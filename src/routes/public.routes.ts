import { Router } from 'express'
import * as orders from '../controllers/order.controller'
import * as products from '../controllers/product.controller'
import { asyncHandler, ok } from '../lib/http'
import { prisma } from '../lib/prisma'

export const publicRouter = Router()

// Katalog
publicRouter.get('/products', asyncHandler(products.listProducts))
publicRouter.get('/products/:slug', asyncHandler(products.getProduct))

// Info toko & rekening (tabel Setting)
publicRouter.get(
  '/settings',
  asyncHandler(async (_req, res) => {
    ok(res, await prisma.setting.findUnique({ where: { id: 'default' } }))
  }),
)

// Pemesanan
publicRouter.post('/orders', asyncHandler(orders.createOrder))
publicRouter.get('/orders/:code', asyncHandler(orders.orderSummary))
publicRouter.post('/orders/:code/check', asyncHandler(orders.checkOrder))
