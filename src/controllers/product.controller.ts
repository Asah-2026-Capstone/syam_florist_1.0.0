// Katalog publik dan kelola produk admin (PRD Bab 6 A & E).
import type { Request, Response } from 'express'
import type { Prisma } from '@prisma/client'
import { AppError, parse } from '../lib/errors'
import { ok } from '../lib/http'
import { prisma } from '../lib/prisma'
import { uniqueSlug } from '../lib/slug'
import { availabilitySchema, productQuerySchema, productSchema } from '../validators'

function catalogFilter(query: unknown): Prisma.ProductWhereInput {
  const { category, occasion, q } = parse(productQuerySchema, query)
  return {
    ...(category ? { category } : {}),
    ...(occasion ? { occasions: { has: occasion } } : {}),
    ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
  }
}

// ===== Publik =====

// GET /api/products — hanya produk yang dipublikasikan
export async function listProducts(req: Request, res: Response) {
  const products = await prisma.product.findMany({
    where: { ...catalogFilter(req.query), isPublished: true },
    orderBy: [{ isAvailable: 'desc' }, { soldCount: 'desc' }, { createdAt: 'desc' }],
  })
  ok(res, products)
}

// GET /api/products/:slug
export async function getProduct(req: Request, res: Response) {
  const product = await prisma.product.findFirst({ where: { slug: req.params.slug, isPublished: true } })
  if (!product) throw new AppError('NOT_FOUND', 'Produk tidak ditemukan.')
  ok(res, product)
}

// ===== Admin =====

// GET /api/admin/products — termasuk produk tersembunyi
export async function adminListProducts(req: Request, res: Response) {
  const products = await prisma.product.findMany({ where: catalogFilter(req.query), orderBy: { createdAt: 'desc' } })
  ok(res, products)
}

// GET /api/admin/products/:id
export async function adminGetProduct(req: Request, res: Response) {
  ok(res, await prisma.product.findUniqueOrThrow({ where: { id: req.params.id } }))
}

// POST /api/admin/products
export async function createProduct(req: Request, res: Response) {
  const data = parse(productSchema, req.body)
  const product = await prisma.product.create({ data: { ...data, slug: await uniqueSlug(data.name) } })
  ok(res, product, 201)
}

// PUT /api/admin/products/:id
export async function updateProduct(req: Request, res: Response) {
  const data = parse(productSchema, req.body)
  const current = await prisma.product.findUniqueOrThrow({ where: { id: req.params.id } })
  const slug = current.name === data.name ? current.slug : await uniqueSlug(data.name, current.id)
  ok(res, await prisma.product.update({ where: { id: current.id }, data: { ...data, slug } }))
}

// PATCH /api/admin/products/:id/availability — tandai Tersedia / Habis
export async function setAvailability(req: Request, res: Response) {
  const { isAvailable } = parse(availabilitySchema, req.body)
  ok(res, await prisma.product.update({ where: { id: req.params.id }, data: { isAvailable } }))
}

// DELETE /api/admin/products/:id — hanya bila belum pernah dipesan (riwayat pesanan dijaga)
export async function deleteProduct(req: Request, res: Response) {
  const id = req.params.id
  const used = await prisma.orderItem.count({ where: { productId: id } })
  if (used > 0) {
    throw new AppError('FORBIDDEN', 'Produk sudah memiliki riwayat pesanan. Sembunyikan atau tandai Habis sebagai gantinya.')
  }
  await prisma.product.delete({ where: { id } })
  ok(res, { ok: true })
}
