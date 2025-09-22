"use client"

import { useState, useId } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { authAPI } from "@/lib/api"
import { Eye, EyeOff, UserPlus } from "lucide-react"

export default function SignupPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const nameId = useId()
  const emailId = useId()
  const passwordId = useId()
  const confirmPasswordId = useId()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      toast({
        title: "Brakujące informacje",
        description: "Proszę wypełnić wszystkie pola.",
        variant: "destructive",
      })
      return
    }

    if (password !== confirmPassword) {
      toast({
        title: "Hasła nie pasują",
        description: "Hasła nie są identyczne.",
        variant: "destructive",
      })
      return
    }

    if (password.length < 6) {
      toast({
        title: "Słabe hasło",
        description: "Hasło musi mieć co najmniej 6 znaków.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await authAPI.register(email, password, name)
      
      // Store auth token and user data
      localStorage.setItem('auth_token', response.access_token || response.token || '')
      localStorage.setItem('currentUser', JSON.stringify(response.user))
      
      toast({
        title: "Konto utworzone!",
        description: "Witaj w TechniZlecenia! Twoje konto zostało pomyślnie utworzone.",
      })
      
      router.push('/')
    } catch (error: unknown) {
      let errorMessage = "Wystąpił błąd podczas rejestracji."
      
      if (error instanceof Error) {
        if (error.message?.includes('CORS')) {
          errorMessage = "Nie można połączyć się z serwerem. Sprawdź połączenie lub spróbuj ponownie później."
        } else {
          errorMessage = error.message
        }
      }
      
      toast({
        title: "Rejestracja nieudana",
        description: errorMessage,
        variant: "destructive",
      })
      
      console.error('Registration error details:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-foreground hover:text-primary transition-colors">
          TechniZlecenia
          </Link>
          <p className="text-muted-foreground mt-2">Dołącz do rynku TechniZlecenia</p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center text-card-foreground">Utwórz konto</CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              Zarejestruj się, aby zacząć łączyć się z innymi studentami
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={nameId} className="text-card-foreground">Imię i nazwisko</Label>
                <Input
                  id={nameId}
                  type="text"
                  placeholder="Jan Kowalski"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-input border-border"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={emailId} className="text-card-foreground">Email</Label>
                <Input
                  id={emailId}
                  type="email"
                  placeholder="twoj.email@technischools.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-input border-border"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={passwordId} className="text-card-foreground">Hasło</Label>
                <div className="relative">
                  <Input
                    id={passwordId}
                    type={showPassword ? "text" : "password"}
                    placeholder="Utwórz hasło"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-input border-border pr-10"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={confirmPasswordId} className="text-card-foreground">Potwierdź hasło</Label>
                <div className="relative">
                  <Input
                    id={confirmPasswordId}
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Potwierdź swoje hasło"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-input border-border pr-10"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

            </CardContent>

            <CardFooter className="flex flex-col space-y-4 mt-6">
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isLoading}
              >
                {isLoading ? (
                  "Tworzenie konta..."
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Utwórz konto
                  </>
                )}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Masz już konto?{" "}
                <Link href="/auth/login" className="text-primary hover:underline">
                  Zaloguj się
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
