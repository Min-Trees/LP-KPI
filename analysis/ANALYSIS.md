# PHASE 1 — Phân tích file Excel & Đề xuất Database Schema

> File nguồn: `Bảng chấm KPI 1.xlsx` (50 KB, 4 sheets)
> Ngày phân tích: 19/08/2026

---

## 1. Cấu trúc chung của 4 sheets

Cả 4 sheets dùng chung **một layout bảng tính**, chỉ khác nhau danh sách nhân viên và tên tiêu chí:

| Vùng | Cột | Mô tả |
|------|-----|-------|
| Tiêu đề | A1 (merge A1:AM1) | `BẢNG CHẤM KPI 1` |
| Header | Hàng 3 | Mã NV \| Tên \| Tiêu chí \| Điểm chuẩn \| Điểm/Ngày (1→31) \| Tổng điểm \| Trọng số \| Điểm KPI \| % Thưởng |
| Cột ngày | E→AI (31 cột) | Số ngày 1–31 trong tháng |
| Cột A | A (Mã NV) | Merge 3 hàng cho mỗi nhân viên |
| Cột B | B (Tên) | Merge 3 hàng cho mỗi nhân viên (sheet Manager dùng VLOOKUP) |
| Cột C | C (Tiêu chí) | Tên tiêu chí (mỗi NV có 3 dòng = 3 tiêu chí) |
| Cột D | D (Điểm chuẩn) | Luôn = 100 |
| Cột AJ | AJ (Tổng điểm) | `=SUM(E:AI) + D` |
| Cột AK | AK (Trọng số) | 0.4 / 0.3 / 0.3 |
| Cột AL | AL (Điểm KPI) | `=AJ[i]*AK[i] + AJ[i+1]*AK[i+1] + AJ[i+2]*AK[i+2]` |
| Cột AM | AM (% Thưởng) | Nested IF theo thang điểm |
| Phần ghi chú | Hàng cuối (sau dữ liệu) | Quy tắc cộng/trừ điểm + Bảng quy đổi thưởng |

---

## 2. Danh sách nhân viên theo sheet

| Sheet | Mã NV | Tên | Số NV |
|-------|-------|-----|-------|
| **Manager** | 1001, 1002, 1003 | (VLOOKUP từ file lương) | 3 |
| **Văn phòng + Hỗ trợ** | 1004, 1005, 1023, 1024, 1025, 1026, 1029, 4001, 4002 | Nguyễn Lư Phượng Uyên, Huỳnh Phát Lộc, Lê Thị Trường An, Hoàng Đình Chinh, Vũ Thị Quýt, Nguyễn Thị Kiều Trinh, Nguyễn Thị Lệ Dung (Y tế), Huỳnh Thị Vân Trang, Ngô Thị Ánh Tuyết | 9 |
| **Giáo viên HS** | 1006, 1007, 1008, 1009, 1010, 1011 | Lê Thị Thanh Mai, Nguyễn Thị Thắm, Nguyễn Thị Băng Tâm, Nguyễn Kim Ngân, Bùi Thị Ngọc Diễm, Lê Thị Ngọc Tuyết | 6 |
| **Giáo viên ST** | 1012, 1013, 1014, 1015, 1016, 1017, 1018, 1019, 1020, 1021, 1022, 1027, 1028, 1030 | 14 NV | 14 |

**Tổng: 32 nhân viên.** Quy ước mã:
- `1xxx` = Giáo viên/Quản lý
- `4xxx` = Văn phòng + Hỗ trợ

---

## 3. Tiêu chí KPI theo từng sheet

| Sheet | Tiêu chí 1 | Trọng số | Tiêu chí 2 | Trọng số | Tiêu chí 3 | Trọng số |
|-------|------------|----------|------------|----------|------------|----------|
| Manager | Nội quy và kỷ luật | 0.4 | Chuyên môn, chất lượng giảng dạy | 0.3 | Chất lượng dịch vụ | 0.3 |
| Văn phòng + Hỗ trợ | Nội quy và kỷ luật | 0.4 | Chuyên môn | 0.3 | Chất lượng dịch vụ/Thái độ | 0.3 |
| Giáo viên HS | Nội quy và kỷ luật | 0.4 | Chuyên môn, chất lượng giảng dạy | 0.3 | Chất lượng dịch vụ | 0.3 |
| Giáo viên ST | Nội quy và kỷ luật | 0.4 | Chuyên môn, chất lượng giảng dạy | 0.3 | Chất lượng dịch vụ | 0.3 |

