"use client"

import { Search, X } from "lucide-react"
import { useState, useRef, useEffect, type FormEvent } from "react"
import { useRouter } from "next/navigation"

interface SearchBarProps {
  defaultValue?: string
  size?: "lg" | "md"
  autoFocus?: boolean
  showSuggestions?: boolean
}

export function SearchBar({
  defaultValue = "",
  size = "lg",
  autoFocus = false,
  showSuggestions = true,
}: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue)
  const [isFocused, setIsFocused] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [suggestions, setSuggestions] = useState<Array<{ text: string; type: string }>>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const autocompleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (!showSuggestions || !query.trim()) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }
    if (autocompleteTimer.current) clearTimeout(autocompleteTimer.current)
    autocompleteTimer.current = setTimeout(async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL
        const r = await fetch(
          `${apiBase}/api/v1/search/autocomplete?q=${encodeURIComponent(query.trim())}&limit=8`
        )
        const data = await r.json()
        const items: Array<{ text: string; type: string }> = data.suggestions ?? []
        setSuggestions(items)
        if (items.length > 0) setShowDropdown(true)
      } catch {
        // network error or abort
      }
    }, 250)
    return () => {
      if (autocompleteTimer.current) clearTimeout(autocompleteTimer.current)
    }
  }, [query, showSuggestions])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (query.trim()) {
      setShowDropdown(false)
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  function handleSuggestionClick(suggestion: string) {
    setQuery(suggestion)
    setShowDropdown(false)
    router.push(`/search?q=${encodeURIComponent(suggestion)}`)
  }

  const isLg = size === "lg"

  return (
    <div ref={wrapperRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={`
            flex items-center rounded-2xl border transition-all duration-300
            ${isFocused
              ? "border-accent/50 bg-card shadow-[0_0_30px_rgba(80,200,120,0.08)]"
              : "border-border bg-card/80 hover:border-muted-foreground/30"
            }
            ${isLg ? "px-5 py-4" : "px-4 py-2.5"}
          `}
        >
          <Search
            className={`shrink-0 text-muted-foreground transition-colors ${
              isFocused ? "text-accent" : ""
            } ${isLg ? "h-5 w-5" : "h-4 w-4"}`}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              if (!e.target.value.trim()) {
                setShowDropdown(false)
                setSuggestions([])
              }
            }}
            onFocus={() => {
              setIsFocused(true)
              if (showSuggestions && suggestions.length > 0) setShowDropdown(true)
            }}
            onBlur={() => setIsFocused(false)}
            placeholder="Search millions of products across stores..."
            autoFocus={autoFocus}
            className={`flex-1 bg-transparent outline-none placeholder:text-muted-foreground/60 ${
              isLg ? "mx-4 text-lg" : "mx-3 text-sm"
            }`}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("")
                inputRef.current?.focus()
              }}
              className="mr-2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear search</span>
            </button>
          )}
          <button
            type="submit"
            className={`shrink-0 rounded-xl bg-accent text-accent-foreground font-medium transition-all hover:opacity-90 active:scale-95 ${
              isLg ? "px-6 py-2.5 text-sm" : "px-4 py-1.5 text-xs"
            }`}
          >
            Search
          </button>
        </div>
      </form>

      {/* Suggestions Dropdown */}
      {showDropdown && showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 z-50 mt-2 w-full overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <div className="p-2">
            {suggestions.map((item) => (
              <button
                key={item.text}
                type="button"
                onClick={() => handleSuggestionClick(item.text)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-secondary"
              >
                <div className="flex items-center gap-3">
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm text-foreground">{item.text}</span>
                </div>
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                    item.type === "brand"
                      ? "bg-blue-500/10 text-blue-400"
                      : item.type === "category"
                      ? "bg-purple-500/10 text-purple-400"
                      : "bg-accent/10 text-accent"
                  }`}
                >
                  {item.type}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
