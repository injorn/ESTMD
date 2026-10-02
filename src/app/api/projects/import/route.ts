import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { authorizeImport, boundedBody, importErrorResponse } from '@/lib/excel-import/http'
import { ImportInputError } from '@/lib/excel-import/model'
import { createImportedProject } from '@/lib/excel-import/store'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const actor = await authorizeImport(request)
    const body = await boundedBody(request, 2 * 1024 * 1024)
    let input: unknown
    try { input = JSON.parse(body.toString('utf8')) }
    catch { throw new ImportInputError('ข้อมูลรายการไม่ถูกต้อง กรุณาตรวจแล้วนำเข้าอีกครั้ง') }
    const projectId = createImportedProject(db, actor, input)
    revalidatePath('/projects')
    return Response.json({ projectId, url: `/projects/${projectId}?step=3` }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return importErrorResponse(error) }
}
