import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/dal'
import { listActivities, listTechStacks } from '@/lib/queries'
import { ImportWizard } from './import-wizard'

export const metadata = { title: 'นำเข้าจาก Excel | Manday Estimation' }

export default async function ImportProjectPage() {
  const user = await requireUser()
  if (user.role === 'viewer') notFound()
  const [activities, stacks] = await Promise.all([listActivities(), listTechStacks()])
  return <div className="space-y-5">
    <nav className="text-sm text-muted"><Link href="/projects" className="hover:underline">โครงการ</Link><span className="mx-2">/</span>นำเข้าจาก Excel</nav>
    <div><h1 className="text-xl font-semibold">นำเข้าจาก Excel</h1><p className="mt-1 text-sm text-muted">เลือกตารางรายการงาน ตรวจข้อมูล แล้วประเมิน MD ใหม่ในระบบ</p></div>
    <ImportWizard activities={activities} stacks={stacks} />
  </div>
}
