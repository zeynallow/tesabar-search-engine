"use client"

import { useEffect, useState } from "react"
import { Megaphone, Plus, Loader2, TrendingUp, MousePointer, DollarSign, Eye } from "lucide-react"

interface Site {
  id: string
  domain: string
  name: string | null
}

interface Campaign {
  id: string
  name: string
  status: string
  budget: number
  budget_type: string
  spent_amount: number
  total_impressions: number
  total_clicks: number
  start_date: string | null
  end_date: string | null
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-accent/10 text-accent",
  draft: "bg-secondary text-muted-foreground",
  paused: "bg-amber-400/10 text-amber-400",
  ended: "bg-secondary text-muted-foreground",
  budget_exhausted: "bg-destructive/10 text-destructive",
}

export default function AdsPage() {
  const token = typeof window !== "undefined" ? localStorage.getItem("console_token") : null
  const apiBase = process.env.NEXT_PUBLIC_API_URL

  const [sites, setSites] = useState<Site[]>([])
  const [selectedSiteId, setSelectedSiteId] = useState<string>("")
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loadingSites, setLoadingSites] = useState(true)
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newCampaign, setNewCampaign] = useState({ name: "", budget: "", budget_type: "daily" })
  const [createError, setCreateError] = useState("")

  const authH = { Authorization: `Bearer ${token}` }

  // Load sites
  useEffect(() => {
    if (!token) return
    fetch(`${apiBase}/api/v1/console/sites`, { headers: authH })
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : []
        setSites(list)
        if (list.length > 0) setSelectedSiteId(list[0].id)
      })
      .catch(() => setSites([]))
      .finally(() => setLoadingSites(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, apiBase])

  // Load campaigns when site changes
  useEffect(() => {
    if (!selectedSiteId || !token) return
    setLoadingCampaigns(true)
    fetch(`${apiBase}/api/v1/console/sites/${selectedSiteId}/ads/campaigns`, { headers: authH })
      .then((r) => r.json())
      .then((d) => setCampaigns(Array.isArray(d) ? d : []))
      .catch(() => setCampaigns([]))
      .finally(() => setLoadingCampaigns(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteId, token, apiBase])

  async function createCampaign() {
    if (!newCampaign.name || !newCampaign.budget) return
    setCreating(true)
    setCreateError("")
    try {
      const res = await fetch(`${apiBase}/api/v1/console/sites/${selectedSiteId}/ads/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authH },
        body: JSON.stringify({
          name: newCampaign.name,
          budget: parseFloat(newCampaign.budget),
          budget_type: newCampaign.budget_type,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Failed to create campaign")
      setCampaigns((prev) => [data, ...prev])
      setShowCreate(false)
      setNewCampaign({ name: "", budget: "", budget_type: "daily" })
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : "Error")
    } finally {
      setCreating(false)
    }
  }

  if (loadingSites) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )

  if (sites.length === 0) return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-foreground mb-2">Ads & Campaigns</h1>
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-16 text-center mt-6">
        <Megaphone className="mb-3 h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">You have no registered sites yet.</p>
        <p className="text-xs text-muted-foreground mt-1">Add a site first to create campaigns.</p>
      </div>
    </div>
  )

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ads & Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Boost your products in search results</p>
        </div>
        {selectedSiteId && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" /> New Campaign
          </button>
        )}
      </div>

      {/* Site selector */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto scrollbar-none">
        {sites.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedSiteId(s.id)}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              selectedSiteId === s.id
                ? "bg-accent text-accent-foreground"
                : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.name || s.domain}
          </button>
        ))}
      </div>

      {/* Create campaign modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-bold text-foreground">New Campaign</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Campaign Name</label>
                <input
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Summer Sale 2025"
                  className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Budget (USD)</label>
                <input
                  type="number"
                  value={newCampaign.budget}
                  onChange={(e) => setNewCampaign((p) => ({ ...p, budget: e.target.value }))}
                  placeholder="50"
                  min="1"
                  className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Budget Type</label>
                <select
                  value={newCampaign.budget_type}
                  onChange={(e) => setNewCampaign((p) => ({ ...p, budget_type: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                >
                  <option value="daily">Daily</option>
                  <option value="total">Total</option>
                </select>
              </div>
              {createError && <p className="text-xs text-destructive">{createError}</p>}
            </div>
            <div className="mt-5 flex gap-2 justify-end">
              <button
                onClick={() => { setShowCreate(false); setCreateError("") }}
                className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >Cancel</button>
              <button
                onClick={createCampaign}
                disabled={creating || !newCampaign.name || !newCampaign.budget}
                className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-60"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campaign list */}
      {loadingCampaigns ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-secondary" />)}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-16 text-center">
          <Megaphone className="mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No campaigns yet for this site.</p>
          <p className="text-xs text-muted-foreground mt-1">Create a campaign to boost your products.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const ctr = c.total_impressions > 0 ? ((c.total_clicks / c.total_impressions) * 100).toFixed(1) : "0.0"
            return (
              <div key={c.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{c.name}</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      ${c.budget}/{c.budget_type} budget · Created {new Date(c.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`rounded-lg px-2 py-0.5 text-[10px] font-medium capitalize ${STATUS_COLORS[c.status] ?? "bg-secondary text-muted-foreground"}`}>
                    {c.status.replace("_", " ")}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { icon: Eye, label: "Impressions", value: c.total_impressions.toLocaleString() },
                    { icon: MousePointer, label: "Clicks", value: c.total_clicks.toLocaleString() },
                    { icon: TrendingUp, label: "CTR", value: `${ctr}%` },
                    { icon: DollarSign, label: "Spent", value: `$${c.spent_amount.toFixed(2)}` },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="rounded-xl bg-secondary p-3">
                      <div className="flex items-center gap-1 mb-1">
                        <Icon className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{label}</span>
                      </div>
                      <p className="text-sm font-semibold text-foreground">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

