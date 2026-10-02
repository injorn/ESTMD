# Excel Estimation Import Implementation Plan

**Goal:** นำเข้ารายการงานจาก Excel ไม่มี MD แล้วประเมินและ Export ผ่านระบบเดิม

**Architecture:** อ่าน XLSX ฝั่ง server → grid มีตำแหน่ง → client mapping/review → validated transaction สร้างโครงการ draft. ไม่เก็บ workbook ไม่ใช้ตัวเลข MD ต้นทาง. เลือก Matrix ได้ทั้งก่อนและหลังนำเข้า.

**Tech Stack:** Next 16.3.6 Route Handlers, React19, ExcelJS, Zod4, Drizzle/SQLite.

## 1. ตัวอ่านและ mapping
- [x] เขียน `scripts/test-excel-import.ts` synthetic Excel ทดสอบ merged cells/formulas/header/total/invalid qty ก่อน implementation. Run `node --conditions=react-server --import tsx --test scripts/test-excel-import.ts` ต้อง fail เพราะโมดูลยังไม่มี.
- [x] สร้าง `src/lib/excel-import/workbook.ts`: `readImportWorkbook(buffer,fileName)` คืน fileName/sha256/sheets. Normalize strings/richText/formula result/date/merged anchor, reject damaged/oversized file, skip oversized sheets with warning.
- [x] สร้าง `src/lib/excel-import/model.ts`: types, Zod schema, `mapSheetRows(sheet,mapping)` คืน editable rows พร้อม warnings/selected; phase carry-forward, detail anchored, explicit quantity validation.
- [x] Run test ให้ green แล้วตรวจ 24 workbook โดยไม่แก้ต้นฉบับ.

## 2. การสร้างโครงการ
- [x] เพิ่ม temp DB tests: `createImportedProject(db,actor,input)` returns ID; schema fields, standard roles, matrix MD, direct/pending 0, once-per-project qty, source refs, rollback/viewer/invalid IDs.
- [x] สร้าง `src/lib/excel-import/store.ts` transaction อ่าน active masters → validate → project/roles/phases/items → `standardManday` เฉพาะ mapped Matrix rows. ไม่มี override, baselineConfirmed=false, actual/commercial=null.
- [x] เพิ่ม pending warning ใน summary และ StepItems, พร้อม editor จับคู่ Activity/level/qty รายการนำเข้าที่ใช้ `saveItem` เดิม จึงไม่สร้างสูตรใหม่.
- [x] Run temp DB + Export roundtrip regression.

## 3. Upload / UI
- [x] สร้าง `src/app/api/projects/import/preview/route.ts`: session writer, same-origin, bounded multipart input → workbook reader → JSON/errors.
- [x] สร้าง `src/app/api/projects/import/route.ts`: writer, same-origin, bounded JSON → store → revalidatePath → project URL; validation/error ไม่เผย stacktrace.
- [x] สร้าง `/projects/import/page.tsx`, `import-wizard.tsx`, `mapping-form.tsx`, `review-table.tsx`: upload/status/errors; grid preview+column mapping+range; editable review incl activity/profile/level; project metadata/stack; create button+navigation. Label native controls, busy state, error announcements, table horizontal scrolling/mobile safe, retain changes after validation error.
- [x] เพิ่มลิงก์ “นำเข้าจาก Excel” ใน `/projects` และ `/projects/new`.

## 4. ยืนยันและส่งมอบ
- [x] ทดสอบ browser ด้วย DB synthetic แยก: import Thai XLSX ไม่มี MD, skip totals, choose Matrix qty/level, pending rows, direct profile, summary และดาวน์โหลด Excel. ตรวจ mobile, invalid input และ role authorization.
- [x] `npm run typecheck`, targeted ESLint, all 7 existing tests + import tests, `npm run test:upgrade`, `npm run build`, `git diff --check`.
- [x] เขียน `docs/excel-import.md` ขั้นตอนและขอบเขต, self-review/reviewer ตาม skill, commit เฉพาะไฟล์งานใหม่ใน branch; ไม่ push/merge.

Owner ยืนยันแบบแล้ว จึงดำเนินงานใน chat นี้ตามลำดับและแจ้งผลโดยไม่ขออนุมัติซ้ำ.
