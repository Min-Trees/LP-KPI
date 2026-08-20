Bạn là Senior Fullstack Developer. Hãy xây dựng một hệ thống quản lý KPI nội bộ dựa trên React + Firebase.

Tôi có một file Excel "Bảng chấm KPI 1.xlsx" chứa 4 sheet KPI:
1. Manager
2. Văn phòng + Hỗ trợ
3. Giáo viên HS
4. Giáo viên ST

Hãy phân tích file Excel này để hiểu:
- Cấu trúc dữ liệu
- Các tiêu chí KPI
- Công thức tính điểm
- Cách tổng hợp điểm
- Các trường dữ liệu cần lưu trữ

Mục tiêu:
Chuyển hệ thống KPI Excel thành một web application có phân quyền, workflow chấm điểm và báo cáo tự động.

==================================================
TECH STACK
==================================================

Frontend:
- React + TypeScript
- Vite
- TailwindCSS
- React Router
- React Hook Form
- React Query
- Recharts cho dashboard

Backend:
- Firebase Authentication
- Firebase Firestore
- Firebase Storage
- Firebase Cloud Functions

==================================================
YÊU CẦU HỆ THỐNG
==================================================

## 1. Authentication

Xây dựng hệ thống đăng nhập bằng Firebase Authentication.

User có thông tin:

users
{
 id,
 name,
 email,
 role,
 department,
 program
}


==================================================
## 2. PHÂN QUYỀN ROLE
==================================================

Có 5 nhóm quyền:


### ROLE: BOARD (BGĐ)

Quyền:
- Quản lý KPI Manager
- Xem toàn bộ báo cáo
- Xem KPI tất cả phòng ban
- Duyệt KPI


Được phép:
manager_kpi: edit


--------------------------------


### ROLE: OPERATION_MANAGER (QLCS)

Quyền:
- Chấm KPI Văn phòng + Hỗ trợ
- Xem nhân sự thuộc cơ sở


Được phép:

office_support_kpi: edit


--------------------------------


### ROLE: PROGRAM_MANAGER

Có thuộc tính:

program:
- HS
- ST


Nếu:

program = HS

=> được chấm sheet Giáo viên HS


Nếu:

program = ST

=> được chấm sheet Giáo viên ST


--------------------------------


### ROLE: EMPLOYEE

Quyền:

- Chỉ xem KPI cá nhân
- Không được sửa


==================================================
## 3. FIRESTORE DATABASE DESIGN
==================================================

Thiết kế database tối ưu.


Collections:


users

employees

kpi_templates

kpi_records

kpi_scores

approval_logs

notifications


Ví dụ:


kpi_records

{
 employeeId,
 type:
 "manager" |
 "office_support" |
 "teacher_hs" |
 "teacher_st",

month,
year,

criteria:[
 {
  name,
  standardScore,
  dailyScores,
  total
 }
 ],

totalScore,

rank,

status
}


==================================================
## 4. KPI WORKFLOW
==================================================


Trạng thái KPI:


DRAFT

↓

IN_PROGRESS

↓

SUBMITTED

↓

APPROVED

↓

LOCKED



Quy trình:


Người được phân quyền vào sheet của mình

↓

Chấm điểm

↓

Lưu tự động

↓

Submit

↓

Người duyệt kiểm tra

↓

Approve

↓

Khóa dữ liệu



==================================================
## 5. TÍNH TOÁN KPI TỰ ĐỘNG
==================================================


Không nhập công thức thủ công.


Hệ thống tự tính:


- Tổng điểm từng tiêu chí
- Tổng KPI
- Phần trăm hoàn thành
- Xếp loại


Ví dụ:


>=90:
Xuất sắc


80-89:
Tốt


65-79:
Đạt


<65:
Cần cải thiện



==================================================
## 6. GIAO DIỆN
==================================================


Thiết kế dashboard:


Dashboard:

