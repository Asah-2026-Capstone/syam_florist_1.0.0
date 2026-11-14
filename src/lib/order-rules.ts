// Aturan bisnis pesanan (PRD Bab 6 C & D): kode pesanan, nominal DP, dan transisi status.
import type { OrderStatus, PaymentStatus } from '@prisma/client'

// Kode SF-YYMMDD-XXXX. XXXX tanpa karakter yang mudah tertukar (0, O, 1, I, L).
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const ORDER_CODE_PATTERN = /^SF-\d{6}-[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{4}$/

/** Tanggal hari ini di zona WIB (UTC+7) dalam format YYYY-MM-DD */
export function todayWib(now = new Date()) {
  return new Date(now.getTime() + 7 * 3600_000).toISOString().slice(0, 10)
}

export function generateOrderCode(now = new Date()) {
  const ymd = todayWib(now).replace(/-/g, '').slice(2)
  let suffix = ''
  for (let i = 0; i < 4; i++) suffix += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  return `SF-${ymd}-${suffix}`
}

/** Nomor WhatsApp disimpan berformat 62xxxxxxxxxx */
export function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, '')
  return digits.startsWith('0') ? `62${digits.slice(1)}` : digits
}

/** Nominal DP dibulatkan ke atas ke ribuan terdekat */
export function dpAmount(total: number, dpPercent: number) {
  return Math.ceil((total * dpPercent) / 100 / 1000) * 1000
}

export type TransitionCheck = { allowed: true; needsReason: boolean } | { allowed: false; message: string }

const PAYMENT_RANK: Record<PaymentStatus, number> = { MENUNGGU_PEMBAYARAN: 0, DP: 1, LUNAS: 2 }
const ORDER_RANK: Record<OrderStatus, number> = { MENUNGGU_KONFIRMASI: 0, DIPROSES: 1, SELESAI: 2, DIBATALKAN: 3 }

/** Maju (Menunggu → DP → Lunas) boleh langsung; mundur wajib disertai alasan. */
export function checkPaymentTransition(
  order: { paymentStatus: PaymentStatus; orderStatus: OrderStatus; totalPrice: number },
  to: PaymentStatus,
): TransitionCheck {
  if (order.paymentStatus === to) return { allowed: false, message: 'Status pembayaran sudah sama.' }
  if (order.orderStatus === 'DIBATALKAN') return { allowed: false, message: 'Pesanan sudah dibatalkan.' }
  if (order.totalPrice <= 0 && to !== 'MENUNGGU_PEMBAYARAN') {
    return { allowed: false, message: 'Isi harga final pesanan custom terlebih dahulu.' }
  }
  return { allowed: true, needsReason: PAYMENT_RANK[to] < PAYMENT_RANK[order.paymentStatus] }
}

/** Selesai hanya bila Lunas; pembatalan, mundur, dan membuka kembali pesanan wajib alasan. */
export function checkOrderTransition(
  order: { paymentStatus: PaymentStatus; orderStatus: OrderStatus },
  to: OrderStatus,
): TransitionCheck {
  const from = order.orderStatus
  if (from === to) return { allowed: false, message: 'Status pesanan sudah sama.' }
  if (from === 'DIBATALKAN') return { allowed: true, needsReason: true }
  if (to === 'SELESAI' && order.paymentStatus !== 'LUNAS') {
    return { allowed: false, message: 'Pesanan belum Lunas sehingga belum bisa ditandai Selesai.' }
  }
  const backward = to !== 'DIBATALKAN' && ORDER_RANK[to] < ORDER_RANK[from]
  return { allowed: true, needsReason: backward || to === 'DIBATALKAN' }
}
