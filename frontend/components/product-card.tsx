"use client"

import { Star, ExternalLink, ShieldCheck, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export interface ApiProduct {
  id: string
  site_id: string
  site_domain: string
  url: string
  name: string
  description?: string | null
  brand?: string | null
  category?: string | null
  price?: number | null
  original_price?: number | null
  currency?: string | null
  discount_percent?: number | null
  in_stock: boolean
  rating?: number | null
  review_count?: number | null
  images?: string[] | null
  sku?: string | null
  is_sponsored?: boolean
  ad_id?: string | null
}

interface ProductCardProps {
  product: ApiProduct
  layout?: "grid" | "list"
  isInCompare?: boolean
  onToggleCompare?: () => void
}

export function ProductCard({ product, layout = "grid", isInCompare, onToggleCompare }: ProductCardProps) {
  const storeIcon = product.site_domain.charAt(0).toUpperCase()
  const discount = product.discount_percent
    ? Math.round(product.discount_percent)
    : product.original_price && product.price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0

  async function visitStore() {
    if (product.is_sponsored && product.ad_id) {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL
        await fetch(`${apiBase}/api/v1/search/ads/${product.ad_id}/click`, { method: "POST" })
      } catch {
        // tracking failure should not block navigation
      }
    }
    window.open(product.url, "_blank", "noopener,noreferrer")
  }

  if (layout === "list") {
    return (
      <article className="group relative flex gap-5 rounded-2xl border border-border bg-card p-4 transition-all duration-300 hover:border-accent/30 hover:shadow-[0_0_30px_rgba(80,200,120,0.06)]">
        {/* Image */}
        <div className="relative h-36 w-36 shrink-0 overflow-hidden rounded-xl bg-secondary">
          <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-muted-foreground/30">
            {product.name.charAt(0)}
          </div>
          {product.is_sponsored && (
            <Badge
              variant="secondary"
              className="absolute top-2 left-2 bg-accent/90 text-accent-foreground text-[10px] font-medium"
            >
              Sponsored
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-secondary text-[10px] font-bold text-secondary-foreground">
                {storeIcon}
              </div>
              <span className="text-xs text-muted-foreground">{product.site_domain}</span>
            </div>
            <h3 className="text-sm font-medium leading-snug text-foreground line-clamp-2 group-hover:text-accent transition-colors">
              {product.name}
            </h3>
            {product.rating != null && (
              <div className="mt-2 flex items-center gap-1.5">
                <div className="flex items-center gap-0.5">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-medium text-foreground">{product.rating.toFixed(1)}</span>
                </div>
                {product.review_count != null && (
                  <span className="text-xs text-muted-foreground">
                    ({product.review_count.toLocaleString()} reviews)
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-end justify-between">
            <div className="flex items-baseline gap-2">
              {product.price != null ? (
                <span className="text-xl font-bold text-foreground">
                  {product.currency ?? "$"}{product.price.toLocaleString()}
                </span>
              ) : (
                <span className="text-xl font-bold text-muted-foreground">—</span>
              )}
              {product.original_price != null && (
                <span className="text-sm text-muted-foreground line-through">
                  {product.currency ?? "$"}{product.original_price.toLocaleString()}
                </span>
              )}
              {discount > 0 && (
                <span className="text-xs font-medium text-accent">-{discount}%</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {onToggleCompare && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onToggleCompare() }}
                  className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    isInCompare
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Check className="h-3 w-3" />
                  {isInCompare ? "Selected" : "Compare"}
                </button>
              )}
              <button
                onClick={visitStore}
                className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Visit Store
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </article>
    )
  }

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:border-accent/30 hover:shadow-[0_0_30px_rgba(80,200,120,0.06)]">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-secondary">
        <div className="flex h-full w-full items-center justify-center text-6xl font-bold text-muted-foreground/20">
          {product.name.charAt(0)}
        </div>
        {product.is_sponsored && (
          <Badge
            variant="secondary"
            className="absolute top-3 left-3 bg-accent/90 text-accent-foreground text-[10px] font-medium"
          >
            Sponsored
          </Badge>
        )}
        {discount > 0 && (
          <div className="absolute top-3 right-3 rounded-lg bg-foreground/80 px-2 py-0.5 text-[10px] font-bold text-background">
            -{discount}%
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:opacity-100">
          <button
            onClick={visitStore}
            className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-all hover:opacity-90 active:scale-95"
          >
            Visit Store
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>
        {/* Compare toggle */}
        {onToggleCompare && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleCompare() }}
            className={`absolute bottom-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-md border transition-all ${
              isInCompare
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border/80 bg-card/80 text-muted-foreground hover:border-accent/50"
            }`}
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        {/* Store info */}
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-secondary text-[10px] font-bold text-secondary-foreground">
            {storeIcon}
          </div>
          <span className="text-xs text-muted-foreground">{product.site_domain}</span>
          <ShieldCheck className="ml-auto h-3.5 w-3.5 text-accent" />
        </div>

        {/* Title */}
        <h3 className="text-sm font-medium leading-snug text-foreground line-clamp-2">
          {product.name}
        </h3>

        {/* Rating */}
        {product.rating != null && (
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${
                    i < Math.floor(product.rating!)
                      ? "fill-amber-400 text-amber-400"
                      : "fill-muted text-muted"
                  }`}
                />
              ))}
            </div>
            {product.review_count != null && (
              <span className="text-[11px] text-muted-foreground">
                ({product.review_count.toLocaleString()})
              </span>
            )}
          </div>
        )}

        {/* Price */}
        <div className="mt-auto flex items-baseline gap-2">
          {product.price != null ? (
            <span className="text-lg font-bold text-foreground">
              {product.currency ?? "$"}{product.price.toLocaleString()}
            </span>
          ) : (
            <span className="text-lg font-bold text-muted-foreground">—</span>
          )}
          {product.original_price != null && (
            <span className="text-xs text-muted-foreground line-through">
              {product.currency ?? "$"}{product.original_price.toLocaleString()}
            </span>
          )}
        </div>

        {/* Tags */}
        <div className="flex items-center gap-2">
          {product.in_stock && (
            <div className="rounded-md bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
              In Stock
            </div>
          )}
          {product.brand && (
            <div className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {product.brand}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