- Tổng nhân sự
- Điểm KPI trung bình
- KPI tháng hiện tại
- Nhân sự nổi bật
- Nhân sự cần cải thiện


--------------------------------


KPI Manager Page

Bảng:


Nhân viên

Tiêu chí

Điểm chuẩn

Điểm thực tế

Tổng


--------------------------------


KPI Teacher Page


Lọc:

- Chương trình
- Giáo viên
- Tháng


--------------------------------


Report Page:


Biểu đồ:

- KPI theo phòng ban
- So sánh tháng
- Ranking nhân viên



==================================================
## 7. TỰ ĐỘNG HÓA
==================================================


Implement:


1.
Tự tạo kỳ KPI mỗi tháng


2.
Tự khóa KPI khi hết hạn


3.
Gửi notification khi:

- Có KPI cần chấm
- Có KPI chờ duyệt
- KPI được duyệt


4.
Lưu lịch sử thay đổi:


audit_logs:

{
 user,
 action,
 oldValue,
 newValue,
 timestamp
}



==================================================
## 8. FIREBASE SECURITY RULES
==================================================


Viết rules đảm bảo:


BGĐ:

- edit manager KPI
- view all


QLCS:

- edit office KPI


QLCT HS:

- edit teacher_hs


QLCT ST:

- edit teacher_st


Employee:

- read only self data



==================================================
## 9. CODE QUALITY
==================================================


Yêu cầu:


- Clean Architecture
- Component reusable
- TypeScript strict mode
- Không viết code duplicate
- Có loading state
- Có error handling
- Responsive UI


==================================================
## 10. QUY TRÌNH TRIỂN KHAI
==================================================


Hãy thực hiện theo từng phase:


PHASE 1:
Phân tích file Excel
- Extract dữ liệu
- Đề xuất database schema
- Xác định công thức KPI


PHASE 2:
Setup React + Firebase project


PHASE 3:
Authentication + Role Permission


PHASE 4:
Xây dựng KPI Manager


PHASE 5:
Xây dựng KPI Văn phòng + Hỗ trợ


PHASE 6:
Xây dựng KPI Giáo viên HS/ST


PHASE 7:
Dashboard + Report


PHASE 8:
Security + Testing


Bắt đầu bằng việc:
1. Đọc file Excel KPI.
2. Phân tích cấu trúc dữ liệu.
3. Đề xuất Firestore schema.
4. Không code UI trước khi thống nhất database.

==================================================
## 11. ADMIN SYSTEM MANAGEMENT
==================================================

Xây dựng thêm ROLE: ADMIN


ADMIN là quyền cao nhất trong hệ thống.

ADMIN có toàn quyền cấu hình và quản trị hệ thống KPI.


==================================================
## QUẢN LÝ NHÂN SỰ
==================================================


Admin có thể:


1. Thêm nhân viên mới


Form:

- Mã nhân viên
- Họ tên
- Email
- Số điện thoại
- Phòng ban
- Chức vụ
- Chương trình
- Người quản lý trực tiếp
- Role


Ví dụ:


Nguyễn Văn A

Department:
Teacher

Program:
HS

Manager:
QLCT HS


Sau khi tạo:

- Tự tạo tài khoản Firebase Auth
- Gán quyền
- Gửi email kích hoạt



--------------------------------


2. Chỉnh sửa nhân viên


Admin có thể:

- Đổi thông tin cá nhân
- Đổi phòng ban
- Đổi chương trình
- Đổi người quản lý
- Đổi role


Ví dụ:


Giáo viên HS chuyển sang ST:


program:

HS

↓

ST


Hệ thống tự cập nhật quyền chấm KPI.



--------------------------------


3. Khóa / vô hiệu hóa nhân viên


Không xóa dữ liệu KPI cũ.


Thay đổi trạng thái:


ACTIVE

INACTIVE



==================================================
## KPI CONFIGURATION MANAGEMENT
==================================================


