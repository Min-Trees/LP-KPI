import { useParams } from "react-router-dom";
import { KpiSheetPage } from "@/features/kpi/KpiSheetPage";
import type { Program } from "@/constants/programs";

export default function KpiTeacherPage() {
  const { program } = useParams<{ program: string }>();
  const prog = (program === "HS" || program === "ST" ? program : "HS") as Program;
  const type = prog === "HS" ? "teacher_hs" : "teacher_st";
  return (
    <KpiSheetPage
      templateType={type}
      title={`KPI Giáo viên ${prog}`}
      programFilter={prog}
    />
  );
}