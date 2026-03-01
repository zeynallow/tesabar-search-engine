"use client"

import { useEffect, useState } from "react"
import { User, Lock, CheckCircle2, Loader2, AlertCircle } from "lucide-react"

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  company_name: string | null
  is_active: boolean
  is_verified: boolean
  is_admin: boolean
}

export default function SettingsPage() {
  const token = typeof window !== "undefined" ? localStorage.getItem("console_token") : null
  const apiBase = process.env.NEXT_PUBLIC_API_URL
  const authH = { Authorization: `Bearer ${token}` }

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  // Password change state
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm: "" })
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState("")
  const [pwSuccess, setPwSuccess] = useState(false)

  useEffect(() => {
    if (!token) return
    fetch(`${apiBase}/api/v1/console/auth/me`, { headers: authH })
      .then((r) => r.json())
      .then((d) => setProfile(d))
      .catch(() => setProfile(null))
      .finally(() => setLoadingProfile(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, apiBase])

  async function changePassword() {
    if (pwForm.new_password !== pwForm.confirm) {
      setPwError("New passwords do not match")
      return
    }
    if (pwForm.new_password.length < 8) {
      setPwError("Password must be at least 8 characters")
      return
    }
    setPwLoading(true)
    setPwError("")
    setPwSuccess(false)
    try {
      const res = await fetch(`${apiBase}/api/v1/console/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authH },
        body: JSON.stringify({
          current_password: pwForm.current_password,
          new_password: pwForm.new_password,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Failed to change password")
      setPwSuccess(true)
      setPwForm({ current_password: "", new_password: "", confirm: "" })
    } catch (e: unknown) {
      setPwError(e instanceof Error ? e.message : "Error")
    } finally {
      setPwLoading(false)
    }
  }

  if (loadingProfile) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground mb-1">Settings</h1>
      <p className="text-sm text-muted-foreground mb-8">Manage your account details and security</p>

      {/* Profile Card */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10">
            <User className="h-4 w-4 text-accent" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">Account Profile</h2>
        </div>

        {profile ? (
          <div className="space-y-4">
            <Row label="Email" value={profile.email} />
            <Row label="Full Name" value={profile.full_name ?? "—"} />
            <Row label="Company" value={profile.company_name ?? "—"} />
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">Email Verified</span>
              {profile.is_verified ? (
                <span className="flex items-center gap-1 text-xs font-medium text-accent">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-medium text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5" /> Not verified
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Could not load profile.</p>
        )}
      </div>

      {/* Change Password */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10">
            <Lock className="h-4 w-4 text-accent" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">Change Password</h2>
        </div>

        <div className="space-y-3">
          <Field
            label="Current Password"
            type="password"
            value={pwForm.current_password}
            onChange={(v) => setPwForm((p) => ({ ...p, current_password: v }))}
          />
          <Field
            label="New Password"
            type="password"
            value={pwForm.new_password}
            onChange={(v) => setPwForm((p) => ({ ...p, new_password: v }))}
          />
          <Field
            label="Confirm New Password"
            type="password"
            value={pwForm.confirm}
            onChange={(v) => setPwForm((p) => ({ ...p, confirm: v }))}
          />

          {pwError && (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5" /> {pwError}
            </p>
          )}
          {pwSuccess && (
            <p className="flex items-center gap-1.5 text-xs text-accent">
              <CheckCircle2 className="h-3.5 w-3.5" /> Password changed successfully
            </p>
          )}

          <div className="pt-2">
            <button
              onClick={changePassword}
              disabled={pwLoading || !pwForm.current_password || !pwForm.new_password || !pwForm.confirm}
              className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {pwLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Update Password
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground font-medium">{value}</span>
    </div>
  )
}

function Field({ label, type, value, onChange }: {
  label: string; type: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent transition-colors"
      />
    </div>
  )
}

