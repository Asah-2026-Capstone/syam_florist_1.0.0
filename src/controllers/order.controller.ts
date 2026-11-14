// Pemesanan pelanggan (PRD Bab 6 C) dan pengelolaan status pesanan oleh admin (Bab 6 D).
import type { Request, Response } from 'express'
import { Prisma, type Order } from '@prisma/client'
import { AppError, parse } from '../lib/errors'
import { ok } from '../lib/http'
import {
  checkOrderTransition,
  checkPaymentTransition,
  dpAmount,
  generateOrderCode,
  normalizePhone,
  type TransitionCheck,
} from '../lib/order-rules'
import { prisma } from '../lib/prisma'
import {
  adminOrderQuerySchema,
  checkOrderSchema,
  customPriceSchema,
  makeCreateOrderSchema,
  orderCodeParam,
  orderStatusSchema,
  paymentStatusSchema,
} from '../validators'

async function getSetting() {
  const setting = await prisma.setting.findUnique({ where: { id: 'default' } })
  if (!setting) throw new AppError('INTERNAL_ERROR', 'Data toko belum diatur. Jalankan npm run db:seed.')
  return setting
}

/** Ringkasan aman untuk pelanggan: tanpa catatan admin dan nomor lengkap */
async function publicSummary(order: Order & { items: { productNameSnapshot: string; quantity: number; unitPrice: number }[] }) {
  const setting = await getSetting()
  return {
    code: order.code,
    type: order.type,
    items: order.items,
    totalPrice: order.totalPrice,
    dpAmount: order.totalPrice > 0 ? dpAmount(order.totalPrice, setting.dpPercent) : 0,
    pickupDate: order.pickupDate.toISOString().slice(0, 10),
    pickupTime: order.pickupTime,
    method: order.method,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    payment: { bankName: setting.bankName, accountNo: setting.accountNo, accountName: setting.accountName, dpPercent: setting.dpPercent },
  }
}

// ===== Publik =====

// POST /api/orders
export async function createOrder(req: Request, res: Response) {
  const d = parse(makeCreateOrderSchema(), req.body)

  // Harga selalu diambil dari database, bukan dari kiriman pelanggan
  let items: { productId: string; productNameSnapshot: string; quantity: number; unitPrice: number }[] = []
  if (d.type === 'PRODUK') {
    const products = await prisma.product.findMany({ where: { id: { in: d.items.map((i) => i.productId) }, isPublished: true } })
    items = d.items.map((i) => {
      const p = products.find((x) => x.id === i.productId)
      if (!p) throw new AppError('NOT_FOUND', 'Produk yang dipilih tidak ditemukan.')
      if (!p.isAvailable) throw new AppError('PRODUCT_UNAVAILABLE', `Maaf, ${p.name} sedang habis.`)
      return { productId: p.id, productNameSnapshot: p.name, quantity: i.quantity, unitPrice: p.price }
    })
  }
  // Pesanan custom: harga 0 dulu, admin mengisi harga final setelah konfirmasi
  const totalPrice = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
  const first = items[0]

  const base = {
    type: d.type,
    source: 'ONLINE' as const,
    productId: first?.productId ?? null,
    productNameSnapshot:
      d.type === 'CUSTOM' ? 'Desain Custom' : items.length > 1 ? `${first.productNameSnapshot} + ${items.length - 1} produk lain` : first.productNameSnapshot,
    quantity: items.reduce((sum, i) => sum + i.quantity, 0) || 1,
    unitPrice: first?.unitPrice ?? 0,
    totalPrice,
    customBaseCategory: d.customBaseCategory,
    customFlowerType: d.customFlowerType,
    customColor: d.customColor,
    customShape: d.customShape,
    customNotes: d.customNotes,
    customerName: d.customerName,
    customerPhone: normalizePhone(d.customerPhone),
    pickupDate: new Date(`${d.pickupDate}T00:00:00.000Z`),
    pickupTime: d.pickupTime,
    method: d.method,
    deliveryAddress: d.method === 'DIANTAR' ? d.deliveryAddress : null,
    cardMessage: d.cardMessage,
    items: { create: items },
  }

  // Ulangi dengan kode baru bila kode kebetulan sudah dipakai
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const order = await prisma.order.create({ data: { ...base, code: generateOrderCode() }, include: { items: true } })
      return ok(res, await publicSummary(order), 201)
    } catch (err) {
      const duplicate = err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
      if (!duplicate) throw err
    }
  }
  throw new AppError('INTERNAL_ERROR', 'Kode pesanan gagal dibuat. Silakan coba lagi.')
}

// GET /api/orders/:code — ringkasan & instruksi pembayaran setelah memesan
export async function orderSummary(req: Request, res: Response) {
  const code = parse(orderCodeParam, req.params.code)
  const order = await prisma.order.findUnique({ where: { code }, include: { items: true } })
  if (!order) throw new AppError('NOT_FOUND', 'Kode pesanan tidak ditemukan.')
  ok(res, await publicSummary(order))
}

