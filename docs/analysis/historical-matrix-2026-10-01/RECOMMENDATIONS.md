# ข้อเสนอปรับ Standard Matrix จากใบประเมิน PTT Digital

วันที่ตรวจ: 1 ตุลาคม 2026 | สถานะ: เจ้าของงานให้ทำตามข้อเสนอแล้ว แยกพัฒนาใน branch `codex/historical-matrix-profiles` โดยคงค่า L/M/H เดิมระหว่างเก็บหลักฐานสอบเทียบ

ฐานที่เจ้าของงานเลือกคือ **MD ประเมินตามเนื้องานก่อนปรับงบ** เอกสารที่ให้เป็นใบประเมินในอดีต ยังไม่มี timesheet หรือ actual effort จึงใช้ตรวจความสอดคล้องของมาตรฐานกับวิธีประเมินที่ผ่านมา ไม่สามารถยืนยันความแม่นยำต่อแรงงานที่ใช้จริงได้

## ข้อค้นพบที่มีผลต่อ Matrix

พบ 24 workbook แต่มี 23 รหัส POT ต่างกัน ตาราง `PTTDigital_Manday` ของไฟล์ POT254773 ทั้งสองไฟล์เหมือนกันทุกเซลล์ ทั้งค่าและสูตร แม้ชื่อไฟล์หนึ่งเป็น RCP และอีกไฟล์เป็น SAP S4-GRC จึงพักไฟล์ที่ชื่อ GRC ไว้ตรวจเจ้าของเอกสาร และใช้ตารางนี้เป็นตัวอย่างเพียงครั้งเดียว ไม่สรุปว่าสองโครงการเป็นโครงการเดียวกันจากชื่อไฟล์

Smart Search มีตัวเลขสามชุดที่ยังต้องกระทบยอด:

| แหล่ง | MD | ความหมาย / วิธีใช้ |
|---|---:|---|
| `Resource!F4:F23`, ยอด `F24` | 770 | Baseline ประเมิน Effort ตามหัวคอลัมน์ F3 |
| `Resource!G4:G23`, ยอด `G24` | 938 | Planned ที่หัวคอลัมน์ระบุว่าปรับให้ครบงบ 9.7 MB ไม่ใช้ปรับมาตรฐาน |
| `PTT Digital!V60` | 747 | รวมรายละเอียดอีกชุด ต่างจาก Baseline 23 MD ต้องหาที่มาความต่างก่อนรวมชุดข้อมูล |

Planned สูงกว่า Baseline 168 MD หรือ 21.8% ถ้าใช้ Planned มาปรับ Matrix จะนำการปรับราคาไปปะปนกับแรงงาน บทบาท `Resource!D5` เป็นตัวเลข 98 แทนชื่อบทบาท จึงต้องให้คนยืนยันก่อนแปลง role; ห้ามอนุมานว่าเป็น Tester แล้วใช้โดยไม่มีบันทึก

## ตัวอย่างยอดและสัดส่วนที่ตรวจจากตารางหลัก

ยอดด้านล่างรวมเฉพาะคอลัมน์ MD ของบทบาท ไม่รวมเงิน Vendor หรืออัตราค่าบริการ เป็นค่าจากตารางที่เลือกตรวจ ยังไม่ยืนยันว่าทุกโครงการแยกส่วนปรับงบออกแล้ว ข้อมูลที่ไม่มีหลักฐาน baseline ชัดเจนใช้เป็นหลักฐานโครงสร้างงานได้ แต่ต้องให้เจ้าของงานยืนยันก่อนใช้ fit ค่ามาตรฐาน

| POT / โครงการ | แหล่ง | รวม MD | DEV ที่ระบุ | PM | SA | BA แยกบทบาท | ข้อควรระวัง |
|---|---|---:|---:|---:|---:|---:|---|
| 253760 Smart Procurement | `PTTDigital_Manday_Release!D41:P41` | 608 | 237 | 64 | 80 | 140 | DEV รวม Tech Lead/Developer; BA&Tester อีก 58 MD เก็บเป็น joint role |
| 260876 CTM | `Calsheet!D173:M173` | 485 | 241 | 35 | 113 | 90 | ใช้ Grand Total เพียงครั้งเดียว ไม่บวก Phase Total ซ้ำ |
| 261160 Discrepancy | `PTTDigital_Manday!D73:K73` | 182 | 40 | 32 | — | 107 | มีงานติดตาม/ประสานระยะยาว ไม่ใช่ตัวแทน CRUD อย่างเดียว |
| 261336 iCMS | `DGT_Manday!D40:H40` | 100 | 67 | 8 | — | — | BA/Tester รวม 22 MD ห้ามลงทั้ง BA22 และ Tester22 |
| 261991 Job Card | `PTTDigital_Manday!D56:N56` | 446 | 233 | 38 | 58 | 57 | Tester44; App Support ใน total เป็น0 แต่มีหมายเหตุแรงงานไม่คิดเงินใต้ตาราง |
| 261467 Tank eMOC | `Digital_Manday!D43:H43` | 71 | ไม่ระบุ | 38 | 10 | 11 | Tester9, SharePoint Admin3; Vendor เป็นเงินแยกต่างหาก |
| 254773 RCP | `PTTDigital_Manday!D49:M49` | 152 | ไม่ระบุ | 16 | — | 133 | งานภายในเน้น BA; ไฟล์ GRC ตารางหลักซ้ำ |
| 261084 Orchestra | `Digital_Manday!D21:N21` | 184 | ไม่แปลงเป็น DEV | 22 | — | — | Legacy/MuleSoft หลายทีม รวม QA/Network/Infra ต้องรักษาบทบาทจริง |

