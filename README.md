# Syam Florist — Backend v0.1 (Checkpoint 1)

Backend awal aplikasi katalog dan pemesanan online **Syam Florist** (Depok).
Versi ini fokus pada **fondasi backend dan implementasi database**: skema PostgreSQL lengkap,
migrasi, data awal (seed), dan REST API inti untuk katalog, pemesanan, serta pengelolaan oleh admin.

| Teknologi | Kegunaan |
| --- | --- |
| Node.js 20 + TypeScript | Runtime dan bahasa |
| Express 4 | REST API |
| Prisma 6 + PostgreSQL (Neon) | ORM, migrasi, dan database |
| Zod | Validasi input & variabel lingkungan |
| bcrypt + JWT (cookie httpOnly) | Autentikasi admin |

## Struktur folder

```
syam v.01/
├── prisma/
│   ├── schema.prisma          # 10 tabel + 11 enum (sesuai ERD)
│   ├── migrations/            # SQL pembuatan tabel (prisma migrate)
│   ├── seed.ts                # admin, data toko, produk dummy, contoh pesanan
│   └── seed-data.ts
├── src/
    ├── server.ts              # titik masuk
    ├── app.ts                 # konfigurasi Express (helmet, CORS, JSON, router)
    ├── config/env.ts          # validasi .env
    ├── lib/                   # prisma client, format respons, error, slug, aturan pesanan
    ├── middleware/            # requireAdmin (JWT), error handler
    ├── validators/            # skema Zod tiap endpoint
    ├── controllers/           # auth, product, order
    └── routes/                # public.routes.ts, admin.routes.ts

```

Alur satu permintaan: **route → (requireAdmin) → controller → validator Zod → Prisma → PostgreSQL**,
lalu dibalas dengan format `{ success, data }` atau `{ success: false, error: { code, message, fields } }`.

## Database

| Tabel | Isi |
| --- | --- |
| `User` | Akun admin (password di-hash bcrypt) |
| `Product` | Produk katalog: kategori, acara, harga, foto, status tersedia/tampil, jumlah terjual |
| `Order` | Pesanan produk/custom, data pemesan, jadwal, status pembayaran & pesanan |
| `OrderItem` | Rincian produk per pesanan (mendukung multi-produk) |
| `PaymentProof` | Bukti transfer pelanggan |
| `OrderStatusLog` | Riwayat setiap perubahan status (siapa, kapan, alasan) |
| `WhatsappLog` | Log notifikasi WhatsApp (dipakai di checkpoint berikutnya) |
| `Review` | Ulasan pelanggan (checkpoint berikutnya) |
| `AiQueryLog` | Log permintaan rekomendasi AI (checkpoint berikutnya) |
| `Setting` | Data toko: rekening, persen DP, alamat, jam buka |

Relasi penting: `Order 1–N OrderItem / PaymentProof / OrderStatusLog` (hapus berantai),
`Product 1–N OrderItem` (bila produk dihapus, `productId` jadi null tetapi nama tetap tersimpan di snapshot).

## Menjalankan

```bash
cp .env.example .env     # isi DATABASE_URL, JWT_SECRET, ADMIN_SEED_PASSWORD
npm install
npm run db:deploy        # membuat seluruh tabel di database
npm run db:seed          # admin, data toko, 11 produk, 2 contoh pesanan
npm run dev              # http://localhost:4000/api/health
```

`npm run db:studio` membuka Prisma Studio untuk melihat isi tabel.

## Endpoint v0.1

| Metode | Endpoint | Akses | Fungsi |
| --- | --- | :---: | --- |
| GET | `/api/health` | Publik | Cek server & koneksi database |
| GET | `/api/products?category=&occasion=&q=` | Publik | Katalog produk dengan filter |
| GET | `/api/products/:slug` | Publik | Detail produk |
| GET | `/api/settings` | Publik | Info toko & rekening |
| POST | `/api/orders` | Publik | Membuat pesanan produk / custom |
| GET | `/api/orders/:code` | Publik | Ringkasan pesanan & instruksi bayar |
| POST | `/api/orders/:code/check` | Publik | Cek status (kode + nomor WhatsApp) |
| POST | `/api/admin/auth/login` | Publik | Login admin |
| POST | `/api/admin/auth/logout` | Admin | Logout |
| GET | `/api/admin/auth/me` | Admin | Data admin yang sedang login |
| GET/POST | `/api/admin/products` | Admin | Daftar / tambah produk |
| GET/PUT/DELETE | `/api/admin/products/:id` | Admin | Detail / ubah / hapus produk |
| PATCH | `/api/admin/products/:id/availability` | Admin | Tandai Tersedia / Habis |
| GET | `/api/admin/orders?paymentStatus=&orderStatus=&q=` | Admin | Daftar pesanan |
| GET | `/api/admin/orders/:id` | Admin | Detail pesanan + riwayat status |
| PATCH | `/api/admin/orders/:id/payment-status` | Admin | Ubah status pembayaran |
| PATCH | `/api/admin/orders/:id/order-status` | Admin | Ubah status pesanan |
| PATCH | `/api/admin/orders/:id/custom-price` | Admin | Isi harga final pesanan custom |

### Aturan bisnis yang sudah diterapkan

- Kode pesanan unik `SF-YYMMDD-XXXX` (tanpa huruf/angka yang mudah tertukar).
- Harga dihitung dari database, bukan dari kiriman pelanggan; produk Habis ditolak.
- Tanggal ambil/antar: produk paling cepat H+1, custom H+2, maksimal 60 hari; jam 08.00–20.00 per 30 menit.
- Status pembayaran maju (Menunggu → DP → Lunas) langsung; mundur wajib alasan.
- Pesanan hanya bisa **Selesai** bila **Lunas**; pembatalan wajib alasan. Semua perubahan tercatat di `OrderStatusLog`.
- Produk yang sudah pernah dipesan tidak bisa dihapus (riwayat transaksi dijaga).

### Contoh uji cepat

```bash
curl http://localhost:4000/api/products?category=BUKET_MAWAR

curl -X POST http://localhost:4000/api/orders -H "Content-Type: application/json" -d '{
  "type": "PRODUK",
  "items": [{ "productId": "prd_mawar_merah_wisuda", "quantity": 1 }],
  "customerName": "Nadia Putri",
  "customerPhone": "081234567890",
  "pickupDate": "2026-11-20",
  "pickupTime": "10.30",
  "method": "AMBIL_TOKO"
}'
```