// POST /api/orders/:code/check — cek status dengan kode + nomor WhatsApp
export async function checkOrder(req: Request, res: Response) {
  const code = parse(orderCodeParam, req.params.code)
  const { phone } = parse(checkOrderSchema, req.body)
  const order = await prisma.order.findUnique({ where: { code }, include: { items: true } })
  // Pesan sama untuk kode salah maupun nomor salah agar data pelanggan tidak bisa ditebak
  if (!order || order.customerPhone !== normalizePhone(phone)) {
    throw new AppError('NOT_FOUND', 'Pesanan tidak ditemukan. Periksa kode pesanan dan nomor WhatsApp Anda.')
  }
  ok(res, await publicSummary(order))
}

// ===== Admin =====

// GET /api/admin/orders?paymentStatus=&orderStatus=&q=
export async function listOrders(req: Request, res: Response) {
  const { paymentStatus, orderStatus, q } = parse(adminOrderQuerySchema, req.query)
  const orders = await prisma.order.findMany({
    where: {
      ...(paymentStatus ? { paymentStatus } : {}),
      ...(orderStatus ? { orderStatus } : {}),
      ...(q
        ? { OR: [{ code: { contains: q, mode: 'insensitive' } }, { customerName: { contains: q, mode: 'insensitive' } }] }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  ok(res, orders)
}

// GET /api/admin/orders/:id
export async function getOrder(req: Request, res: Response) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      items: true,
      paymentProofs: { orderBy: { createdAt: 'desc' } },
      statusLogs: { orderBy: { createdAt: 'desc' } },
    },
  })
  ok(res, order)
}

function assertAllowed(check: TransitionCheck, reason?: string) {
  if (!check.allowed) throw new AppError('INVALID_STATUS_TRANSITION', check.message)
  if (check.needsReason && !reason) {
    throw new AppError('VALIDATION_ERROR', 'Tuliskan alasan perubahan status ini.', { reason: 'Alasan wajib diisi.' })
  }
}

// PATCH /api/admin/orders/:id/payment-status
export async function updatePaymentStatus(req: Request, res: Response) {
  const { status, reason } = parse(paymentStatusSchema, req.body)
  const order = await prisma.order.findUniqueOrThrow({ where: { id: req.params.id } })
  assertAllowed(checkPaymentTransition(order, status), reason)

  const { dpPercent } = await getSetting()
  const amountPaid = status === 'LUNAS' ? order.totalPrice : status === 'DP' ? dpAmount(order.totalPrice, dpPercent) : 0
  const [updated] = await prisma.$transaction([
    prisma.order.update({ where: { id: order.id }, data: { paymentStatus: status, amountPaid } }),
    prisma.orderStatusLog.create({
      data: { orderId: order.id, fromValue: order.paymentStatus, toValue: status, actor: req.admin!.name, reason },
    }),
  ])
  ok(res, updated)
}

// PATCH /api/admin/orders/:id/order-status
export async function updateOrderStatus(req: Request, res: Response) {
  const { status, reason } = parse(orderStatusSchema, req.body)
  const order = await prisma.order.findUniqueOrThrow({ where: { id: req.params.id }, include: { items: true } })
  assertAllowed(checkOrderTransition(order, status), reason)

  // Jumlah terjual produk bertambah saat Selesai dan dikurangi bila status Selesai dibatalkan
  const soldDelta = status === 'SELESAI' ? 1 : order.orderStatus === 'SELESAI' ? -1 : 0
  const soldUpdates = order.items
    .filter((i) => i.productId)
    .map((i) =>
      prisma.product.update({ where: { id: i.productId! }, data: { soldCount: { increment: soldDelta * i.quantity } } }),
    )
  const [updated] = await prisma.$transaction([
    prisma.order.update({ where: { id: order.id }, data: { orderStatus: status } }),
    prisma.orderStatusLog.create({
      data: { orderId: order.id, fromValue: order.orderStatus, toValue: status, actor: req.admin!.name, reason },
    }),
    ...(soldDelta !== 0 ? soldUpdates : []),
  ])
  ok(res, updated)
}

// PATCH /api/admin/orders/:id/custom-price — harga final pesanan custom
export async function updateCustomPrice(req: Request, res: Response) {
  const { totalPrice } = parse(customPriceSchema, req.body)
  const order = await prisma.order.findUniqueOrThrow({ where: { id: req.params.id } })
  if (order.type !== 'CUSTOM') throw new AppError('FORBIDDEN', 'Harga hanya bisa diubah untuk pesanan custom.')
  if (order.paymentStatus !== 'MENUNGGU_PEMBAYARAN') {
    throw new AppError('FORBIDDEN', 'Harga tidak bisa diubah setelah pelanggan membayar.')
  }
  ok(res, await prisma.order.update({ where: { id: order.id }, data: { totalPrice, unitPrice: totalPrice } }))
}
