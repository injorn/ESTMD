import { requireUser } from '@/lib/dal'
import { listActivities, listRoles } from '@/lib/queries'
import { db } from '@/lib/db'
import { matrixCells } from '@/lib/db/schema'
import { reviewedCriterion, criterionText } from '@/lib/estimation/catalog'
import { STANDARD } from '@/lib/standard'
import { criteriaSnapshot } from '@/lib/estimation-ai/policy'
import { MatrixTabs } from '../matrix-tabs'

export const metadata = { title: 'เกณฑ์ระดับงาน | Standard Matrix' }
const LEVELS = [
  { label: 'Low', key: 'low', color: 'text-emerald-700' },
  { label: 'Medium', key: 'medium', color: 'text-amber-700' },
  { label: 'High', key: 'high', color: 'text-rose-700' },
] as const

export default async function WorkLevelCriteriaPage() {
  const user = await requireUser()
  const [activities, roles, cells] = await Promise.all([listActivities(), listRoles(), db.select().from(matrixCells)])
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">เกณฑ์ระดับงาน</h1>
        <p className="mt-1 text-sm text-muted">เกณฑ์ตามกิจกรรมใน Matrix ปัจจุบัน ใช้ข้อมูลชุดเดียวกับการประเมิน AI</p>
      </div>
      <MatrixTabs active="criteria" isAdmin={user.role === 'admin'} />
      <section className="card space-y-3 p-4">
        <h2 className="text-sm font-semibold">หลักการเลือกระดับ</h2>
        <p className="text-sm">พิจารณาปัจจัยที่เกี่ยวข้องทั้งหมด แล้วเลือกระดับสูงสุด ไม่จำเป็นต้องครบทุกข้อในระดับนั้น ช่วงตัวเลขรวมค่าต้นและค่าสิ้นสุด หากข้อมูลไม่ครบหรืออยู่นอกช่วงเกณฑ์ ให้ตรวจทานก่อนยืนยันระดับ</p>
        <p className="text-sm text-muted">เลือก Low ได้เมื่อปัจจัยทั้งหมดอยู่ระดับ Low และไม่มีเงื่อนไขของ Medium หรือ High หน่วยนับเป็นจำนวนงานที่ใช้คำนวณ MD ส่วนจำนวน Chart, ฟิลด์ หรือรอบทดสอบใช้ตัดสินความซับซ้อนต่อหน่วยงาน</p>
        <div className="grid gap-3 md:grid-cols-3">
          {STANDARD.complexityLegend.map((level, index) => (
            <div key={level.label} className="rounded-md border border-line p-3">
              <h3 className={`text-sm font-semibold ${LEVELS[index].color}`}>{level.label}</h3>
              <p className="mt-1 text-sm text-muted">{level.description}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">เกณฑ์แยกตามกิจกรรมและหน่วยนับ</h2>
        {activities.map(activity => {
          const snapshot = criteriaSnapshot(activity.code)
          const source = snapshot.source
          const reviewed = reviewedCriterion(activity.code)
          return (
            <article key={activity.id} className="card space-y-3 p-4">
              <h3 className="text-sm font-semibold">{activity.code} {activity.name}</h3>
              <p className="text-xs text-muted">หน่วยนับ: {activity.countUnit}</p>
              {snapshot.integrationReady && source ? <>
                <div className="grid gap-3 md:grid-cols-3">
                  {LEVELS.map(level => (
                    <div key={level.key} className="rounded-md border border-line p-3">
                      <h4 className={`text-sm font-semibold ${level.color}`}>{level.label}</h4>
                      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted">{[...new Set([source[level.key], criterionText(activity.code, ({ low: 'L', medium: 'M', high: 'H' } as const)[level.key])].filter(Boolean))].join('\n\n')}</p>
                    </div>
                  ))}
                </div>
                {snapshot.sourceCode === 'matrix-v3-crud' && <p className="text-sm text-muted">พิจารณาทุก action รวม Import Excel แล้วเลือกระดับสูงสุดต่อรายการ Import ที่ใช้ pattern เดิมไม่เพิ่มระดับด้วยตัวมันเอง หากไม่ใช้ pattern เดิมและไม่มีหลักฐานระดับ Medium/High ให้ตรวจทานเพิ่ม</p>}
                {snapshot.newProject && <p className="text-sm text-muted">เกณฑ์ด้านบนใช้สำหรับการแก้ไขงานเดิม โครงการใหม่ใช้จำนวน Form: Medium 1–10 Form, High มากกว่า 10 Form ต้องระบุว่าเป็นโครงการใหม่หรือการแก้ไขก่อนประเมิน</p>}
                {['5.1', '5.3'].includes(activity.code) && <p className="text-sm text-muted">One-way มากกว่า 10 ฟิลด์ยังไม่ครอบคลุมในเกณฑ์ ต้องตรวจทานก่อนยืนยัน</p>}
                {activity.code === '4' && <p className="text-sm text-muted">งานภายในที่ซับซ้อนหรือมีข้อมูลมากกว่า 100,000 รายการยังไม่ครอบคลุมในเกณฑ์ ต้องตรวจทานก่อนยืนยัน</p>}
                {snapshot.factors.some(factor => factor.limits?.[2] !== undefined) && <p className="text-sm text-muted">จำนวนที่เกินขอบบนของ High ต้องตรวจทานเพิ่มเติม ไม่จัดเป็น High อัตโนมัติ</p>}
              </> : <p className="text-sm text-muted">ยังไม่มีเกณฑ์เฉพาะที่ตรงกับกิจกรรมนี้ ให้ผู้ประเมินอ้างอิงมาตรฐานของทีมและระบุเหตุผลประกอบระดับที่เลือก</p>}
              {reviewed ? <div className="space-y-2 text-sm"><p><strong>ข้อมูลที่ต้องเก็บ:</strong> {reviewed.ask}</p><p><strong>การนับจำนวน:</strong> {reviewed.rule}</p><p><strong>ตรวจงานซ้ำ:</strong> {reviewed.review}</p>{reviewed.assumptions ? <p><strong>MD เริ่มต้นที่เสนอ:</strong> {reviewed.assumptions}<br />{reviewed.basis}</p> : null}</div> : null}
              <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="mb-2 text-left text-xs text-muted">MD ต่อหน่วยจาก Matrix ปัจจุบัน ก่อนตัวคูณ Qty และ ratio ระดับ Phase</caption><thead><tr className="bg-brand-soft"><th className="p-2 text-left">บทบาท</th>{['L', 'M', 'H'].map(l => <th key={l} className="p-2 text-right">{l}</th>)}</tr></thead><tbody>{roles.filter(r => cells.some(c => c.activityId === activity.id && c.roleId === r.id && c.manday > 0)).map(role => <tr key={role.id} className="border-b border-line"><th className="p-2 text-left font-normal">{role.name}</th>{['L', 'M', 'H'].map(l => <td key={l} className="p-2 text-right tabular-nums">{cells.find(c => c.activityId === activity.id && c.roleId === role.id && c.complexity === l)?.manday ?? 0}</td>)}</tr>)}</tbody><tfoot><tr><th className="p-2 text-left">รวม MD ต่อหน่วย</th>{['L', 'M', 'H'].map(l => <td key={l} className="p-2 text-right font-semibold">{Math.round(cells.filter(c => c.activityId === activity.id && c.complexity === l).reduce((sum, c) => sum + c.manday, 0) * 100) / 100}</td>)}</tr></tfoot></table></div>
            </article>
          )
        })}
      </section>
    </div>
  )
}
