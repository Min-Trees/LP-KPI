import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Edit2 } from "lucide-react";
import {
  useEmployees,
  useCreateEmployee,
  useUpdateEmployee,
} from "@/api/hooks";
import { ROLE_LABEL, ROLE, ALL_ROLES, MANAGER_ROLES } from "@/constants/roles";
import { PROGRAM_LABEL, ALL_PROGRAMS } from "@/constants/programs";
import { BRANCHES } from "@/constants/branches";
import type { Employee } from "@/types";
import type { Role } from "@/constants/roles";
import type { Branch } from "@/types/branch";
import { formatDate } from "@/utils";
import { useAuth } from "@/features/auth/AuthProvider";
import { BranchSelector } from "@/components/common/BranchSelector";
import { isAdmin } from "@/features/auth/AuthProvider";

const schema = z.object({
  code: z.string().min(1, "Bắt buộc"),
  fullName: z.string().min(1, "Bắt buộc"),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  phone: z.string().optional(),
  department: z.string().min(1, "Bắt buộc"),
  departmentType: z.string().optional(),
  position: z.string().optional(),
  program: z.enum(["HS", "ST", ""]).optional(),
  branch: z.enum(["LAO_CAI", "LAI_THIEU"]),
  managerId: z.string().optional(),
  role: z.enum(ALL_ROLES as unknown as [Role, ...Role[]]),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

type FormValues = z.infer<typeof schema>;

export default function EmployeesPage() {
  const { appUser } = useAuth();
  const { data = [], isLoading } = useEmployees();
  const create = useCreateEmployee();
  const update = useUpdateEmployee();
  const [editing, setEditing] = useState<Employee | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterBranch, setFilterBranch] = useState<Branch | "">("");
  const [filterRole, setFilterRole] = useState<Role | "">("");

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

  const filtered = data.filter((e) => {
    if (search && !`${e.fullName} ${e.code} ${e.email}`.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (filterBranch && e.branch !== filterBranch) return false;
    if (filterRole && e.role !== filterRole) return false;
    return true;
  });

  if (isLoading) return <div className="text-slate-500">Đang tải...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Quản lý nhân sự</h1>
          <p className="text-sm text-slate-500">Tổng: {filtered.length} nhân viên</p>
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
          {userIsAdmin && (
            <>
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
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2">Ngày tạo</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {[...filtered].sort((a, b) => a.id.localeCompare(b.id)).map((e) => (
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
                    <span className={`badge ${e.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">{formatDate(e.createdAt)}</td>
                  <td className="px-3 py-2">
                    {userIsAdmin && (
                      <button className="btn-secondary" onClick={() => startEdit(e)}>
                        <Edit2 size={14} /> Sửa
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-8 text-center text-slate-500">Chưa có dữ liệu.</td></tr>
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
                <input className="input" {...register("department")} />
              </Field>
              <Field label="Loại phòng ban (vd: Y tế, thử việc)">
                <input className="input" {...register("departmentType")} />
              </Field>
              <Field label="Chức vụ">
                <input className="input" {...register("position")} />
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