import { requireUser } from '@/lib/dal'
import { db } from '@/lib/db'
import { exportCases } from '@/lib/estimation-ai/case-store'

export async function GET() {
  await requireUser()
  return Response.json(exportCases(db), { headers: {
    'Content-Disposition': 'attachment; filename="estimation-ai-reviewed-cases.json"',
    'Cache-Control': 'private, no-store',
  } })
}
