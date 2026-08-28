import { useState } from "react";
import { Search, CheckCircle, RefreshCw, UserCircle, X, Copy, Eye, EyeOff, Loader, Trash2, Shield } from "lucide-react";
import {
  useEmployees,
  useUpdateEmployee,
  useUpdateUserPermissions,
} from "@/api/hooks";
import { deleteAccountOnly, createEmployeeWithAccount } from "@/api/accounts";
import { roleRequiresAccount } from "@/constants/roles";
import { ROLE_LABEL, ALL_ROLES, ROLE } from "@/constants/roles";
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
import { PermissionMatrix } from "@/components/admin/PermissionMatrix";

export default function AccountsPage() {
  const { appUser, signOut } = useAuth();
  const { data: employees = [], isLoading, refetch } = useEmployees();
  const updateEmployee = useUpdateEmployee();

  const [search, setSearch] = useState("");
  const [filterBranch, setFilterBranch] = useState<Branch | "">("");
  const [filterRole, setFilterRole] = useState<Role | "">("");
  const [filterStatus, setFilterStatus] = useState<"ACTIVE" | "INACTIVE" | "">("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [newStatus, setNewStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [permissionEmployee, setPermissionEmployee] = useState<Employee | null>(null);

  const userIsAdmin = isAdmin(appUser?.role);

  const filtered = employees.filter((emp) => {
    // Chỉ hiển thị nhân viên đã có tài khoản đăng nhập
    // (employee có field `uid` liên kết với Firebase Auth UID).
    if (!emp.id || !emp.uid) return false;
    if (emp.role === 'EMPLOYEE') return false;
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

  async function handleDeleteAccount(emp: Employee) {
    if (!emp.id) return;
    setDeletingId(emp.id);
    setDeleteError(null);
    try {
      await deleteAccountOnly(emp.id);
      await refetch();
      setDeletingEmployee(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setDeleteError(message);
    } finally {
      setDeletingId(null);
    }
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
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="btn-secondary text-xs px-2 py-1"
                          onClick={() => openEdit(emp)}
                        >
                          Khóa/Mở
                        </button>
                        <button
                          className="btn-secondary text-xs px-2 py-1"
                          onClick={() => setPermissionEmployee(emp)}
                          title="Phân quyền chi tiết"
                        >
                          <Shield size={12} /> Phân quyền
                        </button>
                        <button
                          className="btn-secondary text-xs px-2 py-1 text-rose-700 hover:bg-rose-50"
                          onClick={() => {
                            setDeletingEmployee(emp);
                            setDeleteError(null);
                          }}
                          disabled={emp.id === appUser?.uid}
                          title={emp.id === appUser?.uid ? "Không thể xóa chính bạn" : "Xóa tài khoản"}
                        >
                          <Trash2 size={12} /> Xóa
                        </button>
                      </div>
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

      {/* ── Delete Confirmation Modal ── */}
      {deletingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="card w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-lg font-semibold text-rose-700">Xóa tài khoản</h2>
            <p className="mt-2 text-sm text-slate-600">
              Bạn có chắc muốn xóa tài khoản của <strong>{deletingEmployee.fullName}</strong>?
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Email: <span className="font-mono">{deletingEmployee.email}</span>
            </p>
            <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
              Hành động này sẽ xóa vĩnh viễn Firebase Auth account và toàn bộ dữ liệu liên quan (users/employees docs). Không thể hoàn tác.
            </p>
            {deleteError && (
              <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{deleteError}</p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="flex-1 btn-secondary py-2"
                onClick={() => {
                  setDeletingEmployee(null);
                  setDeleteError(null);
                }}
                disabled={deletingId === deletingEmployee.id}
              >
                Hủy
              </button>
              <button
                type="button"
                className="flex-1 btn-primary py-2 bg-rose-600 hover:bg-rose-700"
                onClick={() => void handleDeleteAccount(deletingEmployee)}
                disabled={deletingId === deletingEmployee.id}
              >
                {deletingId === deletingEmployee.id ? "Đang xóa..." : "Xóa vĩnh viễn"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Permission Matrix Modal ── */}
      {permissionEmployee && (
        <PermissionMatrixModal
          employee={permissionEmployee}
          currentAdminUid={appUser?.uid ?? ""}
          onClose={() => setPermissionEmployee(null)}
          onSaved={() => {
            setPermissionEmployee(null);
            void refetch();
          }}
        />
      )}
    </div>
  );
}

// ─── Permission Matrix Modal ────────────────────────────────────────────────

function PermissionMatrixModal({
  employee,
  currentAdminUid,
  onClose,
  onSaved,
}: {
  employee: Employee;
  currentAdminUid: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const updatePermissions = useUpdateUserPermissions();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdminUser = employee.role === ROLE.ADMIN;

  function handleSave(permissions: Parameters<typeof updatePermissions.mutateAsync>[0]["permissions"]) {
    // QUAN TRỌNG: doc users/{uid} dùng Firebase Auth UID (không phải employee.id)
    // - Với createEmployeeWithAccount: employee.id === authUid → trùng → OK
    // - Với useCreateEmployee (tạo employee không có account): employee.id là "emp_xxx"
    //   và có thể chưa có tài khoản → cần fallback về employee.uid hoặc báo lỗi.
    const targetUid = (employee as { uid?: string }).uid || employee.id;
    setSaving(true);
    setError(null);
    updatePermissions.mutateAsync(
      { uid: targetUid, permissions, updatedBy: currentAdminUid },
    ).then(() => {
      onSaved();
    }).catch((err) => {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="card w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100">
              <Shield size={20} className="text-brand-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Phân quyền chi tiết</h2>
              <p className="text-xs text-slate-500">
                {employee.fullName} · <span className="font-mono">{employee.code}</span> · {ROLE_LABEL[employee.role]}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {isAdminUser ? (
            <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Tài khoản <strong>Admin</strong> luôn có toàn quyền trên hệ thống và không thể bị hạn chế.
            </div>
          ) : (
            <PermissionMatrix
              role={employee.role}
              uid={employee.id}
              onSave={handleSave}
              saving={saving}
            />
          )}
        </div>

        {error && (
          <div className="border-t border-slate-200 bg-rose-50 px-5 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Đóng
          </button>
        </div>
      </div>
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
      if (!roleRequiresAccount(form.role)) {
        throw new Error("Chỉ cấp quản lý mới được tạo tài khoản. Nhân viên thông thường sẽ không có tài khoản.");
      }

      const result = await createEmployeeWithAccount({
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

      // Lưu tạm thông tin tài khoản vào sessionStorage TRƯỚC KHI signOut
      // vì signOut sẽ unmount component → state bị mất.
      sessionStorage.setItem("createdAccount", JSON.stringify({
        email: result.email,
        password: result.password,
        uid: result.uid,
      }));

      await signOut();
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
