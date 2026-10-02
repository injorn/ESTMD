import Link from 'next/link'
import { notFound } from 'next/navigation'

import { requireUser } from '@/lib/dal'
import {
  listQuestionnaires,
  listStackModifiers,
  listTechStacks,
} from '@/lib/queries'

import { WizardSteps } from '@/components/wizard-steps'
import { ProjectForm } from '../[id]/project-form'

export const metadata = { title: 'สร้างโครงการ | Manday Estimation' }

export default async function NewProjectPage() {
  const user = await requireUser()
  if (user.role === 'viewer') notFound()

  const [stacks, modifiers, questionnaires] = await Promise.all([
    listTechStacks(),
    listStackModifiers(),
    listQuestionnaires(),
  ])

  return (
    <div className="space-y-5">
      <nav className="text-sm text-muted">
        <Link href="/projects" className="hover:underline">
          โครงการ
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">สร้างโครงการ</span>
      </nav>

      <WizardSteps current={1} />

      <p className="text-sm text-muted">มีรายการงานใน Excel แล้ว? <Link href="/projects/import" className="font-medium text-brand hover:underline">นำเข้าจาก Excel</Link></p>

      <ProjectForm
        project={null}
        techStacks={stacks}
        modifiers={modifiers}
        selectedModifierIds={[]}
        questionnaires={questionnaires}
      />
    </div>
  )
}
