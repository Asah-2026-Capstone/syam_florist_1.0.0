// Seed data awal. Aman dijalankan berulang (upsert).
// Isi: akun admin dari .env, data toko (Setting), produk dummy, dan contoh pesanan untuk uji alur status.
import bcrypt from 'bcrypt'
import { PrismaClient } from '@prisma/client'
import { SEED_PRODUCTS } from './seed-data'

const prisma = new PrismaClient()

function required(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} wajib diisi di .env sebelum menjalankan seed.`)
  return value
}

const date = (d: string) => new Date(`${d}T00:00:00.000Z`)

async function main() {
  // ===== Admin (password disimpan sebagai hash bcrypt) =====
  const email = required('ADMIN_SEED_EMAIL').toLowerCase()
  const password = required('ADMIN_SEED_PASSWORD')
  if (password.length < 8) throw new Error('ADMIN_SEED_PASSWORD minimal 8 karakter.')
  const name = process.env.ADMIN_SEED_NAME ?? 'Pemilik Syam Florist'
  const passwordHash = await bcrypt.hash(password, 12)
  await prisma.user.upsert({ where: { email }, update: { passwordHash, name }, create: { email, passwordHash, name, role: 'ADMIN' } })

  // ===== Setting toko =====
  const setting = {
    bankName: process.env.PAYMENT_BANK_NAME ?? 'Bank BCA',
    accountNo: process.env.PAYMENT_ACCOUNT_NUMBER ?? '1234567890',
    accountName: process.env.PAYMENT_ACCOUNT_NAME ?? 'Syam Florist',
    dpPercent: Number(process.env.PAYMENT_DP_PERCENT ?? 50),
    shopAddress: 'Jl. Komjen Pol. M. Jasin, Pasir Gunung Selatan, Cimanggis, Kota Depok, Jawa Barat',
    openHours: 'Senin–Sabtu 08.00–20.00 WIB, Minggu 09.00–17.00 WIB',
  }
  await prisma.setting.upsert({ where: { id: 'default' }, update: setting, create: { id: 'default', ...setting } })

  // ===== Produk =====
  for (const p of SEED_PRODUCTS) {
    await prisma.product.upsert({ where: { id: p.id }, update: {}, create: p })
  }

  // ===== Contoh pesanan =====
  const mawar = SEED_PRODUCTS.find((p) => p.id === 'prd_mawar_merah_wisuda')!
  const papan = SEED_PRODUCTS.find((p) => p.id === 'prd_papan_grand_opening')!

  const samples = [
    {
      code: 'SF-261112-K7P2',
      product: mawar,
      customerName: 'Nadia Putri',
      customerPhone: '6281234567890',
      pickupDate: date('2026-11-20'),
      pickupTime: '10.30',
      method: 'AMBIL_TOKO' as const,
      cardMessage: 'Selamat wisuda, Sarjana Hebat!',
      paymentStatus: 'DP' as const,
      orderStatus: 'DIPROSES' as const,
      amountPaid: Math.ceil(mawar.price / 2 / 1000) * 1000,
    },
    {
      code: 'SF-261113-M3QA',
      product: papan,
      customerName: 'Rizky Pratama',
      customerPhone: '6285712345678',
      pickupDate: date('2026-11-18'),
      pickupTime: '09.00',
      method: 'DIANTAR' as const,
      deliveryAddress: 'Jl. Margonda Raya No. 88, Kemiri Muka, Beji, Depok',
      cardMessage: 'Selamat atas pembukaan toko baru. Semoga lancar dan berkah!',
      paymentStatus: 'MENUNGGU_PEMBAYARAN' as const,
      orderStatus: 'MENUNGGU_KONFIRMASI' as const,
      amountPaid: 0,
    },
  ]

  for (const { product, ...s } of samples) {
    await prisma.order.upsert({
      where: { code: s.code },
      update: {},
      create: {
        ...s,
        type: 'PRODUK',
        source: 'ONLINE',
        productId: product.id,
        productNameSnapshot: product.name,
        quantity: 1,
        unitPrice: product.price,
        totalPrice: product.price,
        items: { create: [{ productId: product.id, productNameSnapshot: product.name, quantity: 1, unitPrice: product.price }] },
      },
    })
  }

  const [users, products, orders] = await Promise.all([prisma.user.count(), prisma.product.count(), prisma.order.count()])
  console.log(`Seed selesai: ${users} admin, ${products} produk, ${orders} pesanan.`)
}

main()
  .catch((err) => {
    console.error('Seed gagal:', err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
