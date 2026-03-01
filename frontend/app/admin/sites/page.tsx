"use client"

import { useEffect, useState } from "react"
import { Globe, CheckCircle2, Clock, AlertCircle, XCircle, Search, ChevronLeft, ChevronRight } from "lucide-react"

interface AdminSite {
  id: string
  domain: string
  name: string
  status: string
  is_domain_verified: boolean
  total_pages_indexed: number
  total_pages_crawled: number
  owner_email: string
  created_at: string
}

const STATUS_OPTS = ["all", "active", "pending", "suspended", "banned"]

export default function AdminSitesPage() {
  const [sites, setSites] = useState<AdminSite[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null
    if (!token) { setLoading(false); return }
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== "all") params.set("status", statusFilter)
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/sites?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.items)) setSites(d.items) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [statusFilter])

  const filtered = sites.filter((s) => {
    const matchSearch = !search || s.domain.includes(search) || s.name.toLowerCase().includes(search.toLowerCase())
    return matchSearch
  })

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">All Sites</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage all registered stores on the platform</p>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by domain or name…"
            className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-accent transition-colors"
          />
        </div>
        <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
          {STATUS_OPTS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                statusFilter === s ? "bg-accent/15 text-accent" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Site</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Owner</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Indexed</th>
                <th className="px-5 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="px-5 py-4">
                      <div className="h-5 animate-pulse rounded-lg bg-secondary" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-sm text-muted-foreground">
                    No sites found
                  </td>
                </tr>
              ) : (
                filtered.map((site) => (
                  <tr key={site.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-bold text-foreground">
                          {site.domain.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-foreground">{site.name}</div>
                          <div className="text-xs text-muted-foreground">{site.domain}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">{site.owner_email}</td>
                    <td className="px-5 py-3.5"><SiteBadge status={site.status} /></td>
                    <td className="px-5 py-3.5 text-right text-sm font-medium text-foreground">{site.total_pages_indexed.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-right">
                      <SiteActions siteId={site.id} status={site.status} onUpdate={(newStatus) =>
                        setSites((prev) => prev.map((s) => s.id === site.id ? { ...s, status: newStatus } : s))
                      } />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination placeholder */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <span className="text-xs text-muted-foreground">{filtered.length} sites</span>
          <div className="flex items-center gap-1">
            <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary transition-colors"><ChevronLeft className="h-4 w-4" /></button>
            <span className="px-2 text-xs text-foreground font-medium">1</span>
            <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary transition-colors"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SiteBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ComponentType<{className?: string}>; cls: string; label: string }> = {
    active: { icon: CheckCircle2, cls: "bg-accent/10 text-accent", label: "Active" },
    pending: { icon: Clock, cls: "bg-amber-400/10 text-amber-400", label: "Pending" },
    suspended: { icon: AlertCircle, cls: "bg-orange-400/10 text-orange-400", label: "Suspended" },
    banned: { icon: XCircle, cls: "bg-destructive/10 text-destructive", label: "Banned" },
  }
  const cfg = map[status] || { icon: Globe, cls: "bg-secondary text-muted-foreground", label: status }
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium ${cfg.cls}`}>
      <Icon className="h-2.5 w-2.5" /> {cfg.label}
    </span>
  )
}

function SiteActions({ siteId, status, onUpdate }: { siteId: string; status: string; onUpdate: (s: string) => void }) {
  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null

  async function updateStatus(newStatus: string) {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/sites/${siteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      })
      onUpdate(newStatus)
    } catch {}
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {status !== "active" && (
        <button onClick={() => updateStatus("active")} className="rounded-lg px-2 py-1 text-[10px] font-medium text-accent hover:bg-accent/10 transition-colors">
          Activate
        </button>
      )}
      {status !== "suspended" && status !== "banned" && (
        <button onClick={() => updateStatus("suspended")} className="rounded-lg px-2 py-1 text-[10px] font-medium text-orange-400 hover:bg-orange-400/10 transition-colors">
          Suspend
        </button>
      )}
      {status !== "banned" && (
        <button onClick={() => updateStatus("banned")} className="rounded-lg px-2 py-1 text-[10px] font-medium text-destructive hover:bg-destructive/10 transition-colors">
          Ban
        </button>
      )}
    </div>
  )
}

