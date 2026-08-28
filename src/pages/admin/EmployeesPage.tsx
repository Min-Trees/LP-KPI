import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Edit2, Trash2, UserPlus } from "lucide-react";
import {
  useEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
} from "@/api/hooks";
import { createAccountForEmployee } from "@/api/accounts";
import { ROLE_LABEL, ROLE, ALL_ROLES, MANAGER_ROLES, roleRequiresAccount } from "@/constants/roles";
import { PROGRAM_LABEL, ALL_PROGRAMS } from "@/constants/programs";
import { BRANCHES } from "@/constants/branches";
import { DEPARTMENTS, POSITIONS } from "@/constants/departments";
import type { Employee } from "@/types";
import type { Role } from "@/constants/roles";
import type { Branch } from "@/types/branch";
import { formatDate } from "@/utils";
import { useAuth } from "@/features/auth/AuthProvider";
import { BranchSelector } from "@/components/common/BranchSelector";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { isAdmin, isBranchManager } from "@/features/auth/AuthProvider";

const schema = z.object({
  code: z.string().min(1, "Bắt buộc"),
  fullName: z.string().min(1, "Bắt buộc"),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  phone: z.string().optional(),
  department: z.string().min(1, "Bắt buộc"),
  departmentType: z.string().optional(),
  position: z.string().optional(),
  program: z.enum(["HS", "ST", ""]).optional(),
  branch: z.enum(["LAI_THIEU", "LAO_CAI"]),
  managerId: z.string().optional(),
  role: z.enum(ALL_ROLES as unknown as [Role, ...Role[]]),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

type FormValues = z.infer<typeof schema>;

export default function EmployeesPage() {
  const { appUser, signOut } = useAuth();
  const { data = [], isLoading } = useEmployees();
  const create = useCreateEmployee();
  const update = useUpdateEmployee();
  const deleteEmp = useDeleteEmployee();
  const [editing, setEditing] = useState<Employee | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<Employee | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterBranch, setFilterBranch] = useState<Branch | "">("");
  const [filterRole, setFilterRole] = useState<Role | "">("");
  // Account creation modal
  const [creatingAccount, setCreatingAccount] = useState<Employee | null>(null);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("Littlepeople@2026");
  const [accountError, setAccountError] = useState<string | null>(null);
  const [creatingAccountId, setCreatingAccountId] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors: formErrors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: "",
      fullName: "",
      email: "",
      phone: "",
      department: "",
      departmentType: "",
      position: "",
      program: undefined,
      branch: "LAI_THIEU",
      managerId: "",
      role: ROLE.EMPLOYEE,
      status: "ACTIVE",
    },
  });

  const userIsAdmin = isAdmin(appUser?.role);
  const userIsBranchManager = isBranchManager(appUser?.role);
  const userBranch = appUser?.branch;

  // Merge default positions with existing positions from Firestore
  const existingPositions = useMemo(() => {
    const positions = new Set<string>(POSITIONS);
    data.forEach((e) => {
      if (e.position) positions.add(e.position);
    });
    return Array.from(positions).sort();
  }, [data]);

  // Merge default departments with existing departments from Firestore
  const existingDepartments = useMemo(() => {
    const depts = new Set<string>(DEPARTMENTS);
    data.forEach((e) => {
      if (e.department) depts.add(e.department);
    });
    return Array.from(depts).sort();
  }, [data]);

  function startCreate() {
    setEditing(null);
    reset();
    setShowForm(true);
  }

  function startEdit(emp: Employee) {
    setEditing(emp);
    setValue("code", emp.code);
    setValue("fullName", emp.fullName);
    setValue("email", emp.email ?? "");
    setValue("phone", emp.phone ?? "");
    setValue("department", emp.department);
    setValue("departmentType", emp.departmentType ?? "");
    setValue("position", emp.position ?? "");
    setValue("program", emp.program ?? undefined);
    setValue("branch", emp.branch);
    setValue("managerId", emp.managerId ?? "");
    setValue("role", emp.role);
    setValue("status", emp.status);
    setShowForm(true);
  }

  async function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      phone: values.phone || undefined,
      departmentType: values.departmentType || undefined,
      position: values.position || undefined,
      program: (values.program as string) || undefined,
      branch: values.branch,
      managerId: values.managerId || undefined,
      email: values.email || undefined,
    } as Omit<Employee, "id" | "createdAt" | "updatedAt">;

    if (editing) {
      await update.mutateAsync({ id: editing.id, patch: payload });
    } else {
      await create.mutateAsync(payload);
    }
    setShowForm(false);
    setEditing(null);
    reset();
  }

  async function handleDelete(emp: Employee) {
    setDeletingId(emp.id);
    setDeleteError(null);
    try {
      // Only delete employee document, NOT account
      await deleteEmp.mutateAsync(emp.id);
      setDeleting(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setDeleteError(message);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCreateAccount(emp: Employee) {
    setCreatingAccountId(emp.id);
    setAccountError(null);
    try {
      await createAccountForEmployee({
        employeeId: emp.id,
        email: accountEmail,
        password: accountPassword,
      });
      // Sau khi tạo tài khoản thành công, sign-out ngay để admin không bị
      // chuyển sang session của tài khoản vừa tạo (Firebase auto sign-in sau signUp).
      await signOut();
      setCreatingAccount(null);
      setAccountEmail("");
      setAccountPassword("Littlepeople@2026");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setAccountError(message);
    } finally {
      setCreatingAccountId(null);
    }
  }

  const filtered = data.filter((e) => {
    if (search && !`${e.fullName} ${e.code} ${e.email}`.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (userIsBranchManager && e.branch !== userBranch) return false;
    if (userIsAdmin && filterBranch && e.branch !== filterBranch) return false;
    if (!userIsAdmin && !userIsBranchManager && filterBranch && e.branch !== filterBranch) return false;
    if (filterRole && e.role !== filterRole) return false;
    return true;
  });

  if (isLoading) return <div className="text-slate-500">Đang tải...</div>;

  return (
    <div className="space-y-4">
      {/* Create Account Modal */}
      {creatingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="card w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold text-blue-700">Tạo tài khoản</h2>
            <p className="text-sm text-slate-600">
              Tạo tài khoản cho: <strong>{creatingAccount.fullName}</strong> ({creatingAccount.code})
            </p>
            <p className="text-xs text-slate-500">
              Chỉ cấp quản lý mới được tạo tài khoản đăng nhập.
            </p>
            <div>
              <label className="label">Email</label>
              <input
                className="input w-full"
                type="email"
                value={accountEmail}
                onChange={(e) => setAccountEmail(e.target.value)}
                placeholder="email@littlepeople.edu.vn"
              />
            </div>
            <div>
              <label className="label">Mật khẩu</label>
              <input
                className="input w-full"
                type="text"
                value={accountPassword}
                onChange={(e) => setAccountPassword(e.target.value)}
              />
            </div>
            {accountError && (
              <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{accountError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setCreatingAccount(null);
                  setAccountError(null);
                  setAccountEmail("");
                  setAccountPassword("Littlepeople@2026");
                }}
                disabled={!!creatingAccountId}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => void handleCreateAccount(creatingAccount)}
                disabled={!accountEmail || !accountPassword || !!creatingAccountId}
              >
                {creatingAccountId === creatingAccount.id ? "Đang tạo..." : "Tạo tài khoản"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="card w-full max-w-md">
            <h2 className="text-lg font-semibold text-rose-700">Xóa nhân viên</h2>
            <p className="mt-2 text-sm text-slate-600">
              Bạn có chắc muốn xóa nhân viên <strong>{deleting.fullName}</strong> ({deleting.code})?
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Hành động này chỉ xóa thông tin nhân sự. Tài khoản đăng nhập (nếu có) sẽ được giữ lại. Không thể hoàn tác.
            </p>
            {deleteError && (
              <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{deleteError}</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setDeleting(null);
                  setDeleteError(null);
                }}
                disabled={deletingId === deleting.id}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-primary bg-rose-600 hover:bg-rose-700"
                onClick={() => void handleDelete(deleting)}
                disabled={deletingId === deleting.id}
              >
                {deletingId === deleting.id ? "Đang xóa..." : "Xóa vĩnh viễn"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Quản lý nhân sự</h1>
          <p className="text-sm text-slate-500">Tổng: {data.length} nhân viên{data.length !== filtered.length && ` | Đang hiển thị: ${filtered.length}`}</p>
        </div>
        {userIsAdmin && (
          <button className="btn-primary" onClick={startCreate}>
            <Plus size={16} /> Thêm nhân viên
          </button>
        )}
      </div>

      <div className="card">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Search size={16} className="text-slate-400" />
          <input
            className="input max-w-sm"
            placeholder="Tìm theo tên, mã, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {(userIsAdmin || userIsBranchManager) && (
            <>
              {userIsAdmin && (
                <BranchSelector
                  value={filterBranch}
                  onChange={setFilterBranch}
                  placeholder="Tất cả cơ sở"
                  className="w-40"
                />
              )}
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
            </>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-100 text-left text-slate-700">
                <th className="px-3 py-2">Mã NV</th>
                <th className="px-3 py-2">Họ tên</th>
                <th className="px-3 py-2">Cơ sở</th>
                <th className="px-3 py-2">Phòng ban</th>
                <th className="px-3 py-2">Chương trình</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Tài khoản</th>
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2">Ngày tạo</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {[...filtered].sort((a, b) => a.id.localeCompare(b.id)).map((e) => {
                const hasAccount = !!e.uid;
                const canCreateAccount = roleRequiresAccount(e.role) && !hasAccount && userIsAdmin;
                return (
                  <tr key={e.id} className="border-b border-slate-100">
                    <td className="px-3 py-2 font-mono">{e.code}</td>
                    <td className="px-3 py-2 font-medium">{e.fullName}</td>
                    <td className="px-3 py-2">
                      <span className="badge bg-blue-100 text-blue-700">
                        {BRANCHES.find((b) => b.value === e.branch)?.shortLabel ?? e.branch}
                      </span>
                    </td>
                    <td className="px-3 py-2">{e.department}</td>
                    <td className="px-3 py-2">{e.program ? PROGRAM_LABEL[e.program] : "-"}</td>
                    <td className="px-3 py-2">{ROLE_LABEL[e.role]}</td>
                    <td className="px-3 py-2">
                      {hasAccount ? (
                        <span className="badge bg-emerald-100 text-emerald-700">Có tài khoản</span>
                      ) : (
                        <span className="badge bg-slate-100 text-slate-500">Chưa có</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`badge ${e.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">{formatDate(e.createdAt)}</td>
                    <td className="px-3 py-2">
                      {userIsAdmin && (
                        <div className="flex gap-2">
                          <button className="btn-secondary" onClick={() => startEdit(e)}>
                            <Edit2 size={14} /> Sửa
                          </button>
                          {canCreateAccount && (
                            <button
                              className="btn-secondary text-blue-700 hover:bg-blue-50"
                              onClick={() => {
                                setCreatingAccount(e);
                                setAccountError(null);
                                setAccountEmail(e.email || "");
                              }}
                            >
                              <UserPlus size={14} /> Tạo TK
                            </button>
                          )}
                          <button
                            className="btn-secondary text-rose-700 hover:bg-rose-50"
                            onClick={() => {
                              setDeleting(e);
                              setDeleteError(null);
                            }}
                            disabled={e.id === appUser?.uid}
                            title={e.id === appUser?.uid ? "Không thể xóa chính bạn" : "Xóa nhân viên"}
                          >
                            <Trash2 size={14} /> Xóa
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="px-3 py-8 text-center text-slate-500">Chưa có dữ liệu.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={(e) => { void handleSubmit(onSubmit)(e); }} className="card w-full max-w-2xl space-y-4">
            <h2 className="text-lg font-semibold">{editing ? "Sửa nhân viên" : "Thêm nhân viên"}</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Mã NV" error={formErrors.code?.message}>
                <input className="input" {...register("code")} />
              </Field>
              <Field label="Họ tên" error={formErrors.fullName?.message}>
                <input className="input" {...register("fullName")} />
              </Field>
              <Field label="Email" error={formErrors.email?.message}>
                <input className="input" type="email" {...register("email")} />
              </Field>
              <Field label="Số điện thoại">
                <input className="input" {...register("phone")} />
              </Field>
              <Field label="Phòng ban" error={formErrors.department?.message}>
                <SearchableSelect
                  value={watch("department")}
                  onChange={(v) => setValue("department", v)}
                  options={existingDepartments}
                  placeholder="Chọn hoặc gõ để tìm..."
                />
              </Field>
              <Field label="Loại phòng ban (vd: Y tế, thử viện)">
                <input className="input" {...register("departmentType")} />
              </Field>
              <Field label="Chức vụ">
                <SearchableSelect
                  value={watch("position") ?? ""}
                  onChange={(v) => setValue("position", v)}
                  options={existingPositions}
                  placeholder="Chọn hoặc gõ để tìm..."
                />
              </Field>
              <Field label="Cơ sở" error={formErrors.branch?.message}>
                <BranchSelector
                  value={editing?.branch ?? watch("branch")}
                  onChange={(v) => setValue("branch", v as Branch)}
                  className="w-full"
                />
              </Field>
              <Field label="Chương trình">
                <select className="input" {...register("program")}>
                  <option value="">-- Không --</option>
                  {ALL_PROGRAMS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Quản lý">
                <select className="input" {...register("managerId")}>
                  <option value="">-- Không có --</option>
                  {data.filter((emp) => MANAGER_ROLES.includes(emp.role)).map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.code})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Role" error={formErrors.role?.message}>
                <select className="input" {...register("role")}>
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Trạng thái">
                <select className="input" {...register("status")}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </Field>
            </div>
            <p className="text-xs text-slate-500">
              Lưu ý: Nhân viên thông thường sẽ không có tài khoản đăng nhập. Để tạo tài khoản, hãy sử dụng nút "Tạo TK" sau khi lưu.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Hủy</button>
              <button type="submit" className="btn-primary" disabled={create.isPending || update.isPending}>
                {editing ? "Lưu thay đổi" : "Tạo mới"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}