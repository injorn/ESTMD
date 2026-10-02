import 'server-only'
import { readSession } from '../session'
import { ImportInputError } from './model'
import { z } from 'zod'

class ImportHttpError extends Error {
  constructor(message: string, public status: number) { super(message) }
}

export async function authorizeImport(request: Request) {
  const user = await readSession()
  if (!user) throw new ImportHttpError('กรุณาเข้าสู่ระบบอีกครั้ง', 401)
  if (user.role !== 'admin' && user.role !== 'estimator') throw new ImportHttpError('บัญชีนี้ไม่มีสิทธิ์นำเข้า', 403)
  const origin = request.headers.get('origin')
  if (!origin || new URL(origin).host !== request.headers.get('host')) throw new ImportHttpError('กรุณานำเข้าจากหน้าระบบโดยตรง', 403)
  return user
}

/** Checks actual bytes as well as Content-Length; also bounds chunked uploads. */
export async function boundedBody(request: Request, limit: number) {
  if (Number(request.headers.get('content-length')) > limit) throw new ImportHttpError('ข้อมูลที่ส่งมีขนาดใหญ่เกินไป', 413)
  if (!request.body) throw new ImportHttpError('ไม่พบข้อมูลที่ส่ง', 400)
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      length += chunk.value.byteLength
      if (length > limit) { await reader.cancel(); throw new ImportHttpError('ข้อมูลที่ส่งมีขนาดใหญ่เกินไป', 413) }
      chunks.push(chunk.value)
    }
  } finally { reader.releaseLock() }
  return Buffer.concat(chunks)
}

export function importErrorResponse(error: unknown) {
  if (error instanceof ImportHttpError) return Response.json({ error: error.message }, { status: error.status })
  if (error instanceof ImportInputError) return Response.json({ error: error.message }, { status: 400 })
  if (error instanceof z.ZodError) {
    const first = error.issues[0]
    const row = first.path[0] === 'rows' && typeof first.path[1] === 'number' ? `รายการที่ ${first.path[1] + 1}: ` : ''
    return Response.json({ error: row + first.message }, { status: 400 })
  }
  return Response.json({ error: 'นำเข้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }, { status: 500 })
}
