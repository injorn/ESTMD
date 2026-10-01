import Link from 'next/link'
import { requireUser } from '@/lib/dal'
import { db } from '@/lib/db'
import { listCases } from '@/lib/estimation-ai/case-store'
import { round2 } from '@/lib/estimate'
import { MatrixTabs } from '../matrix-tabs'
import { CaptureCasesForm, ReviewCaseForm } from './review-form'

export const metadata = { title: 'ตรวจชุดทดสอบ AI | Standard Matrix' }
const statuses = { pending: 'รอตรวจ', reviewed: 'ยืนยันแล้ว', excluded: 'แยกออก' }

export default async function EvaluationPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireUser()
  const params = await searchParams
  const rows = listCases(db)
  const filter = ['pending', 'reviewed', 'excluded'].includes(params.status ?? '') ? params.status : undefined
  const visible = filter ? rows.filter(row => row.status === filter) : rows
  const canWrite = user.role !== 'viewer'
  const reviewed = rows.filter(row => row.status === 'reviewed').length
  return <div className="space-y-4">
    <div><h1 className="text-xl font-semibold">ตรวจชุดทดสอบ AI</h1>
      <p className="mt-1 text-sm text-muted">ตรวจรายละเอียดงานเก่าและยืนยันระดับมาตรฐาน เพื่อใช้วัดผลคำแนะนำ AI</p></div>
    <MatrixTabs active="ai-evaluation" isAdmin={user.role === 'admin'} />
    <section className="card space-y-3 p-4">
      <p className="text-sm">ทั้งหมด <strong>{rows.length}</strong> รายการ · ยืนยันแล้ว <strong>{reviewed}</strong> · รอตรวจ <strong>{rows.filter(r => r.status === 'pending').length}</strong> · แยกออก <strong>{rows.filter(r => r.status === 'excluded').length}</strong></p>
      <p className="text-sm text-muted">รายละเอียดและค่า MD ถูกเก็บ ณ วันที่เตรียมรายการ การตรวจหน้านี้ไม่แก้ใบประเมินของโครงการ</p>
      <div className="flex flex-wrap items-start gap-3">
        {canWrite ? <CaptureCasesForm /> : <p className="text-sm text-muted">บัญชีนี้ดูผลตรวจได้อย่างเดียว</p>}
        {reviewed > 0 && <a className="btn-ghost" href="/api/evaluation/cases">ดาวน์โหลดคำตอบมาตรฐาน JSON ({reviewed})</a>}
      </div>
    </section>
    <nav aria-label="กรองสถานะการตรวจ" className="flex flex-wrap gap-2">
      {[{ key: '', label: 'ทั้งหมด' }, ...Object.entries(statuses).map(([key, label]) => ({ key, label }))].map(tab =>
        <Link key={tab.key} href={`/matrix/ai-evaluation${tab.key ? `?status=${tab.key}` : ''}`} aria-current={(filter ?? '') === tab.key ? 'page' : undefined}
          className={`btn-ghost ${(filter ?? '') === tab.key ? 'border-brand bg-brand-soft text-brand' : ''}`}>{tab.label}</Link>)}
    </nav>
    {!visible.length && <p className="card p-6 text-sm text-muted">{rows.length ? 'ไม่มีรายการในสถานะนี้' : 'ยังไม่มีชุดทดสอบ กด “เตรียมรายการจากโครงการ” เพื่อเริ่มตรวจ'}</p>}
    {visible.map(row => {
      const snapshot = row.snapshot
      const md = (level: 'L' | 'M' | 'H') => round2(snapshot.rates.reduce((s, r) => s + round2(r[level] * snapshot.qty * r.multiplier), 0))
      return <article key={row.id} className="card space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div><h2 className="text-sm font-semibold">#{row.id} · {snapshot.activityCode} {snapshot.activityName}</h2>
            <p className="mt-1 text-xs text-muted">{snapshot.projectName} · {snapshot.qty} {snapshot.countUnit.replace(/^ต่อ/, '')}</p></div>
          <span className={`chip ${row.status === 'reviewed' ? 'bg-brand-soft text-brand' : 'bg-background text-foreground'}`}>{statuses[row.status]}</span>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{snapshot.detail}</p>
        <p className="text-sm text-muted">ระดับเดิม: <strong className="text-foreground">{snapshot.expectedLevel}</strong> · MD มาตรฐานของรายการ: L {md('L')} / M {md('M')} / H {md('H')}</p>
        <details className="rounded-md border border-line p-3">
          <summary className="cursor-pointer text-sm font-medium">เกณฑ์และค่า MD ที่ใช้ตรวจ</summary>
          <p className="mt-2 text-xs text-muted">เวอร์ชัน: {String(snapshot.criteria.version)}</p>
          {snapshot.criteria.source ? <div className="mt-2 grid gap-2 md:grid-cols-3">
            {(['low', 'medium', 'high'] as const).map((key, index) => <p key={key} className="whitespace-pre-line text-sm"><strong>{['L', 'M', 'H'][index]}:</strong> {String((snapshot.criteria.source as Record<string, unknown>)[key] ?? '—')}</p>)}
          </div> : <p className="mt-2 text-sm text-muted">กิจกรรมนี้ยังไม่มีเกณฑ์เฉพาะ กรุณาอ้างอิงมาตรฐานของทีมและระบุเหตุผล</p>}
          <p className="mt-2 text-xs text-muted">เลือกระดับสูงสุดของปัจจัยในงาน ข้อมูลไม่พอให้แยกออกจากชุดทดสอบ</p>
          <div className="mt-3 overflow-x-auto"><table className="w-full text-sm">
            <caption className="mb-2 text-left text-xs text-muted">MD ต่อหน่วย ก่อนคูณจำนวนงานและตัวคูณ</caption>
            <thead><tr>{['บทบาท', 'L', 'M', 'H', 'ตัวคูณ'].map(label => <th key={label} scope="col" className="px-2 py-1 text-left">{label}</th>)}</tr></thead>
            <tbody>{snapshot.rates.map((rate, i) => <tr key={i} className="border-t border-line"><td className="px-2 py-1">{'roleCode' in rate ? String(rate.roleCode) : `บทบาท ${i + 1}`}</td>{[rate.L, rate.M, rate.H, rate.multiplier].map((value, j) => <td key={j} className="px-2 py-1 tabular-nums">{value}</td>)}</tr>)}</tbody>
          </table></div>
        </details>
        {row.reviewedAt && <p className="text-xs text-muted">ตรวจโดย {row.reviewer} · {new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(row.reviewedAt * 1000)} · {row.expectedLevel ? `ระดับ ${row.expectedLevel}` : 'แยกออก'}<br />{row.reviewNote}</p>}
        {canWrite && <ReviewCaseForm key={`${row.id}-${row.revision}`} id={row.id} revision={row.revision} status={row.status} level={row.expectedLevel} note={row.reviewNote} />}
      </article>
    })}
  </div>
}
