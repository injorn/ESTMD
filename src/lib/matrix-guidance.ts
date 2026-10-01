/** Scope guidance, deliberately independent of unchanged L/M/H rates. */
export const MATRIX_GUIDANCE: Record<string, string> = {
  '1.1': 'ระบุ CRUD ที่รวมในหน้าจอและ business rules; ตรวจขอบเขตเทียบ 1.3 ก่อนเลือกกิจกรรม',
  '1.2': 'Bundle รวม CRUD + Import: ถ้าใช้แถวนี้แล้วไม่เพิ่ม CRUD/Import งานเดียวกันซ้ำ; mapping/validation พิเศษให้แตก work package ชัดเจน',
  '1.3': 'ระบุ Add/Edit/Delete ที่ต้องทำจริง; ขอบเขตอาจต่างจาก 1.1 จึงอย่าเลือกจากค่า MD เพียงอย่างเดียว',
  '2': 'แยก visualization, drilldown, aggregation/data preparation และ interface; ห้ามนับงาน data preparation ซ้ำใน Dashboard และ Migration',
  '12.1': 'ระบุ SSO มาตรฐาน, MFA, B2C หรือ custom integration และงานที่มีอยู่แล้ว',
  '12.4': 'ระบุ session policy ที่มีอยู่และส่วนที่ต้องแก้; กรณี reuse ให้ลง effort ที่ตรวจได้แทนการเดาว่าเป็น0',
  '13.3': 'ระบุจำนวน email template และ configuration/custom logic ที่รวมในรายการ',
  '14.3': 'ระบุ entity และขอบเขต CRUD ของ master data; หลีกเลี่ยงการเพิ่ม CRUD เดิมซ้ำ',
}
