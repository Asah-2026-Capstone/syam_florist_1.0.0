// Sesi admin: JWT disimpan di cookie httpOnly. requireAdmin melindungi seluruh /api/admin/*.
import type { CookieOptions, NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env, isProd } from '../config/env'
import { AppError } from '../lib/errors'

export const SESSION_COOKIE = 'sf_session'
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export interface AdminClaims {
  sub: string
  email: string
  name: string
}

declare module 'express-serve-static-core' {
  interface Request {
    admin?: AdminClaims
  }
}

const cookieOptions: CookieOptions = { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/' }

export function setSessionCookie(res: Response, claims: AdminClaims) {
  const token = jwt.sign(claims, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] })
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: SEVEN_DAYS_MS })
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, cookieOptions)
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE]
  if (!token) return next(new AppError('UNAUTHORIZED', 'Silakan masuk sebagai admin terlebih dahulu.'))
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AdminClaims
    req.admin = { sub: payload.sub, email: payload.email, name: payload.name }
    next()
  } catch {
    next(new AppError('UNAUTHORIZED'))
  }
}
