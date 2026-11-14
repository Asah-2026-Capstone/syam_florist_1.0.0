// Skema Zod untuk setiap body, query, dan parameter (PRD Bab 6 & 8).
import { Category, FulfillmentMethod, Occasion, OrderStatus, PaymentStatus } from '@prisma/client'
import { z } from 'zod'
import { ORDER_CODE_PATTERN, todayWib } from '../lib/order-rules'

const CATEGORIES = Object.values(Category) as [Category, ...Category[]]
const OCCASIONS = Object.values(Occasion) as [Occasion, ...Occasion[]]

export const MIN_DAYS_PRODUCT = 1 // pesanan produk paling cepat H+1
export const MIN_DAYS_CUSTOM = 2 // pesanan custom paling cepat H+2
export const MAX_DAYS_AHEAD = 60
export const MAX_ORDER_ITEMS = 10
// Slot jam 08.00–20.00 setiap 30 menit
export const TIME_SLOTS = Array.from({ length: 25 }, (_, i) => {
  const minutes = 8 * 60 + i * 30
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}.${String(minutes % 60).padStart(2, '0')}`
})

const addDays = (ymd: string, n: number) => new Date(Date.parse(`${ymd}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)
const optionalText = (max: number, message: string) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().trim().max(max, message).optional())
const whatsapp = z
  .string({ required_error: 'Nomor WhatsApp wajib diisi.' })
  .trim()
  .regex(/^(08|62)\d{8,12}$/, 'Nomor WhatsApp harus diawali 08 atau 62 dan berisi 10–14 digit.')

// ===== Admin: autentikasi =====
export const loginSchema = z.object({
  email: z.string({ required_error: 'Email wajib diisi.' }).trim().toLowerCase().email('Format email tidak valid.'),
  password: z.string({ required_error: 'Password wajib diisi.' }).min(1, 'Password wajib diisi.'),
})

// ===== Publik: katalog =====
export const productQuerySchema = z.object({
  category: z.enum(CATEGORIES).optional(),
  occasion: z.enum(OCCASIONS).optional(),
  q: optionalText(80, 'Kata pencarian maksimal 80 karakter.'),
})

// ===== Admin: produk =====
export const productSchema = z.object({
  name: z.string({ required_error: 'Nama produk wajib diisi.' }).trim().min(3, 'Nama produk minimal 3 karakter.').max(100, 'Nama produk maksimal 100 karakter.'),
  category: z.enum(CATEGORIES, { errorMap: () => ({ message: 'Pilih kategori produk.' }) }),
  occasions: z.array(z.enum(OCCASIONS)).min(1, 'Pilih minimal satu acara.'),
  price: z.coerce.number().int('Harga harus bilangan bulat.').min(1000, 'Harga minimal Rp1.000.').max(100_000_000, 'Harga terlalu besar.'),
  description: z.string({ required_error: 'Deskripsi wajib diisi.' }).trim().min(20, 'Deskripsi minimal 20 karakter.').max(2000, 'Deskripsi maksimal 2000 karakter.'),
  imageUrls: z.array(z.string().url('URL gambar tidak valid.')).max(6, 'Maksimal 6 gambar.').default([]),
  isAvailable: z.boolean().default(true),
  isPublished: z.boolean().default(true),
})
export const availabilitySchema = z.object({ isAvailable: z.boolean({ required_error: 'Status ketersediaan wajib diisi.' }) })