**Cấu trúc 3 tiêu chí với trọng số cố định 0.4 + 0.3 + 0.3 = 1.0** là quy tắc chung.
→ Vẫn lưu trong `kpi_templates` để Admin chỉnh được.

---

## 4. Công thức tính điểm (phát hiện từ Excel)

### 4.1. Điểm một tiêu chí (cột AJ)

```
Điểm_tiêu_chí = SUM(E:AI) + Điểm_chuẩn
              = Tổng(điểm ngày 1..31) + 100
```

- Bắt đầu từ **100** (điểm chuẩn).
- Cộng/trừ từng ngày theo sự kiện (đi muộn, nghỉ phép, khen thưởng, kỷ luật...).
- **Cap 105**: tổng điểm mỗi tiêu chí không được vượt quá 105.

### 4.2. Điểm KPI tổng (cột AL)

```
Điểm_KPI = Σ (Điểm_tiêu_chí[i] × Trọng_số[i])  với i = 1..3
         = ĐC1×0.4 + ĐC2×0.3 + ĐC3×0.3
```

Vì trọng số = 1.0 nên Điểm_KPI chính là **trung bình cộng có trọng số** = gần bằng trung bình 3 tiêu chí, nhưng vẫn có thể > 100.

### 4.3. Tỷ lệ thưởng (cột AM) — Nested IF

| Khoảng điểm KPI | % Thưởng |
|------------------|----------|
| > 100            | 105%     |
| 95 – 100         | 100%     |
| 90 – 94          | 90%      |
| 80 – 89          | 70%      |
| 70 – 79          | 50%      |
| < 70             | 0%       |

**Lưu ý:** Đây là `% thưởng`, không phải `xếp loại` (Xuất sắc/Tốt/Đạt/Cần cải thiện như prompt §5). Cần xác nhận nghiệp vụ với user.

### 4.4. Bảng quy tắc cộng/trừ điểm (lưu trong kpi_rules)

**Trừ điểm (Nội quy & Kỷ luật / Chất lượng công việc / Chất lượng dịch vụ):**

| Sự kiện | Mức phạt |
|---------|----------|
| Đi muộn/về sớm < 30 phút, không lý do chính đáng | -2 đ/lần |
| Đi muộn/về sớm 30–90 phút, không lý do | -5 đến -10 đ/lần |
| Nghỉ không báo trước, không lý do | -10 đ/lần |
| Nghỉ không báo trước, có lý do | -5 đ/lần |
| Không tuân thủ quy trình/nội quy | -5 đ/lần |
| Khiển trách miệng/email/zalo | -20 đ/lần |
| Khiển trách bằng văn bản | -30 đ/lần |
| Có 2 biên bản trong 01 quý | 0 đ (reset) |
| Không hoàn thành CV đúng hạn | -5 đ/lần |
| Hồ sơ/sổ sách/báo cáo sai sót | -5 đến -10 đ/lần |
| Không thực hiện đúng quy trình chuyên môn | -5 đ/lần |
| CV bị nhắc nhở nhiều lần | -5 đ/lần |
| Sai sót ảnh hưởng CS-GD | -10 đến -20 đ/lần |
| Có khiếu nại PH được xác minh đúng | -10 đ/lần |
| Khiếu nại nghiêm trọng ảnh hưởng uy tín | -20 đến -40 đ/lần |
| Giao tiếp/ứng xử không phù hợp | -10 đ/lần |
| Nhắc nhở bằng văn bản về thái độ | -5 đ/lần |

**Cộng điểm (Các khoản điểm thưởng):**

| Sự kiện | Mức thưởng |
|---------|-----------|
| Tuân thủ 100%, đến sớm, chuẩn bị chu đáo | + tối đa 10 đ |
| Chủ động nhắc nhở đồng nghiệp thực hiện tốt | (chưa có con số cụ thể) |
| Có sáng kiến, hỗ trợ đồng nghiệp | + tối đa 10 đ |
| BGH/BGĐ khen | (chưa có con số) |
| Được phụ huynh khen (email, tin nhắn) | + tối đa 10 đ |
| Tích cực tham gia phong trào, khen về CLDV | (chưa có con số) |

> **Cap**: Tổng điểm mỗi tiêu chí sau cộng/trừ ≤ 105.

---

## 5. Đề xuất Firestore Schema (configuration-driven)

Nguyên tắc: **Không hard-code role, tiêu chí, công thức, ranking, workflow.** Mọi thứ Admin chỉnh được từ UI.