เครื่องหมาย — หมายถึงไม่ได้แยก/ไม่ได้ map เป็นบทบาทนั้น ไม่ได้ยืนยันว่าโครงการไม่มีงานประเภทนั้น และยอดข้างต้นไม่ใช่ต้นทุนพัฒนา Vendor ทั้งหมด

ไฟล์อีกกลุ่มเป็น resource estimate หรือ SAP effort เช่น SAP LO, SAP Special Processing, SAP PO Schedule, LSMW และ LPG จึงไม่ใช้ยอด resource หารจำนวนหน้าจอเพื่อสร้าง MD ต่อ screen อัตโนมัติ รายชื่อและ sheet ที่เลือกของทั้ง 24 ไฟล์อยู่ใน `reviewed-evidence.json`

## 1. แยกวิธีประเมินตามรูปแบบการส่งมอบ

**แนวทางที่เจ้าของงานให้ดำเนินการ:** ใช้กิจกรรมกลางร่วมกัน แต่แยก profile พัฒนาเอง, SAP, กำกับ Vendor และ Migration/Rollout โดยโครงการผสมให้ระบุ profile ต่อ work package แทนบังคับทั้งโครงการอยู่กลุ่มเดียว

| Profile ที่เสนอ | วิธีคิดหลัก | สิ่งที่ต้องระบุ |
|---|---|---|
| พัฒนาเอง / Enhancement | กิจกรรม × จำนวนหน่วย × MD ของบทบาท | ทำใหม่/แก้เดิม, business rules, reuse, integration |
| SAP | Functional configuration + ABAP + Interface + Test/Transport | module, object, change type, functional/technical ownership |
| กำกับ Vendor | PM/BA/SA/Tester ตาม deliverable, รอบตรวจ และช่วงเวลาประสานงาน | ใครเป็นผู้พัฒนา, internal MD, vendor MD ถ้ามี, vendor cost |
| Migration/Rollout | งานเตรียมครั้งเดียว + งานต่อ interface/site/wave + cutover/support | จำนวน source/target, interface, site, wave, environment |

การคง Matrix เดียวและเพิ่มข้อยกเว้นทำได้เร็วกว่า แต่จะสะสม override และทำให้ผู้ประเมินต้องรู้เองว่ากิจกรรมใดใช้ DEV ratio ไม่ได้ ส่วนการ fit Matrix ใหม่ทั้งชุดจากยอดโครงการเร็วเกินไป เพราะยังขาดหน่วยนับและ L/M/H ที่ยืนยัน ทางเลือกที่แนะนำจึงเป็นแยกวิธีประเมินก่อน แล้วสอบเทียบเฉพาะกิจกรรมที่หลักฐานครบ

## 2. ใช้ ratio เป็นตัวช่วยเฉพาะบริบท ไม่บังคับทุกงาน

ค่า default ใน `src/lib/db/standard-matrix.json` เป็น PM15%, SA30%, BA22.5%, Tester35% แต่ role default มี scope=`item` อัตราเหล่านี้จะใช้คำนวณระดับ phase เมื่อเปลี่ยน scope เป็น phase ตาม `src/lib/summary.ts` จึงไม่ควรอธิบายว่าโปรแกรมคิดทุกงานด้วย ratio อยู่แล้ว

| ตัวอย่าง | PM/DEV | SA/DEV | BA/DEV | Tester/DEV |
|---|---:|---:|---:|---:|
| Smart Procurement | 27.0% | 33.8% | 59.1% | แยกไม่ได้ |
| CTM | 14.5% | 46.9% | 37.3% | ไม่แยกคอลัมน์ |
| Job Card | 16.3% | 24.9% | 24.5% | 18.9% |
| iCMS | 11.9% | แยกไม่ได้ | แยกไม่ได้ | แยกไม่ได้ |
| Discrepancy | 80.0% | ไม่แยกคอลัมน์ | 267.5% | QA แยกต่างหาก |

