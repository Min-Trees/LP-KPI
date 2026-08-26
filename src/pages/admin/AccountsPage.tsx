import { useState } from "react";
import { Search, CheckCircle, RefreshCw, UserCircle, X, Copy, Eye, EyeOff, Loader } from "lucide-react";
import {
  useEmployees,
  useUpdateEmployee,
} from "@/api/hooks";
import { createFirestoreAccount } from "@/api/accounts";
import { ROLE_LABEL, ALL_ROLES } from "@/constants/roles";
import { BRANCHES } from "@/constants/branches";
import { ALL_PROGRAMS } from "@/constants/programs";
import type { Role } from "@/constants/roles";
import type { Branch } from "@/types/branch";
import type { Program } from "@/constants/programs";
import type { Employee } from "@/types";
import { formatDate, slugify } from "@/utils";
import { useAuth } from "@/features/auth/AuthProvider";
import { BranchSelector } from "@/components/common/BranchSelector";
import { isAdmin } from "@/features/auth/AuthProvider";

export default function AccountsPage() {
  const { appUser } = useAuth();
  const { data: employees = [], isLoading, refetch } = useEmployees();
  const updateEmployee = useUpdateEmployee();

  const [search, setSearch] = useState("");
  const [filterBranch, setFilterBranch] = useState<Branch | "">("");
  const [filterRole, setFilterRole] = useState<Role | "">("");
  const [filterStatus, setFilterStatus] = useState<"ACTIVE" | "INACTIVE" | "">("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [newStatus, setNewStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  const userIsAdmin = isAdmin(appUser?.role);

  const filtered = employees.filter((emp) => {
    // Chỉ hiển thị nhân viên đã có tài khoản đăng nhập (id = Firebase Auth UID)
    if (!emp.id) return false;
    if (search) {
      const s = search.toLowerCase();
      if (
        !emp.fullName.toLowerCase().includes(s) &&
        !emp.email.toLowerCase().includes(s) &&
        !emp.code.toLowerCase().includes(s)
      ) {
        return false;
      }
    }
    if (filterBranch && emp.branch !== filterBranch) return false;
    if (filterRole && emp.role !== filterRole) return false;
    if (filterStatus && emp.status !== filterStatus) return false;
    return true;
  });

  function openEdit(emp: Employee) {
    setEditingEmployee(emp);
    setNewStatus(emp.status);
  }

  async function handleSaveStatus() {
    if (!editingEmployee) return;
    await updateEmployee.mutateAsync({
      id: editingEmployee.id,
      patch: { status: newStatus },
    });
    setEditingEmployee(null);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <RefreshCw size={24} className="animate-spin mr-2" />
        Đang tải danh sách...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Quản lý tài khoản</h1>
          <p className="text-sm text-slate-500">
            Tổng: {filtered.length} / {employees.length} nhân viên
          </p>
        </div>
        {userIsAdmin && (
          <button
            className="btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <UserCircle size={16} /> Thêm tài khoản mới
          </button>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="card">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Search size={16} className="text-slate-400" />
          <input
            className="input max-w-sm"
            placeholder="Tìm theo tên, email, mã NV..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <BranchSelector
            value={filterBranch}
            onChange={setFilterBranch}
            placeholder="Tất cả cơ sở"
            className="w-40"
          />
          <select
            className="input w-40"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as Role | "")}
          >
            <option value="">Tất cả vai trò</option>
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </select>
          <select
            className="input w-36"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as "ACTIVE" | "INACTIVE" | "")}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="INACTIVE">Đã khóa</option>
          </select>
          <button
            className="btn-secondary ml-auto"
            onClick={() => void refetch()}
            title="Làm mới"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-100 text-left text-slate-700">
                <th className="px-3 py-2">Mã NV</th>
                <th className="px-3 py-2">Họ tên</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Cơ sở</th>
                <th className="px-3 py-2">Vai trò</th>
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2">Ngày tạo</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {[...filtered].sort((a, b) => a.id.localeCompare(b.id)).map((emp) => (
                <tr key={emp.id} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-mono">{emp.code}</td>
                  <td className="px-3 py-2 font-medium">{emp.fullName}</td>
                  <td className="px-3 py-2 text-slate-600">{emp.email}</td>
                  <td className="px-3 py-2">
                    <span className="badge bg-blue-100 text-blue-700">
                      {BRANCHES.find((b) => b.value === emp.branch)?.shortLabel ?? emp.branch}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="badge bg-purple-100 text-purple-700">
                      {ROLE_LABEL[emp.role] ?? emp.role}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {emp.status === "ACTIVE" ? (
                      <span className="badge bg-emerald-100 text-emerald-700 flex items-center gap-1 w-fit">
                        <CheckCircle size={12} /> Hoạt động
                      </span>
                    ) : (
                      <span className="badge bg-red-100 text-red-700 w-fit">
                        Đã khóa
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">{formatDate(emp.createdAt)}</td>
                  <td className="px-3 py-2">
                    {userIsAdmin && (
                      <button
                        className="btn-secondary text-xs px-2 py-1"
                        onClick={() => openEdit(emp)}
                      >
                        Khóa/Mở
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                    Không tìm thấy nhân viên nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create Account Modal ── */}
      {showCreateModal && (
        <CreateAccountModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            void refetch();
          }}
        />
      )}

      {/* ── Edit Status Modal ── */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="card w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-lg font-semibold mb-4">Cập nhật trạng thái</h2>
            <p className="text-sm text-slate-600 mb-3">
              <strong>{editingEmployee.fullName}</strong><br />
              <span className="font-mono text-xs">{editingEmployee.email}</span>
            </p>
            <div className="mb-4">
              <label className="label">Trạng thái tài khoản</label>
              <select
                className="input w-full"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as "ACTIVE" | "INACTIVE")}
              >
                <option value="ACTIVE">Hoạt động</option>
                <option value="INACTIVE">Đã khóa</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                className="flex-1 btn-secondary py-2"
                onClick={() => setEditingEmployee(null)}
              >
                Hủy
              </button>
              <button
                className="flex-1 btn-primary py-2"
                onClick={() => void handleSaveStatus()}
                disabled={updateEmployee.isPending}
              >
                {updateEmployee.isPending ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Create Account Modal ─────────────────────────────────────────────────────

const EMPTY_FORM = {
  fullName: "",
  code: "",
  email: "",
  password: "Littlepeople@2026",
  department: "",
  departmentType: "",
  position: "",
  program: "" as Program | "",
  role: "EMPLOYEE" as Role,
  branch: "LAI_THIEU" as Branch,
};

function CreateAccountModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [autoEmail, setAutoEmail] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [createdAccount, setCreatedAccount] = useState<{
    email: string;
    password: string;
    uid: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate email from name + code
  function handleNameChange(val: string) {
    setForm((f) => ({ ...f, fullName: val }));
    if (autoEmail) {
      const code = form.code || "CODE";
      setForm((f) => ({ ...f, email: `${slugify(val)}.${code}@littlepeople.edu.vn` }));
    }
  }

  function handleCodeChange(val: string) {
    setForm((f) => ({ ...f, code: val }));
    if (autoEmail) {
      const name = form.fullName || "name";
      setForm((f) => ({ ...f, email: `${slugify(name)}.${val}@littlepeople.edu.vn` }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // Validate
      if (!form.fullName.trim()) throw new Error("Họ tên không được để trống.");
      if (!form.code.trim()) throw new Error("Mã nhân viên không được để trống.");
      if (!form.email.trim()) throw new Error("Email không được để trống.");
      if (!form.password || form.password.length < 6) throw new Error("Mật khẩu phải có ít nhất 6 ký tự.");
      if (!form.department.trim()) throw new Error("Phòng ban không được để trống.");
      if (!form.role) throw new Error("Vai trò không được để trống.");
      if (!form.branch) throw new Error("Cơ sở không được để trống.");

      const result = await createFirestoreAccount({
        fullName: form.fullName.trim(),
        code: form.code.trim(),
        email: form.email.trim(),
        password: form.password,
        department: form.department.trim(),
        departmentType: form.departmentType.trim() || undefined,
        position: form.position.trim() || undefined,
        program: form.program || undefined,
        role: form.role,
        branch: form.branch,
      });

      setCreatedAccount({
        email: result.email,
        password: result.password,
        uid: result.uid,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định.";
      if (msg.includes("auth/email-already-exists") || msg.includes("email-already-exists")) {
        setError("Email đã tồn tại trong hệ thống. Vui lòng dùng email khác.");
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Success state
  if (createdAccount) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
        <div className="card w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle size={20} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Tạo tài khoản thành công!</h2>
              <p className="text-sm text-slate-500">Gửi thông tin đăng nhập cho nhân viên</p>
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 mb-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Email:</span>
              <span className="font-mono text-sm font-medium">{createdAccount.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Mật khẩu:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium">
                  {showPassword ? createdAccount.password : "••••••••"}
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">UID:</span>
              <span className="font-mono text-xs text-slate-500">{createdAccount.uid}</span>
            </div>
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-4">
            <p className="text-xs text-amber-700">
              <strong>Yêu cầu:</strong> Người dùng nên đổi mật khẩu sau khi đăng nhập lần đầu.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `Email: ${createdAccount.email}\nMật khẩu: ${createdAccount.password}`
                );
              }}
              className="flex-1 btn-secondary py-2"
            >
              <Copy size={14} /> Sao chép
            </button>
            <button onClick={onSuccess} className="flex-1 btn-primary py-2">
              Xong
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100">
              <UserCircle size={20} className="text-brand-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Thêm tài khoản mới</h2>
              <p className="text-sm text-slate-500">Tạo tài khoản đăng nhập cho nhân viên</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {/* Row 1: Họ tên + Mã NV */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Họ tên <span className="text-red-500">*</span></label>
              <input
                className="input w-full"
                value={form.fullName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Nguyen Van A"
                required
              />
            </div>
            <div>
              <label className="label">Mã nhân viên <span className="text-red-500">*</span></label>
              <input
                className="input w-full"
                value={form.code}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="2001"
                required
              />
            </div>
          </div>

          {/* Row 2: Email */}
          <div>
            <label className="label flex items-center gap-2">
              Email <span className="text-red-500">*</span>
              <label className="flex items-center gap-1 text-xs text-slate-500 font-normal ml-auto">
                <input
                  type="checkbox"
                  checked={autoEmail}
                  onChange={(e) => {
                    setAutoEmail(e.target.checked);
                    if (e.target.checked) {
                      handleCodeChange(form.code);
                    }
                  }}
                  className="w-3 h-3"
                />
                Tự động
              </label>
            </label>
            <input
              className="input w-full"
              type="email"
              value={form.email}
              onChange={(e) => {
                setForm((f) => ({ ...f, email: e.target.value }));
                setAutoEmail(false);
              }}
              placeholder="nguyen.van.a.2001@littlepeople.edu.vn"
              required
            />
          </div>

          {/* Row 3: Mật khẩu */}
          <div>
            <label className="label">Mật khẩu <span className="text-red-500">*</span></label>
            <div className="relative">
              <input
                className="input w-full pr-10"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Mặc định: Littlepeople@2026"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">Tối thiểu 6 ký tự. Mặc định: Littlepeople@2026</p>
          </div>

          {/* Row 4: Phòng ban + Loại phòng ban */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Phòng ban <span className="text-red-500">*</span></label>
              <input
                className="input w-full"
                value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                placeholder="Giáo viên"
                required
              />
            </div>
            <div>
              <label className="label">Loại phòng ban</label>
              <input
                className="input w-full"
                value={form.departmentType}
                onChange={(e) => setForm((f) => ({ ...f, departmentType: e.target.value }))}
                placeholder="Y tế, Thử viện..."
              />
            </div>
          </div>

          {/* Row 5: Chức vụ + Chương trình */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Chức vụ</label>
              <input
                className="input w-full"
                value={form.position}
                onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                placeholder="Giáo viên, Trợ giảng..."
              />
            </div>
            <div>
              <label className="label">Chương trình</label>
              <select
                className="input w-full"
                value={form.program}
                onChange={(e) => setForm((f) => ({ ...f, program: e.target.value as Program | "" }))}
              >
                <option value="">Không có</option>
                {ALL_PROGRAMS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 6: Vai trò + Cơ sở */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Vai trò <span className="text-red-500">*</span></label>
              <select
                className="input w-full"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
                required
              >
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Cơ sở <span className="text-red-500">*</span></label>
              <BranchSelector
                value={form.branch}
                onChange={(v) => setForm((f) => ({ ...f, branch: v as Branch }))}
                className="w-full"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary py-2">
              Hủy
            </button>
            <button type="submit" className="flex-1 btn-primary py-2" disabled={submitting}>
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader size={14} className="animate-spin" /> Đang tạo...
                </span>
              ) : (
                "Tạo tài khoản"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
