import { z } from 'zod'

export const DELIVERY_PROFILES = ['legacy', 'self_dev', 'sap', 'vendor', 'migration'] as const
export type DeliveryProfile = typeof DELIVERY_PROFILES[number]
export const PROFILE_OPTIONS: { value: DeliveryProfile; label: string; description: string }[] = [
  { value: 'legacy', label: 'สูตรเดิม', description: 'ใช้ Matrix และขอบเขตบทบาทเดิมของโครงการ' },
  { value: 'self_dev', label: 'พัฒนาเอง / Enhancement', description: 'ใช้กิจกรรม × หน่วยนับ × Matrix; ลง MD เองแทนสัดส่วนได้' },
  { value: 'sap', label: 'SAP', description: 'ลง MD รวมต่อรายการตาม Functional, ABAP, Basis และ Interface' },
  { value: 'vendor', label: 'กำกับ Vendor', description: 'ลง MD ภายในตามงานประสานและตรวจรับ; แยกจากค่าจ้าง Vendor' },
  { value: 'migration', label: 'Migration / Rollout', description: 'ลง MD รวมตาม interface, site, wave และ cutover' },
]
export const isMatrixProfile = (profile: DeliveryProfile) => profile === 'legacy' || profile === 'self_dev'
export const profileLabel = (profile: DeliveryProfile) => PROFILE_OPTIONS.find(p => p.value === profile)!.label

export const effortCellSchema = z.object({
  projectId: z.coerce.number().int().positive(),
  itemId: z.coerce.number().int().positive(),
  roleId: z.coerce.number().int().positive(),
  manday: z.coerce.number().finite().min(0),
  commercialManday: z.number().finite().min(0).nullable(),
  actualManday: z.number().finite().min(0).nullable(),
  billable: z.boolean(),
})
export const itemEvidenceSchema = z.object({
  projectId: z.coerce.number().int().positive(),
  itemId: z.coerce.number().int().positive(),
  sourceReference: z.string().trim().max(2000),
  baselineConfirmed: z.boolean(),
  complexityFacts: z.string().trim().max(4000),
  countUnit: z.string().trim().max(100),
}).refine(v => !v.baselineConfirmed || v.sourceReference.length > 0, {
  message: 'กรุณาระบุแหล่งอ้างอิงก่อนยืนยัน Baseline', path: ['sourceReference'],
})
