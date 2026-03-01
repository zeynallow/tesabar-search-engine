"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Globe, FileText, AlertCircle, Megaphone, Plus, Trash2, RefreshCw, CheckCircle2, Clock, Loader2, Copy, Edit2, ShieldCheck, X } from "lucide-react"

type Tab = "overview" | "sitemaps" | "indexing" | "ads"

interface SitemapEntry {
  id: string
  url: string
  status: string
  url_count: number
  last_fetched_at: string | null
  error_message: string | null
}

export default function SiteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("overview")
  const [site, setSite] = useState<Record<string, unknown> | null>(null)
  const [sitemaps, setSitemaps] = useState<SitemapEntry[]>([])
  const [newSitemapUrl, setNewSitemapUrl] = useState("")
  const [addingMap, setAddingMap] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sitemapsLoading, setSitemapsLoading] = useState(false)

  const token = typeof window !== "undefined" ? localStorage.getItem("console_token") : null
  const apiBase = process.env.NEXT_PUBLIC_API_URL

  const authHeaders = { Authorization: `Bearer ${token}` }

  function reloadSite() {
    if (!token) return
    fetch(`${apiBase}/api/v1/console/sites/${id}`, { headers: authHeaders })
      .then((r) => r.json())
      .then((d) => setSite(d))
      .catch(() => {})
  }

  useEffect(() => {
    if (!token) return
    setLoading(true)
    fetch(`${apiBase}/api/v1/console/sites/${id}`, { headers: authHeaders })
      .then((r) => r.json())
      .then((d) => setSite(d))
      .catch(() => setSite(null))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token, apiBase])

  useEffect(() => {
    if (!token || tab !== "sitemaps") return
    setSitemapsLoading(true)
    fetch(`${apiBase}/api/v1/console/sites/${id}/sitemaps`, { headers: authHeaders })
      .then((r) => r.json())
      .then((d) => setSitemaps(Array.isArray(d) ? d : []))
      .catch(() => setSitemaps([]))
      .finally(() => setSitemapsLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token, tab, apiBase])

  async function addSitemap() {
    if (!newSitemapUrl.trim()) return
    setAddingMap(true)
    try {
      const res = await fetch(`${apiBase}/api/v1/console/sites/${id}/sitemaps`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ url: newSitemapUrl }),
      })
      const data = await res.json()
      setSitemaps((prev) => [data, ...prev])
      setNewSitemapUrl("")
    } finally {
      setAddingMap(false)
    }
  }

  async function deleteSitemap(sitemapId: string) {
    await fetch(`${apiBase}/api/v1/console/sites/${id}/sitemaps/${sitemapId}`, {
      method: "DELETE",
      headers: authHeaders,
    })
    setSitemaps((prev) => prev.filter((s) => s.id !== sitemapId))
  }

  async function refetchSitemap(sitemapId: string) {
    await fetch(`${apiBase}/api/v1/console/sites/${id}/sitemaps/${sitemapId}/refetch`, {
      method: "POST",
      headers: authHeaders,
    })
    // Reload sitemaps list after triggering fetch
    fetch(`${apiBase}/api/v1/console/sites/${id}/sitemaps`, { headers: authHeaders })
      .then((r) => r.json())
      .then((d) => setSitemaps(Array.isArray(d) ? d : []))
      .catch(() => {})
  }

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{className?: string}> }[] = [
    { id: "overview", label: "Overview", icon: Globe },
    { id: "sitemaps", label: "Sitemaps", icon: FileText },
    { id: "indexing", label: "Indexing", icon: AlertCircle },
    { id: "ads", label: "Ads", icon: Megaphone },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="p-6 lg:p-8">
      <Link href="/console/sites" className="mb-5 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Sites
      </Link>

      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-xl font-bold">
          {String(site?.domain ?? "").charAt(0).toUpperCase() || "?"}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">{String(site?.name ?? "")}</h1>
          <p className="text-sm text-muted-foreground">{String(site?.domain ?? "")}</p>
        </div>
        <div className="flex items-center gap-2">
          <EditSiteButton siteId={id} site={site} authHeaders={authHeaders} apiBase={apiBase ?? ""} onUpdated={reloadSite} />
          <DeleteSiteButton siteId={id} authHeaders={authHeaders} apiBase={apiBase ?? ""} onDeleted={() => router.push("/console/sites")} />
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl border border-border bg-secondary p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              tab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab site={site} siteId={id} authHeaders={authHeaders} apiBase={apiBase ?? ""} onVerified={reloadSite} />}
      {tab === "sitemaps" && (
        <SitemapsTab
          sitemaps={sitemaps}
          loading={sitemapsLoading}
          newUrl={newSitemapUrl}
          setNewUrl={setNewSitemapUrl}
          onAdd={addSitemap}
          adding={addingMap}
          onDelete={deleteSitemap}
          onRefetch={refetchSitemap}
          siteId={id}
          apiBase={apiBase ?? ""}
          authHeaders={authHeaders}
        />
      )}
      {tab === "indexing" && <IndexingTab siteId={id} />}
      {tab === "ads" && <AdsTab siteId={id} />}
    </div>
  )
}

