# เกณฑ์ระดับงานและ 11 Dimensions

Branch: `codex/work-level-dimensions`

## การใช้งาน

1. ขั้น **ขอบเขต & Questionnaire**: กรอก 11 มิติ เลือกมีงาน/ไม่มีงาน/รอข้อมูล พร้อมรายละเอียด ข้อสมมติ และขอบเขตที่ต้องเก็บ
2. ขั้น **Key รายการ**: เพิ่ม Activity และเปิด **ประเมินระดับ / MD / 11 Dimensions** ใต้รายการ เพื่อดูเกณฑ์ L/M/H, MD ต่อบทบาท, หน่วยนับ และคำแนะนำตรวจงานซ้ำ
3. ผูกมิติที่เกี่ยวข้องและกรอกหลักฐาน เลือก **บันทึกเกณฑ์และมิติ (คง MD)** เพื่อเก็บผลประเมินโดยไม่คำนวณ MD ใหม่ หรือ **ใช้ระดับและคำนวณ MD รายการนี้** เพื่อปรับเฉพาะรายการนั้น ต้องมีเหตุผลเมื่อเปลี่ยนระดับ MD ที่แก้เองคงเดิม
4. ตรวจ **ทีม & อัตรา** ให้รวมบทบาทที่ต้องใช้ เช่น Infrastructure ใน Load Test ระบบแจ้งเตือนบทบาทที่ยังไม่รวมในยอด
5. Export: Details มีเกณฑ์ระดับงาน, Effort Evidence มีมิติและเหตุผล, Scope Dimensions มีสถานะครบทั้ง 11 มิติ โดยไม่แสดงเวอร์ชันเกณฑ์ ผลประเมินที่รายละเอียด/จำนวน/ระดับ/กิจกรรม/หลักฐานเปลี่ยนต้องทบทวนก่อนใช้ snapshot เดิม

## Activity ใหม่

| Code | Activity | L | M | H | หน่วย |
| --- | --- | ---: | ---: | ---: | --- |
| 19.1 | Performance Tuning | 4 | 8 | 15 | ขอบเขตคอขวด / acceptance target |
| 19.2 | Performance / Load Test | 3 | 6 | 10 | campaign / workload รวม 2 รอบ |
| 15.2 | Training / Knowledge Transfer | 1 | 2 | 3 | session 4 ชั่วโมง / ผู้สอนหลัก 1 คน |

ค่าเริ่มต้นเสนอจากการทบทวนขอบเขต ไม่ใช่ MD ใช้จริงจาก Excel ตารางเกณฑ์แสดงสมมติฐานและฐานคิดจากข้อเสนอเดิม Session ซ้ำที่ใช้ material เดิมต้องลงเวลา delivery และ preparation ที่ทำจริง แทนการคิด preparation เต็มซ้ำ เอกสารคู่มือและการเดินทางแยกขอบเขต

SAP และ Migration/Rollout มีแนวทางแตกขอบเขตเพิ่มเติมในกลุ่มงาน โดยลง MD รวมตามบทบาท ไม่คำนวณจาก Matrix L/M/H

## อัปเกรดฐานข้อมูล

ฐานข้อมูลเดิมใช้ `node scripts/upgrade-work-scope.cjs`: สำรอง SQLite, apply migration, เพิ่มเฉพาะ Activity/Matrix cells ที่ยังไม่มี, เพิ่มหัวข้อใน Questionnaire ตั้งต้น และตรวจลายเซ็น MD โครงการก่อน/หลัง ไม่เรียก full seed เพื่อทับค่ามาตรฐานที่แก้ไว้

ฐานข้อมูลใหม่ใช้ `npm run db:migrate` และ `npm run db:seed` ตามเดิม โดย seed จะลง Activity เพิ่มให้ด้วย

## การตรวจสอบ

Focused tests ตรวจการคง MD เดิม, manual override, commercial MD, การป้องกัน viewer/cross-project/stale edits, snapshot และ Excel 11 มิติ ชุดทดสอบ profiles/import/criteria เดิมและ build/typecheck/lint ใช้ร่วมกัน ตรวจ UI ด้วยโครงการ QA แยก: บันทึกขอบเขต, เพิ่ม Tuning M = 8 MD, ยืนยันโดยคงยอด, เปลี่ยนเป็น H = 15 MD พร้อมเหตุผล
