import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { GaugeCircle, AlertCircle, CheckCircle, Copy, Eye, EyeOff } from "lucide-react";

interface CreatedAccountInfo {
  email: string;
  password: string;
  uid: string;
}

export default function LoginPage() {
  const { firebaseUser, signIn, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCreatedBanner, setShowCreatedBanner] = useState<CreatedAccountInfo | null>(null);
  const [showBannerPassword, setShowBannerPassword] = useState(false);

  // Kiểm tra sessionStorage khi mount — có thể admin vừa tạo tài khoản xong
  useEffect(() => {
    const raw = sessionStorage.getItem("createdAccount");
    if (raw) {
      try {
        setShowCreatedBanner(JSON.parse(raw) as CreatedAccountInfo);
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  function handleDismissBanner() {
    sessionStorage.removeItem("createdAccount");
    setShowCreatedBanner(null);
  }

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

        {/* ── Banner: tài khoản vừa được tạo ── */}
        {showCreatedBanner && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-600" />
              <span className="font-medium text-emerald-800">Tạo tài khoản thành công!</span>
            </div>
            <div className="mb-2 space-y-1 text-sm text-emerald-700">
              <p><strong>Email:</strong> {showCreatedBanner.email}</p>
              <p className="flex items-center gap-2">
                <strong>Mật khẩu:</strong>
                <code className="rounded bg-white px-1.5 py-0.5 text-xs font-mono">
                  {showBannerPassword ? showCreatedBanner.password : "••••••••"}
                </code>
                <button
                  type="button"
                  onClick={() => setShowBannerPassword((v) => !v)}
                  className="text-emerald-600 hover:text-emerald-800"
                >
                  {showBannerPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Email: ${showCreatedBanner.email}\nMật khẩu: ${showCreatedBanner.password}`,
                  );
                }}
                className="flex-1 rounded border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
              >
                <Copy size={12} className="inline mr-1" />
                Sao chép
              </button>
              <button
                type="button"
                onClick={handleDismissBanner}
                className="flex-1 rounded border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
              >
                Đóng
              </button>
            </div>
          </div>
        )}

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