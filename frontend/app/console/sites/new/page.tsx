"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Globe } from "lucide-react"
import { COUNTRIES } from "@/lib/countries"
import { useLang } from "@/lib/i18n"

export default function NewSitePage() {
  const { t, country: detectedCountry } = useLang()
  const [form, setForm] = useState({ domain: "", name: "", description: "", country: detectedCountry || "" })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const token = localStorage.getItem("console_token")
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/console/sites`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Failed to create site")
      router.push(`/console/sites/${data.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <Link href="/console/sites" className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> {t("backToSites")}
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">{t("addNewSite")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t("addNewSiteDesc")}</p>
      </div>

      <div className="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                {t("domain")} <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={form.domain}
                  onChange={(e) => set("domain", e.target.value)}
                  required
                  placeholder="mystore.com"
                  className="w-full rounded-xl border border-border bg-secondary pl-10 pr-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-accent transition-colors"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">{t("domainHint")}</p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                {t("siteName")} <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
                placeholder="My Awesome Store"
                className="w-full rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-accent transition-colors"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("country")}</label>
              <select
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
                className="w-full rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent transition-colors"
              >
                <option value="">{t("selectCountry")}</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("description")}</label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                placeholder="Brief description of your store..."
                className="w-full rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm text-foreground outline-none resize-none placeholder:text-muted-foreground/60 focus:border-accent transition-colors"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-2">{t("whatsNext")}</h3>
            <ul className="space-y-2">
              {[t("step1"), t("step2"), t("step3"), t("step4")].map((step, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[10px] font-bold text-accent mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ul>
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Link
              href="/console/sites"
              className="flex-1 rounded-xl border border-border bg-secondary px-4 py-2.5 text-center text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              {t("cancel")}
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90 active:scale-[0.98] disabled:opacity-60 transition-all"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("registerSite")}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