นี่เป็น **สัดส่วนที่สังเกตในใบประเมิน** ไม่ใช่ confidence interval หรือค่าที่พร้อมตั้งใช้ สัดส่วน PM15% ดูใกล้ CTM/Job Card แต่ไม่ครอบคลุม Discrepancy และจะให้0เมื่อ DEV ภายในไม่มี หากใช้กับ Tank eMOC

ข้อเสนอ: PM ให้ลง kickoff, meeting, report, cutover และระยะประสานงานที่ตรวจสอบได้; BA/SA/Tester ใช้กิจกรรมจริงเมื่อทราบ scope; ratio เป็น fallback พร้อมระบุสมมติฐาน ห้ามเพิ่ม phase ratio ทับ item MD ของบทบาทเดียวกันโดยไม่มีกติกาป้องกันนับซ้ำ ไม่ใช้ median ข้าม profile มาตั้ง default ใหม่

## 3. ปรับขอบเขตกิจกรรมก่อนเพิ่มตัวเลข L/M/H

| กิจกรรมปัจจุบัน | หลักฐาน / ปัญหา | ข้อเสนอ |
|---|---|---|
| 1.1 CRUD กับ 1.3 Add/Edit/Delete | DEV ปัจจุบัน 1.1=2/3/5 แต่ 1.3=3/5/8 แม้ชื่อดูเหมือนชุดย่อย | นิยามสิ่งที่รวมในแต่ละกิจกรรมให้ชัด แล้วตรวจ ordering เมื่อขอบเขต/หน่วย/บริบทเทียบกันได้ |
| 1.2 CRUD + Import | Smart Search `R3!F5` มี validate/map Excel 9 sheets =8 DEV MD และ `F6` upload=2 | แยก CRUD, upload, mapping/validation; เลือก combined bundle หรือองค์ประกอบ ห้ามลงทั้งสองซ้ำ |
| 2 Dashboard | Smart Search `R9!F3:F5` =13 DEV MD และ `F6:F8` =13 อีก dashboard รวม26; มี drilldown/data preparation | แยก visualization, drilldown, aggregation/data preparation และ SAP interface; 13เป็นยอด packageตัวอย่าง ไม่ย้ายเป็น H=13 ทุก dashboard |
| 12.1 Authentication | Smart Search `R10!F3` MFA/AzureAD =7 DEV MD เทียบปัจจุบัน2/3/5 | แยก SSO มาตรฐานกับ MFA/B2C/custom integration; ตรวจว่า7ครอบคลุมอะไรก่อนแก้ rate |
| 12.4 Session timeout | ปัจจุบัน DEV=3ทุกระดับ; Smart Search `R11!F3` ระบุว่าระบบมีอยู่แล้ว และ `F4` มีงานเพิ่ม2 | ต้องบันทึก reuse/implementation status; ข้อความว่าเดิมมีอยู่ไม่ใช่ missing numericที่เติม0โดยอัตโนมัติ |
| 13.3 Email Template / 14.3 Master Data | ปัจจุบัน DEV=5 และ8ทุกระดับ | แยกจำนวน template/entity และ simple configuration กับ custom logic; ยังไม่มีตัวอย่างสะอาดพอเสนอค่าใหม่ |
| Migration/Rollout | ClickNGo `ClickNGo Calsheet!D27` BA70 โดยไม่มีDEV; OrchestraมีLegacy/MuleSoft | เพิ่มหน่วย site/wave และ activity สำหรับ compatibility, reconciliation, dual run, cutover ตามหลักฐานที่ยืนยัน |

แนวทาง L/M/H ให้ประเมินจาก rule, state/approval, interface และข้อกำหนด security ของ **งานนั้น** ไม่ใช้ความใหญ่ของโครงการหรือ MD ที่สูงเป็นเหตุผลติดป้าย H เพราะจะทำให้ใช้ผลลัพธ์ย้อนกำหนดคำตอบ

## 4. แยกแรงงาน บทบาท และการคิดเงิน

- เก็บ `estimated_effort_md`, `commercial_planned_md`, `actual_effort_md` คนละช่อง พร้อม source sheet/range และผู้ยืนยัน
- เก็บ BA/Tester, Tech Lead/Developer, PM/SAP เป็น joint role ถ้าไม่มีรายละเอียดแยก ห้ามเพิ่ม MD ให้ทั้งสอง role เต็มจำนวน
- รักษา SAP Functional, ABAP, Basis, PI/CPI, WSO2/MuleSoft และ Legacy team ตามความหมายเดิม ไม่รวมเข้า DEV เพียงเพื่อให้สูตร ratioทำงาน
- แยก vendor cost ที่เป็นบาทออกจาก vendor effort ที่เป็นMD ถ้าไม่มี vendor effort ให้เป็น unknown
- งานไม่คิดเงินยังเป็นแรงงาน เช่น App Support ในหมายเหตุ Job Card ใต้ total ให้มี billable status แยก ไม่ตัดทิ้งจาก effort โดยอัตโนมัติ
- หน่วย FTE/person-month ต้องตรวจนิยามก่อนแปลงเป็นMD ไม่ใช้22วันต่อเดือนโดยไม่มีหลักฐานของโครงการ

