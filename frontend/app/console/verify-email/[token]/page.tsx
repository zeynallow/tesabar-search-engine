"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, XCircle, Loader2, Search } from "lucide-react"

export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!token) { setStatus("error"); setMessage("Invalid verification link."); return }
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/console/auth/verify-email/${token}`, {
      method: "POST",
    })
      .then(async (res) => {
        const data = await res.json()
        if (res.ok) {
          setStatus("success")
          setMessage(data.message ?? "Email verified successfully!")
        } else {
          setStatus("error")
          setMessage(data.detail ?? "Verification failed. The link may have expired.")
        }
      })
      .catch(() => {
        setStatus("error")
        setMessage("Network error. Please try again.")
      })
  }, [token])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="mb-8">
        <Link href="/console" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
            <Search className="h-4 w-4 text-accent-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">Tesabar Console</span>
        </Link>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-accent" />
            <h1 className="text-lg font-bold text-foreground">Verifying your email…</h1>
            <p className="mt-2 text-sm text-muted-foreground">Please wait a moment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
              <CheckCircle2 className="h-8 w-8 text-accent" />
            </div>
            <h1 className="text-lg font-bold text-foreground">Email Verified!</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <Link
              href="/console/login"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-accent px-6 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90 transition-opacity"
            >
              Sign In
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-lg font-bold text-foreground">Verification Failed</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <Link
              href="/console/login"
              className="mt-6 inline-flex items-center justify-center rounded-xl border border-border px-6 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to Login
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

