'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
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
import { useTranslations } from '@/i18n/client'

export default function JoinTeamPage() {
  const params = useParams()
  const router = useRouter()
  const code = (params.code as string) || ''
  const t = useTranslations('auth')

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
          setError(data.error || t('joinTeam.errors.invalidCode'))
        }
      } catch {
        setError(t('joinTeam.errors.validationFailed'))
      } finally {
        setValidating(false)
      }
    }
    if (code) validate()
  }, [code, t])

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
        throw new Error(data.error || t('joinTeam.errors.registrationFailed'))
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('joinTeam.errors.generic'))
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
          {t('joinTeam.status.validating')}
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
            <h2 className="text-lg font-bold mb-2">
              {t('joinTeam.errors.invalidInvite')}
            </h2>
            <p className="text-muted-foreground">{error}</p>
            <Button className="mt-6" onClick={() => router.push('/login')}>
              {t('joinTeam.actions.toLogin')}
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
            <h2 className="text-lg font-bold mb-2">
              {t('joinTeam.success.title', { teamName })}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t('joinTeam.success.description')}
            </p>
            <Button onClick={() => router.push('/login')}>
              {t('joinTeam.actions.login')}
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
          <CardTitle>{t('joinTeam.title', { teamName })}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {t('joinTeam.subtitle')}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>
                {t('joinTeam.nameLabel')}
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('joinTeam.namePlaceholder')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>
                {t('joinTeam.emailLabel')}
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('emailPlaceholder')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>
                {t('joinTeam.passwordLabel')}
              </Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('passwordPlaceholder')}
                minLength={8}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('joinTeam.birthDateLabel')}</Label>
                <Input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('genderLabel')}</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectOption')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">{t('male')}</SelectItem>
                    <SelectItem value="FEMALE">{t('female')}</SelectItem>
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
                  {t('creatingAccount')}
                </>
              ) : (
                t('joinTeam.actions.createAccount')
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              {t('hasAccount')}{' '}
              <Link href="/login" className="text-primary hover:underline">
                {t('signInLink')}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
