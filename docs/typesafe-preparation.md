# เตรียมการประเมิน MD ด้วย TypeSafe

## เกณฑ์เวอร์ชันแรก

`src/lib/estimation-ai/policy.ts` กำหนด `level-def-2026-10-04-v2` โดยใช้ CRITERIA เป็นแหล่งเดียวสำหรับช่วงตัวเลขและปัจจัยที่ AI ประเมิน ข้อความใน snapshot และหน้าเกณฑ์สร้างจากปัจจัยเหล่านี้ ไม่ผสม WORK_TYPE_LEVELS ที่มีเกณฑ์ต่างกัน ตัวเลขใช้ขอบบนแบบ inclusive เช่น 1–5 / 6–10 / มากกว่า 10 และเลือกระดับสูงสุดของปัจจัยที่เกี่ยวข้อง ไม่ต้องครบทุกเงื่อนไขในข้อความระดับ H จึงจะเป็น H หน้าเกณฑ์แสดงรหัสกิจกรรมและหน่วยนับจาก Matrix ปัจจุบัน กิจกรรมที่ไม่มีเกณฑ์เฉพาะระบุให้ผู้ประเมินตรวจทาน

Fact ที่ไม่ทราบต้องเป็น undefined ไม่ใช่ 0 หรือ false ใช้ false เมื่อหลักฐานยืนยันว่าไม่มีเท่านั้น ข้อมูลไม่ครบหรืออยู่นอกช่วงให้ `needs_review` พร้อมรายชื่อปัจจัยที่ต้องถามเพิ่ม โปรแกรมตรวจค่าตัวเลขเป็นจำนวนเต็มไม่ติดลบ

- ใช้ `evaluateActivity(activityCode, facts)` สำหรับ Matrix ปัจจุบัน
- `evaluateCriteria` ใช้รหัสเกณฑ์ต้นฉบับสำหรับตรวจ boundary เท่านั้น
- CRUD 1.1–1.3 ใช้เกณฑ์ `matrix-v3-crud-2026-10-01-v1` จาก complexityLegend ของ Matrix รุ่นปัจจุบัน พิจารณาทุก action รวม Import Excel ไม่ใช้เกณฑ์ Add/Search เดิมตามรหัสที่ตรงกัน
- CRUD ใช้ existingPattern, businessLogic, complexLogic, externalSystems, multiStepApproval, securityCritical; ระบุทุกปัจจัยจากหลักฐาน งานสำเร็จรูปเป็น L, businessLogic หรือเชื่อม 1 ระบบเป็น M, complexLogic / อนุมัติหลายขั้น / security-critical / เชื่อมมากกว่า 1 ระบบเป็น H งานที่ใช้ pattern เดิมไม่ได้และไม่เข้าปัจจัย M/H ให้ถามเพิ่ม
- คู่มือผู้ใช้ 15.1 จับคู่กับเกณฑ์เดิม 11.2 โดยระบุ sourceCode ใน snapshot
- กิจกรรมที่ไม่มีเกณฑ์, One-way >10 fields และ SIT/UAT >6 ครั้ง ให้คนตรวจ ไม่มีการเดาระดับเพิ่มเติม
- งาน Requirement & Design ต้องระบุ newProject; โครงการใหม่ 1–10 forms เป็น M, >10 เป็น H; งานแก้ไขใช้ changes และ complex
- จำนวน Scenario กับจำนวน Test case ต่อ Scenario พิจารณาแยกแล้วเลือกระดับสูงสุด
- ชุดนี้เป็นการตีความเกณฑ์สำหรับทดลอง ต้องให้เจ้าของมาตรฐานรับรองก่อนใช้อนุมัติอัตโนมัติ

## ประวัติคำแนะนำและการยืนยัน

Migration 0006 เพิ่ม estimation_suggestions และ estimation_reviews แยกจาก project_items จึงไม่เปลี่ยน MD เดิม เก็บผู้ร้องขอ ผู้ตรวจ เวลา model, confidence, rawResponse, criteriaVersion และ snapshot ของ input/criteria

ก่อนบันทึกคำแนะนำ ต้องสร้าง inputSnapshot รูปแบบคงที่ประกอบด้วย detail, activityCode, qty, criteria, matrix rates และ effective multiplier แล้ว hash ด้วย inputHash ก่อนยืนยัน ให้สร้าง snapshot ปัจจุบันใหม่และเรียก validateReview เพื่อป้องกันใช้คำแนะนำเก่า การเปลี่ยนระดับหรือยืนยันกรณี AI งดตอบต้องมีเหตุผล

ตอนเชื่อมต่อจริงต้องเพิ่ม server service ที่ตรวจสิทธิ์โครงการและบันทึก review พร้อมการเปลี่ยน project_items ใน transaction เดียว ตอนนี้เตรียม schema และ validation แล้ว ยังไม่มี API หรือหน้าจอรับคำแนะนำ และยังไม่มีนโยบาย confidence สำหรับยืนยันอัตโนมัติ

## ชุดข้อมูลจากงานเก่า

### ตรวจผ่านหน้าจอ

