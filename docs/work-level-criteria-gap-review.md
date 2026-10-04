# ตรวจช่องว่างเกณฑ์ระดับงานจากใบประเมินโครงการเก่า

วันที่ตรวจ: 4 ตุลาคม 2026

## ขอบเขตและข้อสรุป

อ่านข้อมูลเซลล์จาก Excel ทั้ง 24 ไฟล์ใน `pttdigitalMD` รวมชีตรายละเอียด requirement, scope, breakdown และใบประเมิน แล้วเทียบกับ `src/lib/db/standard-matrix.json` และ `criteriaSnapshot()` ใน `src/lib/estimation-ai/policy.ts` ไม่ได้แก้ไขไฟล์ต้นฉบับหรือเกณฑ์ในระบบ

ควรเพิ่มเกณฑ์เฉพาะของ Activity ที่มีอยู่ก่อนเพิ่ม Activity ใหม่: Matrix ที่เก็บใน repository มี 50 Activity แต่ policy ปัจจุบันรองรับเกณฑ์เฉพาะ 17 Activity อีก 33 Activity ยังไม่พร้อมประเมินด้วยเกณฑ์เฉพาะ จำนวนนี้หมายถึงข้อมูลมาตรฐานใน repository ไม่ใช่การตรวจ master data ที่ผู้ใช้เพิ่มหรือแก้ในฐานข้อมูล

ใบประเมินเก่าช่วยระบุปัจจัยที่ควรถามและลักษณะงานที่ตกหล่น แต่ยังไม่เพียงพอสำหรับกำหนดช่วงตัวเลข L/M/H หรือปรับค่า MD แบบอัตโนมัติ ข้อเสนอด้านล่างเป็นร่างปัจจัยสำหรับเจ้าของมาตรฐาน ไม่ใช่เกณฑ์ที่อนุมัติแล้ว

## หลักฐานและเกณฑ์ที่ควรเติม

