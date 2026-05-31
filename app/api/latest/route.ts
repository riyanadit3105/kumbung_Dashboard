import { NextResponse } from 'next/server'
import { fetchLatest } from '@/lib/thingspeak'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await fetchLatest()
    return NextResponse.json({ data })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