function OverviewTab({ site, siteId, authHeaders, apiBase, onVerified }: {
  site: Record<string, unknown> | null
  siteId: string
  authHeaders: Record<string, string>
  apiBase: string
  onVerified: () => void
}) {
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState("")
  const [stats, setStats] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    fetch(`${apiBase}/api/v1/console/sites/${siteId}/stats`, { headers: authHeaders })
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId])

  async function verifyDomain(method: "meta_tag" | "dns_txt") {
    setVerifying(true)
    setVerifyError("")
    try {
      const res = await fetch(`${apiBase}/api/v1/console/sites/${siteId}/verify?method=${method}`, {
        method: "POST",
        headers: authHeaders,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Verification failed")
      onVerified()
    } catch (e: unknown) {
      setVerifyError(e instanceof Error ? e.message : "Verification failed")
    } finally {
      setVerifying(false)
    }
  }

  if (!site) return null
  const verified = Boolean(site.is_domain_verified)
  const crawledPages = Number(stats?.total_pages_crawled ?? site.total_pages_crawled ?? 0)
  const indexedPages = Number(stats?.total_pages_indexed ?? site.total_pages_indexed ?? 0)
  const issuePages = Number(stats?.total_pages_with_issues ?? site.total_pages_with_issues ?? 0)

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pages Indexed", value: indexedPages.toLocaleString() },
          { label: "Pages Crawled", value: crawledPages.toLocaleString() },
          { label: "Issues", value: issuePages.toLocaleString() },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl border border-border bg-card p-5">
            <div className="text-2xl font-bold text-foreground">{m.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{m.label}</div>
          </div>
        ))}
      </div>

      {!verified && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-foreground">Domain not verified</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Add this meta tag to your site&apos;s &lt;head&gt; to verify ownership:
          </p>
          <div className="flex items-center gap-2 rounded-xl bg-secondary p-3 font-mono text-[11px] text-muted-foreground mb-4">
            <code className="flex-1 truncate">{`<meta name="tesabar-site-verification" content="${site.verification_token}" />`}</code>
            <button
              onClick={() => navigator.clipboard.writeText(`<meta name="tesabar-site-verification" content="${site.verification_token}" />`)}
              className="shrink-0 text-accent hover:opacity-70 transition-opacity"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
          {verifyError && <p className="text-xs text-destructive mb-3">{verifyError}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => verifyDomain("meta_tag")}
              disabled={verifying}
              className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {verifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
              Verify via Meta Tag
            </button>
            <button
              onClick={() => verifyDomain("dns_txt")}
              disabled={verifying}
              className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-60 transition-colors"
            >
              Verify via DNS TXT
            </button>
          </div>
        </div>
      )}

      {verified && (
        <div className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
          <CheckCircle2 className="h-4 w-4 text-accent" />
          <span className="text-xs font-medium text-accent">Domain verified — you can now add sitemaps</span>
        </div>
      )}
    </div>
  )
}

