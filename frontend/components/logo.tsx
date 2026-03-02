"use client"

import Link from "next/link"
import { useLang } from "@/lib/i18n"
import { getCountryByCode } from "@/lib/countries"

interface LogoProps {
  size?: "lg" | "sm"
}

export function Logo({ size = "sm" }: LogoProps) {
  const { country } = useLang()
  const countryData = getCountryByCode(country)

  return (
    <Link href="/" className="flex items-center gap-1.5">
      {countryData && (
        <span className={`font-bold tracking-wide text-muted-foreground select-none ${
          size === "lg" ? "text-sm" : "text-[10px]"
        }`}>
          {countryData.code}
        </span>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/tesabar_logo.svg"
        alt="Tesabar"
        className={`dark:brightness-0 dark:invert transition-[filter] ${
          size === "lg" ? "h-10" : "h-7"
        }`}
      />
    </Link>
  )
}
