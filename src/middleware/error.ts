import type { ErrorRequestHandler, RequestHandler } from 'express'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import { AppError, zodFields } from '../lib/errors'

export const notFound: RequestHandler = (_req, _res, next) => {
  next(new AppError('NOT_FOUND', 'Alamat API tidak ditemukan.'))
}

function normalize(err: unknown): AppError {
  if (err instanceof AppError) return err
  if (err instanceof ZodError) {
    const fields = zodFields(err)
    return new AppError('VALIDATION_ERROR', Object.values(fields)[0], fields)
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') return new AppError('NOT_FOUND')
  if (typeof err === 'object' && err && 'type' in err && (err as { type: string }).type === 'entity.parse.failed') {
    return new AppError('VALIDATION_ERROR', 'Format data yang dikirim tidak valid.')
  }
  return new AppError('INTERNAL_ERROR')
}

/** Semua error dikembalikan dengan format { success: false, error: { code, message, fields? } } */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const appErr = normalize(err)
  if (appErr.code === 'INTERNAL_ERROR') console.error(`[${req.method} ${req.originalUrl}]`, err)
  res.status(appErr.status).json({
    success: false,
    error: { code: appErr.code, message: appErr.message, ...(appErr.fields ? { fields: appErr.fields } : {}) },
  })
}
