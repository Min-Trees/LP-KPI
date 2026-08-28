import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, User, Award, Calendar, TrendingUp, Download, ChevronRight, AlertCircle, Building2, Briefcase } from "lucide-react";
import {
  getDb,
} from "@/config/firebaseInit";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import type { Employee, KpiPeriod, KpiRecord, KpiTemplate } from "@/types";
import { RANK_LABEL, STATUS_LABEL } from "@/utils/labels";

const RANK_COLOR: Record<string, string> = {
  XUAT_SAC: "bg-emerald-100 text-emerald-700 border-emerald-200",
  TOT: "bg-sky-100 text-sky-700 border-sky-200",
  DAT: "bg-amber-100 text-amber-700 border-amber-200",
  CAN_CAI_THIEN: "bg-rose-100 text-rose-700 border-rose-200",
};

const STATUS_COLOR: Record<string, string> = {
  APPROVED: "bg-emerald-100 text-emerald-700",
  LOCKED: "bg-slate-200 text-slate-700",
  REJECTED: "bg-rose-100 text-rose-700",
  SUBMITTED: "bg-amber-100 text-amber-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  DRAFT: "bg-slate-100 text-slate-600",
};

function safeDate(s?: string) {
  if (!s) return "-";
  try {
    return new Date(s).toLocaleDateString("vi-VN");
  } catch {
    return "-";
  }
}

function safeNum(n?: number | null, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "-";
  return n.toFixed(digits);
}

