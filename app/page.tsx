import { fetchFeeds, fetchLatest } from '@/lib/thingspeak'
import DashboardClient from '@/components/DashboardClient'

export const dynamic = 'force-dynamic'
export const revalidate = 15

export default async function HomePage() {
  let feeds = []
  let latest = null
  let fetchError = null

  try {
    ;[feeds, latest] = await Promise.all([fetchFeeds(80), fetchLatest()])
  } catch (e: unknown) {
    fetchError = e instanceof Error ? e.message : 'Gagal mengambil data dari ThingSpeak'
  }

  return (
    <DashboardClient
      initialFeeds={feeds}
      initialLatest={latest}
      fetchError={fetchError}
    />
  )
}
