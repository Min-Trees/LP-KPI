export const DEPARTMENTS = [
  "Giáo viên HS",
  "Giáo viên ST",
  "Văn phòng + Hỗ trợ",
] as const;

export type Department = (typeof DEPARTMENTS)[number];

export const POSITIONS = [
  "Bếp chính",
  "Bảo mẫu HS",
  "Giáo viên HS",
  "Bảo trì",
  "Tuyển sinh",
  "Giáo viên",
  "Giám đốc vận hành / QLCS Lái Thiêu",
  "Trưởng nhóm Sự kiện",
  "Trợ lý chuyên môn",
  "Chuyên viên nhân sự",
  "Bảo mẫu tầng",
  "Tạp vụ",
  "Cấp dưỡng",
  "Bảo mẫu",
  "Giáo viên hỗ trợ",
  "Hiệu trưởng",
  "Nhân viên kế toán",
  "Nhân viên Học vụ / Academic Assistant",
  "Nhân viên y tế",
  "Nhân viên hỗ trợ tầng",
  "Nhân viên vệ sinh",
  "Giáo viên tiếng Anh ESL",
] as const;

export type Position = (typeof POSITIONS)[number];