| กลุ่มงาน / Activity | หลักฐานที่ตรวจพบ | ช่องว่างและปัจจัยที่ควรเพิ่ม |
| --- | --- | --- |
| Workflow — 1.4 | eMOC GSP, `Breakdown_Rev2!E26`: Admin แก้ workflow ได้ มี Sequential/Parallel; Pyramid, `Summary_Option 1!B7`: ขยายผู้อนุมัติ L1–L2 เป็น L1–L5 | มี Activity แล้ว แต่ไม่มีเกณฑ์เฉพาะ ควรถามจำนวนขั้น, branch, ผู้อนุมัติแบบ parallel, การแก้ workflow ตอน runtime, reject/rework และการเชื่อมสถานะข้ามระบบ |
| Notification / Email template — 1.5, 13.3, 14.2 และ Job — 4 | eMOC GSP, `Breakdown_Rev2!E28`: สรุปรายเดือนและเตือนตามอายุ/สถานะ; Tank eMOC, `Scope of Work!B4`, `B9`: เตือนทุกวันจนอนุมัติและแจ้งตามขั้นตอน; Smart Search, `R6!B10`: ตั้ง To/CC และความถี่ได้ | แยกแจ้งทันที, ตั้งเวลา, เตือนซ้ำ, template ที่แก้ได้, การเลือกผู้รับตาม role/state และตรวจสอบผลการส่ง อย่านับ notification กับ job ซ้ำสำหรับขอบเขตเดียวกัน |
| Export / Print — 1.6, 13.2 | CTM, `Calsheet!C66:C67`: Export PowerPoint มีตารางและกราฟ; Procurement, `Requirements!E5`, `E17`: เอกสาร TOR ขนาดใหญ่; `Performance Tuning!B8:B10`, `B32`: สร้างเอกสารล่วงหน้าและดาวน์โหลดไฟล์ที่สร้างไว้ | เติมเกณฑ์ template/layout, chart/image, pagination, หลาย section/รูปแบบไฟล์, ขนาดเอกสาร และสร้างไฟล์เบื้องหลัง ควรขยายชื่อ Export ให้ครอบคลุม PowerPoint หลักฐานไม่ได้รองรับการตั้งว่า PowerPoint ทุกงานเป็น High |
| SSO / Permission / Session / Audit — 12.1–12.4 | Smart Search, `R10!B3:B6`: Azure AD/B2C MFA, CA&A และย้าย user/role; IRIN, `Scope!B12`, `B15`: shared device whitelist และ login audit; Pyramid, `Summary_Option 1!B5:B6`: สิทธิ์ระดับปุ่ม 49 หน้าจอและ extend session | มี Activity แล้วแต่ไม่มีเกณฑ์เฉพาะ ถาม identity provider, MFA/device policy, token flow, granularity ของสิทธิ์, จำนวนหน้าจอที่ได้รับผลกระทบ, session แบบ idle/absolute และข้อมูล audit ห้ามใช้จำนวน role อย่างเดียวแทนความซับซ้อนทั้งหมด |
| Interface / Master Sync / Job — 5.1–5.3, 4 | Smart Search, `R3!B11:B13`: คิวส่ง SAP, แจ้งสำเร็จ/ล้มเหลว, resend/cancel; IRIN, `Scope!B3:B11`: update/create/release และ rework ข้ามระบบ | เกณฑ์ปัจจุบันเน้นจำนวน field, one/two-way และจำนวนตาราง ควรเพิ่ม endpoint/action, mapping/transformation, async/queue, retry/resend, ป้องกันส่งซ้ำ, status consistency, transaction และความถี่ sync ต้องทบทวน 5.2 ซึ่งชื่อปัจจุบันคือ External Master Data Sync แต่ยังใช้เกณฑ์จำนวนตาราง SAP Master |
| Dashboard / Report / Data preparation — 2, 3 | Smart Search, `R9!B3:B8`: drill-down, prepare table และ pivot; IRIN, `Scope!B16`: สร้าง 12 view และแก้ 1 view สำหรับ Power BI; Pyramid, `Summary_Option 1!B8`: dashboard หลายมิติและ export PDF/Excel | เติมความซับซ้อน query/aggregation/KPI, data source, preparation/view, freshness และปริมาณข้อมูล แยกงานเตรียมข้อมูลออกเมื่อมีขอบเขตและแรงงานของตัวเอง เกณฑ์ dashboard ปัจจุบันครอบคลุม chart ไม่เกิน 4 และ drill-down ไม่เกิน 2; ค่าที่มากกว่ายังต้องตรวจทาน ไม่ถือเป็น High อัตโนมัติ |
| Import — 1.2 | Smart Search, `R3!B5`: validate Excel 9 ชีตและ map field กับหน้าจอ | CRUD ปัจจุบันรวม Import ในเงื่อนไข business logic แล้ว ควรทำตัวอย่างเฉพาะเรื่อง cross-sheet validation, duplicate/error handling, partial import/rollback และ mapping ให้ผู้ประเมินเลือกได้สม่ำเสมอ ไม่เพิ่มระดับเพียงเพราะมีปุ่ม Import |
| Migration / Upgrade — 6, 16.1–16.4 | eMOC GSP, `ICT_Manday!B27:B32`: extraction, transform, preload/postload sign-off; e-Provident, `enh202(Re)+security+CR V2!C36:C44`: .NET 2.0 → 4.8.1, SQL Server 2005/2008 R2 → 2022 และ retest ระบบที่เชื่อมต่อ; Pyramid, `Summary_Option 1!B4`: cleanse และ migrate user/role | ควรถาม source/target, version gap, schema/compatibility, cleansing, dependency, mock migration, reconciliation, downtime, cutover และ rollback จำนวนตารางอย่างเดียวไม่พอ งาน delivery profile migration ยังคงลง MD ตามบทบาทตามระบบปัจจุบัน |
| Security remediation / Retention — 7, 14.1 | e-Provident, `enh202(Re)+security+CR V2!C38`: findings จาก Acunetix/Coverity/Black Duck หลายระดับ; E-Recruit, `E-Recruit adjust before EA!C23`, `C31:C34`: auto-delete ผู้สมัครที่ไม่ active เกิน 2 ปี และแก้ผล scan | ใช้ unique root cause, remediation pattern, dependency change, regression/re-scan และ impact ประกอบระดับ ไม่ใช้จำนวน findings อย่างเดียว ส่วน retention ควรแยกลบตรงไปตรงมาออกจากข้อมูลที่มี reference, archive หรือข้อยกเว้น |
| Test / Regression / Performance — 11.1, 11.3, 11.4 และงานทดสอบชนิดใหม่ | Smart Search, `PTT Digital!C40:C41`: ประมาณ 40 test case; SAP LO, `SR21005626_Estimated Effort!B13`, `B15`: regression และ rollback; CTM, `Calsheet!C103`, `C158`: Performance Test | เติม module/interface/role/state ที่ทดสอบ, regression scope, test data และจำนวนรอบ retest จำนวนรอบ SIT/UAT อย่างเดียวไม่สะท้อน scope ควรมีประเภท Performance/Load Test แยกเมื่อมี script, workload และผลทดสอบเป็นสิ่งส่งมอบ |
| Deploy / DevOps / Support — 17.1–17.5 | RCP, `PTTDigital_Manday!B32`: pipeline front/back; Orchestra, `Digital_Manday!B16:B17`: transport/firewall; eMOC GSP, `ICT_Manday!B52:B53`: support 1 เดือนและ warranty 12 เดือน | เติม environment, pipeline/service, network dependency, approval/scan gate, release/cutover window และขอบเขต support ต้องแยกเวลา standby/warranty ออกจากแรงงานที่ลงทำงาน ไม่คูณเดือน warranty เป็น MD โดยตรง |
| Requirement / Design และงานแก้ไขระบบเดิม — 10.1–10.4 | iCMS, `DGT_Manday!B18`: เปลี่ยนข้อมูลกระทบ 16 เมนูพนักงาน, 2 เมนู Admin, 13 report และ 1 dashboard; `B27:B28`: จำกัดสิทธิ์เฉพาะจุด | เกณฑ์เดิมบางตัวใช้จำนวน issue/จุดแก้ หรือจำนวน form สำหรับโครงการใหม่ ควรเพิ่ม impacted components/modules, shared model, stakeholder/process และ reuse แยกขอบเขตเปลี่ยนแปลงข้ามระบบออกจากการแก้หน้าจอเล็กน้อย |

