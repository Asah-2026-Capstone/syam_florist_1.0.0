import { prisma } from './prisma'

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Slug unik dari nama produk; tambahkan -2, -3, ... bila sudah dipakai */
export async function uniqueSlug(name: string, excludeId?: string) {
  const base = slugify(name) || 'produk'
  const taken = new Set(
    (
      await prisma.product.findMany({
        where: { slug: { startsWith: base }, ...(excludeId ? { id: { not: excludeId } } : {}) },
        select: { slug: true },
      })
    ).map((p) => p.slug),
  )
  let slug = base
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`
  return slug
}
