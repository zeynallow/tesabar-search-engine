import Link from "next/link"

interface LogoProps {
  size?: "lg" | "sm"
}

export function Logo({ size = "sm" }: LogoProps) {
  return (
    <Link href="/" className="flex items-center">
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
