// Validasi variabel lingkungan dengan Zod. Server tidak menyala bila nilai wajib belum benar.
import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_URL: z.string().url('CLIENT_URL harus berupa URL, contoh http://localhost:5173').default('http://localhost:5173'),
  DATABASE_URL: z
    .string({ required_error: 'DATABASE_URL wajib diisi.' })
    .regex(/^postgres(ql)?:\/\//, 'DATABASE_URL harus connection string PostgreSQL (diawali postgresql://).'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET minimal 32 karakter acak.'),
  JWT_EXPIRES_IN: z.string().default('7d'),
})

function loadEnv() {
  const parsed = schema.safeParse(process.env)
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
    console.error(`\nKonfigurasi belum lengkap. Periksa file .env:\n${lines}\n`)
    process.exit(1)
  }
  return parsed.data
}

export const env = loadEnv()
export const isProd = env.NODE_ENV === 'production'
