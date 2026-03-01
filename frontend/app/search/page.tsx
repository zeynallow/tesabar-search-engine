import { SearchResults } from "@/components/search-results"
import { Suspense } from "react"

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchResultsSkeleton />}>
      <SearchResults />
    </Suspense>
  )
}

function SearchResultsSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3">
          <div className="h-8 w-20 animate-pulse rounded-lg bg-secondary" />
          <div className="h-10 flex-1 animate-pulse rounded-xl bg-secondary" />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-24 animate-pulse rounded-lg bg-secondary" />
          ))}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-2xl bg-secondary" />
          ))}
        </div>
      </div>
    </div>
  )
}
