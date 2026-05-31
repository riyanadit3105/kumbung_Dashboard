# 🍄 Kumbung Jamur Tiram — IoT Dashboard

Dashboard monitoring real-time untuk Sistem Kendali Iklim Mikro Kumbung Jamur Tiram berbasis IoT.

## Stack
- **Framework**: Next.js 14 (App Router)
- **UI**: Recharts, IBM Plex Mono font
- **Data Source**: ThingSpeak REST API
- **Deploy**: Vercel

## Fitur
- ⚡ Auto-refresh setiap 15 detik (sesuai batas ThingSpeak free plan)
- 🌡 Gauge meter visual untuk Suhu, Kelembapan, dan Level Air
- 📈 Area chart & Line chart dengan threshold reference lines
- 🚨 Alert banner untuk state FAULT dan INTRUSION
- 🤖 Distribusi state FSM dengan progress bar
- 📋 Log pembacaan 15 terbaru secara real-time
- 🌙 Full dark mode (GitHub-inspired industrial aesthetic)

## Konfigurasi ThingSpeak

Edit file `lib/thingspeak.ts`:

```ts
export const TS_CHANNEL_ID = 'CHANNEL_ID_KAMU'  // ganti ini
export const TS_READ_KEY = 'READ_API_KEY'         // jika channel private
```

**Field mapping ThingSpeak:**
| Field | Parameter | Satuan |
|-------|-----------|--------|
| field1 | Suhu | °C |
| field2 | Kelembapan | % RH |
| field3 | LDR | % |
| field4 | Water Level | % |
| field5 | State FSM | 0–4 |

**State FSM:**
- 0 = NORMAL
- 1 = COOLING (kipas aktif)
- 2 = HUMIDIFY (mist maker aktif)
- 3 = INTRUSION (pintu terbuka)
- 4 = FAULT (air habis)

## Deploy ke Vercel

### Cara 1: Vercel CLI
```bash
npm install -g vercel
vercel login
vercel --prod
```

### Cara 2: GitHub + Vercel Dashboard
1. Push project ke GitHub
2. Buka https://vercel.com/new
3. Import repo → Vercel auto-detect Next.js
4. Klik Deploy

### Cara 3: Drag & Drop
1. Build dulu: `npm run build`
2. Upload folder `.next` ke Vercel dashboard

## Development Lokal

```bash
npm install
npm run dev
# Buka http://localhost:3000
```

## Catatan Penting

- Channel ThingSpeak harus **Public** agar bisa diakses tanpa API key
- Jika channel **Private**, isi `TS_READ_KEY` dengan Read API Key
- Free plan ThingSpeak: upload minimal 15 detik sekali
- Dashboard tidak menyimpan data — semua diambil langsung dari ThingSpeak