## ประเภทงานที่ควรพิจารณาเพิ่มจริง

1. **Performance Tuning**: มีหลักฐานชัดใน Procurement, `Performance Tuning!B3:B4`, `B12:B15`, `B22:B35` ทั้ง query/view/stored procedure, แยก schedule ต่อ pod และเปลี่ยนที่เก็บไฟล์ ควรแยกจาก CRUD หรือเพิ่ม subtype ที่กำหนดหน่วยนับชัดเจน ปัจจัยคือจุดคอขวด, ชั้นระบบที่ต้องแก้, ปริมาณข้อมูล, target response/throughput และการพิสูจน์ก่อน/หลัง
2. **Performance/Load Test**: แยกจาก tuning และ SIT/UAT เมื่อมี workload/script/ผลวัดเป็น deliverable ปัจจัยคือ scenario, concurrency, test data, environment และรอบทดสอบ
3. **SAP Configuration / ABAP-RICEF**: SAP LO, `SR21005626_Estimated Effort!B7:B8`, `B31:B32`, `B53:B54` มีปรับ pricing procedure และ FS/development/RICEF testing; e-Provident มี infotype/config ไม่ควรบังคับเป็น CRUD ทั่วไป เริ่มเป็นข้อมูลประกอบของ SAP profile และลง MD ตามบทบาทก่อน มีปัจจัย object/process/module, config เทียบ custom code, transport และ integration/regression impact
4. **Training / Knowledge Transfer**: มี 15.1 สำหรับเอกสาร แต่การจัดสอนเป็นอีกงาน เช่น Digital Job Card, `PTTDigital_Manday!B45:B47`, `B50` มี material, TTT, EUT และ technical training ถามจำนวน session, audience, duration และ delivery mode เพื่อไม่ซ้ำกับค่าทำคู่มือ

