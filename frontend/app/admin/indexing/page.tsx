"use client"

import { useEffect, useState } from "react"
import { Activity, CheckCircle2, Clock, Loader2, XCircle, AlertCircle, RefreshCw, Zap, TrendingUp } from "lucide-react"
import { useLang } from "@/lib/i18n"

interface IndexingJob {
  id: string
  site_id: string
  job_type: string
  status: string
  total_urls: number
  processed_urls: number
  failed_urls: number
  started_at: string | null
  finished_at: string | null
  error_message: string | null
}

const STATUS_TABS = ["all", "running", "queued", "completed", "failed"]

export default function AdminIndexingPage() {
  const { t } = useLang()
  const [jobs, setJobs] = useState<IndexingJob[]>([])
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkMsg, setBulkMsg] = useState("")
  const [boostLoading, setBoostLoading] = useState(false)
  const [boostMsg, setBoostMsg] = useState("")

  const base = process.env.NEXT_PUBLIC_API_URL

  function getToken() {
    return typeof window !== "undefined" ? localStorage.getItem("admin_token") : null
  }

  function fetchJobs() {
    const token = getToken()
    if (!token) { setLoading(false); return }
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== "all") params.set("status", statusFilter)
    fetch(`${base}/api/v1/admin/indexing/jobs?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.items)) setJobs(d.items) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchJobs() }, [statusFilter])

  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(fetchJobs, 5000)
    return () => clearInterval(id)
  }, [autoRefresh, statusFilter])

  async function triggerBulkIndex() {
    const token = getToken()
    if (!token) return
    setBulkLoading(true)
    setBulkMsg("")
    try {
      const res = await fetch(`${base}/api/v1/admin/indexing/bulk-index-es`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      const d = await res.json()
      setBulkMsg("✓ " + (d.message || "Bulk ES indexing queued"))
    } catch {
      setBulkMsg("Failed to trigger bulk index")
    } finally {
      setBulkLoading(false)
    }
  }

  async function triggerAdBoosts() {
    const token = getToken()
    if (!token) return
    setBoostLoading(true)
    setBoostMsg("")
    try {
      const res = await fetch(`${base}/api/v1/admin/indexing/update-ad-boosts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      const d = await res.json()
      setBoostMsg("✓ " + (d.message || "Ad boost update queued"))
    } catch {
      setBoostMsg("Failed to trigger ad boost update")
    } finally {
      setBoostLoading(false)
    }
  }

  const filtered = jobs.filter((j) => statusFilter === "all" || j.status === statusFilter)

  const counts = {
    running: jobs.filter((j) => j.status === "running").length,
    queued: jobs.filter((j) => j.status === "queued").length,
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("indexingJobsTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("monitorPipeline")} —
            <span className="text-accent font-medium"> {counts.running} {t("running")}</span>,
            <span className="text-amber-400 font-medium"> {counts.queued} {t("queued")}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
              autoRefresh ? "border-accent/40 bg-accent/10 text-accent" : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${autoRefresh ? "animate-spin" : ""}`} />
            {t("autoRefresh")}
          </button>
          <button
            onClick={fetchJobs}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> {t("refresh")}
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <button
            onClick={triggerBulkIndex}
            disabled={bulkLoading}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:border-accent/40 hover:bg-accent/5 disabled:opacity-50 transition-all"
          >
            {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 text-accent" />}
            {t("bulkIndexES")}
          </button>
          {bulkMsg && <span className={`text-xs px-1 ${bulkMsg.startsWith("✓") ? "text-accent" : "text-destructive"}`}>{bulkMsg}</span>}
        </div>
        <div className="flex flex-col gap-1">
          <button
            onClick={triggerAdBoosts}
            disabled={boostLoading}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:border-blue-400/40 hover:bg-blue-400/5 disabled:opacity-50 transition-all"
          >
            {boostLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4 text-blue-400" />}
            {t("updateAdBoosts")}
          </button>
          {boostMsg && <span className={`text-xs px-1 ${boostMsg.startsWith("✓") ? "text-accent" : "text-destructive"}`}>{boostMsg}</span>}
        </div>
      </div>

      {/* Status filter */}
      <div className="mb-5 flex gap-1 rounded-xl border border-border bg-card p-1 w-fit">
        {STATUS_TABS.map((s) => (
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

      {/* Jobs list */}
      <div className="space-y-3">
        {loading && filtered.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-secondary" />
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-16 text-center">
            <Activity className="mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">{t("noJobsFound")}</p>
          </div>
        ) : (
          filtered.map((job) => <JobCard key={job.id} job={job} />)
        )}
      </div>
    </div>
  )
}

function JobCard({ job }: { job: IndexingJob }) {
  const { t } = useLang()
  const pct = job.total_urls > 0 ? Math.round((job.processed_urls / job.total_urls) * 100) : 0
  const siteShort = job.site_id.slice(0, 8)

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-sm font-bold text-foreground">
            {job.job_type.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground font-mono">{siteShort}…</span>
              <JobBadge status={job.status} />
            </div>
            <span className="text-xs text-muted-foreground font-mono">#{job.id.slice(0, 8)}</span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-6 text-right">
          <div>
            <div className="text-sm font-semibold text-foreground">{job.processed_urls.toLocaleString()}<span className="text-muted-foreground font-normal">/{job.total_urls.toLocaleString()}</span></div>
            <div className="text-[10px] text-muted-foreground">{t("urlsProcessed")}</div>
          </div>
          {job.failed_urls > 0 && (
            <div>
              <div className="text-sm font-semibold text-destructive">{job.failed_urls}</div>
              <div className="text-[10px] text-muted-foreground">{t("failed")}</div>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {job.status === "running" && (
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">{t("progress")}</span>
            <span className="text-[10px] font-medium text-foreground">{pct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
            <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {job.error_message && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/5 border border-destructive/20 px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
          <span className="text-xs text-destructive">{job.error_message}</span>
        </div>
      )}

      <div className="mt-2 flex items-center gap-4 text-[10px] text-muted-foreground">
        {job.started_at && <span>{t("started")}: {new Date(job.started_at).toLocaleString()}</span>}
        {job.finished_at && <span>{t("completed")}: {new Date(job.finished_at).toLocaleString()}</span>}
      </div>
    </div>
  )
}

function JobBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ComponentType<{className?: string}>; cls: string }> = {
    running: { icon: Loader2, cls: "bg-blue-400/10 text-blue-400" },
    queued: { icon: Clock, cls: "bg-amber-400/10 text-amber-400" },
    completed: { icon: CheckCircle2, cls: "bg-accent/10 text-accent" },
    failed: { icon: XCircle, cls: "bg-destructive/10 text-destructive" },
  }
  const cfg = map[status] || { icon: Activity, cls: "bg-secondary text-muted-foreground" }
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium ${cfg.cls}`}>
      <Icon className={`h-2.5 w-2.5 ${status === "running" ? "animate-spin" : ""}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