```
users/{userId}                         {uid, email, displayName, photoURL,
                                        role, department, program, managerId,
                                        status: ACTIVE|INACTIVE, createdAt}

employees/{employeeId}                 {code, fullName, email, phone,
                                        department, position, program,
                                        managerId, role, status, joinedAt}

kpi_templates/{templateId}             {type: 'manager'|'office_support'|
                                              'teacher_hs'|'teacher_st',
                                        name, version, status: ACTIVE|INACTIVE,
                                        maxScorePerCriterion: 105,
                                        criteria: [
                                          {id, name, code, weight,
                                           description, order,
                                           rules: [{code, label, type:
                                                    'ADD'|'SUBTRACT',
                                                    points, minPoints, maxPoints,
                                                    note}]}
                                        ],
                                        totalFormula: 'WEIGHTED_AVG',
                                        createdBy, createdAt}

kpi_versions/{versionId}               {templateId, version: 1|2|...,
                                        snapshot: {...full criteria config...},
                                        changes: [...],
                                        createdBy, createdAt,
                                        effectiveFrom}

kpi_periods/{periodId}                 {month: 1..12, year,
                                        startDate, endDate,
                                        scoringDeadline, approvalDeadline,
                                        status: UPCOMING|OPEN|LOCKED|CLOSED,
                                        createdAt}

kpi_records/{recordId}                {employeeId, periodId,
                                        templateId, templateVersion,
                                        status: DRAFT|IN_PROGRESS|SUBMITTED|
                                                APPROVED|LOCKED|REJECTED,
                                        createdBy, submittedBy, approvedBy,
                                        submittedAt, approvedAt,
                                        criteria: [
                                          {criterionId, name, code, weight,
                                           baseScore: 100,
                                           dailyScores: {1: num, 2: num, ..., 31: num},
                                           total: num,
                                           events: [{date, ruleCode, points, note,
                                                     createdBy, createdAt}]
                                          }
                                        ],
                                        kpiScore: num,                // cột AL
                                        bonusPercent: num,           // cột AM
                                        rank: 'XUAT_SAC'|'TOT'|'DAT'|'CAN_CAI_THIEN',
                                        note, lockedAt}

audit_logs/{logId}                     {userId, action, module:
                                          'employee'|'kpi_template'|'permission'|
                                          'period'|'system',
                                        entityId,
                                        oldData, newData,
                                        timestamp}

notifications/{notificationId}         {userId, type, title, body, link,
                                        read: bool, createdAt}

ranking_rules/{ruleId}                 {name, bands: [
                                          {min, max, label, bonusPercent}
                                        ],
                                        status: ACTIVE|INACTIVE}

system_settings/period                 {scoringDayOfMonth, approvalDayOfMonth,
                                        defaultCap: 105}
```

### Các quyết định thiết kế chính

1. **`kpi_templates` lưu cả quy tắc cộng/trừ** (rules) → người dùng chỉ chọn rule + ngày, hệ thống tự tính.
2. **`dailyScores` lưu map `{day: points}`** để vẫn thể hiện dữ liệu lưới ngày như Excel.
3. **`kpi_records` snapshot `templateVersion`** → tính toán lại theo version cũ khi cần audit.
4. **`audit_logs` ghi mọi thay đổi** của Admin (template, role, period).
5. **`kpi_periods` tự động tạo** theo cron Cloud Function mỗi tháng (PHASE 7).
6. **Ngày `month` & `year` dùng để query** thay vì timestamp phức tạp.

### Công thức tính (frontend implementation)

```
với mỗi criterion:
  total = max(0, min(cap, baseScore + Σ(dailyScores[1..31])))

kpiScore = Σ(criterion.total × criterion.weight)
bonusPercent = rankingBand(kpiScore)   // từ ranking_rules
rank = label(band)
```

---

## 6. Open questions cần user xác nhận

1. **Trường "Tên" ở sheet Manager**: file dùng VLOOKUP từ file lương ngoài (không có trong workbook). Cần import danh sách tên thủ công, hay có file lương khác?
2. **Nhân viên "Lê Thị Trường An" (1023)** thuộc sheet VP+Hỗ trợ nhưng tên gợi ý vị trí giáo viên — có đúng không?
3. **Nhân viên có ghi chú "(thử việc)"** (1027, 1028, 1030) và "(Y tế)" (1029) — phân loại role/department thế nào?
4. **Ranking bands hiện tại (Excel)** dùng cho **% thưởng**, không phải xếp loại. Có tách riêng 2 bảng (ranking + bonus) hay gộp?
5. **Ngày bắt đầu kỳ KPI**: mặc định ngày 1 tháng → hết ngày cuối tháng, hay theo chu kỳ khác?
6. **3 tiêu chí với trọng số 0.4/0.3/0.3** là cố định hay Admin được chỉnh theo từng chương trình?