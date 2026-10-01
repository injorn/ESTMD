import Link from 'next/link'
import { requireUser } from '@/lib/dal'
import { PROFILE_OPTIONS } from '@/lib/delivery-profiles'
import { MATRIX_GUIDANCE } from '@/lib/matrix-guidance'
import { MatrixTabs } from '../matrix-tabs'

export const metadata = { title: 'วิธีประเมินจากโครงการที่ผ่านมา | Standard Matrix' }

export default async function MethodologyPage() {
  const user = await requireUser()
  return <div className="space-y-5">
    <div><h1 className="text-xl font-semibold">วิธีประเมินจากโครงการที่ผ่านมา</h1>
      <p className="mt-1 text-sm text-muted">ใช้ MD ประเมินตามเนื้องานก่อนปรับงบเป็นฐาน · ใบประเมินเก่ายังไม่ถือเป็นแรงงานที่ใช้จริง</p></div>
    <MatrixTabs active="methodology" isAdmin={user.role === 'admin'} />
    <section className="card overflow-x-auto">
      <h2 className="border-b border-line p-4 font-semibold">เลือกรูปแบบการส่งมอบต่อกลุ่มงาน</h2>
      <table className="w-full min-w-[560px] text-sm"><thead><tr className="bg-brand-soft"><th scope="col" className="p-3 text-left">รูปแบบ</th><th scope="col" className="p-3 text-left">วิธีคิดแรงงาน</th></tr></thead>
        <tbody>{PROFILE_OPTIONS.map(p => <tr key={p.value} className="border-t border-line"><th scope="row" className="p-3 text-left font-medium">{p.label}</th><td className="p-3">{p.description}</td></tr>)}</tbody>
      </table>
      <p className="p-4 text-xs text-muted">โครงการผสมมีหลายรูปแบบได้ · งานเดิมใช้สูตรเดิมจนกว่าจะเลือกเปลี่ยน · งานกรอกเองเป็น MD รวม ไม่คูณจำนวนอีก</p>
    </section>
    <section className="card space-y-3 p-4">
      <h2 className="font-semibold">ใช้ Baseline และบทบาทให้ตรงความหมาย</h2>
      <ul className="list-disc space-y-2 pl-5 text-sm">
        <li>กรอก MD ประเมิน, MD สำหรับราคา และ MD ใช้จริงแยกกัน ช่องว่างหมายถึงยังไม่ทราบ ส่วน0คือมีข้อมูลว่าเป็น0</li>
        <li>งานไม่คิดเงินยังรวมในแรงงาน แต่ไม่เพิ่มค่าใช้จ่าย · เงิน Vendor ไม่แปลงเป็นMD</li>
        <li>BA/Tester หรือ PM/SAP ที่เอกสารรวมไว้ให้ใช้บทบาทรวมเพียงยอดเดียว บทบาทใหม่เริ่มที่อัตรา0จนระบุราคา และมีข้อความให้ทบทวนเมื่อมีงานคิดเงิน</li>
        <li>ถ้ากรอก MD เองสำหรับบทบาทที่คิดเป็น ratio ระบบใช้ยอดที่กรอกแทน ratio ในกลุ่มงานนั้น เพื่อป้องกันนับซ้ำ</li>
        <li>เลือกบทบาทที่จะรวมยอดในขั้น “ทีม &amp; อัตรา” แล้วตรวจหน้าสรุปและชีต Effort Evidence ก่อนส่งประเมิน</li>
      </ul>
    </section>
    <section className="card space-y-3 p-4">
      <h2 className="font-semibold">กำหนดขอบเขตกิจกรรมก่อนปรับค่ามาตรฐาน</h2>
      <ul className="space-y-3 text-sm">{Object.entries(MATRIX_GUIDANCE).map(([code, text]) => <li key={code}><span className="font-semibold">{code}</span> · {text}</li>)}</ul>
      <p className="text-xs text-muted">L/M/H พิจารณา business rules, states, approval, interface และ security ของงานนั้น ค่าเดิมคงไว้จนมีตัวอย่างต่อหน่วยที่ยืนยันแล้ว</p>
    </section>
    <section className="card space-y-3 p-4">
      <h2 className="font-semibold">ข้อพบจากไฟล์เก่าและการสอบเทียบ</h2>
      <p className="text-sm">ตรวจ24ไฟล์ มี23รหัส POT ตารางหลักไฟล์ GRC และ RCP ของ POT254773 เหมือนกัน จึงต้องแก้ข้อมูลต้นทางก่อนนับเป็นคนละตัวอย่าง Smart Search มี Baseline770, Planned938 และรายละเอียด747MD ต้องกระทบยอดก่อนนำมาสอบเทียบ</p>
      <p className="text-sm">แต่ละรายการต้องยืนยัน Baseline พร้อมไฟล์/ชีต/เซลล์และข้อเท็จจริงของระดับ การเปลี่ยน Baseline จะให้ยืนยันใหม่ รายงานสอบเทียบใช้เฉพาะ MD ที่กรอกเองของบทบาทขอบเขต item ในรูปแบบ Matrix ที่มีหลักฐานครบ แยกตามกิจกรรม บทบาท ระดับ และหน่วย พร้อมจำนวนโครงการและค่าคลาดเคลื่อน บทบาทแบบ phase และงาน direct แยกทบทวนวิธีประเมิน ไม่ใช้ปรับค่าต่อหน่วยอัตโนมัติ</p>
      <p className="text-xs text-muted">ผล median/IQR เป็นข้อมูลให้ทบทวน ยังไม่ใช่ค่าที่อนุมัติใช้ ต้องแบ่งชุดตรวจตามโครงการและกันข้อมูลซ้ำก่อน fit ค่ารุ่นใหม่</p>
      <a href="/api/evaluation/calibration" className="btn-primary">ดาวน์โหลดข้อมูลสอบเทียบ JSON</a>
      <Link href="/matrix/ai-evaluation" className="btn-ghost">ตรวจชุดทดสอบ AI</Link>
    </section>
  </div>
}
