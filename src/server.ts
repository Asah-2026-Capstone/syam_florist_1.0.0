import { createApp } from './app'
import { env } from './config/env'
import { prisma } from './lib/prisma'

const server = createApp().listen(env.PORT, () => {
  console.log(`Syam Florist API v0.1 berjalan di http://localhost:${env.PORT}/api (mode ${env.NODE_ENV})`)
})

async function shutdown() {
  server.close()
  await prisma.$disconnect()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
