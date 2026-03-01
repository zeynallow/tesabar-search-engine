"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Globe, CheckCircle2, Clock, XCircle, AlertCircle, ArrowRight } from "lucide-react"

interface Site {
  id: string
  domain: string
  name: string
  status: string
  is_domain_verified: boolean
  total_pages_indexed: number
  total_pages_with_issues: number
  total_pages_crawled: number
  last_crawled_at: string | null
  created_at: string
}

export default function ConsoleSitesPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("console_token") : null
    if (!token) { setLoading(false); return }
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/console/sites`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setSites(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sites</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your registered stores</p>
        </div>
        <Link
          href="/console/sites/new"
          className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          Add Site
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-secondary" />
          ))}
        </div>
      ) : sites.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-20 text-center">
          <Globe className="mb-3 h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm font-medium text-foreground mb-1">No sites yet</p>
          <p className="text-xs text-muted-foreground mb-5">Add your first store to start indexing</p>
          <Link href="/console/sites/new" className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-medium text-accent-foreground">
            <Plus className="h-3.5 w-3.5" /> Add Site
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sites.map((site) => (
            <Link
              key={site.id}
              href={`/console/sites/${site.id}`}
              className="group flex items-center gap-5 rounded-2xl border border-border bg-card p-5 transition-all hover:border-accent/30 hover:shadow-[0_0_20px_rgba(80,200,120,0.06)]"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-lg font-bold text-foreground">
                {site.domain.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-foreground">{site.name}</span>
                  <StatusBadge status={site.status} />
                  {site.is_domain_verified && (
                    <span className="flex items-center gap-1 rounded-md bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Verified
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{site.domain}</span>
                {site.last_crawled_at && (
                  <span className="ml-3 text-[10px] text-muted-foreground/70">
                    Last crawled: {new Date(site.last_crawled_at).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div className="hidden md:flex items-center gap-8">
                <Metric label="Indexed" value={site.total_pages_indexed.toLocaleString()} />
                <Metric label="Crawled" value={site.total_pages_crawled.toLocaleString()} />
                {site.total_pages_with_issues > 0 && (
                  <Metric label="Issues" value={site.total_pages_with_issues.toString()} highlight />
                )}
              </div>

              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="text-right">
      <div className={`text-sm font-semibold ${highlight ? "text-amber-400" : "text-foreground"}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ComponentType<{className?: string}>; cls: string; label: string }> = {
    active: { icon: CheckCircle2, cls: "bg-accent/10 text-accent", label: "Active" },
    pending: { icon: Clock, cls: "bg-amber-400/10 text-amber-400", label: "Pending" },
    suspended: { icon: AlertCircle, cls: "bg-orange-400/10 text-orange-400", label: "Suspended" },
    banned: { icon: XCircle, cls: "bg-destructive/10 text-destructive", label: "Banned" },
  }
  const cfg = map[status] || { icon: Globe, cls: "bg-secondary text-muted-foreground", label: status }
  const Icon = cfg.icon
  return (
    <span className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium ${cfg.cls}`}>
      <Icon className="h-2.5 w-2.5" />
      {cfg.label}
    </span>
  )
}

