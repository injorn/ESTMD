import { requireUser } from '@/lib/dal'
import { getProjectDetail, listProjects } from '@/lib/queries'
import { buildCalibrationReport } from '@/lib/calibration'

export async function GET() {
  await requireUser()
  const rows = await Promise.all((await listProjects()).map(p => getProjectDetail(p.id)))
  const report = buildCalibrationReport(rows.filter(p => p != null))
  return Response.json(report, { headers: { 'Content-Disposition': 'attachment; filename="matrix-calibration.json"', 'Cache-Control': 'no-store' } })
}
