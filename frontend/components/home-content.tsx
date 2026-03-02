"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Zap, Globe, ShieldCheck, BarChart3, Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"
import { SearchBar } from "@/components/search-bar"
import { TrendingCard } from "@/components/trending-card"
import { StoreChip } from "@/components/store-chip"
import { Logo } from "@/components/logo"
import { useLang } from "@/lib/i18n"
import type { Lang } from "@/lib/i18n"
import { useCountryDetect } from "@/hooks/use-country"

interface TrendingItem { query: string; category: string; count: string }
interface PopularStore { id: string; name: string; domain: string; total_pages_indexed: number }
interface PublicStats { total_sites: number; total_products_indexed: number }

function fmtNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B+`
  if (n >= 1_000_000) return `${Math.floor(n / 1_000_000)}M+`
  if (n >= 1_000) return `${Math.floor(n / 1_000)}K+`
  return n.toLocaleString()
}

export function HomeContent() {
  const router = useRouter()
  const apiBase = process.env.NEXT_PUBLIC_API_URL
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const { t, lang, setLang } = useLang()

  // Detect country from IP on first visit
  useCountryDetect()

  const [trending, setTrending] = useState<TrendingItem[]>([])
  const [stores, setStores] = useState<PopularStore[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [stats, setStats] = useState<PublicStats | null>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    Promise.all([
      fetch(`${apiBase}/api/v1/search/trending?limit=6`).then((r) => r.json()).catch(() => ({ trending: [] })),
      fetch(`${apiBase}/api/v1/search/popular-stores?limit=6`).then((r) => r.json()).catch(() => ({ stores: [] })),
      fetch(`${apiBase}/api/v1/search/categories?limit=12`).then((r) => r.json()).catch(() => ({ categories: [] })),
      fetch(`${apiBase}/api/v1/search/stats`).then((r) => r.json()).catch(() => null),
    ]).then(([tr, s, c, st]) => {
      if (Array.isArray(tr.trending)) setTrending(tr.trending)
      if (Array.isArray(s.stores)) setStores(s.stores)
      if (Array.isArray(c.categories)) setCategories(c.categories)
      if (st && typeof st.total_sites === "number") setStats(st)
    })
  }, [apiBase])

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      {/* Subtle background pattern */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-accent/[0.03] blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-accent/[0.02] blur-[100px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-4xl flex-col px-4 sm:px-6">
        {/* Header */}
        <header className="flex items-center justify-between pt-5 sm:pt-6">
          <Logo size="sm" />
          <nav className="flex items-center gap-1">
            <a
              href="#stats"
              className="hidden sm:inline-flex rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("about")}
            </a>
            <Link
              href="/console/register"
              className="hidden sm:inline-flex rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("api")}
            </Link>
            <Link
              href="/console/login"
              className="ml-2 rounded-xl bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:px-4"
            >
              {t("signIn")}
            </Link>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="ml-1 rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Toggle theme"
            >
              {mounted ? (
                theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </button>
          </nav>
        </header>

        {/* Hero */}
        <section className="flex flex-1 flex-col items-center justify-center pb-20">
          <div className="mb-6 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-accent" />
            <span className="text-xs font-medium text-muted-foreground">
              {stats
                ? `${t("searchingAcross")} ${fmtNumber(stats.total_products_indexed)} ${t("fromStores")} ${fmtNumber(stats.total_sites)} stores`
                : t("millionsOfProducts")}
            </span>
          </div>

          <h1 className="mb-3 text-center text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl text-balance">
            {t("heroTitle1")}
            <br />
            <span className="text-accent">{t("heroTitle2")}</span>
          </h1>

          <p className="mb-10 max-w-lg text-center text-base leading-relaxed text-muted-foreground text-pretty">
            {t("heroSubtitle")}
          </p>

          {/* Search */}
          <div className="w-full max-w-2xl">
            <SearchBar size="lg" autoFocus showSuggestions />
          </div>

          {/* Quick Categories */}
          {categories.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => router.push(`/search?q=${encodeURIComponent(cat)}`)}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-accent/30 hover:text-foreground"
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Stats row */}
        <section id="stats" className="border-t border-border py-10">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { icon: Globe, label: t("storesIndexed"), value: stats ? fmtNumber(stats.total_sites) : "—" },
              { icon: BarChart3, label: t("products"), value: stats ? fmtNumber(stats.total_products_indexed) : "—" },
              { icon: Zap, label: t("avgResponse"), value: "0.2s" },
              { icon: ShieldCheck, label: t("verifiedSellers"), value: "98%" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-4 text-center"
              >
                <stat.icon className="h-4 w-4 text-accent" />
                <span className="text-xl font-bold text-foreground">{stat.value}</span>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Trending */}
        {trending.length > 0 && (
          <section className="border-t border-border py-10">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">{t("trendingNow")}</h2>
              <span className="text-xs text-muted-foreground">{t("fromLiveIndex")}</span>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {trending.map((item) => (
                <TrendingCard key={item.query} item={item} />
              ))}
            </div>
          </section>
        )}

        {/* Popular Stores */}
        {stores.length > 0 && (
          <section className="border-t border-border py-10">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">{t("popularStores")}</h2>
              <button
                onClick={() => router.push("/search")}
                className="text-xs text-accent transition-colors hover:underline"
              >
                {t("viewAll")}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {stores.map((store) => (
                <StoreChip
                  key={store.id}
                  store={{ name: store.name, domain: store.domain, logo: store.name.charAt(0).toUpperCase(), productCount: store.total_pages_indexed }}
                />
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="border-t border-border py-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-4">
              <Logo size="sm" />
              <span className="text-xs text-muted-foreground">
                {t("tagline")}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <a href="#" className="transition-colors hover:text-foreground">{t("privacy")}</a>
              <a href="#" className="transition-colors hover:text-foreground">{t("terms")}</a>
              <a href="#" className="transition-colors hover:text-foreground">{t("contact")}</a>
              {/* Language switcher */}
              <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary p-0.5">
                {(["az", "en"] as Lang[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase transition-all ${
                      lang === l
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </footer>
      </div>
    </main>
  )
}
