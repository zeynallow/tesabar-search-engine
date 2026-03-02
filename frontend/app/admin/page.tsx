"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Globe, Users, Activity, AlertCircle, CheckCircle2, Clock, TrendingUp, Database, Zap, ArrowRight } from "lucide-react"
import { useLang } from "@/lib/i18n"

interface AdminStats {
  total_sites: number
  active_sites: number
  total_users: number
  total_pages_indexed: number
  total_products_indexed: number
  total_active_campaigns: number
  indexing_jobs_running: number
  indexing_jobs_queued: number
  search_queries_today: number
  es_index_size_mb: number
}

interface RecentSite {
  id: string
  domain: string
  name: string
  status: string
  total_pages_indexed: number
  owner_email: string
}

const EMPTY_STATS: AdminStats = {
  total_sites: 0, active_sites: 0, total_users: 0,
  total_pages_indexed: 0, total_products_indexed: 0,
  total_active_campaigns: 0, indexing_jobs_running: 0,
  indexing_jobs_queued: 0, search_queries_today: 0, es_index_size_mb: 0,
}

export default function AdminDashboard() {
  const { t } = useLang()
  const [stats, setStats] = useState<AdminStats>(EMPTY_STATS)
  const [recentSites, setRecentSites] = useState<RecentSite[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null
    if (!token) { setLoading(false); return }
    const headers = { Authorization: `Bearer ${token}` }
    const base = process.env.NEXT_PUBLIC_API_URL
    Promise.all([
      fetch(`${base}/api/v1/admin/sites/stats`, { headers }).then((r) => r.json()),
      fetch(`${base}/api/v1/admin/sites?limit=5`, { headers }).then((r) => r.json()),
    ])
      .then(([statsData, sitesData]) => {
        setStats(statsData)
        if (Array.isArray(sitesData.items)) setRecentSites(sitesData.items)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const statCards = [
    { label: t("totalSites"), value: stats.total_sites, sub: `${stats.active_sites} ${t("active")}`, icon: Globe, color: "text-accent" },
    { label: t("registeredUsers"), value: stats.total_users, sub: "site owners", icon: Users, color: "text-blue-400" },
    { label: t("statPagesIndexed"), value: stats.total_pages_indexed.toLocaleString(), sub: "across all sites", icon: Database, color: "text-purple-400" },
    { label: t("searchQueriesToday"), value: stats.search_queries_today.toLocaleString(), sub: "real-time", icon: Zap, color: "text-yellow-400" },
    { label: t("jobsRunning"), value: stats.indexing_jobs_running, sub: `${stats.indexing_jobs_queued} ${t("queued")}`, icon: Activity, color: "text-emerald-400" },
    { label: t("activeCampaigns"), value: stats.total_active_campaigns, sub: "ad campaigns", icon: AlertCircle, color: "text-orange-400" },
  ]

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">{t("systemDashboard")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t("platformOverview")}</p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <div className="text-2xl font-bold text-foreground">{loading ? "—" : s.value}</div>
            <div className="text-[10px] text-muted-foreground mt-1">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Recent Sites */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-sm font-semibold text-foreground">{t("recentSites")}</h2>
          <Link href="/admin/sites" className="flex items-center gap-1 text-xs text-accent hover:underline">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="divide-y divide-border">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="px-6 py-4">
                <div className="h-10 animate-pulse rounded-xl bg-secondary" />
              </div>
            ))
          ) : recentSites.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">No sites yet</div>
          ) : recentSites.map((site) => (
            <Link
              key={site.id}
              href={`/admin/sites/${site.id}`}
              className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-secondary/50"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-sm font-bold text-foreground">
                {site.domain.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-foreground">{site.name}</span>
                  <StatusDot status={site.status} />
                </div>
                <span className="text-xs text-muted-foreground">{site.domain}</span>
              </div>
              <div className="hidden md:block text-right">
                <div className="text-sm font-semibold text-foreground">{site.total_pages_indexed.toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground">pages</div>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: t("manageSites"), href: "/admin/sites", icon: Globe, desc: t("manageSitesDesc") },
          { label: t("manageUsers"), href: "/admin/users", icon: Users, desc: t("manageUsersDesc") },
          { label: t("indexingJobs"), href: "/admin/indexing", icon: Activity, desc: t("indexingJobsDesc") },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 transition-all hover:border-accent/30 hover:shadow-[0_0_20px_rgba(80,200,120,0.06)]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10">
              <action.icon className="h-4 w-4 text-accent" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">{action.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{action.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const map: Record<string, { icon: React.ComponentType<{className?: string}>; cls: string }> = {
    active: { icon: CheckCircle2, cls: "text-accent" },
    pending: { icon: Clock, cls: "text-amber-400" },
    suspended: { icon: AlertCircle, cls: "text-orange-400" },
  }
  const cfg = map[status] || { icon: Globe, cls: "text-muted-foreground" }
  const Icon = cfg.icon
  return <Icon className={`h-3 w-3 ${cfg.cls}`} />
}

