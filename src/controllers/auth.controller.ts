import type { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { AppError, parse } from '../lib/errors'
import { ok } from '../lib/http'
import { prisma } from '../lib/prisma'
import { clearSessionCookie, setSessionCookie } from '../middleware/auth'
import { loginSchema } from '../validators'

// Hash pembanding agar waktu respons sama walau email tidak terdaftar
const DUMMY_HASH = bcrypt.hashSync('pembanding-waktu-login', 12)

// POST /api/admin/auth/login
export async function login(req: Request, res: Response) {
  const { email, password } = parse(loginSchema, req.body)
  const user = await prisma.user.findUnique({ where: { email } })
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH)
  if (!user || !valid) throw new AppError('UNAUTHORIZED', 'Email atau password salah. Periksa kembali lalu coba lagi.')
  setSessionCookie(res, { sub: user.id, email: user.email, name: user.name })
  ok(res, { email: user.email, name: user.name })
}

// POST /api/admin/auth/logout
export async function logout(_req: Request, res: Response) {
  clearSessionCookie(res)
  ok(res, { ok: true })
}

// GET /api/admin/auth/me
export async function me(req: Request, res: Response) {
  ok(res, { email: req.admin!.email, name: req.admin!.name })
}
