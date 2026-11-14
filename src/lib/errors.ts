// Kode error standar (PRD Bab 10). Pesan selalu dalam Bahasa Indonesia.
import type { ZodError, ZodTypeAny, z } from 'zod'

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'PRODUCT_UNAVAILABLE'
  | 'INVALID_STATUS_TRANSITION'
  | 'INTERNAL_ERROR'

const STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  PRODUCT_UNAVAILABLE: 409,
  INVALID_STATUS_TRANSITION: 409,
  INTERNAL_ERROR: 500,
}

export const DEFAULT_MESSAGE: Record<ErrorCode, string> = {
  VALIDATION_ERROR: 'Ada data yang belum sesuai. Periksa kembali isian Anda.',
  NOT_FOUND: 'Data yang Anda cari tidak ditemukan.',
  UNAUTHORIZED: 'Sesi Anda sudah berakhir. Silakan masuk kembali.',
  FORBIDDEN: 'Anda tidak memiliki akses untuk tindakan ini.',
  PRODUCT_UNAVAILABLE: 'Maaf, produk ini sedang habis dan belum bisa dipesan.',
  INVALID_STATUS_TRANSITION: 'Perubahan status ini tidak diizinkan.',
  INTERNAL_ERROR: 'Terjadi kendala di sistem kami. Silakan coba lagi beberapa saat lagi.',
}

export class AppError extends Error {
  readonly code: ErrorCode
  readonly status: number
  readonly fields?: Record<string, string>

  constructor(code: ErrorCode, message?: string, fields?: Record<string, string>) {
    super(message ?? DEFAULT_MESSAGE[code])
    this.code = code
    this.status = STATUS[code]
    this.fields = fields
  }
}

export function zodFields(error: ZodError) {
  const fields: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_'
    if (!fields[key]) fields[key] = issue.message
  }
  return fields
}

/** Validasi data dengan skema Zod; gagal → VALIDATION_ERROR dengan pesan per kolom */
export function parse<S extends ZodTypeAny>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data)
  if (!result.success) {
    const fields = zodFields(result.error)
    throw new AppError('VALIDATION_ERROR', Object.values(fields)[0] ?? DEFAULT_MESSAGE.VALIDATION_ERROR, fields)
  }
  return result.data
}