export default function KpiLookupPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCode = searchParams.get("code") ?? "";
  const initialName = searchParams.get("name") ?? "";

  const [searchCode, setSearchCode] = useState(initialCode);
  const [searchName, setSearchName] = useState(initialName);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [records, setRecords] = useState<KpiRecord[]>([]);
  const [periods, setPeriods] = useState<KpiPeriod[]>([]);
  const [loadingEmployee, setLoadingEmployee] = useState(false);
  const [employeeError, setEmployeeError] = useState<string | null>(null);

  const [selectedRecord, setSelectedRecord] = useState<KpiRecord | null>(null);
  const [template, setTemplate] = useState<KpiTemplate | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Auto-trigger search khi ?code= hoặc ?name= có sẵn (shareable link)
  useEffect(() => {
    if (initialCode || initialName) {
      void doSearch(initialCode, initialName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doSearch(code: string, name: string) {
    if (!code.trim() && !name.trim()) return;
    setIsSearching(true);
    setSearched(true);
    setSearchError(null);
    try {
      const db = getDb();
      let snap;
      if (code.trim()) {
        const q = query(
          collection(db, "employees"),
          where("code", "==", code.trim()),
          limit(5),
        );
        snap = await getDocs(q);
      } else {
        // Load all employees and filter client-side for substring search
        const allSnap = await getDocs(collection(db, "employees"));
        snap = allSnap; // reuse for iteration below
        const term = name.trim().toLowerCase();
        const list: Array<Employee & { id: string }> = [];
        allSnap.forEach((d) => {
          const emp = d.data() as Employee;
          if (emp.fullName?.toLowerCase().includes(term)) {
            list.push({ ...emp, id: d.id });
          }
        });
        setSearchResults(list);
        if (list.length === 0) {
          setSearchError(`Không tìm thấy nhân viên với tên "${name}".`);
        }
        setIsSearching(false);
        return;
      }
      const list: Array<Employee & { id: string }> = [];
      snap.forEach((d) => list.push({ ...(d.data() as Employee), id: d.id }));
      setSearchResults(list);
      if (list.length === 0) {
        setSearchError(`Không tìm thấy nhân viên${code ? ` với mã "${code}"` : ` với tên "${name}"`}.`);
      }
    } catch (err) {
      console.error(err);
      setSearchError(`L�i khi tìm kiếm: ${(err as Error).message ?? "unknown"}`);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }

  async function handleSearch() {
    const code = searchCode.trim();
    const name = searchName.trim();
    // Sync URL để có thể share link
    const params = new URLSearchParams();
    if (code) params.set("code", code);
    if (name) params.set("name", name);
    setSearchParams(params, { replace: true });
    setEmployee(null);
    setSelectedRecord(null);
    await doSearch(code, name);
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSearch();
  }

  async function handleSelectEmployee(emp: Employee) {
    setEmployee(emp);
    setSelectedRecord(null);
    setTemplate(null);
    setEmployeeError(null);
    setLoadingEmployee(true);
    try {
      const db = getDb();
      const periodSnap = await getDocs(collection(db, "kpi_periods"));
      const periodList: KpiPeriod[] = [];
      periodSnap.forEach((d) => periodList.push({ ...(d.data() as KpiPeriod), id: d.id }));
      setPeriods(periodList);

      // Query lấy tất cả records của nhân viên này (không lọc status)
      const recSnap = await getDocs(
        query(
          collection(db, "kpi_records"),
          where("employeeId", "==", emp.id),
          orderBy("periodId", "desc"),
        ),
      );
      const recList: KpiRecord[] = [];
      recSnap.forEach((d) => recList.push({ ...(d.data() as KpiRecord), id: d.id }));
      setRecords(recList);
    } catch (err) {
      console.error(err);
      setEmployeeError(`Lỗi khi tải dữ liệu: ${(err as Error).message ?? "unknown"}`);
    } finally {
      setLoadingEmployee(false);
    }
  }

  async function handleViewPeriod(rec: KpiRecord) {
    setSelectedRecord(rec);
    setLoadingDetail(true);
    try {
      const db = getDb();
      const tplSnap = await getDoc(doc(db, "kpi_templates", rec.templateId));
      if (tplSnap.exists()) {
        setTemplate({ ...(tplSnap.data() as KpiTemplate), id: tplSnap.id });
      } else {
        setTemplate(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  }

  const stats = useMemo(() => {
    if (records.length === 0) {
      return { total: 0, avg: null as number | null, latest: null as KpiRecord | null };
    }
    const total = records.length;
    const sum = records.reduce((a, r) => a + r.kpiScore, 0);
    const avg = sum / total;
    const latest = records[0];
    return { total, avg, latest };
  }, [records]);

  function exportPersonalCsv() {
    if (!employee || records.length === 0) return;
    const headers = [
      "STT", "Kỳ", "T� ngày", "Đến ngày", "Tiêu chí", "Trọng số (%)",
      "Ngày", "Mã rule", "Mô tả", "Loại", "Điểm", "Trạng thái",
    ];
    const rows: string[][] = [headers];
    let stt = 1;
    const periodMap = new Map(periods.map((p) => [p.id, p]));
    records.forEach((rec) => {
      const period = periodMap.get(rec.periodId);
      const periodLabel = period ? `T${period.month}/${period.year}` : rec.periodId;
      rec.criteria.forEach((crit) => {
        if (crit.events.length === 0) {
          rows.push([
            String(stt++),
            periodLabel,
            period ? safeDate(period.startDate) : "",
            period ? safeDate(period.endDate) : "",
            crit.name,
            String(Math.round(crit.weight * 100)),
            "", "", "", "", "",
            STATUS_LABEL[rec.status] ?? rec.status,
          ]);
          return;
        }
        crit.events.forEach((ev) => {
          rows.push([
            String(stt++),
            periodLabel,
            period ? safeDate(period.startDate) : "",
            period ? safeDate(period.endDate) : "",
            crit.name,
            String(Math.round(crit.weight * 100)),
            String(ev.date),
            ev.ruleCode,
            ev.note ?? "",
            ev.points >= 0 ? "Thưởng" : "Phạt",
            String(ev.points),
            STATUS_LABEL[rec.status] ?? rec.status,
          ]);
        });
      });
      rows.push([]);
      rows.push([
        "TỔNG KỲ",
        periodLabel,
        "", "", "", "", "", "", "", "",
        `${safeNum(rec.kpiScore, 2)} điểm · ${RANK_LABEL[rec.rank]} · ${rec.bonusPercent}%`,
        STATUS_LABEL[rec.status] ?? rec.status,
      ]);
    });
    const csvContent = rows.map((r) => r.map((c) => {
      const s = String(c ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(",")).join("\n");
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safe = (employee.fullName ?? "nhan-vien").replace(/\s+/g, "_");
    link.download = `KPI_${employee.code ?? "nv"}_${safe}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-100 rounded-full mb-4">
              <Award className="w-8 h-8 text-brand-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Tra cứu kết quả KPI</h1>
            <p className="text-slate-500 mt-2">
              Nhập mã nhân viên hoặc tên để xem kết quả KPI đã được duyệt
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Trang công khai · Không cần đăng nhập
            </p>
          </div>

          {/* Search Box */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-600 mb-1">Mã nhân viên</label>
                <input
                  type="text"
                  placeholder="VD: LC-001"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 text-lg"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-600 mb-1">Hoặc tên</label>
                <input
                  type="text"
                  placeholder="VD: Nguyễn Văn A"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 text-lg"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleSearch}
                  disabled={isSearching || (!searchCode.trim() && !searchName.trim())}
                  className="w-full sm:w-auto px-8 py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <Search size={20} />
                  {isSearching ? "Đang tìm..." : "Tra cứu"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Search Results */}
        {searched && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-700 mb-4">
              Kết quả tìm kiếm ({searchResults.length})
            </h2>
            {searchError && searchResults.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 mb-4">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <p className="text-amber-700">{searchError}</p>
              </div>
            )}
            {searchResults.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Không tìm thấy nhân viên nào</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {searchResults.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => handleSelectEmployee(emp)}
                    className="bg-white rounded-xl border border-slate-200 p-4 text-left hover:border-brand-300 hover:shadow-md transition-all flex items-center gap-4 w-full"
                  >
                    <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-brand-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900">{emp.fullName}</p>
                      <p className="text-sm text-slate-500">
                        {emp.code} · {emp.department}
                        {emp.position && ` · ${emp.position}`}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="badge bg-blue-100 text-blue-700">{emp.branch}</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Loading Employee */}
        {loadingEmployee && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full mx-auto mb-3" />
            <p className="text-slate-500">Đang tải thông tin KPI...</p>
          </div>
        )}

        {employeeError && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <p className="text-rose-700">{employeeError}</p>
          </div>
        )}

        {/* Employee Detail */}
        {employee && !loadingEmployee && (
          <div className="space-y-6">
            {/* Header card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-white flex-1">
                    <h2 className="text-2xl font-bold">{employee.fullName}</h2>
                    <p className="text-white/80">{employee.department}{employee.position && ` · ${employee.position}`}</p>
                  </div>
                  <button
                    onClick={exportPersonalCsv}
                    disabled={records.length === 0}
                    className="flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/25 disabled:opacity-50"
                    title="Tải toàn bộ KPI đã duyệt của bạn ra CSV"
                  >
                    <Download size={16} />
                    Xuất CSV
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-slate-50 rounded-xl">
                    <p className="text-3xl font-bold text-brand-600">{employee.code}</p>
                    <p className="text-sm text-slate-500 mt-1">Mã nhân viên</p>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-xl">
                    <p className="text-2xl font-bold text-slate-700">{employee.branch}</p>
                    <p className="text-sm text-slate-500 mt-1">Cơ sở</p>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-xl">
                    <p className="text-2xl font-bold text-slate-700">{stats.total}</p>
                    <p className="text-sm text-slate-500 mt-1">Kỳ đã duyệt</p>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-xl">
                    <p className="text-3xl font-bold text-emerald-600">
                      {stats.avg !== null ? safeNum(stats.avg, 1) : "-"}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">Điểm TB</p>
                  </div>
                </div>

                {stats.latest && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-emerald-600 font-medium">Kết quả KPI gần nhất</p>
                        <p className="text-2xl font-bold text-emerald-700 mt-1">
                          {safeNum(stats.latest.kpiScore, 1)} điểm
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-600">
                          {periods.find((p) => p.id === stats.latest?.periodId)
                            ? `T${periods.find((p) => p.id === stats.latest!.periodId)!.month}/${periods.find((p) => p.id === stats.latest!.periodId)!.year}`
                            : stats.latest.periodId}
                        </p>
                        <span className={`badge mt-1 ${RANK_COLOR[stats.latest.rank] ?? "bg-slate-100"}`}>
                          {RANK_LABEL[stats.latest.rank] ?? stats.latest.rank}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* KPI History */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Lịch sử KPI đã duyệt
                </h3>
              </div>

              {records.length === 0 ? (
                <div className="p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Chưa có kết quả KPI</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {records.map((rec) => {
                    return (
                      <button
                        key={rec.id}
                        onClick={() => handleViewPeriod(rec)}
                        className="w-full px-6 py-4 text-left hover:bg-slate-50 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-brand-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-900">
                                {(() => {
                                  const p = periods.find((pp) => pp.id === rec.periodId);
                                  return p ? `T${p.month}/${p.year}` : rec.periodId;
                                })()}
                              </p>
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                rec.status === "APPROVED" || rec.status === "LOCKED"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : rec.status === "SUBMITTED"
                                  ? "bg-amber-100 text-amber-700"
                                  : rec.status === "REJECTED"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}>
                                {rec.status === "APPROVED" || rec.status === "LOCKED" ? "Đã duyệt"
                                  : rec.status === "SUBMITTED" ? "Chờ duyệt"
                                  : rec.status === "REJECTED" ? "Từ chối"
                                  : "Nháp"}
                              </span>
                            </div>
                            <p className="text-sm text-slate-500">
                              {(() => {
                                const p = periods.find((pp) => pp.id === rec.periodId);
                                return p ? `${safeDate(p.startDate)} — ${safeDate(p.endDate)}` : rec.templateType;
                              })()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xl font-bold text-slate-900">{safeNum(rec.kpiScore, 1)}</p>
                            <p className="text-sm text-slate-500">điểm</p>
                          </div>
                          <span className={`badge ${RANK_COLOR[rec.rank] ?? "bg-slate-100"}`}>
                            {RANK_LABEL[rec.rank] ?? rec.rank}
                          </span>
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Period Detail Modal */}
        {selectedRecord && (
          <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">Chi tiết KPI</h3>
                  <p className="text-sm text-slate-500">
                    {(() => {
                      const p = periods.find((pp) => pp.id === selectedRecord.periodId);
                      return p ? `T${p.month}/${p.year}` : selectedRecord.periodId;
                    })()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  aria-label="Đóng"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-6">
                {employee && (
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-brand-600" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{employee.fullName}</p>
                        <p className="text-sm text-slate-500">
                          {employee.code} · {employee.department}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Building2 size={14} className="text-slate-400" />
                        <span className="text-slate-500">Cơ sở:</span>
                        <span className="font-medium">{employee.branch}</span>
                      </div>
                      {employee.position && (
                        <div className="flex items-center gap-1.5">
                          <Briefcase size={14} className="text-slate-400" />
                          <span className="text-slate-500">Chức vụ:</span>
                          <span className="font-medium">{employee.position}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gradient-to-br from-brand-50 to-blue-50 rounded-xl border border-brand-100">
                    <p className="text-4xl font-black text-brand-600">{safeNum(selectedRecord.kpiScore, 1)}</p>
                    <p className="text-sm text-slate-500 mt-1">Điểm KPI</p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                    <span className={`inline-block badge ${RANK_COLOR[selectedRecord.rank] ?? "bg-slate-100"}`}>
                      {RANK_LABEL[selectedRecord.rank] ?? selectedRecord.rank}
                    </span>
                    <p className="text-sm text-slate-500 mt-2">Xếp loại</p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                    <p className="text-3xl font-bold text-amber-600">{selectedRecord.bonusPercent}%</p>
                    <p className="text-sm text-slate-500 mt-1">% Thưởng</p>
                  </div>
                </div>

                {selectedRecord.criteria.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-3">Điểm theo tiêu chí</h4>
                    <div className="space-y-3">
                      {selectedRecord.criteria.map((c, idx) => {
                        const base = 100;
                        const percent = Math.min(100, Math.max(0, (c.total / base) * 100));
                        const color = percent >= 90 ? "bg-emerald-500" : percent >= 70 ? "bg-amber-500" : "bg-rose-500";
                        return (
                          <div key={idx} className="bg-slate-50 rounded-lg p-3">
                            <div className="flex justify-between mb-2">
                              <span className="font-medium text-slate-700">{c.name}</span>
                              <span className="font-bold text-slate-900">{safeNum(c.total, 0)} đ</span>
                            </div>
                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${color} transition-all`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              Trọng số: {Math.round(c.weight * 100)}% · {c.events.length} sự kiện
                            </p>
                            {c.events.length > 0 && (
                              <details className="mt-2">
                                <summary className="text-xs text-brand-600 cursor-pointer hover:underline">
                                  Xem chi tiết {c.events.length} sự kiện
                                </summary>
                                <div className="mt-2 space-y-1">
                                  {c.events
                                    .slice()
                                    .sort((a, b) => a.date - b.date)
                                    .map((ev, i) => {
                                      const rule = template?.criteria.find((cc) => cc.rules.some((r) => r.code === ev.ruleCode))?.rules.find((r) => r.code === ev.ruleCode);
                                      return (
                                        <div key={i} className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded ${ev.points > 0 ? "bg-emerald-50" : "bg-rose-50"}`}>
                                          <span className="text-slate-500 w-12">Ngày {ev.date}</span>
                                          <span className="flex-1 text-slate-700">{rule?.label ?? ev.ruleCode}</span>
                                          <span className={`font-bold ${ev.points > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                            {ev.points > 0 ? "+" : ""}{ev.points}đ
                                          </span>
                                        </div>
                                      );
                                    })}
                                </div>
                              </details>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <div>
                    <p className="text-sm text-slate-500">Trạng thái</p>
                    <span className={`badge ${STATUS_COLOR[selectedRecord.status] ?? "bg-slate-100"}`}>
                      {STATUS_LABEL[selectedRecord.status] ?? selectedRecord.status}
                    </span>
                  </div>
                  {selectedRecord.approvedAt && (
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Ngày duyệt</p>
                      <p className="font-medium text-slate-700">{safeDate(selectedRecord.approvedAt)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {loadingDetail && (
          <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full mx-auto mb-3" />
              <p className="text-slate-500">Đang tải chi tiết KPI...</p>
            </div>
          </div>
        )}

        {!searched && !employee && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-slate-100 rounded-full mb-4">
              <Search className="w-12 h-12 text-slate-300" />
            </div>
            <p className="text-slate-400">Nhập mã nhân viên hoặc tên để tra cứu kết quả KPI</p>
            <p className="text-xs text-slate-300 mt-2">
              Thử: <code className="bg-slate-100 px-2 py-0.5 rounded">LC-001</code> hoặc tên của bạn
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 bg-white mt-auto">
        <div className="mx-auto max-w-5xl px-4 py-4 text-center text-sm text-slate-400">
          Hệ thống KPI nội bộ · Little People Education
        </div>
      </div>
    </div>
  );
}
