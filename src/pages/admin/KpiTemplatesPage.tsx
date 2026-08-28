import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit2, History } from "lucide-react";
import {
  useKpiTemplates,
  useCreateKpiTemplate,
  useUpdateKpiTemplate,
  useWriteAuditLog,
} from "@/api/hooks";
import { useAuth } from "@/features/auth/AuthProvider";
import type { KpiCriterion, KpiTemplate, KpiTemplateType, KpiVersion, RuleType } from "@/types";
import { formatDateTime } from "@/utils";

const ruleSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
  category: z.string().min(1),
  type: z.enum(["ADD", "SUBTRACT"]),
  points: z.coerce.number(),
  minPoints: z.coerce.number().optional(),
  maxPoints: z.coerce.number().optional(),
  note: z.string().optional(),
});

const criterionSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  weight: z.coerce.number().min(0).max(1),
  description: z.string().optional(),
  order: z.coerce.number(),
  rules: z.array(ruleSchema).min(1),
});

const schema = z.object({
  id: z.string().optional(),
  type: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  maxScorePerCriterion: z.coerce.number().default(105),
  totalFormula: z.enum(["WEIGHTED_AVG", "SUM", "AVG"]).default("WEIGHTED_AVG"),
  criteria: z.array(criterionSchema).min(1),
});

type FormValues = z.infer<typeof schema>;

const TEMPLATE_TYPES: { value: KpiTemplateType; label: string }[] = [
  { value: "manager", label: "Manager" },
  { value: "office_support", label: "Văn phòng + Hỗ trợ" },
  { value: "teacher_hs", label: "Giáo viên HS" },
  { value: "teacher_st", label: "Giáo viên ST" },
];

