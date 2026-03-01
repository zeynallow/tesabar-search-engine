"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Globe } from "lucide-react"

export default function NewSitePage() {
  const [form, setForm] = useState({ domain: "", name: "", description: "" })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const token = localStorage.getItem("console_token")
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/console/sites`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Failed to create site")
      router.push(`/console/sites/${data.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <Link href="/console/sites" className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Sites
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Add New Site</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Register your store to start indexing products</p>
      </div>

      <div className="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Domain <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={form.domain}
                  onChange={(e) => set("domain", e.target.value)}
                  required
                  placeholder="mystore.com"
                  className="w-full rounded-xl border border-border bg-secondary pl-10 pr-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-accent transition-colors"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Enter your domain without http:// or www (e.g., mystore.com)
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Site Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
                placeholder="My Awesome Store"
                className="w-full rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-accent transition-colors"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                placeholder="Brief description of your store..."
                className="w-full rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm text-foreground outline-none resize-none placeholder:text-muted-foreground/60 focus:border-accent transition-colors"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-2">What happens next?</h3>
            <ul className="space-y-2">
              {[
                "Your site will be registered and you'll receive a verification token",
                "Add the verification meta tag to your site's HTML",
                "Once verified, add your sitemap URL to start indexing",
                "We'll crawl and index your products automatically",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[10px] font-bold text-accent mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ul>
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Link
              href="/console/sites"
              className="flex-1 rounded-xl border border-border bg-secondary px-4 py-2.5 text-center text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90 active:scale-[0.98] disabled:opacity-60 transition-all"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Register Site"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

