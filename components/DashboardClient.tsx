'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart, BarChart, Bar, Cell
} from 'recharts'
import {
  SensorReading, SystemState, STATE_META, TS_CHANNEL_ID
} from '@/lib/thingspeak'

interface Props {
  initialFeeds: SensorReading[]
  initialLatest: SensorReading | null
  fetchError: string | null
}

function fmt(n: number | null, dec = 1, unit = ''): string {
  if (n === null) return '—'
  return n.toFixed(dec) + unit
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}

// Gauge component
function Gauge({ value, min, max, unit, label, color, thresholdLow, thresholdHigh }: {
  value: number | null; min: number; max: number; unit: string; label: string
  color: string; thresholdLow?: number; thresholdHigh?: number
}) {
  const pct = value === null ? 0 : Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
  const angle = -135 + (pct / 100) * 270
  const r = 54
  const cx = 70; const cy = 70
  const arcStart = -135 * (Math.PI / 180)
  const arcEnd = 135 * (Math.PI / 180)
  const totalArc = 270 * (Math.PI / 180)

  const toXY = (a: number) => ({
    x: cx + r * Math.cos(a - Math.PI / 2),
    y: cy + r * Math.sin(a - Math.PI / 2),
  })

  const arcPath = (startA: number, endA: number, rc: number) => {
    const s = toXY(startA); const e = toXY(endA)
    const large = Math.abs(endA - startA) > Math.PI ? 1 : 0
    return `M ${s.x} ${s.y} A ${rc} ${rc} 0 ${large} 1 ${e.x} ${e.y}`
  }

  const needleAngle = (angle - 90) * (Math.PI / 180)
  const nx = cx + (r - 6) * Math.cos(needleAngle)
  const ny = cy + (r - 6) * Math.sin(needleAngle)

  const isWarn = (thresholdHigh && value !== null && value > thresholdHigh) ||
    (thresholdLow && value !== null && value < thresholdLow)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width="140" height="100" viewBox="0 0 140 100" style={{ overflow: 'visible' }}>
        {/* Track */}
        <path d={arcPath(arcStart, arcEnd, r)} fill="none" stroke="#21262d" strokeWidth="10" strokeLinecap="round" />
        {/* Fill */}
        {value !== null && (
          <path
            d={arcPath(arcStart, arcStart + (pct / 100) * totalArc, r)}
            fill="none"
            stroke={isWarn ? '#f85149' : color}
            strokeWidth="10"
            strokeLinecap="round"
            style={{ transition: 'all 0.6s ease' }}
          />
        )}
        {/* Needle */}
        {value !== null && (
          <>
            <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#e6edf3" strokeWidth="2.5" strokeLinecap="round"
              style={{ transformOrigin: `${cx}px ${cy}px`, transition: 'all 0.6s ease' }} />
            <circle cx={cx} cy={cy} r="5" fill="#e6edf3" />
          </>
        )}
        {/* Value */}
        <text x={cx} y={cy + 20} textAnchor="middle" fill={isWarn ? '#f85149' : color}
          style={{ fontFamily: 'IBM Plex Mono', fontSize: 18, fontWeight: 600 }}>
          {value === null ? '—' : value.toFixed(label === 'Kelembapan' ? 0 : 1)}
        </text>
        <text x={cx} y={cy + 32} textAnchor="middle" fill="#8b949e"
          style={{ fontFamily: 'IBM Plex Mono', fontSize: 10 }}>
          {unit}
        </text>
      </svg>
      <span style={{ fontSize: 11, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </span>
    </div>
  )
}

// Metric card
function MetricCard({ label, value, unit, color = '#e6edf3', sub }: {
  label: string; value: string; unit?: string; color?: string; sub?: string
}) {
  return (
    <div style={{
      background: '#161b22', border: '1px solid #30363d', borderRadius: 8,
      padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6
    }}>
      <span style={{ fontSize: 10, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 28, fontWeight: 600, color, lineHeight: 1 }}>{value}</span>
        {unit && <span style={{ fontSize: 13, color: '#8b949e' }}>{unit}</span>}
      </div>
      {sub && <span style={{ fontSize: 11, color: '#8b949e' }}>{sub}</span>}
    </div>
  )
}

// Status badge
function StateBadge({ state }: { state: SystemState | null }) {
  if (state === null) return (
    <span style={{ background: '#21262d', color: '#8b949e', padding: '4px 12px', borderRadius: 20, fontSize: 12 }}>
      N/A
    </span>
  )
  const m = STATE_META[state]
  return (
    <span style={{
      background: m.bg, color: m.color, padding: '4px 12px', borderRadius: 20,
      fontSize: 12, fontWeight: 500, border: `1px solid ${m.color}33`,
      display: 'inline-flex', alignItems: 'center', gap: 6
    }}>
      <span style={{ fontSize: 10 }}>{m.icon}</span>
      {m.label}
    </span>
  )
}

// Custom tooltip for charts
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { color: string; name: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#161b22', border: '1px solid #30363d', borderRadius: 6,
      padding: '10px 14px', fontFamily: 'IBM Plex Mono', fontSize: 12, color: '#e6edf3'
    }}>
      <p style={{ margin: '0 0 6px', color: '#8b949e', fontSize: 11 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ margin: '2px 0', color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </p>
      ))}
    </div>
  )
}

