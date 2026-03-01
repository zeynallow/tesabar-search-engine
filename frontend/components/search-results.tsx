"use client"

import { useSearchParams } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import {
  LayoutGrid,
  List,
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowUpDown,
  Sparkles,
  Loader2,
  Check,
  GitCompare,
  ExternalLink,
  Sun,
  Moon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { SearchBar } from "@/components/search-bar"
import { ProductCard, type ApiProduct } from "@/components/product-card"
import { Logo } from "@/components/logo"

const SORT_OPTIONS = [
  { label: "Relevance", value: "relevance" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Rating", value: "rating" },
  { label: "Newest", value: "newest" },
  { label: "Best Discount", value: "discount" },
]

interface CompareProduct {
  product: ApiProduct
  attributes: Array<{ name: string; value: unknown }>
}

interface CompareResult {
  products: CompareProduct[]
  common_attributes: string[]
  diff_attributes: string[]
}

export function SearchResults() {
  const searchParams = useSearchParams()
  const query = searchParams.get("q") || ""
  const apiBase = process.env.NEXT_PUBLIC_API_URL
  const { theme, setTheme } = useTheme()

  const [layout, setLayout] = useState<"grid" | "list">("grid")
  const [activeCategory, setActiveCategory] = useState("")
  const [activeSort, setActiveSort] = useState("relevance")
  const [priceMin, setPriceMin] = useState("")
  const [priceMax, setPriceMax] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [minRating, setMinRating] = useState(0)
  const [inStockOnly, setInStockOnly] = useState(false)
  const [activeSiteIds, setActiveSiteIds] = useState<string[]>([])
  const [activeBrands, setActiveBrands] = useState<string[]>([])
  const [page, setPage] = useState(1)

  const [products, setProducts] = useState<ApiProduct[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [tookMs, setTookMs] = useState(0)
  const [loading, setLoading] = useState(false)
  const [facetCategories, setFacetCategories] = useState<string[]>([])
  const [facetStores, setFacetStores] = useState<string[]>([])
  const [facetBrands, setFacetBrands] = useState<string[]>([])

  const [compareIds, setCompareIds] = useState<string[]>([])
  const [showCompareModal, setShowCompareModal] = useState(false)
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null)
  const [compareLoading, setCompareLoading] = useState(false)

  // Debounced price values
  const priceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedPriceMin, setDebouncedPriceMin] = useState("")
  const [debouncedPriceMax, setDebouncedPriceMax] = useState("")

  function handlePriceChange(min: string, max: string) {
    setPriceMin(min)
    setPriceMax(max)
    if (priceTimer.current) clearTimeout(priceTimer.current)
    priceTimer.current = setTimeout(() => {
      setDebouncedPriceMin(min)
      setDebouncedPriceMax(max)
    }, 500)
  }

  // Reset page when any filter/sort/query changes (but not when page itself changes)
  useEffect(() => {
    setPage(1)
  }, [query, activeSort, activeCategory, debouncedPriceMin, debouncedPriceMax, minRating, inStockOnly, activeSiteIds, activeBrands])

  useEffect(() => {
    if (!query.trim()) {
      setProducts([])
      setTotal(0)
      setTotalPages(0)
      setFacetCategories([])
      setFacetStores([])
      setFacetBrands([])
      return
    }

    const controller = new AbortController()
    setLoading(true)

    const params = new URLSearchParams({ q: query, sort: activeSort, page: String(page) })
    if (activeCategory) params.set("categories", activeCategory)
    if (debouncedPriceMin) params.set("min_price", debouncedPriceMin)
    if (debouncedPriceMax) params.set("max_price", debouncedPriceMax)
    if (minRating > 0) params.set("min_rating", String(minRating))
    if (inStockOnly) params.set("in_stock_only", "true")
    activeSiteIds.forEach((id) => params.append("site_ids", id))
    activeBrands.forEach((b) => params.append("brands", b))

    fetch(`${apiBase}/api/v1/search?${params.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.results ?? [])
        setTotal(data.total ?? 0)
        setTotalPages(data.total_pages ?? 0)
        setTookMs(data.took_ms ?? 0)
        const cats: string[] = (data.facets?.categories ?? []).map((f: { key: string }) => f.key)
        setFacetCategories(cats)
        const stores: string[] = (data.facets?.sites ?? []).map((f: { key: string }) => f.key)
        setFacetStores(stores)
        const brands: string[] = (data.facets?.brands ?? []).map((f: { key: string }) => f.key)
        setFacetBrands(brands)
      })
      .catch(() => {/* aborted or network error */})
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [query, activeSort, activeCategory, debouncedPriceMin, debouncedPriceMax, minRating, inStockOnly, activeSiteIds, activeBrands, page, apiBase])

  async function fetchCompare() {
    if (compareIds.length < 2) return
    setCompareLoading(true)
    try {
      const r = await fetch(`${apiBase}/api/v1/search/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_ids: compareIds }),
      })
      const data: CompareResult = await r.json()
      setCompareResult(data)
      setShowCompareModal(true)
    } catch {
      // network error
    }
    setCompareLoading(false)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3">
          <Logo size="sm" />
          <div className="flex-1">
            <SearchBar defaultValue={query} size="md" showSuggestions={false} />
          </div>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6">
        {/* Search Meta */}
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-1">
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-accent" />
              )}
              <span className="text-sm font-medium text-accent">
                {total.toLocaleString()} results
              </span>
            </div>
            {query && (
              <span className="text-sm text-muted-foreground">
                for &ldquo;<span className="text-foreground font-medium">{query}</span>&rdquo;
              </span>
            )}
          </div>
          {tookMs > 0 && (
            <span className="text-xs text-muted-foreground">{(tookMs / 1000).toFixed(2)} seconds</span>
          )}
        </div>

        {/* Controls Bar */}
        <div className="flex items-center justify-between gap-4 pb-4">
          {/* Categories from facets */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveCategory("")}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                activeCategory === ""
                  ? "bg-accent text-accent-foreground"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            {facetCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  activeCategory === cat
                    ? "bg-accent text-accent-foreground"
                    : "border border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Right controls */}
          <div className="flex shrink-0 items-center gap-2">
            {/* Filters */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                showFilters
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <SlidersHorizontal className="h-3 w-3" />
              Filters
            </button>

            {/* Layout toggle */}
            <div className="flex overflow-hidden rounded-lg border border-border">
              <button
                onClick={() => setLayout("grid")}
                className={`p-1.5 transition-colors ${
                  layout === "grid"
                    ? "bg-accent text-accent-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="sr-only">Grid layout</span>
              </button>
              <button
                onClick={() => setLayout("list")}
                className={`p-1.5 transition-colors ${
                  layout === "list"
                    ? "bg-accent text-accent-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span className="sr-only">List layout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="mb-4 rounded-2xl border border-border bg-card p-5 animate-in slide-in-from-top-2 fade-in duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Filters</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close filters</span>
              </button>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* Price Range */}
              <div>
                <label className="mb-2 block text-xs font-medium text-muted-foreground">
                  Price Range
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={priceMin}
                    onChange={(e) => handlePriceChange(e.target.value, priceMax)}
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-foreground outline-none focus:border-accent"
                    placeholder="Min"
                  />
                  <span className="text-muted-foreground">-</span>
                  <input
                    type="number"
                    value={priceMax}
                    onChange={(e) => handlePriceChange(priceMin, e.target.value)}
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-foreground outline-none focus:border-accent"
                    placeholder="Max"
                  />
                </div>
              </div>

              {/* Rating */}
              <div>
                <label className="mb-2 block text-xs font-medium text-muted-foreground">
                  Minimum Rating
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[0, 3, 3.5, 4, 4.5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => setMinRating(rating)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                        minRating === rating
                          ? "bg-accent text-accent-foreground"
                          : "border border-border bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {rating === 0 ? "Any" : `${rating}+`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Availability */}
              <div>
                <label className="mb-2 block text-xs font-medium text-muted-foreground">
                  Availability
                </label>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-accent"
                  />
                  <span className="text-sm text-foreground">In Stock Only</span>
                </label>
              </div>

              {/* Stores */}
              {facetStores.length > 0 && (
                <div>
                  <label className="mb-2 block text-xs font-medium text-muted-foreground">
                    Stores
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {facetStores.map((store) => (
                      <button
                        key={store}
                        onClick={() =>
                          setActiveSiteIds((prev) =>
                            prev.includes(store)
                              ? prev.filter((s) => s !== store)
                              : [...prev, store]
                          )
                        }
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                          activeSiteIds.includes(store)
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border bg-secondary text-muted-foreground hover:border-accent/30 hover:text-foreground"
                        }`}
                      >
                        {store}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Brands */}
            {facetBrands.length > 0 && (
              <div className="mt-6">
                <label className="mb-2 block text-xs font-medium text-muted-foreground">
                  Brands
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {facetBrands.map((brand) => (
                    <button
                      key={brand}
                      onClick={() =>
                        setActiveBrands((prev) =>
                          prev.includes(brand)
                            ? prev.filter((b) => b !== brand)
                            : [...prev, brand]
                        )
                      }
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                        activeBrands.includes(brand)
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border bg-secondary text-muted-foreground hover:border-accent/30 hover:text-foreground"
                      }`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sort Dropdown inline */}
        <SortDropdown activeSort={activeSort} setActiveSort={setActiveSort} />

        {/* Results */}
        {loading && products.length === 0 ? (
          <div
            className={
              layout === "grid"
                ? "grid gap-4 pb-10 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "flex flex-col gap-3 pb-10"
            }
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`animate-pulse rounded-2xl bg-secondary ${layout === "grid" ? "aspect-[3/4]" : "h-36"}`} />
            ))}
          </div>
        ) : (
          <div
            className={
              layout === "grid"
                ? "grid gap-4 pb-10 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "flex flex-col gap-3 pb-10"
            }
          >
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                layout={layout}
                isInCompare={compareIds.includes(product.id)}
                onToggleCompare={() =>
                  setCompareIds((prev) =>
                    prev.includes(product.id)
                      ? prev.filter((id) => id !== product.id)
                      : prev.length < 5
                      ? [...prev, product.id]
                      : prev
                  )
                }
              />
            ))}
          </div>
        )}

        {!loading && products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              {query ? "No results found" : "Start searching"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {query
                ? "Try adjusting your filters or search for something else"
                : "Enter a product name, brand, or category above"}
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pb-10 pt-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : Math.min(page + i - 3, totalPages - 6 + i)
                if (p < 1 || p > totalPages) return null
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`h-7 w-7 rounded-lg text-xs font-medium transition-colors ${
                      p === page
                        ? "bg-accent text-accent-foreground"
                        : "border border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Compare Bar */}
      {compareIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 px-6 py-3 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-3">
              <GitCompare className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-foreground">
                {compareIds.length} product{compareIds.length !== 1 ? "s" : ""} selected
              </span>
              {compareIds.length < 2 && (
                <span className="text-xs text-muted-foreground">
                  (select {2 - compareIds.length} more to compare)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCompareIds([])}
                className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Clear
              </button>
              <button
                onClick={fetchCompare}
                disabled={compareIds.length < 2 || compareLoading}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-1.5 text-xs font-medium text-accent-foreground transition-opacity disabled:opacity-50"
              >
                {compareLoading
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <GitCompare className="h-3.5 w-3.5" />
                }
                Compare
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compare Modal */}
      {showCompareModal && compareResult && (
        <div className="fixed inset-0 z-[60] overflow-auto bg-background/95 backdrop-blur-xl">
          <div className="mx-auto max-w-6xl px-6 py-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Product Comparison</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {compareResult.products.length} products compared side by side
                </p>
              </div>
              <button
                onClick={() => setShowCompareModal(false)}
                className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="w-36 px-4 py-3 text-left text-xs font-medium text-muted-foreground">Attribute</th>
                    {compareResult.products.map((item) => (
                      <th key={item.product.id} className="px-4 py-3 text-left">
                        <div className="text-sm font-medium text-foreground line-clamp-2">{item.product.name}</div>
                        {item.product.price != null && (
                          <div className="mt-1 text-base font-bold text-accent">
                            {item.product.currency ?? "$"}{item.product.price.toLocaleString()}
                          </div>
                        )}
                        <a
                          href={item.product.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-accent"
                        >
                          {item.product.site_domain}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compareResult.products[0]?.attributes.map((attr) => {
                    const isDiff = compareResult.diff_attributes.includes(attr.name)
                    return (
                      <tr
                        key={attr.name}
                        className={`border-b border-border/50 ${isDiff ? "bg-accent/5" : ""}`}
                      >
                        <td className="px-4 py-2.5 text-xs font-medium text-muted-foreground">
                          {attr.name}
                          {isDiff && (
                            <span className="ml-1 rounded bg-accent/20 px-1 py-0.5 text-[10px] text-accent">diff</span>
                          )}
                        </td>
                        {compareResult.products.map((item) => {
                          const a = item.attributes.find((a) => a.name === attr.name)
                          return (
                            <td key={item.product.id} className="px-4 py-2.5 text-sm text-foreground">
                              {a ? String(a.value ?? "—") : "—"}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                  {/* Core product fields */}
                  {[
                    { label: "Brand", get: (p: ApiProduct) => p.brand ?? "—" },
                    { label: "Category", get: (p: ApiProduct) => p.category ?? "—" },
                    { label: "Rating", get: (p: ApiProduct) => p.rating != null ? `${p.rating.toFixed(1)} ★` : "—" },
                    { label: "Reviews", get: (p: ApiProduct) => p.review_count != null ? p.review_count.toLocaleString() : "—" },
                    { label: "In Stock", get: (p: ApiProduct) => p.in_stock ? "Yes" : "No" },
                  ].map((row) => (
                    <tr key={row.label} className="border-b border-border/50">
                      <td className="px-4 py-2.5 text-xs font-medium text-muted-foreground">{row.label}</td>
                      {compareResult.products.map((item) => (
                        <td key={item.product.id} className="px-4 py-2.5 text-sm text-foreground">
                          {row.get(item.product)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SortDropdown({
  activeSort,
  setActiveSort,
}: {
  activeSort: string
  setActiveSort: (v: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative mb-4 inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowUpDown className="h-3 w-3" />
        Sort: {SORT_OPTIONS.find((s) => s.value === activeSort)?.label}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 min-w-[180px] overflow-hidden rounded-xl border border-border bg-card shadow-xl">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setActiveSort(opt.value)
                setOpen(false)
              }}
              className={`flex w-full items-center px-3 py-2 text-left text-xs transition-colors hover:bg-secondary ${
                activeSort === opt.value
                  ? "font-medium text-accent"
                  : "text-muted-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
