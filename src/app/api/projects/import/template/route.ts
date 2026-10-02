import { requireUser } from '@/lib/dal'
import { buildImportTemplate } from '@/lib/excel-import/template'

export const runtime = 'nodejs'

export async function GET() {
  const user = await requireUser()
  if (user.role === 'viewer') return Response.json({ error: 'บัญชีนี้ไม่มีสิทธิ์นำเข้า' }, { status: 403 })
  const buffer = await buildImportTemplate().xlsx.writeBuffer()
  return new Response(new Uint8Array(buffer), { headers: {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': 'attachment; filename="Manday_Import_Template.xlsx"',
    'Cache-Control': 'private, no-store',
  } })
}