// State distribution bar
function StateDistribution({ feeds }: { feeds: SensorReading[] }) {
  const counts = [0, 1, 2, 3, 4].map(s => ({
    state: s as SystemState,
    count: feeds.filter(f => f.state === s).length,
    pct: feeds.length ? Math.round((feeds.filter(f => f.state === s).length / feeds.length) * 100) : 0,
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {counts.map(({ state, count, pct }) => {
        const m = STATE_META[state]
        return (
          <div key={state} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 72, fontSize: 11, color: m.color, fontWeight: 500 }}>{m.label}</span>
            <div style={{ flex: 1, height: 6, background: '#21262d', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${pct}%`, background: m.color,
                borderRadius: 3, transition: 'width 0.6s ease'
              }} />
            </div>
            <span style={{ width: 36, fontSize: 11, color: '#8b949e', textAlign: 'right' }}>{pct}%</span>
            <span style={{ width: 24, fontSize: 11, color: '#636e7b', textAlign: 'right' }}>({count})</span>
          </div>
        )
      })}
    </div>
  )
}

export default function DashboardClient({ initialFeeds, initialLatest, fetchError }: Props) {
  const [feeds, setFeeds] = useState<SensorReading[]>(initialFeeds)
  const [latest, setLatest] = useState<SensorReading | null>(initialLatest)
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [activeChart, setActiveChart] = useState<'climate' | 'sensors'>('climate')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [error, setError] = useState<string | null>(fetchError)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [newFeeds, newLatest] = await Promise.all([
        fetch(`/api/feeds`).then(r => r.json()),
        fetch(`/api/latest`).then(r => r.json()),
      ])
      if (newFeeds.feeds) setFeeds(newFeeds.feeds)
      if (newLatest.data) setLatest(newLatest.data)
      setLastUpdate(new Date())
    } catch {
      setError('Gagal memperbarui data. Periksa koneksi internet.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-refresh every 15 seconds
  useEffect(() => {
    if (!autoRefresh) return
    const iv = setInterval(refresh, 15000)
    return () => clearInterval(iv)
  }, [autoRefresh, refresh])

  // Chart data
  const chartData = feeds.slice(-40).map(f => ({
    time: fmtTime(f.created_at),
    suhu: f.suhu,
    kelembapan: f.kelembapan,
    ldr: f.ldr,
    water: f.waterLevel,
    state: f.state,
  }))

  // Stats
  const validSuhu = feeds.map(f => f.suhu).filter((v): v is number => v !== null)
  const validHum = feeds.map(f => f.kelembapan).filter((v): v is number => v !== null)
  const avgSuhu = validSuhu.length ? validSuhu.reduce((a, b) => a + b, 0) / validSuhu.length : null
  const avgHum = validHum.length ? validHum.reduce((a, b) => a + b, 0) / validHum.length : null
  const minSuhu = validSuhu.length ? Math.min(...validSuhu) : null
  const maxSuhu = validSuhu.length ? Math.max(...validSuhu) : null

  const currentState = latest?.state ?? null
  const stateMeta = currentState !== null ? STATE_META[currentState] : null

  const isAlarm = currentState === 3 || currentState === 4
  const isCritical = currentState === 4

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: 'IBM Plex Mono, monospace' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid #30363d', padding: '12px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, background: '#0d1117', zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>🍄</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3', lineHeight: 1.2 }}>
                KUMBUNG JAMUR TIRAM
              </div>
              <div style={{ fontSize: 10, color: '#8b949e', letterSpacing: '0.08em' }}>
                IoT CLIMATE CONTROL SYSTEM · ESP32 + THINGSPEAK
              </div>
            </div>
          </div>

          {/* System state pill */}
          {stateMeta && (
            <div style={{
              background: isCritical ? '#2b0d0d' : stateMeta.bg,
              border: `1px solid ${stateMeta.color}55`,
              borderRadius: 20, padding: '4px 14px',
              display: 'flex', alignItems: 'center', gap: 8,
              animation: isAlarm ? 'pulse 2s ease infinite' : undefined
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: stateMeta.color, position: 'relative',
                boxShadow: `0 0 0 3px ${stateMeta.color}30`
              }} />
              <span style={{ fontSize: 12, color: stateMeta.color, fontWeight: 500 }}>
                {stateMeta.label}
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: '#636e7b' }}>
            Update: {lastUpdate.toLocaleTimeString('id-ID')}
          </span>

          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(v => !v)}
            style={{
              background: autoRefresh ? '#0d2818' : '#21262d',
              border: `1px solid ${autoRefresh ? '#3fb95055' : '#30363d'}`,
              color: autoRefresh ? '#3fb950' : '#8b949e',
              padding: '5px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
              fontFamily: 'IBM Plex Mono', display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <span style={{ fontSize: 9 }}>●</span> AUTO {autoRefresh ? 'ON' : 'OFF'}
          </button>

          {/* Manual refresh */}
          <button
            onClick={refresh}
            disabled={loading}
            style={{
              background: '#161b22', border: '1px solid #30363d', color: '#e6edf3',
              padding: '5px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
              fontFamily: 'IBM Plex Mono', opacity: loading ? 0.6 : 1,
              display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            {loading ? '⟳' : '↺'} REFRESH
          </button>

          {/* ThingSpeak link */}
          <a
            href={`https://thingspeak.com/channels/${TS_CHANNEL_ID}`}
            target="_blank" rel="noopener noreferrer"
            style={{
              background: '#161b22', border: '1px solid #30363d', color: '#58a6ff',
              padding: '5px 12px', borderRadius: 6, fontSize: 11,
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            ↗ THINGSPEAK
          </a>
        </div>
      </header>

      <main style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>

        {/* Error banner */}
        {error && (
          <div style={{
            background: '#2b0d0d', border: '1px solid #f8514955', borderRadius: 8,
            padding: '12px 16px', marginBottom: 20, fontSize: 12, color: '#f85149',
            display: 'flex', alignItems: 'center', gap: 10
          }}>
            <span>⚠</span>
            <span>{error}</span>
            <span style={{ marginLeft: 'auto', color: '#8b949e' }}>
              Channel ID: {TS_CHANNEL_ID} · Pastikan channel bersifat publik atau API key benar
            </span>
          </div>
        )}

        {/* FAULT ALERT BANNER */}
        {isCritical && (
          <div style={{
            background: '#2b0d0d', border: '1px solid #f85149',
            borderRadius: 8, padding: '14px 20px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 12,
            animation: 'pulse 2s ease infinite'
          }}>
            <span style={{ fontSize: 20 }}>🚨</span>
            <div>
              <div style={{ fontSize: 14, color: '#f85149', fontWeight: 600 }}>FAULT — AIR HABIS</div>
              <div style={{ fontSize: 11, color: '#8b949e', marginTop: 2 }}>
                Tangki air kosong. Humidifier dikunci mati. Segera isi ulang tangki air!
              </div>
            </div>
          </div>
        )}

        {currentState === 3 && (
          <div style={{
            background: '#2b1e00', border: '1px solid #d29922',
            borderRadius: 8, padding: '14px 20px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 12
          }}>
            <span style={{ fontSize: 20 }}>🚪</span>
            <div>
              <div style={{ fontSize: 14, color: '#d29922', fontWeight: 600 }}>INTRUSION — PINTU TERBUKA</div>
              <div style={{ fontSize: 11, color: '#8b949e', marginTop: 2 }}>
                Cahaya terdeteksi masuk kumbung. Humidifier dimatikan untuk keselamatan operator.
              </div>
            </div>
          </div>
        )}

        {/* GAUGES + METRICS ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

          {/* Gauges card */}
          <div style={{
            background: '#161b22', border: '1px solid #30363d', borderRadius: 10,
            padding: '20px 24px'
          }}>
            <div style={{ fontSize: 10, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
              Sensor Utama — Pembacaan Terakhir
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
              <Gauge
                value={latest?.suhu ?? null}
                min={15} max={40} unit="°C" label="Suhu"
                color="#58a6ff" thresholdLow={22} thresholdHigh={28}
              />
              <div style={{ width: 1, height: 80, background: '#30363d' }} />
              <Gauge
                value={latest?.kelembapan ?? null}
                min={40} max={100} unit="% RH" label="Kelembapan"
                color="#d2a8ff" thresholdLow={80}
              />
              <div style={{ width: 1, height: 80, background: '#30363d' }} />
              <Gauge
                value={latest?.waterLevel ?? null}
                min={0} max={100} unit="%" label="Tangki Air"
                color="#3fb950" thresholdLow={20}
              />
            </div>

            <div style={{
              marginTop: 16, padding: '10px 14px',
              background: '#0d1117', borderRadius: 6, fontSize: 11, color: '#636e7b'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Entry #{latest?.entry_id ?? '—'}</span>
                <span>{latest ? fmtDateTime(latest.created_at) : '—'}</span>
                <span style={{ color: stateMeta?.color }}>
                  {stateMeta ? `${stateMeta.icon} ${stateMeta.label}` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Metric grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <MetricCard
              label="Suhu Rata-rata"
              value={avgSuhu !== null ? avgSuhu.toFixed(1) : '—'}
              unit="°C"
              color="#58a6ff"
              sub={`Min ${fmt(minSuhu)}°C / Max ${fmt(maxSuhu)}°C`}
            />
            <MetricCard
              label="Kelembapan Rata-rata"
              value={avgHum !== null ? avgHum.toFixed(0) : '—'}
              unit="% RH"
              color="#d2a8ff"
              sub={latest?.kelembapan !== null ? (latest!.kelembapan! >= 80 ? '✓ Target ≥80% tercapai' : '⚠ Di bawah target 80%') : undefined}
            />
            <MetricCard
              label="Level Cahaya (LDR)"
              value={fmt(latest?.ldr ?? null, 0)}
              unit="%"
              color={latest?.ldr !== null && latest!.ldr! > 75 ? '#d29922' : '#3fb950'}
              sub={latest?.ldr !== null ? (latest!.ldr! > 75 ? '⚠ Pintu terbuka' : '✓ Kumbung gelap') : undefined}
            />
            <MetricCard
              label="Total Pembacaan"
              value={feeds.length.toString()}
              sub={`~${Math.round(feeds.length * 15 / 60)} menit data`}
              color="#e6edf3"
            />
          </div>
        </div>

        {/* CHARTS */}
        <div style={{
          background: '#161b22', border: '1px solid #30363d', borderRadius: 10,
          padding: '20px 24px', marginBottom: 20
        }}>
          {/* Chart tabs */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 4, background: '#0d1117', borderRadius: 6, padding: 3 }}>
              {[
                { key: 'climate', label: '🌡 Suhu & RH' },
                { key: 'sensors', label: '📡 LDR & Tangki' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveChart(tab.key as 'climate' | 'sensors')}
                  style={{
                    padding: '5px 14px', borderRadius: 5, cursor: 'pointer',
                    fontSize: 11, fontFamily: 'IBM Plex Mono',
                    background: activeChart === tab.key ? '#161b22' : 'transparent',
                    color: activeChart === tab.key ? '#e6edf3' : '#8b949e',
                    fontWeight: activeChart === tab.key ? 500 : 400,
                    border: activeChart === tab.key ? '1px solid #30363d' : '1px solid transparent'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <span style={{ fontSize: 10, color: '#636e7b' }}>
              Menampilkan {Math.min(40, feeds.length)} pembacaan terakhir
            </span>
          </div>

          {activeChart === 'climate' && (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradSuhu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#58a6ff" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#58a6ff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradHum" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d2a8ff" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#d2a8ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#8b949e', fontFamily: 'IBM Plex Mono' }}
                  tickLine={false} axisLine={{ stroke: '#30363d' }} interval={Math.floor(chartData.length / 6)} />
                <YAxis yAxisId="suhu" domain={[15, 40]} tick={{ fontSize: 10, fill: '#8b949e', fontFamily: 'IBM Plex Mono' }}
                  tickLine={false} axisLine={false} width={30} />
                <YAxis yAxisId="hum" orientation="right" domain={[40, 100]}
                  tick={{ fontSize: 10, fill: '#8b949e', fontFamily: 'IBM Plex Mono' }}
                  tickLine={false} axisLine={false} width={30} />
                <Tooltip content={<CustomTooltip />} />
                {/* Threshold lines */}
                <ReferenceLine yAxisId="suhu" y={28} stroke="#f8514944" strokeDasharray="4 4"
                  label={{ value: '28°C max', position: 'right', fill: '#f85149', fontSize: 9, fontFamily: 'IBM Plex Mono' }} />
                <ReferenceLine yAxisId="suhu" y={22} stroke="#58a6ff44" strokeDasharray="4 4"
                  label={{ value: '22°C min', position: 'right', fill: '#58a6ff', fontSize: 9, fontFamily: 'IBM Plex Mono' }} />
                <ReferenceLine yAxisId="hum" y={80} stroke="#d2a8ff44" strokeDasharray="4 4"
                  label={{ value: '80% RH', position: 'left', fill: '#d2a8ff', fontSize: 9, fontFamily: 'IBM Plex Mono' }} />
                <Area yAxisId="suhu" type="monotone" dataKey="suhu" stroke="#58a6ff" strokeWidth={2}
                  fill="url(#gradSuhu)" name="Suhu (°C)" dot={false} activeDot={{ r: 4, fill: '#58a6ff' }} />
                <Area yAxisId="hum" type="monotone" dataKey="kelembapan" stroke="#d2a8ff" strokeWidth={2}
                  fill="url(#gradHum)" name="Kelembapan (%)" dot={false} activeDot={{ r: 4, fill: '#d2a8ff' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {activeChart === 'sensors' && (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#8b949e', fontFamily: 'IBM Plex Mono' }}
                  tickLine={false} axisLine={{ stroke: '#30363d' }} interval={Math.floor(chartData.length / 6)} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#8b949e', fontFamily: 'IBM Plex Mono' }}
                  tickLine={false} axisLine={false} width={30} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={75} stroke="#d2992244" strokeDasharray="4 4"
                  label={{ value: 'intrusion thr', position: 'right', fill: '#d29922', fontSize: 9, fontFamily: 'IBM Plex Mono' }} />
                <ReferenceLine y={10} stroke="#f8514944" strokeDasharray="4 4"
                  label={{ value: 'fault thr', position: 'right', fill: '#f85149', fontSize: 9, fontFamily: 'IBM Plex Mono' }} />
                <Line type="monotone" dataKey="ldr" stroke="#d29922" strokeWidth={2}
                  name="LDR (%)" dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="water" stroke="#3fb950" strokeWidth={2}
                  name="Tangki Air (%)" dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}

          {/* Legend */}
          <div style={{ display: 'flex', gap: 20, marginTop: 12, flexWrap: 'wrap' }}>
            {activeChart === 'climate' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#8b949e' }}>
                  <div style={{ width: 20, height: 2, background: '#58a6ff', borderRadius: 1 }} />
                  Suhu (°C) · optimal 22–28°C
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#8b949e' }}>
                  <div style={{ width: 20, height: 2, background: '#d2a8ff', borderRadius: 1 }} />
                  Kelembapan (% RH) · target ≥80%
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#8b949e' }}>
                  <div style={{ width: 20, height: 2, background: '#d29922', borderRadius: 1 }} />
                  LDR (%) · &gt;75% = pintu terbuka
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#8b949e' }}>
                  <div style={{ width: 20, height: 2, background: '#3fb950', borderRadius: 1 }} />
                  Tangki Air (%) · &lt;10% = FAULT
                </div>
              </>
            )}
          </div>
        </div>

        {/* BOTTOM ROW: State distribution + FSM info + recent log */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>

          {/* State Distribution */}
          <div style={{
            background: '#161b22', border: '1px solid #30363d', borderRadius: 10,
            padding: '20px 24px'
          }}>
            <div style={{ fontSize: 10, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
              Distribusi State FSM
            </div>
            <StateDistribution feeds={feeds} />
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #21262d', fontSize: 11, color: '#636e7b' }}>
              Berdasarkan {feeds.length} pembacaan terakhir
            </div>
          </div>

          {/* FSM State Reference */}
          <div style={{
            background: '#161b22', border: '1px solid #30363d', borderRadius: 10,
            padding: '20px 24px'
          }}>
            <div style={{ fontSize: 10, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
              Referensi FSM & Threshold
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {([0, 1, 2, 3, 4] as SystemState[]).map(s => {
                const m = STATE_META[s]
                const isActive = currentState === s
                return (
                  <div key={s} style={{
                    background: isActive ? m.bg : '#0d1117',
                    border: `1px solid ${isActive ? m.color + '55' : '#21262d'}`,
                    borderRadius: 6, padding: '8px 12px',
                    transition: 'all 0.3s ease'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 10, color: m.color, fontWeight: 600 }}>
                        P{s === 0 ? '—' : s} {m.label}
                      </span>
                      {isActive && <StateBadge state={s} />}
                    </div>
                    <div style={{ fontSize: 10, color: '#636e7b' }}>{m.desc}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recent readings log */}
          <div style={{
            background: '#161b22', border: '1px solid #30363d', borderRadius: 10,
            padding: '20px 24px', overflow: 'hidden'
          }}>
            <div style={{ fontSize: 10, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
              Log Pembacaan Terbaru
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 280, overflowY: 'auto' }}>
              {feeds.slice(-15).reverse().map((f, i) => {
                const m = f.state !== null ? STATE_META[f.state] : null
                return (
                  <div key={f.entry_id} style={{
                    display: 'grid', gridTemplateColumns: '80px 1fr 1fr 60px',
                    gap: 6, fontSize: 10, padding: '5px 8px',
                    background: i === 0 ? '#0d2818' : 'transparent',
                    borderRadius: 4, alignItems: 'center',
                    borderBottom: '1px solid #21262d'
                  }}>
                    <span style={{ color: '#636e7b' }}>{fmtTime(f.created_at)}</span>
                    <span style={{ color: '#58a6ff' }}>
                      {fmt(f.suhu)}°C / {fmt(f.kelembapan, 0)}%
                    </span>
                    <span style={{ color: '#8b949e' }}>
                      W:{fmt(f.waterLevel, 0)}% L:{fmt(f.ldr, 0)}%
                    </span>
                    <span style={{ color: m?.color ?? '#636e7b', fontSize: 9, fontWeight: 500 }}>
                      {m?.label ?? '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer style={{
          marginTop: 32, paddingTop: 16, borderTop: '1px solid #21262d',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 10, color: '#636e7b'
        }}>
          <span>
            Kumbung Jamur Tiram IoT — Sistem Kendali Iklim Mikro Adaptif
          </span>
          <span style={{ display: 'flex', gap: 16 }}>
            <span>ESP32 NodeMCU · DHT11/22 · DS3231 · Relay 2-CH</span>
            <span>ThingSpeak Ch: {TS_CHANNEL_ID}</span>
            <span>Refresh: 15s</span>
          </span>
        </footer>
      </main>
    </div>
  )
}
