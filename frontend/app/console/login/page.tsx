"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react"
import { useLang } from "@/lib/i18n"

export default function ConsoleLoginPage() {
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/console/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Login failed")
      localStorage.setItem("console_token", data.access_token)
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
          <blockquote className="text-2xl font-semibold leading-snug text-foreground mb-4">
            "Index your store. <br />
            <span className="text-accent">Reach millions</span> of shoppers."
          </blockquote>
          <p className="text-sm text-muted-foreground">
            Manage your site indexing, sitemaps, and ad campaigns from one place.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: t("indexedStores"), value: "10K+" },
            { label: "Products", value: "500M+" },
            { label: t("dailySearches"), value: "2M+" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-secondary p-4">
              <div className="text-xl font-bold text-foreground">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
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

          <h1 className="text-2xl font-bold text-foreground mb-1">{t("welcomeBack")}</h1>
          <p className="text-sm text-muted-foreground mb-8">
            {t("signInConsole")}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                {t("emailAddress")}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                {t("password")}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
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
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-xs text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>Sign In <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {t("noAccount")}{" "}
            <Link href="/console/register" className="text-accent hover:underline font-medium">
              {t("createOne")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

