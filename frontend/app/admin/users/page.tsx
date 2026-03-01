"use client"

import { useEffect, useState } from "react"
import { Users, Search, CheckCircle2, XCircle, ShieldCheck, ChevronLeft, ChevronRight, Plus, Trash2, Loader2 } from "lucide-react"

interface AdminUser {
  id: string
  email: string
  full_name: string
  company_name: string | null
  is_active: boolean
  is_admin: boolean
  is_verified: boolean
  sites_count: number
  created_at: string
}

interface CreateUserForm {
  email: string
  password: string
  full_name: string
  company_name: string
  is_admin: boolean
}

const EMPTY_FORM: CreateUserForm = { email: "", password: "", full_name: "", company_name: "", is_admin: false }

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CreateUserForm>(EMPTY_FORM)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const base = process.env.NEXT_PUBLIC_API_URL

  function getToken() {
    return typeof window !== "undefined" ? localStorage.getItem("admin_token") : null
  }

  useEffect(() => {
    const token = getToken()
    if (!token) { setLoading(false); return }
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    fetch(`${base}/api/v1/admin/users?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.items)) setUsers(d.items) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [search])

  async function toggleActive(id: string, currentActive: boolean) {
    const token = getToken()
    if (!token) return
    try {
      await fetch(`${base}/api/v1/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_active: !currentActive }),
      })
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, is_active: !currentActive } : u))
    } catch {}
  }

  async function toggleAdmin(id: string, currentAdmin: boolean) {
    const token = getToken()
    if (!token) return
    try {
      await fetch(`${base}/api/v1/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_admin: !currentAdmin }),
      })
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, is_admin: !currentAdmin } : u))
    } catch {}
  }

  async function deleteUser(id: string) {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return
    const token = getToken()
    if (!token) return
    setDeletingId(id)
    try {
      await fetch(`${base}/api/v1/admin/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      setUsers((prev) => prev.filter((u) => u.id !== id))
    } catch {}
    finally { setDeletingId(null) }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    const token = getToken()
    if (!token) return
    setCreating(true)
    setCreateError("")
    try {
      const res = await fetch(`${base}/api/v1/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.detail || "Failed to create user")
      }
      setShowCreate(false)
      setForm(EMPTY_FORM)
      // Refresh list
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      const listRes = await fetch(`${base}/api/v1/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const listData = await listRes.json()
      if (Array.isArray(listData.items)) setUsers(listData.items)
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create user")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground mt-0.5">All registered site owners and admins</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setCreateError("") }}
          className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-background hover:opacity-90 transition-all shrink-0"
        >
          <Plus className="h-4 w-4" /> Create User
        </button>
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h2 className="text-base font-semibold text-foreground mb-4">Create New User</h2>
            <form onSubmit={createUser} className="space-y-3">
              {[
                { label: "Full Name", key: "full_name", type: "text", placeholder: "John Doe" },
                { label: "Email", key: "email", type: "email", placeholder: "user@example.com" },
                { label: "Password", key: "password", type: "password", placeholder: "Min. 8 characters" },
                { label: "Company Name", key: "company_name", type: "text", placeholder: "Acme Inc. (optional)" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
                  <input
                    type={type}
                    value={form[key as keyof CreateUserForm] as string}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    required={key !== "company_name"}
                    className="w-full rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-accent transition-colors"
                  />
                </div>
              ))}
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={form.is_admin}
                  onChange={(e) => setForm((f) => ({ ...f, is_admin: e.target.checked }))}
                  className="h-4 w-4 rounded border-border accent-accent"
                />
                Grant admin privileges
              </label>
              {createError && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-2.5 text-xs text-destructive">{createError}</div>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-foreground py-2.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-60 transition-all"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create User"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setCreateError(""); setForm(EMPTY_FORM) }}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-5 max-w-sm">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email or name…"
            className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-accent transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">User</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Role</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Sites</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Joined</th>
                <th className="px-5 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-5 py-4">
                      <div className="h-5 animate-pulse rounded-lg bg-secondary" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No users found</p>
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">
                          {user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-foreground">{user.full_name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {user.is_admin ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-foreground/10 px-2 py-0.5 text-[10px] font-medium text-foreground">
                          <ShieldCheck className="h-2.5 w-2.5" /> Admin
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-medium">Site Owner</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {user.is_active ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                          <XCircle className="h-2.5 w-2.5" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm font-medium text-foreground">{user.sites_count}</td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">{user.created_at}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggleActive(user.id, user.is_active)}
                          className={`rounded-lg px-2 py-1 text-[10px] font-medium transition-colors ${
                            user.is_active
                              ? "text-orange-400 hover:bg-orange-400/10"
                              : "text-accent hover:bg-accent/10"
                          }`}
                        >
                          {user.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => toggleAdmin(user.id, user.is_admin)}
                          className={`rounded-lg px-2 py-1 text-[10px] font-medium transition-colors ${
                            user.is_admin
                              ? "text-muted-foreground hover:bg-secondary"
                              : "text-blue-400 hover:bg-blue-400/10"
                          }`}
                        >
                          {user.is_admin ? "Revoke Admin" : "Make Admin"}
                        </button>
                        <button
                          onClick={() => deleteUser(user.id)}
                          disabled={deletingId === user.id}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                          title="Delete user"
                        >
                          {deletingId === user.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <span className="text-xs text-muted-foreground">{filtered.length} users</span>
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

