// ThingSpeak channel config
// Field mapping:
//   field1 = Suhu (°C)
//   field2 = Kelembapan (% RH)
//   field3 = LDR (%)
//   field4 = Water Level (%)
//   field5 = State (0=NORMAL,1=COOLING,2=HUMIDIFY,3=INTRUSION,4=FAULT)

export const TS_CHANNEL_ID = process.env.NEXT_PUBLIC_TS_CHANNEL_ID ?? '3396691' // public channel id
export const TS_READ_KEY = process.env.TS_READ_KEY ?? 'O2781H5JSI2BVFZ0'
export const TS_API_KEY = process.env.TS_API_KEY ?? '70JK2S31O47R00ZP'
export const TS_BASE = process.env.TS_BASE ?? 'https://api.thingspeak.com'

export type SystemState = 0 | 1 | 2 | 3 | 4

export interface SensorReading {
  created_at: string
  entry_id: number
  suhu: number | null
  kelembapan: number | null
  ldr: number | null
  waterLevel: number | null
  state: SystemState | null
}

export interface ChannelInfo {
  id: number
  name: string
  description: string
  last_entry_id: number
  created_at: string
  updated_at: string
}

export interface ThingSpeakResponse {
  channel: ChannelInfo
  feeds: RawFeed[]
}

interface RawFeed {
  created_at: string
  entry_id: number
  field1?: string
  field2?: string
  field3?: string
  field4?: string
  field5?: string
}

function parseNum(v?: string): number | null {
  if (!v) return null
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}

function parseState(v?: string): SystemState | null {
  if (!v) return null
  const n = parseInt(v)
  if (isNaN(n) || n < 0 || n > 4) return null
  return n as SystemState
}

export function mapFeed(feed: RawFeed): SensorReading {
  return {
    created_at: feed.created_at,
    entry_id: feed.entry_id,
    suhu: parseNum(feed.field1),
    kelembapan: parseNum(feed.field2),
    ldr: parseNum(feed.field3),
    waterLevel: parseNum(feed.field4),
    state: parseState(feed.field5),
  }
}

export const STATE_META: Record<
  SystemState,
  { label: string; color: string; bg: string; icon: string; desc: string }
> = {
  0: { label: 'NORMAL', color: '#3fb950', bg: '#0d2818', icon: '✓', desc: 'Semua parameter optimal' },
  1: { label: 'COOLING', color: '#58a6ff', bg: '#0d1b2e', icon: '❄', desc: 'Suhu terlalu tinggi — kipas aktif' },
  2: { label: 'HUMIDIFY', color: '#d2a8ff', bg: '#1a0d2e', icon: '💧', desc: 'RH rendah — mist maker aktif' },
  3: { label: 'INTRUSION', color: '#d29922', bg: '#2b1e00', icon: '⚠', desc: 'Pintu terbuka terdeteksi' },
  4: { label: 'FAULT', color: '#f85149', bg: '#2b0d0d', icon: '✕', desc: 'Air habis — sistem terkunci' },
}

// Fetch last N readings
export async function fetchFeeds(results = 80): Promise<SensorReading[]> {
  const url = `${TS_BASE}/channels/${TS_CHANNEL_ID}/feeds.json?results=${results}&api_key=${TS_READ_KEY}`
  const res = await fetch(url, { next: { revalidate: 15 } })
  if (!res.ok) throw new Error(`ThingSpeak error: ${res.status}`)
  const data: ThingSpeakResponse = await res.json()
  return data.feeds.map(mapFeed)
}

// Fetch single latest reading
export async function fetchLatest(): Promise<SensorReading | null> {
  const url = `${TS_BASE}/channels/${TS_CHANNEL_ID}/feeds/last.json?api_key=${TS_READ_KEY}`
  const res = await fetch(url, { next: { revalidate: 15 } })
  if (!res.ok) return null
  const data: RawFeed = await res.json()
  return mapFeed(data)
}
