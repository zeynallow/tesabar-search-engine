"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Globe, FileText, Megaphone, TrendingUp, Plus, ArrowRight, AlertCircle, CheckCircle2, Clock } from "lucide-react"
import { useLang } from "@/lib/i18n"

interface SiteSummary {
  id: string
  domain: string
  name: string
  status: string
  total_pages_indexed: number
  total_pages_with_issues: number
  last_crawled_at: string | null
}

export default function ConsoleDashboard() {
  const { t } = useLang()
  const [sites, setSites] = useState<SiteSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCampaigns, setActiveCampaigns] = useState<number | null>(null)

  const totalIndexed = sites.reduce((s, x) => s + x.total_pages_indexed, 0)
  const totalIssues = sites.reduce((s, x) => s + x.total_pages_with_issues, 0)

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("console_token") : null
    if (!token) { setLoading(false); return }
    const apiBase = process.env.NEXT_PUBLIC_API_URL
    const headers = { Authorization: `Bearer ${token}` }
    fetch(`${apiBase}/api/v1/console/sites`, { headers })
      .then((r) => r.json())
      .then(async (data) => {
        if (!Array.isArray(data)) return
        setSites(data)
        // Fetch campaigns for each site and count active ones
        const results = await Promise.all(
          data.map((site: SiteSummary) =>
            fetch(`${apiBase}/api/v1/console/sites/${site.id}/ads/campaigns`, { headers })
              .then((r) => r.json())
              .then((campaigns) => (Array.isArray(campaigns) ? campaigns.filter((c: { status: string }) => c.status === "active").length : 0))
              .catch(() => 0)
          )
        )
        setActiveCampaigns(results.reduce((a, b) => a + b, 0))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const stats = [
    { label: t("statTotalSites"), value: sites.length, icon: Globe, color: "text-accent" },
    { label: t("statPagesIndexed"), value: totalIndexed.toLocaleString(), icon: FileText, color: "text-blue-400" },
    { label: t("statIssues"), value: totalIssues, icon: AlertCircle, color: "text-amber-400" },
    { label: t("statActiveCampaigns"), value: activeCampaigns === null ? "—" : activeCampaigns, icon: Megaphone, color: "text-purple-400" },
  ]

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("dashboard")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("manageIndexedStores")}</p>
        </div>
        <Link
          href="/console/sites/new"
          className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          {t("addSite")}
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <div className="text-2xl font-bold text-foreground">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Sites */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-sm font-semibold text-foreground">{t("yourSites")}</h2>
          <Link href="/console/sites" className="flex items-center gap-1 text-xs text-accent hover:underline">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3 p-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-secondary" />
            ))}
          </div>
        ) : sites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Globe className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">{t("noSitesYet")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("addFirstSite")}</p>
            <Link href="/console/sites/new" className="mt-4 flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-medium text-accent-foreground hover:opacity-90">
              <Plus className="h-3.5 w-3.5" /> {t("addSite")}
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sites.map((site) => (
              <Link
                key={site.id}
                href={`/console/sites/${site.id}`}
                className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-secondary/50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-sm font-bold text-foreground">
                  {site.domain.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{site.name}</span>
                    <StatusBadge status={site.status} />
                  </div>
                  <span className="text-xs text-muted-foreground">{site.domain}</span>
                </div>
                <div className="hidden md:flex items-center gap-6 text-right">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{site.total_pages_indexed.toLocaleString()}</div>
                    <div className="text-[10px] text-muted-foreground">{t("indexed")}</div>
                  </div>
                  {site.total_pages_with_issues > 0 && (
                    <div>
                      <div className="text-sm font-semibold text-amber-400">{site.total_pages_with_issues}</div>
                      <div className="text-[10px] text-muted-foreground">{t("issues")}</div>
                    </div>
                  )}
                </div>
                <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useLang()
  if (status === "active") return (
    <span className="flex items-center gap-1 rounded-md bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
      <CheckCircle2 className="h-2.5 w-2.5" /> {t("statusActive")}
    </span>
  )
  if (status === "pending") return (
    <span className="flex items-center gap-1 rounded-md bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
      <Clock className="h-2.5 w-2.5" /> {t("statusPending")}
    </span>
  )
  return <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">{status}</span>
}

