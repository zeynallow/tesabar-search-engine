"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck, Eye, EyeOff, Loader2 } from "lucide-react"
import { useLang } from "@/lib/i18n"

export default function AdminLoginPage() {
  const { t } = useLang()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  async function handleSubmit(e: React.BaseSyntheticEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL
      // Step 1: get token
      const res = await fetch(`${apiBase}/api/v1/console/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Login failed")

      // Step 2: verify admin role via /me
      const meRes = await fetch(`${apiBase}/api/v1/console/auth/me`, {
        headers: { Authorization: `Bearer ${data.access_token}` },
      })
      const me = await meRes.json()
      if (!meRes.ok || !me.is_admin) throw new Error("Access denied — admin only")

      localStorage.setItem("admin_token", data.access_token)
      router.push("/admin")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      {/* Subtle glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[400px] w-[400px] rounded-full bg-accent/[0.04] blur-[100px]" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground">
            <ShieldCheck className="h-7 w-7 text-background" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t("adminPanelTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("restrictedAccess")}</p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                {t("adminEmail")}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@tesabar.io"
                autoComplete="email"
                className="w-full rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-accent transition-colors"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("password")}</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-border bg-secondary px-4 py-2.5 pr-10 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-accent transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-destructive" />
                <span className="text-xs text-destructive">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("signInToAdmin")}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-[11px] text-muted-foreground/60">
          {t("restrictedNote")}
        </p>

        <div className="mt-4 text-center">
          <a href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← Back to Tesabar
          </a>
        </div>
      </div>
    </div>
  )
}