## 5. วิธีสอบเทียบที่เสนอหลังยืนยัน profile

1. เจ้าของเอกสารยืนยัน revision และ baseline โดยเริ่ม Smart Search, ไฟล์ GRC/RCP และ sheetที่ใช้templateชื่อโครงการเก่า
2. ดึง work package ที่มี activity, role, qty, unit, level facts และ source cells ครบ; แยก parent/subtask/total เพื่อไม่บวกซ้ำ
3. ผู้เชี่ยวชาญยืนยัน activity และ L/M/H ก่อนดูค่าที่โมเดลเสนอ บันทึก joint role/reuse/out-of-scopeไว้
4. เทียบ historical MD ต่อหน่วยกับ Matrix ของ roleและlevelเดียวกัน ใช้ median/IQRแสดงการกระจาย พร้อมจำนวนตัวอย่างและจำนวนโครงการอิสระ ไม่ให้100แถวในโครงการเดียวเท่ากับ100โครงการ
5. แบ่ง train/validation ตามโครงการ และเก็บ revision/ไฟล์ซ้ำไว้กลุ่มเดียวกัน; วัด absolute MD error, signed bias, ผลรวมรายroleและโครงการ; ชุดที่มี actualภายหลังประเมินแยก
6. ตั้ง candidate version แยกจาก current แล้ว backtestก่อนเสนอค่าใหม่ สำหรับกิจกรรมที่ตัวอย่างน้อยให้คงค่าเดิมและระบุว่า evidenceยังไม่พอ

ยังไม่มีชุด L/M/H ต่อหน่วยที่เจ้าของงานยืนยันครบ จึงไม่เสนอค่าตัวเลข L/M/H ใหม่ให้ใช้งานทันทีจาก aggregateข้างต้น

## การใช้ TypeSafe ที่เหมาะกับงานนี้

ใช้เพื่อเสนอ profile/activity จากรายการตัวเลือกที่มีอยู่ และตรวจข้อเท็จจริง เช่นมี business ruleหรือหลายระบบหรือไม่ โดยส่งเฉพาะ work packageที่จำเป็น ให้คนตรวจรายการที่หลักฐานขาดหรือไม่มั่นใจ การดึงตัวเลข, หน่วยนับ, สูตร, การป้องกันข้อมูลซ้ำ และคำนวณMDยังเป็น deterministic code

แนวทางนี้สอดคล้องกับ [เอกสาร TypeSafe](https://docs.typesafe.ai/llms.txt) ที่อธิบาย Choice/Score/Noul เป็น typed judgments แยกจากการสร้างข้อความ การวิเคราะห์รอบนี้ไม่ได้เรียก TypeSafe APIหรือส่ง workbookไปบริการภายนอก ยังต้องยืนยัน profile และชุดคำตอบอ้างอิงก่อนประเมินโมเดล

## การตรวจและข้อจำกัด

อ่าน XMLในXLSXแบบread-only เก็บค่าcacheและสูตร ไม่เปิดExcelเพื่อคำนวณใหม่ ตรวจ SHA-256 เทียบตอนดึงข้อมูลแล้วทั้ง24ไฟล์ไม่เปลี่ยน ตรวจผลรวม Smart Search Baseline/Planned กับยอดcacheได้ตรงกัน และเปรียบเทียบทุกcellของตารางหลักRCP/GRCได้ตรงกัน ตัวเลขที่เหลือเป็นการรวมคอลัมน์MDที่ระบุในตารางข้างต้น ไม่ใช่การรับรองสูตรทุกcellในทุกworkbook

คำสั่งทำซ้ำ: `scripts/analyze-historical-matrix.py inventory`, `profile`, `analyze` ตามลำดับ ด้วยPython3 รายละเอียดแหล่งและผลรวมอยู่ใน `reviewed-evidence.json` ไฟล์ raw cell/inventory/profileถูกgitignore เพราะอาจมีข้อมูลบุคคลที่ไม่เกี่ยวกับการปรับมาตรฐาน

เจ้าของงานตอบให้ทำตามข้อเสนอและแยก branch สำหรับการแก้โปรแกรมแล้ว รายละเอียดการใช้งานและสิ่งที่ยังต้องให้เจ้าของเอกสารกระทบยอดอยู่ใน `IMPLEMENTATION.md` ยังไม่เปลี่ยนตัวเลข L/M/H เพราะชุดข้อมูลต่อหน่วยที่ยืนยันยังไม่ครบ
