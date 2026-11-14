import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import { env } from './config/env'
import { prisma } from './lib/prisma'
import { errorHandler, notFound } from './middleware/error'
import { adminRouter } from './routes/admin.routes'
import { publicRouter } from './routes/public.routes'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')

  app.use(helmet())
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }))
  app.use(express.json({ limit: '100kb' }))
  app.use(cookieParser())

  app.get(['/', '/api'], (_req, res) => {
    res.json({ success: true, data: { name: 'Syam Florist API', version: '0.1.0', health: '/api/health' } })
  })

  // Cek server dan koneksi database
  app.get('/api/health', async (_req, res) => {
    const db = await prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false)
    res.status(db ? 200 : 503).json({ success: db, data: { status: db ? 'ok' : 'database-unreachable' } })
  })

  app.use('/api/admin', adminRouter)
  app.use('/api', publicRouter)

  app.use(notFound)
  app.use(errorHandler)
  return app
}
