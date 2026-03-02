"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react"
import { useLang } from "@/lib/i18n"

export default function ConsoleRegisterPage() {
  const { t } = useLang()
  const [form, setForm] = useState({ email: "", password: "", full_name: "", company_name: "" })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  function set(key: string, val: string) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e: React.BaseSyntheticEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL
      // Step 1: register
      const res = await fetch(`${apiBase}/api/v1/console/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Registration failed")

      // Step 2: auto-login to get token
      const loginRes = await fetch(`${apiBase}/api/v1/console/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      })
      const tokenData = await loginRes.json()
      if (!loginRes.ok) throw new Error("Registered! Please sign in.")
      localStorage.setItem("console_token", tokenData.access_token)
      router.push("/console")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-card border-r border-border p-12">
        <Link href="/" className="flex flex-col items-start gap-0.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/tesabar_logo.svg"
            alt="Tesabar"
            className="h-7 dark:brightness-0 dark:invert transition-[filter]"
          />
          <span className="text-[9px] font-semibold tracking-[0.2em] uppercase text-muted-foreground leading-none">
            Console
          </span>
        </Link>
        <div>
          <h2 className="text-2xl font-semibold text-foreground mb-3">
            List your store on <span className="text-accent">Tesabar</span>
          </h2>
          <ul className="space-y-3">
            {[
              t("registerBenefit1"),
              t("registerBenefit2"),
              t("registerBenefit3"),
              t("registerBenefit4"),
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-border bg-secondary p-5">
          <p className="text-xs text-muted-foreground">
            {t("alreadyTrusted")}
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 flex flex-col items-start gap-0.5 lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/tesabar_logo.svg"
              alt="Tesabar"
              className="h-6 dark:brightness-0 dark:invert transition-[filter]"
            />
            <span className="text-[9px] font-semibold tracking-[0.2em] uppercase text-muted-foreground leading-none">
              Console
            </span>
          </Link>

          <h1 className="text-2xl font-bold text-foreground mb-1">{t("createAccount")}</h1>
          <p className="text-sm text-muted-foreground mb-8">{t("startIndexingToday")}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("fullName")}</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => set("full_name", e.target.value)}
                  placeholder="John Doe"
                  className="w-full rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("company")}</label>
                <input
                  type="text"
                  value={form.company_name}
                  onChange={(e) => set("company_name", e.target.value)}
                  placeholder="Acme Inc."
                  className="w-full rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-accent transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("emailAddress")}</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("password")}</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  required
                  minLength={8}
                  placeholder="Min 8 characters"
                  className="w-full rounded-xl border border-border bg-secondary px-4 py-2.5 pr-10 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-accent transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-xs text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{t("createAccountBtn")} <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {t("alreadyHaveAccount")}{" "}
            <Link href="/console/login" className="text-accent hover:underline font-medium">{t("signInConsole")}</Link>
          </p>
          <p className="mt-3 text-center text-[10px] text-muted-foreground/60">
            By creating an account you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  )
}

