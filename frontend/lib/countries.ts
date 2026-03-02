export interface Country {
  code: string   // ISO 3166-1 alpha-2 (e.g. "AZ")
  name: string   // English name
  nameAz: string // Azerbaijani name
  flag: string   // emoji flag
  lang: "az" | "en" // default language for this country
}

export const COUNTRIES: Country[] = [
  { code: "AZ", name: "Azerbaijan", nameAz: "Azərbaycan", flag: "🇦🇿", lang: "az" },
  { code: "TR", name: "Turkey", nameAz: "Türkiyə", flag: "🇹🇷", lang: "az" },
  { code: "US", name: "United States", nameAz: "Amerika", flag: "🇺🇸", lang: "en" },
  { code: "GB", name: "United Kingdom", nameAz: "Böyük Britaniya", flag: "🇬🇧", lang: "en" },
  { code: "DE", name: "Germany", nameAz: "Almaniya", flag: "🇩🇪", lang: "en" },
  { code: "FR", name: "France", nameAz: "Fransa", flag: "🇫🇷", lang: "en" },
  { code: "RU", name: "Russia", nameAz: "Rusiya", flag: "🇷🇺", lang: "en" },
  { code: "UA", name: "Ukraine", nameAz: "Ukrayna", flag: "🇺🇦", lang: "en" },
  { code: "GE", name: "Georgia", nameAz: "Gürcüstan", flag: "🇬🇪", lang: "en" },
  { code: "AM", name: "Armenia", nameAz: "Ermənistan", flag: "🇦🇲", lang: "en" },
  { code: "KZ", name: "Kazakhstan", nameAz: "Qazaxıstan", flag: "🇰🇿", lang: "en" },
  { code: "UZ", name: "Uzbekistan", nameAz: "Özbəkistan", flag: "🇺🇿", lang: "az" },
  { code: "TM", name: "Turkmenistan", nameAz: "Türkmənistan", flag: "🇹🇲", lang: "az" },
  { code: "PL", name: "Poland", nameAz: "Polşa", flag: "🇵🇱", lang: "en" },
  { code: "NL", name: "Netherlands", nameAz: "Niderland", flag: "🇳🇱", lang: "en" },
  { code: "IT", name: "Italy", nameAz: "İtaliya", flag: "🇮🇹", lang: "en" },
  { code: "ES", name: "Spain", nameAz: "İspaniya", flag: "🇪🇸", lang: "en" },
  { code: "CA", name: "Canada", nameAz: "Kanada", flag: "🇨🇦", lang: "en" },
  { code: "AU", name: "Australia", nameAz: "Avstraliya", flag: "🇦🇺", lang: "en" },
  { code: "CN", name: "China", nameAz: "Çin", flag: "🇨🇳", lang: "en" },
  { code: "JP", name: "Japan", nameAz: "Yaponiya", flag: "🇯🇵", lang: "en" },
  { code: "KR", name: "South Korea", nameAz: "Cənubi Koreya", flag: "🇰🇷", lang: "en" },
  { code: "IN", name: "India", nameAz: "Hindistan", flag: "🇮🇳", lang: "en" },
  { code: "IR", name: "Iran", nameAz: "İran", flag: "🇮🇷", lang: "en" },
  { code: "SA", name: "Saudi Arabia", nameAz: "Səudiyyə Ərəbistanı", flag: "🇸🇦", lang: "en" },
  { code: "AE", name: "United Arab Emirates", nameAz: "BƏƏ", flag: "🇦🇪", lang: "en" },
]

export const DEFAULT_COUNTRY: Country = COUNTRIES[0] // AZ

export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code.toUpperCase())
}

export function getLangForCountry(code: string): "az" | "en" {
  return getCountryByCode(code)?.lang ?? "en"
}

