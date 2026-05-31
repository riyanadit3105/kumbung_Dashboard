import { NextResponse } from 'next/server'
import { fetchFeeds } from '@/lib/thingspeak'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const feeds = await fetchFeeds(80)
    return NextResponse.json({ feeds })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
