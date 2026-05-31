import { fetchFeeds, fetchLatest, SensorReading } from '@/lib/thingspeak'
import DashboardClient from '@/components/DashboardClient'

export const dynamic = 'force-dynamic'
export const revalidate = 15

export default async function HomePage() {
  let feeds: SensorReading[] = []
  let latest: SensorReading | null = null
  let fetchError: string | null = null

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
