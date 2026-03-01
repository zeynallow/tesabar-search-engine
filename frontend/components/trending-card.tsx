"use client"

import { TrendingUp, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
interface TrendingSearch {
  query: string
  category: string
  count: string
}

interface TrendingCardProps {
  item: TrendingSearch
}

export function TrendingCard({ item }: TrendingCardProps) {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => router.push(`/search?q=${encodeURIComponent(item.query)}`)}
      className="group flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left transition-all duration-300 hover:border-accent/30 hover:bg-card/90"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
          <TrendingUp className="h-3.5 w-3.5 text-accent" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{item.query}</p>
          <p className="text-[11px] text-muted-foreground">
            {item.category} &middot; {item.count} searches
          </p>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
    </button>
  )
}
