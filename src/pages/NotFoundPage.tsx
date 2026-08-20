import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6">
      <h1 className="text-6xl font-bold text-brand-600">404</h1>
      <p className="text-slate-600">Trang bạn tìm không tồn tại.</p>
      <Link to="/dashboard" className="btn-primary">Về Dashboard</Link>
    </div>
  );
}