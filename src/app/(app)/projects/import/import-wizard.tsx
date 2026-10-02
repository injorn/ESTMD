'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { Activity, TechStack } from '@/lib/db/schema'
import { ONCE_PER_PROJECT_UNIT } from '@/lib/db/schema'
import { isMatrixProfile, PROFILE_OPTIONS, type DeliveryProfile } from '@/lib/delivery-profiles'
import { importProjectSchema, initialSheetIndex, mapSheetRows, MAX_IMPORT_ROWS, MAX_UPLOAD_BYTES, suggestMapping, type ColumnMapping, type ImportWorkbook, type ReviewRow } from '@/lib/excel-import/model'
import { MappingForm } from './mapping-form'
import { ReviewTable } from './review-table'

export function ImportWizard({ activities, stacks }: { activities: Activity[]; stacks: TechStack[] }) {
  const router = useRouter()
  const [stage, setStage] = useState<'upload' | 'map' | 'review'>('upload')
  const [workbook, setWorkbook] = useState<ImportWorkbook | null>(null)
  const [sheetIndex, setSheetIndex] = useState(0)
  const [mapping, setMapping] = useState<ColumnMapping | null>(null)
  const [rows, setRows] = useState<ReviewRow[]>([])
  const [profiles, setProfiles] = useState<Record<string, DeliveryProfile>>({})
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [stackId, setStackId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const sheet = workbook?.sheets[sheetIndex]
  const activeActivities = activities.filter(a => a.active)
  const profileOf = (phase: string) => Object.hasOwn(profiles, phase.trim()) ? profiles[phase.trim()] : 'self_dev' as const

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const file = data.get('file')
    if (!(file instanceof File) || !file.size) { setError('กรุณาเลือกไฟล์ Excel'); return }
    if (!/\.xlsx$/i.test(file.name)) { setError('รองรับไฟล์ .xlsx เท่านั้น'); return }
    if (file.size > MAX_UPLOAD_BYTES) { setError('ไฟล์ต้องมีขนาดไม่เกิน 10 MiB'); return }
    setError(''); setBusy(true)
    try {
      const response = await fetch('/api/projects/import/preview', { method: 'POST', body: data })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'อ่านไฟล์ไม่ได้')
      const book = result as ImportWorkbook
      const index = initialSheetIndex(book)
      setWorkbook(book); setSheetIndex(index); setMapping(index < 0 ? null : suggestMapping(book.sheets[index]))
      setName(file.name.replace(/\.xlsx$/i, '')); setCode(file.name.match(/POT\d+/i)?.[0] ?? '')
      setRows([]); setProfiles({}); setStage('map')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'อัปโหลดไม่สำเร็จ กรุณาลองใหม่') }
    finally { setBusy(false) }
  }

  function review(nextMapping: ColumnMapping) {
    if (!sheet) return
    setError('')
    try {
      const next = mapSheetRows(sheet, nextMapping)
      if (!next.length) throw new Error('ไม่พบรายการในช่วงแถวและคอลัมน์ที่เลือก กรุณาตรวจตารางต้นทาง')
      setMapping(nextMapping); setRows(next); setProfiles({}); setStage('review')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'อ่านรายการไม่ได้') }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!workbook || !sheet) return
    setError('')
    const selectedRows = rows.filter(row => row.selected).map(row => {
      const activity = activeActivities.find(a => a.id === row.activityId)
      const once = isMatrixProfile(profileOf(row.phase)) && activity?.countUnit === ONCE_PER_PROJECT_UNIT
      return { ...row, phase: row.phase.trim(), qty: once ? 1 : row.qty }
    })
    const result = importProjectSchema.safeParse({ name, code, techStackId: stackId ? Number(stackId) : null,
      fileName: workbook.fileName, sha256: workbook.sha256, sheetName: sheet.name,
      profiles: Object.fromEntries(selectedRows.map(row => [row.phase, profileOf(row.phase)])), rows: selectedRows,
    })
    if (!result.success) {
      const issue = result.error.issues[0]
      const row = issue.path[0] === 'rows' && typeof issue.path[1] === 'number' ? `แถว ${selectedRows[issue.path[1]].sourceRow}: ` : ''
      setError(row + issue.message); return
    }
    setBusy(true)
    try {
      const response = await fetch('/api/projects/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(result.data) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'สร้างโครงการไม่ได้')
      router.push(data.url)
      router.refresh()
      // Keep create disabled until navigation completes, preventing repeated submission.
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'สร้างโครงการไม่สำเร็จ กรุณาลองใหม่'); setBusy(false) }
  }

  const phases = [...new Set(rows.filter(row => row.selected).map(row => row.phase.trim()).filter(Boolean))]
  const selectedCount = rows.filter(row => row.selected).length
  return <div className="space-y-4" aria-busy={busy}>
    <div className="card flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="text-sm font-medium">ยังไม่มีไฟล์รายการงาน?</p><p className="mt-1 text-xs text-muted">ดาวน์โหลด Template มีชีตกรอกงาน ตัวอย่าง และวิธีใช้ พร้อมหัวคอลัมน์ที่ระบบอ่านได้</p></div><a href="/api/projects/import/template" className="btn-ghost">ดาวน์โหลด Template พร้อมตัวอย่าง</a></div>
    <ol aria-label="ขั้นตอนนำเข้า" className="flex flex-wrap gap-3 text-sm">{[['upload', '1. อัปโหลด'], ['map', '2. เลือกตาราง'], ['review', '3. ตรวจและนำเข้า']].map(([key, label]) => <li key={key} aria-current={stage === key ? 'step' : undefined} className={`rounded-md border px-3 py-2 ${stage === key ? 'border-brand bg-brand-soft font-medium text-brand' : 'border-line text-muted'}`}>{label}</li>)}</ol>
    {error ? <p id="import-error" role="alert" className="card border-danger/40 p-4 text-sm text-danger">{error}</p> : null}
    {busy ? <p role="status" className="text-sm text-brand">{stage === 'upload' ? 'กำลังอ่านไฟล์ Excel…' : 'กำลังสร้างโครงการ…'}</p> : null}
    {stage === 'upload' ? <form onSubmit={upload} className="card p-5"><fieldset disabled={busy} aria-describedby={error ? 'import-error' : 'upload-help'} className="space-y-4">
      <legend className="font-semibold">1. อัปโหลดรายการงาน</legend>
      <p id="upload-help" className="text-sm text-muted">เลือกไฟล์ .xlsx เช่นไฟล์ใน pttdigitalMD ขนาดไม่เกิน 10 MiB ใช้รายการงานจากไฟล์แล้วประเมิน MD ใหม่ในระบบ</p>
      <label className="block text-sm">ไฟล์ Excel *<input type="file" name="file" required accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" aria-describedby="upload-help" className="field mt-2 file:mr-3 file:rounded file:border-0 file:bg-brand-soft file:px-3 file:py-1 file:text-brand" /></label>
      <button type="submit" className="btn-primary">{busy ? 'กำลังอ่าน…' : 'อัปโหลดและเลือกตาราง'}</button>
    </fieldset></form> : null}
    {workbook && stage !== 'upload' ? <div className="card flex flex-wrap items-center justify-between gap-3 p-4 text-sm"><div className="min-w-0"><p className="break-words font-medium">{workbook.fileName}</p><p className="mt-1 text-xs text-muted">นำเข้าเฉพาะชีตที่เลือก · ไม่ดึง MD เดิมและราคาในไฟล์</p></div><button type="button" disabled={busy} className="btn-ghost" onClick={() => { setStage('upload'); setError('') }}>เลือกไฟล์ใหม่</button></div> : null}
    {stage === 'map' && workbook ? <>
      <label className="card block p-4 text-sm">ชีตรายการงาน<select className="field mt-1" value={sheetIndex} onChange={e => { const index = Number(e.target.value); setSheetIndex(index); setMapping(index < 0 ? null : suggestMapping(workbook.sheets[index])); setError('') }}><option value={-1}>กรุณาเลือกชีตรายการงาน</option>{workbook.sheets.map((s, index) => <option key={s.name} value={index} disabled={!!s.error || !s.rows.length}>{s.name} · {s.rowCount} แถว{s.hidden ? ' · ชีตซ่อน' : ''}{s.error ? ' · เกินขนาดที่รองรับ' : !s.rows.length ? ' · ไม่มีข้อมูล' : ''}</option>)}</select>{sheet?.hidden ? <span className="mt-2 block text-accent">ชีตนี้ถูกซ่อนในต้นฉบับ กรุณาตรวจว่าเป็นข้อมูลที่ต้องการใช้</span> : null}</label>
      {workbook.sheets.some(s => s.error) ? <details className="text-sm text-muted"><summary className="cursor-pointer">ชีตที่ยังอ่านไม่ได้</summary><ul className="mt-2 space-y-1">{workbook.sheets.filter(s => s.error).map(s => <li key={s.name}>{s.name}: {s.error}</li>)}</ul></details> : null}
      {sheet ? <MappingForm key={`${sheetIndex}-${workbook.sha256}`} sheet={sheet} initial={mapping ?? suggestMapping(sheet)} onReview={review} /> : <p className="text-sm text-muted">ไม่มีชีตที่แสดงอยู่และอ่านได้ กรุณาเลือกชีตที่ต้องการเองจากรายการด้านบน</p>}
    </> : null}
    {stage === 'review' && workbook && sheet ? <form onSubmit={create} noValidate><fieldset disabled={busy} aria-describedby={error ? 'import-error' : undefined} className="card min-w-0 space-y-5 p-4">
      <legend className="font-semibold">3. ตรวจรายการและสร้างโครงการ</legend>
      <p className="text-sm text-muted">แก้รายการ เลือกกิจกรรมและระดับเพื่อใช้ Matrix หรือเว้นไว้ประเมินต่อหลังนำเข้าได้ สร้างได้ไม่เกิน {MAX_IMPORT_ROWS.toLocaleString()} รายการต่อครั้ง</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><label className="text-sm">ชื่อโครงการ *<input className="field mt-1" required maxLength={500} value={name} onChange={e => setName(e.target.value)} /></label><label className="text-sm">รหัสโครงการ<input className="field mt-1" maxLength={100} value={code} onChange={e => setCode(e.target.value)} /></label><label className="text-sm">Technology Stack<select className="field mt-1" value={stackId} onChange={e => setStackId(e.target.value)}><option value="">ไม่ระบุ — ตัวคูณ 1</option>{stacks.map(stack => <option key={stack.id} value={stack.id}>{stack.name} · ×{stack.multiplier}</option>)}</select></label></div>
      <ReviewTable rows={rows} onChange={setRows} activities={activeActivities} profileOf={profileOf} />
      {phases.length ? <div className="space-y-2"><h3 className="text-sm font-semibold">รูปแบบงานต่อ Phase</h3><div className="grid gap-3 sm:grid-cols-2">{phases.map(phase => <label key={phase} className="min-w-0 text-sm"><span className="break-words">{phase}</span><select className="field mt-1" value={profileOf(phase)} onChange={e => setProfiles({ ...profiles, [phase]: e.target.value as DeliveryProfile })}>{PROFILE_OPTIONS.filter(option => option.value !== 'legacy').map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>)}</div><p className="text-xs text-muted">พัฒนาเองใช้ Matrix; SAP / Vendor / Migration ลง MD รวมตามบทบาทในขั้นถัดไป</p></div> : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4"><button type="button" className="btn-ghost" onClick={() => { setStage('map'); setError('') }}>กลับไปแก้ช่วงแถว / คอลัมน์</button><div className="space-y-1 text-right"><button type="submit" className="btn-primary" disabled={!selectedCount || selectedCount > MAX_IMPORT_ROWS}>{busy ? 'กำลังสร้าง…' : `สร้างโครงการจาก ${selectedCount} รายการ`}</button>{!selectedCount ? <p className="text-xs text-muted">เลือกอย่างน้อยหนึ่งรายการ</p> : selectedCount > MAX_IMPORT_ROWS ? <p className="text-xs text-danger">ลดจำนวนรายการให้ไม่เกิน {MAX_IMPORT_ROWS.toLocaleString()}</p> : null}</div></div>
    </fieldset></form> : null}
  </div>
}