export default function KpiTemplatesPage() {
  const { data: templates = [], isLoading } = useKpiTemplates();
  const create = useCreateKpiTemplate();
  const update = useUpdateKpiTemplate();
  const writeLog = useWriteAuditLog();
  const { appUser } = useAuth();
  const [editing, setEditing] = useState<KpiTemplate | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [history, setHistory] = useState<KpiTemplate | null>(null);

  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyForm(),
  });

  const { fields: criterionFields, append: appendCriterion, remove: removeCriterion } = useFieldArray({
    control,
    name: "criteria",
  });

  function startCreate() {
    setEditing(null);
    reset(emptyForm());
    setShowForm(true);
  }

  function startEdit(t: KpiTemplate) {
    setEditing(t);
    setValue("id", t.id);
    setValue("type", t.type);
    setValue("name", t.name);
    setValue("status", t.status);
    setValue("maxScorePerCriterion", t.maxScorePerCriterion);
    setValue("totalFormula", t.totalFormula);
    setValue("criteria", t.criteria as KpiCriterion[]);
    setShowForm(true);
  }

  async function onSubmit(values: FormValues) {
    if (!appUser) return;
    const version = editing ? editing.version : (templates.filter((t) => t.type === values.type).length) + 1;
    const payload = {
      type: values.type,
      name: values.name,
      version,
      status: values.status,
      maxScorePerCriterion: values.maxScorePerCriterion,
      totalFormula: values.totalFormula,
      criteria: values.criteria as KpiCriterion[],
      createdBy: appUser.uid,
    } as Omit<KpiTemplate, "id" | "createdAt">;

    if (editing) {
      await update.mutateAsync({ id: editing.id, patch: payload });
    } else {
      await create.mutateAsync(payload);
    }
    await writeLog.mutateAsync({
      userId: appUser.uid,
      userName: appUser.displayName,
      action: editing ? "UPDATE_KPI_TEMPLATE" : "CREATE_KPI_TEMPLATE",
      module: "kpi_template",
      entityId: editing?.id ?? values.type,
      oldData: editing ?? null,
      newData: payload,
    });
    setShowForm(false);
    setEditing(null);
    reset();
  }

  if (isLoading) return <div className="text-slate-500">Đang tải...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">KPI Templates</h1>
          <p className="text-sm text-slate-500">Cấu hình tiêu chí, trọng số, quy tắc cộng/trừ.</p>
        </div>
        <button className="btn-primary" onClick={startCreate}>
          <Plus size={16} /> Tạo template
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {templates.map((t) => (
          <div key={t.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{t.name}</h3>
                <p className="text-xs text-slate-500">
                  Loại: {t.type} · Version {t.version} · Cap {t.maxScorePerCriterion}đ
                </p>
                <span className={`badge mt-2 ${t.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
                  {t.status}
                </span>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary" onClick={() => setHistory(t)}>
                  <History size={14} />
                </button>
                <button className="btn-secondary" onClick={() => startEdit(t)}>
                  <Edit2 size={14} /> Sửa
                </button>
              </div>
            </div>
            <ul className="mt-4 space-y-1 text-sm">
              {t.criteria.map((c) => (
                <li key={c.id} className="flex justify-between">
                  <span>{c.name}</span>
                  <span className="text-slate-500">{Math.round(c.weight * 100)}% · {c.rules.length} quy tắc</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {templates.length === 0 && (
          <div className="card text-sm text-slate-500">Chưa có template nào. Tạo mới để bắt đầu.</div>
        )}
      </div>

      {showForm && (
        <TemplateForm
          control={control}
          register={register}
          handleSubmit={handleSubmit}
          errors={errors}
          criterionFields={criterionFields}
          appendCriterion={appendCriterion}
          removeCriterion={removeCriterion}
          editing={!!editing}
          onClose={() => setShowForm(false)}
          watch={watch}
          onValid={onSubmit}
        />
      )}

      {history && <HistoryModal template={history} onClose={() => setHistory(null)} />}
    </div>
  );
}

function emptyForm(): FormValues {
  return {
    id: "",
    type: "manager",
    name: "Thưởng tuân thủ & Chất lượng công việc",
    status: "ACTIVE",
    maxScorePerCriterion: 105,
    totalFormula: "WEIGHTED_AVG",
    criteria: [
      {
        id: "discipline",
        code: "discipline",
        name: "Nội quy lao động & Kỷ luật lao động",
        weight: 0.4,
        order: 1,
        description: "Điều 4 - Phần A: Trọng số 40%",
        rules: [
          { code: "late_5_15", label: "Đi làm trễ hoặc về sớm > 5ph và <15ph có lý do chính đáng", category: "Nội quy lao động & Kỷ luật lao động", type: "SUBTRACT", points: -2 },
          { code: "late_15_30", label: "Đi làm trễ hoặc về sớm >15ph và < 30ph không có lý do chính đáng", category: "Nội quy lao động & Kỷ luật lao động", type: "SUBTRACT", points: -5 },
          { code: "late_30", label: "Đi làm trễ hoặc về sớm > 30ph không có lý do chính đáng", category: "Nội quy lao động & Kỷ luật lao động", type: "SUBTRACT", points: -8 },
          { code: "absent_no_reason", label: "Nghỉ không thông báo mà không có lý do chính đáng", category: "Nội quy lao động & Kỷ luật lao động", type: "SUBTRACT", points: -20 },
          { code: "absent_with_reason", label: "Nghỉ không thông báo nhưng có lý do chính đáng (có thể chứng minh)", category: "Nội quy lao động & Kỷ luật lao động", type: "SUBTRACT", points: -12 },
          { code: "violate_policy", label: "Không tuân thủ quy trình, nội quy của nhà trường", category: "Nội quy lao động & Kỷ luật lao động", type: "SUBTRACT", points: -10 },
          { code: "verbal_discipline", label: "Bị xử lý kỷ luật bằng hình thức khiển trách lời nói, email, zalo nhắc nhở", category: "Nội quy lao động & Kỷ luật lao động", type: "SUBTRACT", points: -20 },
          { code: "written_discipline", label: "Bị xử lý kỷ luật bằng hình thức khiển trách bằng văn bản", category: "Nội quy lao động & Kỷ luật lao động", type: "SUBTRACT", points: -30 },
          { code: "two_disciplines_quarter", label: "Có từ 02 biên bản xử lý kỷ luật trong quý", category: "Nội quy lao động & Kỷ luật lao động", type: "SUBTRACT", points: -100, note: "Về 0 điểm tiêu chí" },
          { code: "full_compliance", label: "Tuân thủ 100% nghiêm túc, đến sớm để chuẩn bị công việc chỉnh chu, chủ động nhắc nhở đồng nghiệp thực hiện tốt", category: "Nội quy lao động & Kỷ luật lao động", type: "ADD", points: 5, maxPoints: 5 },
        ],
      },
      {
        id: "expertise",
        code: "expertise",
        name: "Thực hiện chuyên môn & Chất lượng công việc",
        weight: 0.3,
        order: 2,
        description: "Điều 4 - Phần A: Trọng số 30%",
        rules: [
          { code: "overdue_work", label: "Trễn hạn công việc không có lý do chính đáng", category: "Thực hiện chuyên môn & Chất lượng công việc", type: "SUBTRACT", points: -5, minPoints: -2, maxPoints: -5 },
          { code: "doc_error", label: "Hồ sơ, sổ sách, báo cáo hoặc biểu mẫu sai sót, phải chỉnh sửa", category: "Thực hiện chuyên môn & Chất lượng công việc", type: "SUBTRACT", points: -6, minPoints: -3, maxPoints: -6 },
          { code: "incomplete_process", label: "Không thực hiện hoặc thực hiện không đầy đủ quy trình chuyên môn theo quy định của Công ty & Nhà trường", category: "Thực hiện chuyên môn & Chất lượng công việc", type: "SUBTRACT", points: -5 },
          { code: "third_remind", label: "Bị nhắc nhở từ lần thứ 3 trở lên", category: "Thực hiện chuyên môn & Chất lượng công việc", type: "SUBTRACT", points: -10 },
          { code: "serious_error", label: "Để xảy ra sai sót ảnh hưởng đến chất lượng chăm sóc, giáo dục hoặc hoạt động của Công ty & Nhà trường tuỳ mức độ nặng nhẹ", category: "Thực hiện chuyên môn & Chất lượng công việc", type: "SUBTRACT", points: -20, minPoints: -10, maxPoints: -20 },
          { code: "initiative_praised", label: "Có sáng kiến được áp dụng, Chủ động hỗ trợ đồng nghiệp, được Ban Giám hiệu hoặc Ban Giám đốc khen", category: "Thực hiện chuyên môn & Chất lượng công việc", type: "ADD", points: 10, maxPoints: 10 },
        ],
      },
      {
        id: "service",
        code: "service",
        name: "Chất lượng dịch vụ",
        weight: 0.3,
        order: 3,
        description: "Điều 4 - Phần A: Trọng số 30%",
        rules: [
          { code: "parent_complaint_verified", label: "Có khiếu nại của phụ huynh được xác minh là đúng", category: "Chất lượng dịch vụ", type: "SUBTRACT", points: -10 },
          { code: "serious_complaint", label: "Khiếu nại nghiêm trọng ảnh hưởng đến uy tín của Công ty & Nhà trường", category: "Chất lượng dịch vụ", type: "SUBTRACT", points: -30, minPoints: -15, maxPoints: -30 },
          { code: "bad_communication", label: "Giao tiếp, ứng xử với phụ huynh, học sinh hoặc đồng nghiệp không phù hợp", category: "Chất lượng dịch vụ", type: "SUBTRACT", points: -15, minPoints: -10, maxPoints: -15 },
          { code: "written_attitude_remind", label: "Bị nhắc nhở bằng văn bản về thái độ, tác phong phục vụ", category: "Chất lượng dịch vụ", type: "SUBTRACT", points: -20 },
          { code: "service_praised", label: "Được phụ huynh khen (email, tin nhắn, thư…); tích cực tham gia phong trào, BGH BGĐ khen về chất lượng dịch vụ", category: "Chất lượng dịch vụ", type: "ADD", points: 10, maxPoints: 10 },
        ],
      },
    ],
  };
}

function TemplateForm({
  control,
  register,
  handleSubmit,
  errors,
  criterionFields,
  appendCriterion,
  removeCriterion,
  editing,
  onClose,
  watch,
  onValid,
}: {
  control: ReturnType<typeof useForm<FormValues>>["control"];
  register: ReturnType<typeof useForm<FormValues>>["register"];
  handleSubmit: ReturnType<typeof useForm<FormValues>>["handleSubmit"];
  errors: ReturnType<typeof useForm<FormValues>>["formState"]["errors"];
  criterionFields: ReturnType<typeof useFieldArray<FormValues, "criteria">>["fields"];
  appendCriterion: ReturnType<typeof useFieldArray<FormValues, "criteria">>["append"];
  removeCriterion: ReturnType<typeof useFieldArray<FormValues, "criteria">>["remove"];
  editing: boolean;
  onClose: () => void;
  watch: ReturnType<typeof useForm<FormValues>>["watch"];
  onValid: (values: FormValues) => Promise<void>;
}) {
  const criteria = watch("criteria") ?? [];
  const totalWeight = criteria.reduce((s: number, c: { weight?: number }) => s + Number(c?.weight ?? 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <form onSubmit={(e) => { void handleSubmit(onValid)(e); }} className="card max-h-[90vh] w-full max-w-4xl space-y-4 overflow-y-auto">
        <h2 className="text-lg font-semibold">{editing ? "Sửa template" : "Tạo template"}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Loại</label>
            <select className="input" {...register("type")}>
              {TEMPLATE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tên</label>
            <input className="input" {...register("name")} />
            {errors.name && <p className="text-xs text-rose-600">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Trạng thái</label>
            <select className="input" {...register("status")}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
          <div>
            <label className="label">Cap điểm mỗi tiêu chí</label>
            <input className="input" type="number" {...register("maxScorePerCriterion")} />
          </div>
          <div>
            <label className="label">Công thức tổng</label>
            <select className="input" {...register("totalFormula")}>
              <option value="WEIGHTED_AVG">WEIGHTED_AVG</option>
              <option value="SUM">SUM</option>
              <option value="AVG">AVG</option>
            </select>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-medium">Tiêu chí ({criterionFields.length}) — Tổng trọng số: {(totalWeight * 100).toFixed(0)}%</h3>
            <button type="button" className="btn-secondary" onClick={() => appendCriterion({
              id: `c_${Date.now()}`, code: "", name: "", weight: 0, order: criterionFields.length + 1, rules: [],
            })}>
              <Plus size={14} /> Thêm tiêu chí
            </button>
          </div>
          {totalWeight !== 1 && <p className="mb-2 text-xs text-amber-700">⚠ Tổng trọng số nên = 100%.</p>}

          {criterionFields.map((field, ci) => (
            <CriterionEditor
              key={field.id}
              ci={ci}
              control={control}
              register={register}
              remove={() => removeCriterion(ci)}
            />
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Hủy</button>
          <button type="submit" className="btn-primary">{editing ? "Lưu" : "Tạo"}</button>
        </div>
      </form>
    </div>
  );
}

function CriterionEditor({
  ci,
  control,
  register,
  remove,
}: {
  ci: number;
  control: ReturnType<typeof useForm<FormValues>>["control"];
  register: ReturnType<typeof useForm<FormValues>>["register"];
  remove: () => void;
}) {
  const { fields: rules, append, remove: removeRule } = useFieldArray({ control, name: `criteria.${ci}.rules` as const });
  return (
    <div className="mb-4 rounded-lg border border-slate-200 p-4">
      <div className="grid grid-cols-5 gap-2">
        <div className="col-span-2">
          <label className="label">Tên tiêu chí</label>
          <input className="input" {...register(`criteria.${ci}.name` as const)} />
        </div>
        <div>
          <label className="label">Code</label>
          <input className="input" {...register(`criteria.${ci}.code` as const)} />
        </div>
        <div>
          <label className="label">Trọng số</label>
          <input className="input" type="number" step="0.01" {...register(`criteria.${ci}.weight` as const)} />
        </div>
        <div className="flex items-end">
          <button type="button" className="btn-danger w-full" onClick={remove}>Xóa</button>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-xs font-medium text-slate-600">Quy tắc ({rules.length})</p>
          <button
            type="button"
            className="text-xs text-brand-600 hover:underline"
            onClick={() =>
              append({
                code: `rule_${Date.now()}`,
                label: "",
                category: "",
                type: "SUBTRACT" as RuleType,
                points: -5,
              })
            }
          >
            + Thêm quy tắc
          </button>
        </div>
        {rules.map((r, ri) => (
          <div key={r.id} className="grid grid-cols-6 gap-2 py-1">
            <input className="input col-span-1" placeholder="Code" {...register(`criteria.${ci}.rules.${ri}.code` as const)} />
            <input className="input col-span-2" placeholder="Mô tả" {...register(`criteria.${ci}.rules.${ri}.label` as const)} />
            <input className="input" placeholder="Loại" {...register(`criteria.${ci}.rules.${ri}.category` as const)} />
            <select className="input" {...register(`criteria.${ci}.rules.${ri}.type` as const)}>
              <option value="SUBTRACT">SUBTRACT</option>
              <option value="ADD">ADD</option>
            </select>
            <input className="input" type="number" placeholder="Điểm" {...register(`criteria.${ci}.rules.${ri}.points` as const)} />
            <button type="button" className="btn-secondary" onClick={() => removeRule(ri)}>Xóa</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryModal({ template, onClose }: { template: KpiTemplate; onClose: () => void }) {
  const versions: KpiVersion[] = []; // hook sẽ load từ kpi_versions
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Lịch sử phiên bản — {template.name}</h2>
          <button className="btn-secondary" onClick={onClose}>Đóng</button>
        </div>
        <p className="text-xs text-slate-500">
          Phiên bản hiện tại: v{template.version} · Tạo lúc: {formatDateTime(template.createdAt)}
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          {versions.length === 0 && <li className="text-slate-500">Chưa có phiên bản lịch sử.</li>}
          {versions.map((v) => (
            <li key={v.id} className="rounded-md border border-slate-200 p-2">
              <p className="font-medium">v{v.version} · {formatDateTime(v.createdAt)}</p>
              <p className="text-xs text-slate-500">{v.changes.join("; ")}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}