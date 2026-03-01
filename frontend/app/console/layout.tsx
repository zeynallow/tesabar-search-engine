"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Globe, Megaphone, Settings, LogOut, ChevronRight } from "lucide-react"

const navItems = [
  { href: "/console", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/console/sites", label: "Sites", icon: Globe },
  { href: "/console/ads", label: "Ads & Campaigns", icon: Megaphone },
  { href: "/console/settings", label: "Settings", icon: Settings },
]

const AUTH_ROUTES = ["/console/login", "/console/register"]

function isVerifyEmailRoute(pathname: string) {
  return pathname.startsWith("/console/verify-email")
}

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [ready, setReady] = useState(false)

  const isAuthRoute = AUTH_ROUTES.includes(pathname) || isVerifyEmailRoute(pathname)

  useEffect(() => {
    if (isAuthRoute) {
      setReady(true)
      return
    }
    if (!localStorage.getItem("console_token")) {
      router.replace("/console/login")
    } else {
      setReady(true)
    }
  }, [router, isAuthRoute])

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  async function handleLogout() {
    const token = localStorage.getItem("console_token")
    if (token) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/console/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch {
        // ignore errors, proceed with local logout
      }
    }
    localStorage.removeItem("console_token")
    router.push("/console/login")
  }

  if (!ready) return null

  // Login / Register pages — render without sidebar
  if (isAuthRoute) return <>{children}</>

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="flex flex-col items-start border-b border-border px-5 py-4">
          <Link href="/" className="flex flex-col items-start gap-0.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/tesabar_logo.svg"
              alt="Tesabar"
              className="h-6 dark:brightness-0 dark:invert transition-[filter]"
            />
            <span className="text-[9px] font-semibold tracking-[0.2em] uppercase text-muted-foreground leading-none">
              Console
            </span>
          </Link>
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
                    ? "bg-accent/15 text-accent"
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
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
          <Link href="/" className="flex flex-col items-start gap-0.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/tesabar_logo.svg"
              alt="Tesabar"
              className="h-5 dark:brightness-0 dark:invert transition-[filter]"
            />
            <span className="text-[8px] font-semibold tracking-[0.2em] uppercase text-muted-foreground leading-none">
              Console
            </span>
          </Link>
        </header>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  )
}

