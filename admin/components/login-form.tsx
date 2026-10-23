"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/client"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ShieldAlert, ShieldCheck, Loader2 } from "lucide-react"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get("error") === "unauthorized") {
      setErrorMessage("Bu yönetim paneline yalnızca yetkili yöneticiler erişebilir.")
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const supabase = createClient()

      // 1. E-posta ve şifre ile oturum aç
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setErrorMessage("E-posta adresi veya şifre hatalı.")
        } else {
          setErrorMessage(error.message)
        }
        setIsLoading(false)
        return
      }

      if (!data.user) {
        setErrorMessage("Kullanıcı doğrulanamadı.")
        setIsLoading(false)
        return
      }

      // 2. Admins tablosunda yetki kontrolü
      const { data: adminRecord, error: adminError } = await supabase
        .from("admins")
        .select("role")
        .eq("user_id", data.user.id)
        .maybeSingle()

      if (adminError || !adminRecord) {
        // Admin yetkisi yoksa anında oturumu kapat
        await supabase.auth.signOut()
        setErrorMessage("Giriş başarısız: Yönetici (admin) yetkiniz bulunmamaktadır.")
        setIsLoading(false)
        return
      }

      // 3. Yetkili yönetici: Dashboard'a yönlendir
      router.push("/")
      router.refresh()
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Giriş sırasında beklenmeyen bir hata oluştu."
      )
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-border/60 shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">
            81 Şehir Odası — Yönetim Paneli
          </CardTitle>
          <CardDescription className="text-sm">
            Lütfen yönetici e-posta adresiniz ve şifrenizle giriş yapın.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {errorMessage && (
                <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                  <p className="leading-tight font-medium">{errorMessage}</p>
                </div>
              )}

              <Field>
                <FieldLabel htmlFor="email">Yönetici E-Posta</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@sehirodalari.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={isLoading}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="password">Şifre</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                />
              </Field>

              <Field className="pt-2">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Doğrulanıyor...
                    </>
                  ) : (
                    "Yönetici Girişi Yap"
                  )}
                </Button>
                <FieldDescription className="text-center text-xs text-muted-foreground pt-2">
                  Yetkisiz erişim denemeleri IP adresi ile kayıt altına alınmaktadır.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
