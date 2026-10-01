import Link from 'next/link'

import { saveProjectRoles } from '@/lib/actions/project'
import { round2 } from '@/lib/estimate'
import type { ProjectDetail } from '@/lib/queries'
import { buildSummary } from '@/lib/summary'

export function StepTeam({
  detail,
  readOnly,
}: {
  detail: ProjectDetail
  readOnly: boolean
}) {
  const { project, roles } = detail
  const byRole = new Map(detail.projectRoles.map((pr) => [pr.roleId, pr]))

  // Preview every role, including roles not yet selected for export.
  const preview = buildSummary({ ...detail, projectRoles: roles.map(r => ({ projectId: project.id, roleId: r.id, id: byRole.get(r.id)?.id ?? -r.id, resourceLabel: null, personName: null, ratePerMd: byRole.get(r.id)?.ratePerMd ?? r.ratePerMd, included: true, sortOrder: r.sortOrder })) })
  const mandayByRole = new Map(preview.roles.map(r => [r.id, r.manday]))
  const costByRole = new Map(preview.roles.map(r => [r.id, r.cost]))

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h2 className="text-sm font-semibold">ทีมและอัตราต่อ Man-day</h2>
        <p className="mt-1 text-sm text-muted">
          เลือกบทบาทที่จะคิดค่าใช้จ่าย และปรับอัตรา/ชื่อผู้รับผิดชอบเฉพาะโครงการนี้
          — คอลัมน์ที่ติ๊กไว้จะถูก export เป็นคอลัมน์บทบาทในไฟล์ Excel
        </p>
      </div>

      <form action={saveProjectRoles} className="card overflow-x-auto">
        <input type="hidden" name="projectId" value={project.id} />

        <table className="w-full min-w-[800px] border-collapse text-sm">
          <thead>
            <tr className="bg-brand-soft/60 text-xs">
              <th className="w-20 border-b border-line px-3 py-2 text-center font-semibold">
                export
              </th>
              <th className="border-b border-line px-3 py-2 text-left font-semibold">
                บทบาท
              </th>
              <th className="w-28 border-b border-line px-3 py-2 text-left font-semibold">
                ระดับ (Of/Sr)
              </th>
              <th className="border-b border-line px-3 py-2 text-left font-semibold">
                ผู้รับผิดชอบ
              </th>
              <th className="w-28 border-b border-line px-3 py-2 text-center font-semibold">
                MD รวม
              </th>
              <th className="w-36 border-b border-line px-3 py-2 text-center font-semibold">
                อัตรา / MD
              </th>
              <th className="w-32 border-b border-line px-3 py-2 text-right font-semibold">
                ค่าใช้จ่าย
              </th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => {
              const pr = byRole.get(role.id)
              const manday = round2(mandayByRole.get(role.id) ?? 0)
              const rate = pr?.ratePerMd ?? role.ratePerMd
              return (
                <tr key={role.id} className="border-b border-line/70 last:border-0">
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      name={`included_${role.id}`}
                      defaultChecked={pr?.included ?? false}
                      disabled={readOnly}
                      aria-label={`export คอลัมน์ ${role.name}`}
                      className="size-4 rounded border-line"
                    />
                  </td>
                  <td className="px-3 py-2 font-medium">
                    {role.name}
                    {role.stackMultiplied ? (
                      <span className="chip ml-2 bg-accent/10 text-accent">
                        × stack
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      name={`label_${role.id}`}
                      defaultValue={pr?.resourceLabel ?? ''}
                      disabled={readOnly}
                      placeholder="Of1 / Sr1"
                      aria-label={`ระดับของ ${role.name}`}
                      className="field h-8 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      name={`person_${role.id}`}
                      defaultValue={pr?.personName ?? ''}
                      disabled={readOnly}
                      aria-label={`ผู้รับผิดชอบของ ${role.name}`}
                      className="field h-8 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums">{manday}</td>
                  <td className="px-3 py-2">
                    <input
                      name={`rate_${role.id}`}
                      type="number"
                      step="100"
                      min="0"
                      defaultValue={rate}
                      disabled={readOnly}
                      aria-label={`อัตรา/MD ของ ${role.name}`}
                      className="field h-8 text-right text-sm tabular-nums"
                    />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {(costByRole.get(role.id) ?? 0).toLocaleString('th-TH')}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line p-4">
          <Link href={`/projects/${project.id}?step=3`} className="btn-ghost">
            ย้อนกลับ
          </Link>
          {readOnly ? (
            <Link href={`/projects/${project.id}?step=5`} className="btn-primary">
              ถัดไป: สรุป &amp; Export
            </Link>
          ) : (
            <button type="submit" className="btn-primary">
              บันทึกและไปหน้าสรุป
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
