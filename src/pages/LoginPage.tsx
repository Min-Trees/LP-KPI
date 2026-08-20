import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { GaugeCircle, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const { firebaseUser, signIn, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && firebaseUser) {
    return <Navigate to="/dashboard" replace />;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Đăng nhập thất bại.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 p-6">
      <div className="w-full max-w-md card">
        <div className="mb-6 flex items-center gap-2">
          <GaugeCircle size={26} className="text-brand-600" />
          <h1 className="text-xl font-semibold">Đăng nhập hệ thống KPI</h1>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label className="label" htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          {error && (
            <div className="flex items-start gap-2 rounded-md bg-rose-50 p-3 text-sm text-rose-700">
              <AlertCircle size={16} className="mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={submitting}
          >
            {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-500">
          Cấu hình Firebase qua biến môi trường trong file <code>.env</code>.
        </p>
      </div>
    </div>
  );
}