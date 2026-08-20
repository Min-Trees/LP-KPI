import { useAuditLogs } from "@/api/hooks";
import { formatDateTime } from "@/utils";

export default function AuditLogsPage() {
  const { data: logs = [], isLoading } = useAuditLogs();
  if (isLoading) return <div className="text-slate-500">Đang tải...</div>;
  const sorted = [...logs].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Audit Logs</h1>
        <p className="text-sm text-slate-500">Lịch sử thay đổi của Admin.</p>
      </div>
      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-100 text-left text-slate-700">
              <th className="px-3 py-2">Thời gian</th>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Hành động</th>
              <th className="px-3 py-2">Module</th>
              <th className="px-3 py-2">Entity</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((l) => (
              <tr key={l.id} className="border-b border-slate-100">
                <td className="px-3 py-2 text-xs">{formatDateTime(l.timestamp)}</td>
                <td className="px-3 py-2">{l.userName ?? l.userId}</td>
                <td className="px-3 py-2 font-mono text-xs">{l.action}</td>
                <td className="px-3 py-2">{l.module}</td>
                <td className="px-3 py-2 font-mono text-xs">{l.entityId ?? "-"}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">Chưa có log nào.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}