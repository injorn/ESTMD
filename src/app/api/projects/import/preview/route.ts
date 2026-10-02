import { authorizeImport, boundedBody, importErrorResponse } from '@/lib/excel-import/http'
import { ImportInputError, MAX_UPLOAD_BYTES } from '@/lib/excel-import/model'
import { readImportWorkbook } from '@/lib/excel-import/workbook'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    await authorizeImport(request)
    const contentType = request.headers.get('content-type') ?? ''
    if (!contentType.startsWith('multipart/form-data;')) throw new ImportInputError('กรุณาเลือกไฟล์ Excel')
    const body = await boundedBody(request, MAX_UPLOAD_BYTES + 64 * 1024)
    let data: FormData
    try { data = await new Response(body, { headers: { 'content-type': contentType } }).formData() }
    catch { throw new ImportInputError('อ่านไฟล์อัปโหลดไม่ได้ กรุณาเลือกไฟล์อีกครั้ง') }
    const file = data.get('file')
    if (!(file instanceof File)) throw new ImportInputError('กรุณาเลือกไฟล์ Excel')
    if (file.size > MAX_UPLOAD_BYTES) throw new ImportInputError('ไฟล์ต้องมีขนาดไม่เกิน 10 MiB')
    try {
      const workbook = await readImportWorkbook(Buffer.from(await file.arrayBuffer()), file.name)
      return Response.json(workbook, { headers: { 'Cache-Control': 'no-store' } })
    } catch (error) { throw new ImportInputError(error instanceof Error ? error.message : 'อ่านไฟล์ Excel ไม่ได้') }
  } catch (error) { return importErrorResponse(error) }
}
