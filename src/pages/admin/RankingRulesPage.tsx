import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Save } from "lucide-react";
import { useRankingRules, useSaveRankingRules } from "@/api/hooks";
import { defaultRankingRules } from "@/utils";
import type { RankingBand, RankingRules } from "@/types";

export default function RankingRulesPage() {
  const { data: rules, isLoading } = useRankingRules();
  const save = useSaveRankingRules();
  const defaultRules = defaultRankingRules();

  const { register, handleSubmit, control, reset } = useForm<{ bands: RankingBand[]; name: string; status: "ACTIVE" | "INACTIVE" }>({
    defaultValues: { bands: defaultRules.bands, name: defaultRules.name, status: defaultRules.status },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "bands" });

  useEffect(() => {
    if (!isLoading && rules) {
      reset({ bands: rules.bands, name: rules.name, status: rules.status });
    }
  }, [isLoading, rules, reset]);

  async function onSubmit(values: { bands: RankingBand[]; name: string; status: "ACTIVE" | "INACTIVE" }) {
    const next: RankingRules = {
      id: rules?.id ?? defaultRules.id,
      name: values.name,
      status: values.status,
      bands: values.bands,
      updatedAt: new Date().toISOString(),
    };
    await save.mutateAsync(next);
  }

  if (isLoading) return <div className="text-slate-500">Đang tải...</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Xếp loại & Thưởng</h1>
        <p className="text-sm text-slate-500">Cấu hình các khoảng điểm → xếp loại → % thưởng.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Tên quy tắc</label>
            <input className="input" {...register("name")} />
          </div>
          <div>
            <label className="label">Trạng thái</label>
            <select className="input" {...register("status")}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-medium">Các khoảng ({fields.length})</h3>
            <button
              type="button"
              className="text-sm text-brand-600 hover:underline"
              onClick={() => append({ min: 0, max: 0, label: "Mới", bonusPercent: 0, rank: "DAT" })}
            >
              + Thêm khoảng
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-100 text-left text-slate-700">
                  <th className="px-2 py-1">Min</th>
                  <th className="px-2 py-1">Max</th>
                  <th className="px-2 py-1">Label</th>
                  <th className="px-2 py-1">Xếp loại</th>
                  <th className="px-2 py-1">% Thưởng</th>
                  <th className="px-2 py-1"></th>
                </tr>
              </thead>
              <tbody>
                {fields.map((f, i) => (
                  <tr key={f.id} className="border-b border-slate-100">
                    <td className="px-2 py-1"><input type="number" className="input" {...register(`bands.${i}.min` as const)} /></td>
                    <td className="px-2 py-1"><input type="number" className="input" {...register(`bands.${i}.max` as const)} /></td>
                    <td className="px-2 py-1"><input className="input" {...register(`bands.${i}.label` as const)} /></td>
                    <td className="px-2 py-1">
                      <select className="input" {...register(`bands.${i}.rank` as const)}>
                        <option value="XUAT_SAC">Xuất sắc</option>
                        <option value="TOT">Tốt</option>
                        <option value="DAT">Đạt</option>
                        <option value="CAN_CAI_THIEN">Cần cải thiện</option>
                      </select>
                    </td>
                    <td className="px-2 py-1"><input type="number" className="input" {...register(`bands.${i}.bonusPercent` as const)} /></td>
                    <td className="px-2 py-1">
                      <button type="button" className="btn-danger" onClick={() => remove(i)}>Xóa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={save.isPending}>
            <Save size={16} /> Lưu
          </button>
        </div>
      </form>
    </div>
  );
}