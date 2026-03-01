"use client"

import { useRouter } from "next/navigation"
interface StoreInfo {
  name: string
  domain: string
  logo: string
  productCount: number
}

interface StoreChipProps {
  store: StoreInfo
}

export function StoreChip({ store }: StoreChipProps) {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => router.push(`/search?q=${encodeURIComponent(store.name)}`)}
      className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-all duration-300 hover:border-accent/30"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-lg font-bold text-secondary-foreground transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
        {store.logo}
      </div>
      <div className="text-left">
        <p className="text-sm font-medium text-foreground">{store.name}</p>
        <p className="text-[11px] text-muted-foreground">
          {(store.productCount / 1000000).toFixed(0)}M+ products
        </p>
      </div>
    </button>
  )
}
