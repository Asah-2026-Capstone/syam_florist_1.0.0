// Data produk dummy (PRD Bab 9) untuk seed awal.
import type { Category, Occasion } from '@prisma/client'

const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}`

export interface SeedProduct {
  id: string
  name: string
  slug: string
  category: Category
  occasions: Occasion[]
  price: number
  description: string
  imageUrls: string[]
  isAvailable: boolean
  isPublished: boolean
  soldCount: number
}

export const SEED_PRODUCTS: SeedProduct[] = [
  {
    id: 'prd_mawar_merah_wisuda',
    name: 'Buket Mawar Merah Wisuda Elegan',
    slug: 'buket-mawar-merah-wisuda-elegan',
    category: 'BUKET_MAWAR',
    occasions: ['WISUDA'],
    price: 350000,
    description:
      'Dua puluh tangkai mawar merah segar, dibalut kertas kraft cokelat dan pita satin krem. Cocok untuk merayakan kelulusan.',
    imageUrls: [
      unsplash('1494972308805-463bc619d34e'),
      unsplash('1559563362-c667ba5f5480'),
      unsplash('1496062031456-07b8f162a322'),
    ],
    isAvailable: true,
    isPublished: true,
    soldCount: 48,
  },
  {
    id: 'prd_casablanca_sidang',
    name: 'Buket Casablanca Putih Sidang',
    slug: 'buket-casablanca-putih-sidang',
    category: 'BUKET_LILI',
    occasions: ['SIDANG', 'WISUDA'],
    price: 285000,
    description:
      'Lima tangkai lili casablanca putih yang harum, dipadukan daun eucalyptus dan kertas putih susu. Tampil bersih dan tenang untuk merayakan sidang skripsi.',
    imageUrls: [unsplash('1523694576729-dc99e9c0f9b4'), unsplash('1502977249166-824b3a8a4d6d')],
    isAvailable: true,
    isPublished: true,
    soldCount: 31,
  },
  {
    id: 'prd_buket_uang_nikah',
    name: 'Buket Uang Pernikahan 50 Lembar',
    slug: 'buket-uang-pernikahan-50-lembar',
    category: 'BUKET_UANG',
    occasions: ['PERNIKAHAN'],
    price: 450000,
    description:
      'Lima puluh lembar uang dirangkai rapi bersama mawar putih dan pita satin. Harga adalah jasa rangkai dan bunga; uang disiapkan oleh pemesan dan diantar ke toko paling lambat H-2.',
    imageUrls: [unsplash('1567696153798-9111f9cd3d0d'), unsplash('1526047932273-341f2a7631f9')],
    isAvailable: false,
    isPublished: true,
    soldCount: 12,
  },
  {
    id: 'prd_papan_grand_opening',
    name: 'Karangan Bunga Papan Grand Opening Ucapan Selamat',
    slug: 'karangan-bunga-papan-grand-opening-ucapan-selamat',
    category: 'KARANGAN_PAPAN',
    occasions: ['GRAND_OPENING'],
    price: 850000,
    description:
      'Papan ucapan ukuran 2 x 1,25 meter dengan rangkaian krisan, mawar, dan bunga matahari segar. Tulisan ucapan dan nama pengirim bisa Anda tentukan sendiri. Ongkos kirim dikonfirmasi lewat WhatsApp.',
    imageUrls: [unsplash('1455659817273-f96807779a8a'), unsplash('1597848212624-a19eb35e2651')],
    isAvailable: true,
    isPublished: true,
    soldCount: 22,
  },
  {
    id: 'prd_standing_duka',
    name: 'Standing Flower Lili dan Mawar Duka Cita',
    slug: 'standing-flower-lili-dan-mawar-duka-cita',
    category: 'STANDING_FLOWER',
    occasions: ['DUKA'],
    price: 1200000,
    description:
      'Rangkaian berdiri setinggi kurang lebih 1,5 meter dari lili putih, mawar putih, dan krisan, lengkap dengan pita ucapan belasungkawa. Kami antar dengan hormat ke rumah duka atau tempat persemayaman.',
    imageUrls: [unsplash('1530092285049-1c42085fd395'), unsplash('1606041008023-472dfb5e530f')],
    isAvailable: true,
    isPublished: true,
    soldCount: 9,
  },
  {
    id: 'prd_dekor_akad_dusty',
    name: 'Dekorasi Meja Akad Dusty Rose',
    slug: 'dekorasi-meja-akad-dusty-rose',
    category: 'DEKORASI_ACARA',
    occasions: ['PERNIKAHAN'],
    price: 2500000,
    description:
      'Rangkaian bunga meja akad bernuansa dusty rose: mawar, garden rose, dan baby breath, lengkap dengan runner kain dan vas kaca. Termasuk pemasangan di lokasi acara area Depok.',
    imageUrls: [
      unsplash('1519225421980-715cb0215aed'),
      unsplash('1582794543139-8ac9cb0f7b11'),
      unsplash('1469371670807-013ccf25f16a'),
    ],
    isAvailable: true,
    isPublished: true,
    soldCount: 6,
  },
  {
    id: 'prd_lili_campur',
    name: 'Buket Lili Campur',
    slug: 'buket-lili-campur',
    category: 'BUKET_LILI',
    occasions: ['ULANG_TAHUN', 'UMUM'],
    price: 250000,
    description:
      'Delapan tangkai lili casablanca dengan baby breath, dibungkus kertas kraft abu dan pita cokelat. Pilihan aman untuk hadiah di berbagai momen.',
    imageUrls: [unsplash('1502977249166-824b3a8a4d6d')],
    isAvailable: true,
    isPublished: true,
    soldCount: 27,
  },
  {
    id: 'prd_mawar_pink_ultah',
    name: 'Buket Mawar Pink Ulang Tahun',
    slug: 'buket-mawar-pink-ulang-tahun',
    category: 'BUKET_MAWAR',
    occasions: ['ULANG_TAHUN'],
    price: 225000,
    description:
      'Lima belas tangkai mawar pink dengan baby breath dan kertas pink pastel. Manis untuk ulang tahun ibu, sahabat, atau pasangan.',
    imageUrls: [unsplash('1518895949257-7621c3c786d7'), unsplash('1582794543139-8ac9cb0f7b11')],
    isAvailable: true,
    isPublished: true,
    soldCount: 35,
  },
  {
    id: 'prd_pastel_sidang',
    name: 'Buket Pastel Sidang Mungil',
    slug: 'buket-pastel-sidang-mungil',
    category: 'BUKET_MAWAR',
    occasions: ['SIDANG', 'WISUDA'],
    price: 175000,
    description:
      'Buket kecil berisi mawar peach, krisan putih, dan daun eucalyptus. Ringan dibawa ke ruang sidang dan tetap cantik di foto.',
    imageUrls: [unsplash('1563241527-3004b7be0ffd')],
    isAvailable: true,
    isPublished: true,
    soldCount: 41,
  },
  {
    id: 'prd_garden_rose',
    name: 'Buket Garden Rose Premium',
    slug: 'buket-garden-rose-premium',
    category: 'BUKET_MAWAR',
    occasions: ['PERNIKAHAN', 'ULANG_TAHUN', 'UMUM'],
    price: 495000,
    description:
      'Garden rose, mawar putih, dan bunga musiman dalam rangkaian besar yang mewah. Cocok untuk lamaran, hari jadi, atau hadiah istimewa.',
    imageUrls: [unsplash('1487530811176-3780de880c2d'), unsplash('1591886960571-74d43a9d4166')],
    isAvailable: true,
    isPublished: true,
    soldCount: 14,
  },
  {
    id: 'prd_mawar_oranye',
    name: 'Buket Mawar Oranye Sidang Ceria',
    slug: 'buket-mawar-oranye-sidang-ceria',
    category: 'BUKET_MAWAR',
    occasions: ['SIDANG'],
    price: 265000,
    description:
      'Mawar oranye, snapdragon, dan daun segar dalam buket yang cerah. Disembunyikan sementara sampai stok mawar oranye kembali stabil.',
    imageUrls: [unsplash('1533616688419-b7a585564566')],
    isAvailable: true,
    isPublished: false,
    soldCount: 5,
  },
]