Không hard-code tiêu chí KPI.


Toàn bộ KPI phải quản lý bằng database.



Collection:


kpi_templates



Ví dụ:


kpi_templates

{

type:
"teacher_hs",


name:
"Giáo viên HS",


criteria:[

{

id:"teaching_quality",

name:
"Chất lượng giảng dạy",


weight:
30,


maxScore:
10,


formula:
"average"

},


{

id:"discipline",

name:
"Kỷ luật",


weight:
20,


formula:
"sum"

}


]

}



==================================================
## ADMIN CÓ THỂ THAY ĐỔI KPI
==================================================


Admin có thể:


1. Thêm tiêu chí KPI mới


Ví dụ:


Thêm:

"Thái độ phục vụ"


Không cần sửa code.


--------------------------------


2. Xóa / ẩn tiêu chí


Không xóa dữ liệu lịch sử.


Chỉ chuyển:


status:

ACTIVE

INACTIVE



--------------------------------


3. Thay đổi trọng số


Ví dụ:


Cũ:


Chuyên môn:

40%



Mới:


Chuyên môn:

50%



Hệ thống tự tính lại KPI theo cấu hình mới.



--------------------------------


4. Thay đổi điểm chuẩn


Ví dụ:


Hoàn thành tốt:


10 điểm


Có thể chỉnh thành:


15 điểm



--------------------------------


5. Quản lý công thức tính KPI


Không viết cố định trong code.


Admin có thể cấu hình:



Formula Type:


- SUM
- AVG
- WEIGHTED_AVG
- PERCENTAGE
- CUSTOM



Ví dụ:


Công thức:


KPI =

(
Điểm tiêu chí 1 * 40%

+

Điểm tiêu chí 2 * 30%

+

Điểm tiêu chí 3 * 30%

)



==================================================
## KPI VERSION CONTROL
==================================================


Mỗi lần Admin thay đổi KPI:


Tạo version mới.


Ví dụ:


Teacher HS KPI:


Version 1:

01/2026


Version 2:

08/2026



Không ảnh hưởng dữ liệu quá khứ.



Database:


kpi_versions


{

templateId,

version,

createdBy,

createdAt,

changes

}



==================================================
## SYSTEM SETTINGS
==================================================


Admin quản lý:


- Thời gian bắt đầu kỳ KPI
- Thời gian kết thúc kỳ KPI
- Deadline chấm
- Deadline duyệt
- Quy tắc xếp loại
- Các trạng thái KPI



Ví dụ:


Ranking:


90-100:

Xuất sắc


80-89:

Tốt


65-79:

Đạt


<65:

Cần cải thiện



Admin có thể chỉnh trực tiếp.



==================================================
## ADMIN DASHBOARD
==================================================


Dashboard Admin:


Hiển thị:


- Tổng nhân sự
- Tổng KPI đang chạy
- KPI chưa chấm
- KPI chờ duyệt
- Lịch sử thay đổi
- Cấu hình hiện tại



Menu Admin:


Users Management

Roles & Permissions

KPI Templates

Formula Settings

KPI Versions

System Settings

Audit Logs



==================================================
## AUDIT LOG SYSTEM
==================================================


Mọi hành động quan trọng phải lưu:


audit_logs


{

userId,

action,


module:


"employee"

"kpi_template"

"permission"


oldData,

newData,


timestamp

}



Ví dụ:


Admin thay đổi công thức:


Before:

AVG(score)


After:

WEIGHTED_AVG(score)



Lưu lịch sử để kiểm tra.



==================================================
## YÊU CẦU QUAN TRỌNG
==================================================


Thiết kế hệ thống theo hướng:

CONFIGURATION DRIVEN


Không hard-code:


- Role
- KPI criteria
- Formula
- Ranking
- Workflow


Mọi thay đổi nghiệp vụ trong tương lai phải thực hiện được từ Admin Panel mà không cần developer sửa code.