// ===== Publik: pemesanan (PRD Bab 6 C) =====
export function makeCreateOrderSchema(now = new Date()) {
  return z
    .object({
      type: z.enum(['PRODUK', 'CUSTOM'], { errorMap: () => ({ message: 'Pilih jenis pesanan.' }) }),
      items: z
        .array(
          z.object({
            productId: z.string().trim().min(1, 'Pilih produk.').max(40, 'Produk tidak valid.'),
            quantity: z.coerce.number().int().min(1, 'Jumlah minimal 1.').max(99, 'Jumlah maksimal 99 per produk.'),
          }),
        )
        .max(MAX_ORDER_ITEMS, `Maksimal ${MAX_ORDER_ITEMS} produk berbeda dalam satu pesanan.`)
        .default([]),
      customBaseCategory: z.enum(CATEGORIES).optional(),
      customFlowerType: optionalText(100, 'Maksimal 100 karakter.'),
      customColor: optionalText(100, 'Maksimal 100 karakter.'),
      customShape: optionalText(100, 'Maksimal 100 karakter.'),
      customNotes: optionalText(1000, 'Catatan desain maksimal 1000 karakter.'),
      customerName: z.string({ required_error: 'Nama wajib diisi.' }).trim().min(3, 'Nama minimal 3 karakter.').max(80, 'Nama maksimal 80 karakter.'),
      customerPhone: whatsapp,
      pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD.'),
      pickupTime: z.string().refine((v) => TIME_SLOTS.includes(v), 'Pilih jam antara 08.00 dan 20.00 dengan interval 30 menit.'),
      method: z.nativeEnum(FulfillmentMethod, { errorMap: () => ({ message: 'Pilih metode penerimaan.' }) }),
      deliveryAddress: optionalText(300, 'Alamat maksimal 300 karakter.'),
      cardMessage: optionalText(200, 'Ucapan kartu maksimal 200 karakter.'),
    })
    .superRefine((d, ctx) => {
      if (d.type === 'PRODUK') {
        if (d.items.length === 0) ctx.addIssue({ code: 'custom', path: ['items'], message: 'Pilih produk yang ingin dipesan.' })
        const ids = d.items.map((i) => i.productId)
        if (new Set(ids).size !== ids.length) {
          ctx.addIssue({ code: 'custom', path: ['items'], message: 'Produk yang sama cukup dipilih sekali. Atur jumlahnya saja.' })
        }
      } else {
        if (!d.customBaseCategory) ctx.addIssue({ code: 'custom', path: ['customBaseCategory'], message: 'Pilih kategori dasar.' })
        if (!d.customFlowerType) ctx.addIssue({ code: 'custom', path: ['customFlowerType'], message: 'Tulis jenis bunga yang diinginkan.' })
        if (!d.customColor) ctx.addIssue({ code: 'custom', path: ['customColor'], message: 'Tulis warna yang diinginkan.' })
      }
      if (d.method === 'DIANTAR' && (!d.deliveryAddress || d.deliveryAddress.length < 10)) {
        ctx.addIssue({ code: 'custom', path: ['deliveryAddress'], message: 'Alamat pengiriman wajib diisi lengkap (minimal 10 karakter).' })
      }
      const today = todayWib(now)
      const min = addDays(today, d.type === 'CUSTOM' ? MIN_DAYS_CUSTOM : MIN_DAYS_PRODUCT)
      const max = addDays(today, MAX_DAYS_AHEAD)
      if (d.pickupDate < min) {
        ctx.addIssue({ code: 'custom', path: ['pickupDate'], message: `Tanggal paling cepat ${min} (${d.type === 'CUSTOM' ? 'H+2 untuk custom' : 'H+1'}).` })
      } else if (d.pickupDate > max) {
        ctx.addIssue({ code: 'custom', path: ['pickupDate'], message: `Tanggal paling lambat ${max} (${MAX_DAYS_AHEAD} hari ke depan).` })
      }
    })
}

export const orderCodeParam = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .refine((v) => ORDER_CODE_PATTERN.test(v), 'Format kode pesanan: SF-YYMMDD-XXXX.')

export const checkOrderSchema = z.object({ phone: whatsapp })

// ===== Admin: pesanan =====
export const adminOrderQuerySchema = z.object({
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  orderStatus: z.nativeEnum(OrderStatus).optional(),
  q: optionalText(80, 'Kata pencarian maksimal 80 karakter.'),
})
const reason = optionalText(300, 'Alasan maksimal 300 karakter.')
export const paymentStatusSchema = z.object({ status: z.nativeEnum(PaymentStatus), reason })
export const orderStatusSchema = z.object({ status: z.nativeEnum(OrderStatus), reason })
export const customPriceSchema = z.object({
  totalPrice: z.coerce.number().int().min(1000, 'Harga minimal Rp1.000.').max(100_000_000, 'Harga terlalu besar.'),
})
