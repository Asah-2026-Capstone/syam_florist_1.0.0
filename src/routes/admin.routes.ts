import { Router } from 'express'
import * as auth from '../controllers/auth.controller'
import * as orders from '../controllers/order.controller'
import * as products from '../controllers/product.controller'
import { asyncHandler } from '../lib/http'
import { requireAdmin } from '../middleware/auth'

export const adminRouter = Router()

// Login terbuka; semua endpoint setelah baris requireAdmin wajib sesi admin
adminRouter.post('/auth/login', asyncHandler(auth.login))
adminRouter.use(requireAdmin)
adminRouter.post('/auth/logout', asyncHandler(auth.logout))
adminRouter.get('/auth/me', asyncHandler(auth.me))

// Kelola produk
adminRouter.get('/products', asyncHandler(products.adminListProducts))
adminRouter.get('/products/:id', asyncHandler(products.adminGetProduct))
adminRouter.post('/products', asyncHandler(products.createProduct))
adminRouter.put('/products/:id', asyncHandler(products.updateProduct))
adminRouter.patch('/products/:id/availability', asyncHandler(products.setAvailability))
adminRouter.delete('/products/:id', asyncHandler(products.deleteProduct))

// Kelola pesanan
adminRouter.get('/orders', asyncHandler(orders.listOrders))
adminRouter.get('/orders/:id', asyncHandler(orders.getOrder))
adminRouter.patch('/orders/:id/payment-status', asyncHandler(orders.updatePaymentStatus))
adminRouter.patch('/orders/:id/order-status', asyncHandler(orders.updateOrderStatus))
adminRouter.patch('/orders/:id/custom-price', asyncHandler(orders.updateCustomPrice))
