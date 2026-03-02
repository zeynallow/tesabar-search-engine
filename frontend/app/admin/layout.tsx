"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ShieldCheck, LayoutDashboard, Globe, Users, Activity, LogOut, ChevronRight } from "lucide-react"
import { useLang } from "@/lib/i18n"

const AUTH_ROUTES = ["/admin/login"]

interface AdminMe {
  email: string
  full_name: string
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [me, setMe] = useState<AdminMe | null>(null)
  const { t } = useLang()

  const isAuthRoute = AUTH_ROUTES.includes(pathname)

  const navItems = [
    { href: "/admin", label: t("navDashboard"), icon: LayoutDashboard, exact: true },
    { href: "/admin/sites", label: t("allSites"), icon: Globe },
    { href: "/admin/users", label: t("users"), icon: Users },
    { href: "/admin/indexing", label: t("indexingJobs"), icon: Activity },
  ]

  useEffect(() => {
    if (isAuthRoute) {
      setReady(true)
      return
    }
    const token = localStorage.getItem("admin_token")
    if (!token) {
      router.replace("/admin/login")
      return
    }
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/console/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => { if (d.email) setMe({ email: d.email, full_name: d.full_name }) })
      .catch(() => {})
      .finally(() => setReady(true))
  }, [router, isAuthRoute])

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  function handleLogout() {
    localStorage.removeItem("admin_token")
    router.push("/admin/login")
  }

  if (!ready) return null

  // Login page — render without sidebar
  if (isAuthRoute) return <>{children}</>

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground">
            <ShieldCheck className="h-4 w-4 text-background" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight">Tesabar {t("adminPanel")}</div>
            <div className="text-[10px] text-muted-foreground">{t("systemControl")}</div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-foreground/10 text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
                {active && <ChevronRight className="ml-auto h-3 w-3" />}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-border p-3">
          <div className="mb-2 rounded-xl bg-secondary px-3 py-2">
            <p className="text-[10px] font-medium text-muted-foreground">{t("signedInAs")}</p>
            <p className="text-xs font-semibold text-foreground truncate">{me?.email ?? "—"}</p>
            {me?.full_name && (
              <p className="text-[10px] text-muted-foreground truncate">{me.full_name}</p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            {t("signOut")}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 lg:hidden">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-background" />
          </div>
          <span className="text-sm font-bold">{t("adminPanel")}</span>
        </header>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  )
}

