"use client"

import { useEffect } from "react"
import { useLang } from "@/lib/i18n"
import { getLangForCountry } from "@/lib/countries"

/**
 * Detects the user's country from IP and sets it in the language context.
 * Also sets the default language based on the detected country
 * (only if the user hasn't manually chosen a language yet).
 */
export function useCountryDetect() {
  const { setCountry, setLang } = useLang()

  useEffect(() => {
    // Skip if already saved
    const savedCountry = localStorage.getItem("app_country")
    const savedLang = localStorage.getItem("app_lang")
    if (savedCountry) return

    fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(5000) })
      .then((r) => r.json())
      .then((data: { country_code?: string }) => {
        const code = data?.country_code
        if (code && typeof code === "string") {
          setCountry(code)
          // Only set lang if user hasn't set it manually
          if (!savedLang) {
            setLang(getLangForCountry(code))
          }
        }
      })
      .catch(() => {
        // Silently ignore — default country/lang will be used
      })
  }, [setCountry, setLang])
}

