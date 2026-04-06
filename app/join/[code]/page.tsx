'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Users, Loader2, CheckCircle2, XCircle } from 'lucide-react'

export default function JoinTeamPage() {
  const params = useParams()
  const router = useRouter()
  const code = (params.code as string) || ''

  const [validating, setValidating] = useState(true)
  const [teamName, setTeamName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  // Validate invite code
  useEffect(() => {
    const validate = async () => {
      try {
        const res = await fetch(`/api/join/${code}`)
        if (res.ok) {
          const data = await res.json()
          setTeamName(data.teamName)
        } else {
          const data = await res.json()
          setError(data.error || 'Ogiltig inbjudningskod')
        }
      } catch {
        setError('Kunde inte validera koden')
      } finally {
        setValidating(false)
      }
    }
    if (code) validate()
  }, [code])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !password) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/join/${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          birthDate: birthDate || undefined,
          gender: gender || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Registrering misslyckades')
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Något gick fel')
    } finally {
      setSubmitting(false)
    }
  }

  // Loading state
  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Validerar inbjudan...
        </div>
      </div>
    )
  }

  // Invalid code
  if (error && !teamName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-bold mb-2">Ogiltig inbjudan</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button className="mt-6" onClick={() => router.push('/login')}>
              Gå till inloggning
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold mb-2">Välkommen till {teamName}!</h2>
            <p className="text-muted-foreground mb-6">
              Ditt konto har skapats. Kolla din e-post för att verifiera kontot, sedan kan du logga in.
            </p>
            <Button onClick={() => router.push('/login')}>
              Logga in
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Signup form
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Gå med i {teamName}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Skapa ett konto för att ansluta till laget
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Namn *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ditt namn"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>E-post *</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="din@email.se"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Lösenord *</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minst 8 tecken"
                minLength={8}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Födelsedatum</Label>
                <Input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Kön</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger>
                    <SelectValue placeholder="Välj..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Man</SelectItem>
                    <SelectItem value="FEMALE">Kvinna</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Registrerar...
                </>
              ) : (
                'Skapa konto och gå med'
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Har du redan ett konto?{' '}
              <a href="/login" className="text-primary hover:underline">
                Logga in
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