เปิด Standard Matrix → ตรวจชุดทดสอบ AI (`/matrix/ai-evaluation`) แล้วกด “เตรียมรายการจากโครงการ” เพื่อสร้าง snapshot จากงานที่มีอยู่ ปุ่มนี้ไม่สร้างรายการซ้ำหากข้อมูลเดิมไม่เปลี่ยน เมื่อรายละเอียด จำนวนงาน ระดับเดิม เกณฑ์ หรือ rates/multiplier เปลี่ยน จะสร้าง snapshot ใหม่แยกจากรายการเก่า

ผู้ประเมินและ admin เลือก L/M/H พร้อมเหตุผล หรือแยกออกเมื่อข้อมูลไม่พอ Viewer อ่านผลได้อย่างเดียว การตรวจนี้ไม่แก้ project_items หรือ MD ในใบประเมินจริง

ผลตรวจเก็บผู้ตรวจ เวลา revision และประวัติทุกครั้งใน evaluation_case_reviews ป้องกันหน้าจอที่เปิดค้างไว้บันทึกทับผลตรวจใหม่ของคนอื่น รายการที่ยืนยันแล้วดาวน์โหลดเป็น JSON ผ่านปุ่มในหน้าจอได้ ใช้กับ evaluate-estimation-ai.ts เหมือนไฟล์ CLI ด้านล่าง รายการ pending/excluded จะไม่อยู่ในไฟล์คำตอบมาตรฐาน

ชุดข้อมูลเก่าที่ export เป็น JSON ก่อนหน้านี้ยังคง snapshot เวอร์ชันเดิม หน้าจอจะสร้างชุดใหม่จากฐานข้อมูลปัจจุบันเพื่อใช้เกณฑ์ CRUD รุ่นใหม่ ไม่ยืนยันคำตอบของงานจริงให้อัตโนมัติ

### Export ผ่าน CLI

```powershell
New-Item -ItemType Directory -Force data/ai-evaluation
# ถ้าใช้ DATABASE_PATH เฉพาะ ให้กำหนด env ตัวเดียวกับแอปก่อน export
npx tsx scripts/export-estimation-ai-cases.ts data/ai-evaluation/cases.json
```

Export แบบอ่านอย่างเดียว รวมรายการที่มี activity และ qty >0 เก็บข้อความ ระดับที่บันทึกไว้ และ rates/multipliers ณ วัน export ไม่ใช้ค่า override เป็นมาตรฐาน เก็บเฉพาะ item-scoped roles ที่โครงการเลือกไว้ จึงวัด MD ของรายการ ไม่ใช่ยอดรวมโครงการที่มี phase ratios/buffer งานต่อโครงการใช้ qty=1

รายการทุกแถวเริ่ม reviewed=false ให้ผู้ประเมินตรวจ expectedLevel, ความครบถ้วนของรายละเอียด และ rates แล้วใส่ reviewNote ก่อนเปลี่ยน reviewed=true ควรมี L/M/H ครบ รวมจุดตัด งานซับซ้อนแต่ฟิลด์น้อย และข้อความข้อมูลไม่พอ แบ่งโครงการสำหรับปรับคำถามกับโครงการสำหรับวัดผลออกจากกัน

ไฟล์ใน data/ai-evaluation ถูก gitignore เพื่อไม่ commit ข้อความโครงการโดยไม่ตั้งใจ Export ไม่ทับไฟล์เดิม เพื่อรักษาคำตอบที่คนตรวจแล้ว

ไฟล์ predictions.json ใช้รูปแบบ:

```json
[{ "id": "123", "level": "M" }, { "id": "124", "level": null }]
```

```powershell
npx tsx scripts/evaluate-estimation-ai.ts data/ai-evaluation/cases.json data/ai-evaluation/predictions.json
npx tsx --test scripts/test-estimation-ai.ts
```

Evaluator ใช้เฉพาะ reviewed=true รายงาน coverage, accuracy เฉพาะรายการที่ตอบ, abstained, confusion matrix, จำนวนที่ MD ต่ำกว่าคำตอบมาตรฐาน และ mean absolute MD error รายแถวที่ไม่ตอบไม่ถูกนับเป็น MD=0 ไม่เลือก confidence threshold จนกว่าจะมีผลทดลองจากข้อมูลจริง

ยังไม่มีการเรียก TypeSafe API, ติดตั้ง SDK หรือส่งข้อมูล requirement ออกนอกเครื่อง

## รูปแบบการส่งมอบและหลักฐาน Baseline

โปรแกรมแยก delivery profile ต่อ Phase แล้ว: legacy/self developmentใช้Matrix; SAP/vendor/migrationใช้แรงงานกรอกตรง ชุดทดสอบ AIที่captureใหม่ข้ามdirect profilesเพื่อไม่เอาgenericMatrixไปวัดงานต่างวิธี MDCommercialและActualเก็บแยกจากBaseline มีbillable statusและsource/level factsสำหรับการสอบเทียบ ดู [การใช้งาน](analysis/historical-matrix-2026-10-01/IMPLEMENTATION.md) และหน้า `/matrix/methodology`
