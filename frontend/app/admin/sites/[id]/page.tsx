"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Globe, CheckCircle2, Clock, AlertCircle, XCircle,
  RefreshCw, Plus, Loader2, Database, FileText, TriangleAlert,
} from "lucide-react"

interface SiteDetail {
  id: string
  domain: string
  name: string
  description: string | null
  owner_email: string
  owner_id: string
  status: string
  is_domain_verified: boolean
  total_pages_indexed: number
  total_pages_crawled: number
  total_pages_with_issues: number
  last_crawled_at: string | null
  created_at: string
}

const STATUS_OPTS = ["active", "pending", "suspended", "banned"]

function SiteBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ComponentType<{ className?: string }>; cls: string; label: string }> = {
    active: { icon: CheckCircle2, cls: "bg-accent/10 text-accent", label: "Active" },
    pending: { icon: Clock, cls: "bg-amber-400/10 text-amber-400", label: "Pending" },
    suspended: { icon: AlertCircle, cls: "bg-orange-400/10 text-orange-400", label: "Suspended" },
    banned: { icon: XCircle, cls: "bg-destructive/10 text-destructive", label: "Banned" },
  }
  const cfg = map[status] || { icon: Globe, cls: "bg-secondary text-muted-foreground", label: status }
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${cfg.cls}`}>
      <Icon className="h-3 w-3" /> {cfg.label}
    </span>
  )
}

export default function AdminSiteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [site, setSite] = useState<SiteDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusValue, setStatusValue] = useState("")
  const [statusSaving, setStatusSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState("")
  const [reindexing, setReindexing] = useState(false)
  const [reindexMsg, setReindexMsg] = useState("")
  const [sitemapUrl, setSitemapUrl] = useState("")
  const [triggerFetch, setTriggerFetch] = useState(true)
  const [sitemapAdding, setSitemapAdding] = useState(false)
  const [sitemapMsg, setSitemapMsg] = useState("")

  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null
  const base = process.env.NEXT_PUBLIC_API_URL
  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    if (!token) { setLoading(false); return }
    fetch(`${base}/api/v1/admin/sites/${id}`, { headers })
      .then((r) => r.json())
      .then((d) => {
        setSite(d)
        setStatusValue(d.status)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  async function saveStatus() {
    if (!site || statusValue === site.status) return
    setStatusSaving(true)
    setStatusMsg("")
    try {
      await fetch(`${base}/api/v1/admin/sites/${id}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusValue }),
      })
      setSite((prev) => prev ? { ...prev, status: statusValue } : prev)
      setStatusMsg("✓ Status updated")
    } catch {
      setStatusMsg("Failed to update status")
    } finally {
      setStatusSaving(false)
    }
  }

  async function triggerReindex() {
    setReindexing(true)
    setReindexMsg("")
    try {
      await fetch(`${base}/api/v1/admin/sites/${id}/reindex`, {
        method: "POST",
        headers,
      })
      setReindexMsg("✓ Reindex job queued")
    } catch {
      setReindexMsg("Failed to queue reindex")
    } finally {
      setReindexing(false)
    }
  }

  async function addSitemap(e: React.FormEvent) {
    e.preventDefault()
    if (!sitemapUrl.trim()) return
    setSitemapAdding(true)
    setSitemapMsg("")
    try {
      const res = await fetch(`${base}/api/v1/admin/sites/${id}/sitemaps`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ url: sitemapUrl.trim(), trigger_fetch: triggerFetch }),
      })
      if (!res.ok) throw new Error()
      setSitemapMsg("✓ Sitemap added successfully")
      setSitemapUrl("")
    } catch {
      setSitemapMsg("Failed to add sitemap")
    } finally {
      setSitemapAdding(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-6 h-8 w-48 animate-pulse rounded-xl bg-secondary" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-secondary" />)}
        </div>
      </div>
    )
  }

  if (!site) {
    return (
      <div className="flex flex-col items-center justify-center p-6 py-24 text-center">
        <Globe className="mb-3 h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Site not found</p>
        <Link href="/admin/sites" className="mt-4 text-xs text-accent hover:underline">← Back to sites</Link>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Back + Header */}
      <div>
        <Link href="/admin/sites" className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> All Sites
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-lg font-bold text-foreground">
              {site.domain.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">{site.name}</h1>
                <SiteBadge status={site.status} />
                {site.is_domain_verified && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-blue-400/10 px-2 py-0.5 text-[11px] font-medium text-blue-400">
                    <CheckCircle2 className="h-3 w-3" /> Verified
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground mt-0.5">{site.domain}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { label: "Pages Indexed", value: site.total_pages_indexed.toLocaleString(), icon: Database, cls: "text-accent" },
          { label: "Pages Crawled", value: site.total_pages_crawled.toLocaleString(), icon: FileText, cls: "text-blue-400" },
          { label: "Pages with Issues", value: site.total_pages_with_issues.toLocaleString(), icon: TriangleAlert, cls: "text-amber-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted-foreground">{s.label}</span>
              <s.icon className={`h-4 w-4 ${s.cls}`} />
            </div>
            <div className="text-2xl font-bold text-foreground">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3 text-sm">
        <h2 className="text-sm font-semibold text-foreground mb-3">Site Info</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            { label: "Owner", value: site.owner_email },
            { label: "Description", value: site.description || "—" },
            { label: "Created", value: new Date(site.created_at).toLocaleDateString() },
            { label: "Last Crawled", value: site.last_crawled_at ? new Date(site.last_crawled_at).toLocaleString() : "Never" },
          ].map(({ label, value }) => (
            <div key={label}>
              <span className="text-[11px] text-muted-foreground block mb-0.5">{label}</span>
              <span className="text-sm text-foreground">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Status Update */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Update Status</h2>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusValue}
            onChange={(e) => setStatusValue(e.target.value)}
            className="rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-accent transition-colors capitalize"
          >
            {STATUS_OPTS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <button
            onClick={saveStatus}
            disabled={statusSaving || statusValue === site.status}
            className="flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition-all hover:opacity-90 disabled:opacity-50"
          >
            {statusSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Save Status
          </button>
          {statusMsg && <span className={`text-xs ${statusMsg.startsWith("✓") ? "text-accent" : "text-destructive"}`}>{statusMsg}</span>}
        </div>
      </div>

      {/* Reindex */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-1">Trigger Reindex</h2>
        <p className="text-xs text-muted-foreground mb-4">Queue a full re-crawl and re-index of all pages for this site.</p>
        <div className="flex items-center gap-3">
          <button
            onClick={triggerReindex}
            disabled={reindexing}
            className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-secondary/80 disabled:opacity-50"
          >
            {reindexing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Trigger Reindex
          </button>
          {reindexMsg && <span className={`text-xs ${reindexMsg.startsWith("✓") ? "text-accent" : "text-destructive"}`}>{reindexMsg}</span>}
        </div>
      </div>

      {/* Add Sitemap */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-1">Add Sitemap</h2>
        <p className="text-xs text-muted-foreground mb-4">Manually add a sitemap URL to this site (bypasses domain validation).</p>
        <form onSubmit={addSitemap} className="space-y-3">
          <input
            type="url"
            value={sitemapUrl}
            onChange={(e) => setSitemapUrl(e.target.value)}
            placeholder="https://example.com/sitemap.xml"
            required
            className="w-full rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-accent transition-colors"
          />
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={triggerFetch}
                onChange={(e) => setTriggerFetch(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-accent"
              />
              Trigger fetch immediately
            </label>
            <button
              type="submit"
              disabled={sitemapAdding || !sitemapUrl.trim()}
              className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-background transition-all hover:opacity-90 disabled:opacity-50"
            >
              {sitemapAdding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Add Sitemap
            </button>
            {sitemapMsg && <span className={`text-xs ${sitemapMsg.startsWith("✓") ? "text-accent" : "text-destructive"}`}>{sitemapMsg}</span>}
          </div>
        </form>
      </div>
    </div>
  )
}