function EditSiteButton({ siteId, site, authHeaders, apiBase, onUpdated }: {
  siteId: string
  site: Record<string, unknown> | null
  authHeaders: Record<string, string>
  apiBase: string
  onUpdated: () => void
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: "", description: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  function openModal() {
    setForm({ name: String(site?.name ?? ""), description: String(site?.description ?? "") })
    setError("")
    setOpen(true)
  }

  async function save() {
    setSaving(true)
    setError("")
    try {
      const res = await fetch(`${apiBase}/api/v1/console/sites/${siteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ name: form.name, description: form.description }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Update failed")
      setOpen(false)
      onUpdated()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        onClick={openModal}
        className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <Edit2 className="h-3.5 w-3.5" /> Edit
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-foreground">Edit Site</h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Site Name</label>
                <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-accent" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
                <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={3} className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none resize-none focus:border-accent" />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button onClick={() => setOpen(false)} className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
              <button onClick={save} disabled={saving || !form.name}
                className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-60">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function DeleteSiteButton({ siteId, authHeaders, apiBase, onDeleted }: {
  siteId: string
  authHeaders: Record<string, string>
  apiBase: string
  onDeleted: () => void
}) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function deleteSite() {
    setDeleting(true)
    try {
      await fetch(`${apiBase}/api/v1/console/sites/${siteId}`, { method: "DELETE", headers: authHeaders })
      onDeleted()
    } finally {
      setDeleting(false)
      setOpen(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-xl border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="text-base font-bold text-foreground mb-2">Delete Site?</h2>
            <p className="text-sm text-muted-foreground mb-5">This will permanently delete the site and all its data. This action cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setOpen(false)} className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
              <button onClick={deleteSite} disabled={deleting}
                className="flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />} Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function SitemapsTab({ sitemaps, loading, newUrl, setNewUrl, onAdd, adding, onDelete, onRefetch, siteId, apiBase, authHeaders }: {
  sitemaps: SitemapEntry[]
  loading: boolean
  newUrl: string
  setNewUrl: (v: string) => void
  onAdd: () => void
  adding: boolean
  onDelete: (id: string) => void
  onRefetch: (id: string) => void
  siteId: string
  apiBase: string
  authHeaders: Record<string, string>
}) {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(null)

  async function testSitemapUrl() {
    if (!newUrl.trim()) return
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch(`${apiBase}/api/v1/console/sites/${siteId}/sitemaps/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ url: newUrl }),
      })
      const data = await res.json()
      setTestResult(data)
    } catch {
      setTestResult({ is_valid: false, error: "Network error. Please try again." })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex gap-2">
        <input
          type="url"
          value={newUrl}
          onChange={(e) => { setNewUrl(e.target.value); setTestResult(null) }}
          placeholder="https://mystore.com/sitemap.xml"
          className="flex-1 rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-accent transition-colors"
          onKeyDown={(e) => { if (e.key === "Enter") onAdd() }}
        />
        <button
          onClick={testSitemapUrl}
          disabled={testing || adding || !newUrl.trim()}
          className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-60 transition-colors"
        >
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
        </button>
        <button
          onClick={onAdd}
          disabled={adding || !newUrl.trim()}
          className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60 transition-all"
        >
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Add</>}
        </button>
      </div>

      {testResult && (
        <div className={`rounded-2xl border p-4 ${testResult.is_valid ? "border-accent/30 bg-accent/5" : "border-destructive/30 bg-destructive/5"}`}>
          <div className="flex items-center gap-2 mb-2">
            {testResult.is_valid
              ? <CheckCircle2 className="h-4 w-4 text-accent" />
              : <AlertCircle className="h-4 w-4 text-destructive" />}
            <span className={`text-sm font-medium ${testResult.is_valid ? "text-accent" : "text-destructive"}`}>
              {testResult.is_valid ? "Valid sitemap" : "Invalid sitemap"}
            </span>
            {testResult.is_valid && <span className="ml-auto text-xs text-muted-foreground">{Number(testResult.url_count ?? 0).toLocaleString()} URLs · {String(testResult.detected_type ?? "")}</span>}
          </div>
          {testResult.error && <p className="text-xs text-destructive mb-2">{String(testResult.error)}</p>}
          {Array.isArray(testResult.sample_urls) && (testResult.sample_urls as string[]).length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground mb-1">Sample URLs:</p>
              {(testResult.sample_urls as string[]).slice(0, 5).map((u, i) => (
                <p key={i} className="text-[10px] text-muted-foreground truncate font-mono">{u}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-secondary" />)}
        </div>
      ) : sitemaps.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-12 text-center">
          <FileText className="mb-3 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No sitemaps yet — add your first one above</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sitemaps.map((sm) => (
            <div key={sm.id} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{sm.url}</p>
                <div className="flex items-center gap-3 mt-1">
                  <SitemapStatus status={sm.status} />
                  {sm.url_count > 0 && <span className="text-[10px] text-muted-foreground">{sm.url_count.toLocaleString()} URLs</span>}
                  {sm.error_message && <span className="text-[10px] text-destructive truncate">{sm.error_message}</span>}
                </div>
              </div>
              <button
                onClick={() => onRefetch(sm.id)}
                className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"
                title="Re-fetch sitemap"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onDelete(sm.id)}
                className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Delete sitemap"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SitemapStatus({ status }: { status: string }) {
  const map: Record<string, string> = {
    fetched: "text-accent",
    pending: "text-amber-400",
    fetching: "text-blue-400",
    failed: "text-destructive",
  }
  return (
    <span className={`text-[10px] font-medium capitalize ${map[status] ?? "text-muted-foreground"}`}>
      {status}
    </span>
  )
}

type IndexingSubTab = "jobs" | "pages" | "issues" | "request"

function IndexingTab({ siteId }: { siteId: string }) {
  const token = typeof window !== "undefined" ? localStorage.getItem("console_token") : null
  const apiBase = process.env.NEXT_PUBLIC_API_URL
  const authH = { Authorization: `Bearer ${token}` }
  const [subTab, setSubTab] = useState<IndexingSubTab>("jobs")

  // Jobs state
  const [jobs, setJobs] = useState<Record<string, unknown>[]>([])
  const [jobsLoading, setJobsLoading] = useState(false)

  // Pages state
  const [pages, setPages] = useState<Record<string, unknown>[]>([])
  const [pagesLoading, setPagesLoading] = useState(false)
  const [pagesTotal, setPagesTotal] = useState(0)

  // Issues state
  const [issues, setIssues] = useState<Record<string, unknown> | null>(null)
  const [issuesLoading, setIssuesLoading] = useState(false)

  // Request indexing state
  const [requestUrls, setRequestUrls] = useState("")
  const [requesting, setRequesting] = useState(false)
  const [requestResult, setRequestResult] = useState("")

  useEffect(() => {
    if (!token || subTab !== "jobs") return
    setJobsLoading(true)
    fetch(`${apiBase}/api/v1/console/sites/${siteId}/indexing/jobs`, { headers: authH })
      .then((r) => r.json())
      .then((d) => setJobs(Array.isArray(d) ? d : []))
      .catch(() => setJobs([]))
      .finally(() => setJobsLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId, token, subTab])

  useEffect(() => {
    if (!token || subTab !== "pages") return
    setPagesLoading(true)
    fetch(`${apiBase}/api/v1/console/sites/${siteId}/indexing/pages?limit=20`, { headers: authH })
      .then((r) => r.json())
      .then((d) => { setPages(d.items ?? []); setPagesTotal(d.total ?? 0) })
      .catch(() => setPages([]))
      .finally(() => setPagesLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId, token, subTab])

  useEffect(() => {
    if (!token || subTab !== "issues") return
    setIssuesLoading(true)
    fetch(`${apiBase}/api/v1/console/sites/${siteId}/indexing/issues`, { headers: authH })
      .then((r) => r.json())
      .then((d) => setIssues(d))
      .catch(() => setIssues(null))
      .finally(() => setIssuesLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId, token, subTab])

  async function requestIndexing() {
    const urls = requestUrls.split("\n").map((u) => u.trim()).filter(Boolean)
    if (!urls.length) return
    setRequesting(true)
    setRequestResult("")
    try {
      const res = await fetch(`${apiBase}/api/v1/console/sites/${siteId}/indexing/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authH },
        body: JSON.stringify({ urls }),
      })
      const data = await res.json()
      setRequestResult(data.message ?? "Submitted")
      setRequestUrls("")
    } catch {
      setRequestResult("Error submitting request")
    } finally {
      setRequesting(false)
    }
  }

  const subTabs: { id: IndexingSubTab; label: string }[] = [
    { id: "jobs", label: "Jobs" },
    { id: "pages", label: "Pages" },
    { id: "issues", label: "Issues" },
    { id: "request", label: "Request Indexing" },
  ]

  const statusColor: Record<string, string> = {
    completed: "text-accent", running: "text-blue-400",
    queued: "text-amber-400", failed: "text-destructive", cancelled: "text-muted-foreground",
  }

  return (
    <div className="max-w-3xl space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-secondary p-1 w-fit">
        {subTabs.map((t) => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${subTab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Jobs */}
      {subTab === "jobs" && (
        jobsLoading ? <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-secondary" />)}</div>
        : jobs.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <Clock className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No indexing jobs yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => {
              const total = Number(job.total_urls ?? 0)
              const processed = Number(job.processed_urls ?? 0)
              const pct = total > 0 ? Math.round((processed / total) * 100) : 0
              return (
                <div key={String(job.id)} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">{String(job.job_type ?? "")}</span>
                      <span className={`text-xs font-medium capitalize ${statusColor[String(job.status)] ?? "text-muted-foreground"}`}>{String(job.status ?? "")}</span>
                    </div>
                    {job.finished_at && <span className="text-[10px] text-muted-foreground">{new Date(String(job.finished_at)).toLocaleString()}</span>}
                  </div>
                  {total > 0 && (
                    <div className="space-y-1">
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[10px] text-muted-foreground">{processed}/{total} URLs · {pct}%</p>
                    </div>
                  )}
                  {job.error_message && <p className="mt-1 text-[10px] text-destructive">{String(job.error_message)}</p>}
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Pages */}
      {subTab === "pages" && (
        pagesLoading ? <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-secondary" />)}</div>
        : pages.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No indexed pages yet.</p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground mb-2">{pagesTotal.toLocaleString()} total pages</p>
            {pages.map((p) => (
              <div key={String(p.id)} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">{String(p.url ?? "")}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{String(p.page_type ?? "")} · {String(p.status ?? "")}</p>
                </div>
                {Array.isArray(p.seo_issues) && p.seo_issues.length > 0 && (
                  <span className="ml-3 shrink-0 rounded-md bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                    {(p.seo_issues as unknown[]).length} issue{(p.seo_issues as unknown[]).length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Issues */}
      {subTab === "issues" && (
        issuesLoading ? <div className="h-32 animate-pulse rounded-2xl bg-secondary" />
        : !issues ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">No issues data available.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Errors", value: Number(issues.errors ?? 0), cls: "text-destructive" },
                { label: "Warnings", value: Number(issues.warnings ?? 0), cls: "text-amber-400" },
                { label: "Info", value: Number(issues.infos ?? 0), cls: "text-blue-400" },
              ].map((m) => (
                <div key={m.label} className="rounded-2xl border border-border bg-card p-4">
                  <div className={`text-2xl font-bold ${m.cls}`}>{m.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{m.label}</div>
                </div>
              ))}
            </div>
            {Array.isArray(issues.sample_issues) && (issues.sample_issues as unknown[]).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Sample Issues</p>
                {(issues.sample_issues as Record<string, unknown>[]).map((issue, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-medium capitalize px-2 py-0.5 rounded ${String(issue.severity) === "error" ? "bg-destructive/10 text-destructive" : "bg-amber-400/10 text-amber-400"}`}>
                        {String(issue.severity ?? "")}
                      </span>
                      <span className="text-xs font-medium text-foreground">{String(issue.type ?? "")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{String(issue.message ?? "")}</p>
                    <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">{String(issue.affected_url ?? "")}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      )}

      {/* Request Indexing */}
      {subTab === "request" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Enter URLs to request immediate indexing (one URL per line):</p>
          <textarea
            value={requestUrls}
            onChange={(e) => setRequestUrls(e.target.value)}
            rows={6}
            placeholder={"https://mystore.com/product/1\nhttps://mystore.com/product/2"}
            className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground outline-none resize-none placeholder:text-muted-foreground/60 focus:border-accent transition-colors font-mono"
          />
          {requestResult && (
            <p className="text-xs text-accent">{requestResult}</p>
          )}
          <button
            onClick={requestIndexing}
            disabled={requesting || !requestUrls.trim()}
            className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {requesting && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit for Indexing
          </button>
        </div>
      )}
    </div>
  )
}

function AdsTab({ siteId }: { siteId: string }) {
  const token = typeof window !== "undefined" ? localStorage.getItem("console_token") : null
  const apiBase = process.env.NEXT_PUBLIC_API_URL
  const authH = { Authorization: `Bearer ${token}` }
  const [campaigns, setCampaigns] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newCampaign, setNewCampaign] = useState({ name: "", budget: "", budget_type: "daily" })
  const [createError, setCreateError] = useState("")
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null)

  function loadCampaigns() {
    if (!token) return
    fetch(`${apiBase}/api/v1/console/sites/${siteId}/ads/campaigns`, { headers: authH })
      .then((r) => r.json())
      .then((d) => setCampaigns(Array.isArray(d) ? d : []))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadCampaigns() }, [siteId, token, apiBase]) // eslint-disable-line react-hooks/exhaustive-deps

  async function createCampaign() {
    if (!newCampaign.name || !newCampaign.budget) return
    setCreating(true); setCreateError("")
    try {
      const res = await fetch(`${apiBase}/api/v1/console/sites/${siteId}/ads/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authH },
        body: JSON.stringify({ name: newCampaign.name, budget: parseFloat(newCampaign.budget), budget_type: newCampaign.budget_type }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Failed")
      setCampaigns((prev) => [data, ...prev])
      setShowCreate(false); setNewCampaign({ name: "", budget: "", budget_type: "daily" })
    } catch (e: unknown) { setCreateError(e instanceof Error ? e.message : "Error") }
    finally { setCreating(false) }
  }

  async function updateCampaignStatus(campaignId: string, status: string) {
    await fetch(`${apiBase}/api/v1/console/sites/${siteId}/ads/campaigns/${campaignId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authH },
      body: JSON.stringify({ status }),
    })
    loadCampaigns()
  }

  const statusColors: Record<string, string> = {
    active: "bg-accent/10 text-accent", draft: "bg-secondary text-muted-foreground",
    paused: "bg-amber-400/10 text-amber-400", ended: "bg-secondary text-muted-foreground",
    budget_exhausted: "bg-destructive/10 text-destructive",
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-foreground">Ad Campaigns</h3>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:opacity-90">
          <Plus className="h-3.5 w-3.5" /> New Campaign
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-foreground">New Campaign</h2>
              <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Campaign Name</label>
                <input value={newCampaign.name} onChange={(e) => setNewCampaign((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Summer Sale 2025" className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-accent" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Budget (USD)</label>
                <input type="number" value={newCampaign.budget} onChange={(e) => setNewCampaign((p) => ({ ...p, budget: e.target.value }))}
                  placeholder="50" min="1" className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-accent" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Budget Type</label>
                <select value={newCampaign.budget_type} onChange={(e) => setNewCampaign((p) => ({ ...p, budget_type: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-accent">
                  <option value="daily">Daily</option>
                  <option value="total">Total</option>
                </select>
              </div>
              {createError && <p className="text-xs text-destructive">{createError}</p>}
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button onClick={() => { setShowCreate(false); setCreateError("") }} className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
              <button onClick={createCampaign} disabled={creating || !newCampaign.name || !newCampaign.budget}
                className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-60">
                {creating && <Loader2 className="h-4 w-4 animate-spin" />} Create
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-secondary" />)}</div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <Megaphone className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No campaigns yet.</p>
          <p className="mt-1 text-xs text-muted-foreground">Create a campaign to boost your products in search results.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const cId = String(c.id)
            const isExpanded = expandedCampaignId === cId
            const status = String(c.status ?? "")
            return (
              <div key={cId} className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between p-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{String(c.name ?? "")}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Budget: ${Number(c.budget ?? 0).toFixed(2)}/{String(c.budget_type ?? "")} · Spent: ${Number(c.spent_amount ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <span className={`text-[10px] font-medium capitalize px-2 py-0.5 rounded-lg ${statusColors[status] ?? "bg-secondary text-muted-foreground"}`}>
                      {status.replace("_", " ")}
                    </span>
                    {status === "active" && (
                      <button onClick={() => updateCampaignStatus(cId, "paused")}
                        className="text-[10px] rounded-lg border border-border px-2 py-0.5 text-muted-foreground hover:text-foreground">Pause</button>
                    )}
                    {status === "paused" && (
                      <button onClick={() => updateCampaignStatus(cId, "active")}
                        className="text-[10px] rounded-lg border border-accent/30 px-2 py-0.5 text-accent hover:bg-accent/10">Resume</button>
                    )}
                    <button onClick={() => setExpandedCampaignId(isExpanded ? null : cId)}
                      className="text-[10px] rounded-lg border border-border px-2 py-0.5 text-muted-foreground hover:text-foreground">
                      {isExpanded ? "Hide" : "Details"}
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-border bg-secondary/30 p-4">
                    <CampaignDetails siteId={siteId} campaignId={cId} authH={authH} apiBase={apiBase ?? ""} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CampaignDetails({ siteId, campaignId, authH, apiBase }: {
  siteId: string; campaignId: string; authH: Record<string, string>; apiBase: string
}) {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null)
  const [groups, setGroups] = useState<Record<string, unknown>[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [showAddGroup, setShowAddGroup] = useState(false)
  const [newGroup, setNewGroup] = useState({ name: "", keywords: "", default_bid: "0.10" })
  const [addingGroup, setAddingGroup] = useState(false)
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${apiBase}/api/v1/console/sites/${siteId}/ads/campaigns/${campaignId}/stats`, { headers: authH })
      .then((r) => r.json()).then((d) => setStats(d)).catch(() => {}).finally(() => setLoadingStats(false))
    fetch(`${apiBase}/api/v1/console/sites/${siteId}/ads/campaigns/${campaignId}/groups`, { headers: authH })
      .then((r) => r.json()).then((d) => setGroups(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoadingGroups(false))
  }, [siteId, campaignId, apiBase, authH]) // eslint-disable-line react-hooks/exhaustive-deps

  async function addGroup() {
    if (!newGroup.name || !newGroup.keywords) return
    setAddingGroup(true)
    try {
      const res = await fetch(`${apiBase}/api/v1/console/sites/${siteId}/ads/campaigns/${campaignId}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authH },
        body: JSON.stringify({ name: newGroup.name, keywords: newGroup.keywords.split(",").map((k) => k.trim()).filter(Boolean), default_bid: parseFloat(newGroup.default_bid) }),
      })
      const data = await res.json()
      if (res.ok) { setGroups((p) => [...p, data]); setShowAddGroup(false); setNewGroup({ name: "", keywords: "", default_bid: "0.10" }) }
    } finally { setAddingGroup(false) }
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      {loadingStats ? <div className="h-10 animate-pulse rounded-xl bg-secondary" /> : stats && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Impressions", value: Number(stats.total_impressions ?? 0).toLocaleString() },
            { label: "Clicks", value: Number(stats.total_clicks ?? 0).toLocaleString() },
            { label: "CTR", value: `${Number(stats.ctr ?? 0).toFixed(1)}%` },
            { label: "Spent", value: `$${Number(stats.total_spent ?? 0).toFixed(2)}` },
          ].map((m) => (
            <div key={m.label} className="rounded-xl bg-secondary p-2.5 text-center">
              <p className="text-sm font-semibold text-foreground">{m.value}</p>
              <p className="text-[10px] text-muted-foreground">{m.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Ad Groups */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground">Ad Groups</p>
          <button onClick={() => setShowAddGroup(!showAddGroup)}
            className="flex items-center gap-1 text-[10px] rounded-lg bg-accent/10 px-2 py-1 text-accent hover:bg-accent/20">
            <Plus className="h-3 w-3" /> Add Group
          </button>
        </div>
        {showAddGroup && (
          <div className="mb-3 rounded-xl border border-border bg-card p-3 space-y-2">
            <input value={newGroup.name} onChange={(e) => setNewGroup((p) => ({ ...p, name: e.target.value }))}
              placeholder="Group name" className="w-full rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs text-foreground outline-none focus:border-accent" />
            <input value={newGroup.keywords} onChange={(e) => setNewGroup((p) => ({ ...p, keywords: e.target.value }))}
              placeholder="Keywords (comma separated)" className="w-full rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs text-foreground outline-none focus:border-accent" />
            <input type="number" value={newGroup.default_bid} onChange={(e) => setNewGroup((p) => ({ ...p, default_bid: e.target.value }))}
              placeholder="Default bid $" step="0.01" min="0.01" className="w-full rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs text-foreground outline-none focus:border-accent" />
            <div className="flex gap-2">
              <button onClick={() => setShowAddGroup(false)} className="text-[10px] text-muted-foreground hover:text-foreground">Cancel</button>
              <button onClick={addGroup} disabled={addingGroup || !newGroup.name || !newGroup.keywords}
                className="flex items-center gap-1 text-[10px] rounded-lg bg-accent px-3 py-1 text-accent-foreground disabled:opacity-60">
                {addingGroup && <Loader2 className="h-3 w-3 animate-spin" />} Save Group
              </button>
            </div>
          </div>
        )}
        {loadingGroups ? <div className="h-8 animate-pulse rounded-xl bg-secondary" /> : groups.length === 0 ? (
          <p className="text-xs text-muted-foreground">No ad groups yet.</p>
        ) : (
          <div className="space-y-2">
            {groups.map((g) => {
              const gId = String(g.id)
              return (
                <div key={gId} className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2">
                    <div>
                      <p className="text-xs font-medium text-foreground">{String(g.name ?? "")}</p>
                      <p className="text-[10px] text-muted-foreground">Bid: ${Number(g.default_bid ?? 0).toFixed(2)} · {Array.isArray(g.keywords) ? (g.keywords as string[]).length : 0} keywords</p>
                    </div>
                    <button onClick={() => setExpandedGroupId(expandedGroupId === gId ? null : gId)}
                      className="text-[10px] rounded-lg border border-border px-2 py-0.5 text-muted-foreground hover:text-foreground">
                      {expandedGroupId === gId ? "Hide Ads" : "View Ads"}
                    </button>
                  </div>
                  {expandedGroupId === gId && (
                    <div className="border-t border-border bg-secondary/30 p-3">
                      <AdsList siteId={siteId} campaignId={campaignId} groupId={gId} authH={authH} apiBase={apiBase} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function AdsList({ siteId, campaignId, groupId, authH, apiBase }: {
  siteId: string; campaignId: string; groupId: string; authH: Record<string, string>; apiBase: string
}) {
  const [ads, setAds] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newAd, setNewAd] = useState({ headline: "", description: "", destination_url: "", bid_amount: "0.10" })
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    fetch(`${apiBase}/api/v1/console/sites/${siteId}/ads/campaigns/${campaignId}/groups/${groupId}/ads`, { headers: authH })
      .then((r) => r.json()).then((d) => setAds(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false))
  }, [siteId, campaignId, groupId, apiBase, authH]) // eslint-disable-line react-hooks/exhaustive-deps

  async function createAd() {
    setAdding(true)
    try {
      const res = await fetch(`${apiBase}/api/v1/console/sites/${siteId}/ads/campaigns/${campaignId}/groups/${groupId}/ads`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authH },
        body: JSON.stringify({ headline: newAd.headline, description: newAd.description, destination_url: newAd.destination_url, bid_amount: parseFloat(newAd.bid_amount) }),
      })
      const data = await res.json()
      if (res.ok) { setAds((p) => [...p, data]); setShowAdd(false); setNewAd({ headline: "", description: "", destination_url: "", bid_amount: "0.10" }) }
    } finally { setAdding(false) }
  }

  if (loading) return <div className="h-8 animate-pulse rounded-xl bg-secondary" />

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-medium text-muted-foreground">Ads</p>
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 text-[10px] rounded-lg bg-accent/10 px-2 py-0.5 text-accent hover:bg-accent/20">
          <Plus className="h-2.5 w-2.5" /> Add Ad
        </button>
      </div>
      {showAdd && (
        <div className="rounded-lg border border-border bg-card p-2.5 space-y-1.5 mb-2">
          <input value={newAd.headline} onChange={(e) => setNewAd((p) => ({ ...p, headline: e.target.value }))}
            placeholder="Headline" className="w-full rounded-lg border border-border bg-secondary px-2.5 py-1 text-[11px] text-foreground outline-none focus:border-accent" />
          <input value={newAd.description} onChange={(e) => setNewAd((p) => ({ ...p, description: e.target.value }))}
            placeholder="Description" className="w-full rounded-lg border border-border bg-secondary px-2.5 py-1 text-[11px] text-foreground outline-none focus:border-accent" />
          <input value={newAd.destination_url} onChange={(e) => setNewAd((p) => ({ ...p, destination_url: e.target.value }))}
            placeholder="https://..." className="w-full rounded-lg border border-border bg-secondary px-2.5 py-1 text-[11px] text-foreground outline-none focus:border-accent" />
          <input type="number" value={newAd.bid_amount} onChange={(e) => setNewAd((p) => ({ ...p, bid_amount: e.target.value }))}
            placeholder="Bid $" step="0.01" min="0.01" className="w-full rounded-lg border border-border bg-secondary px-2.5 py-1 text-[11px] text-foreground outline-none focus:border-accent" />
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(false)} className="text-[10px] text-muted-foreground hover:text-foreground">Cancel</button>
            <button onClick={createAd} disabled={adding || !newAd.headline || !newAd.destination_url}
              className="flex items-center gap-1 text-[10px] rounded-lg bg-accent px-2.5 py-0.5 text-accent-foreground disabled:opacity-60">
              {adding && <Loader2 className="h-3 w-3 animate-spin" />} Save
            </button>
          </div>
        </div>
      )}
      {ads.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">No ads yet in this group.</p>
      ) : (
        ads.map((ad) => (
          <div key={String(ad.id)} className="rounded-lg border border-border bg-card px-3 py-2">
            <p className="text-xs font-medium text-foreground">{String(ad.headline ?? "")}</p>
            {ad.description && <p className="text-[10px] text-muted-foreground truncate">{String(ad.description)}</p>}
            <p className="text-[10px] text-accent truncate">{String(ad.destination_url ?? "")}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Bid: ${Number(ad.bid_amount ?? 0).toFixed(2)} · {Number(ad.impressions ?? 0)} impr · {Number(ad.clicks ?? 0)} clicks</p>
          </div>
        ))
      )}
    </div>
  )
}