Rollout ต่างประเทศไม่จำเป็นต้องสร้าง Activity ใหม่ทันที เพราะมี delivery profile migration/rollout อยู่แล้ว แต่ควรมีข้อมูลประกอบ timezone, currency/tax, master data และ country-level permission: ClickNGo, `ClickNGo Calsheet!B10:B16`, `B24` มีรายละเอียดเหล่านี้ หลักฐานส่วนนี้เป็นงานช่วยตรวจ/ประสานของ PTT Digital ไม่ใช่แรงงานพัฒนาเองทั้งหมด

## ลำดับแนะนำ

1. เติมเกณฑ์ Activity เดิมที่มีหลักฐานตรง: 1.4–1.6, 12.1–12.4, 6, 7, 16.1/16.3 และ 17.1–17.5
2. ขยายปัจจัยของ 2, 3, 4, 5.1–5.3 และ 11.x รวมถึงแนวทางแบ่งงาน/นับจำนวน ไม่เพิ่มระดับจากคำว่า SAP, MFA, Import หรือ Export เพียงคำเดียว
3. เพิ่ม Performance Tuning, Performance/Load Test และ Training ส่วน SAP ให้เริ่มจาก profile-specific rubric ก่อนกำหนด Matrix MD ใหม่
4. ให้เจ้าของมาตรฐานยืนยันช่วง L/M/H และหน่วยนับก่อนเปลี่ยน policy, หน้าเกณฑ์, AI และ Excel ให้ใช้ข้อมูลชุดเดียวกัน

## คุณภาพข้อมูลที่ต้องคำนึง

- 24 ไฟล์ไม่เท่ากับ 24 ตัวอย่างอิสระ: ไฟล์ POT254773 ชื่อ RCP และ SAP S4-GRC มีข้อมูลเซลล์ที่อ่านได้ทุกชีตเหมือนกัน และชีตหลักของทั้งคู่ระบุโครงการ RCP จึงไม่ใช้เป็นสองหลักฐานแยกสำหรับ SAP GRC
- หลายไฟล์มีชีต revision/backup/option ห้ามรวมเป็นยอดหรือจำนวนตัวอย่างซ้ำ
- 6 ไฟล์ (POT261134, POT261243, POT261375, POT261434, POT261677, POT262125) มีหลัก ๆ เป็น resource/cost template ไม่มีรายละเอียดงานที่ใช้ตั้งเกณฑ์เฉพาะได้เพียงพอ อย่าอนุมานขอบเขตจากชื่อไฟล์
- POT255012 มีรายละเอียดต้นทุนและรายชื่อบทบาทเป็นหลัก ชื่อ Dual Run ชี้หัวข้อที่ควรขอข้อมูลเพิ่ม แต่ยังไม่เพียงพอสำหรับตั้งระดับความซับซ้อน dual run
- Scope of Work ของ Tank eMOC ระบุ migration/cleansing และ scan บางส่วนอยู่ Out of Scope ต้องรักษาความต่างระหว่างรายการงานใน template กับ scope ที่ตกลงจริง
- MD ในใบประเมินไม่ใช่ MD ใช้จริงโดยอัตโนมัติ และบางชีตมีการปรับราคา/งบ ต้องยืนยัน MD ประเมินตามเนื้องานก่อนใช้ปรับ Matrix
- การตรวจนี้อ่านค่าเซลล์และค่าที่ cache ไว้ ไม่ตีความรูปภาพ/shape หรือคำนวณสูตร Excel ใหม่ ข้อเสนออ้างอิงข้อความ scope/requirement เป็นหลัก
