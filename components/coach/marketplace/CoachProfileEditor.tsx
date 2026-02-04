'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CheckCircle2,
  Globe,
  MapPin,
  Plus,
  Save,
  X,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { SportType } from '@prisma/client'

// Sport type labels
const SPORT_LABELS: Record<string, { en: string; sv: string }> = {
  RUNNING: { en: 'Running', sv: 'Löpning' },
  CYCLING: { en: 'Cycling', sv: 'Cykling' },
  TRIATHLON: { en: 'Triathlon', sv: 'Triathlon' },
  SWIMMING: { en: 'Swimming', sv: 'Simning' },
  SKIING: { en: 'Skiing', sv: 'Skidåkning' },
  HYROX: { en: 'HYROX', sv: 'HYROX' },
  GENERAL_FITNESS: { en: 'General Fitness', sv: 'Allmän fitness' },
  FUNCTIONAL_FITNESS: { en: 'Functional Fitness', sv: 'Funktionell fitness' },
  STRENGTH: { en: 'Strength', sv: 'Styrka' },
}

const METHODOLOGY_OPTIONS = [
  'Polarized Training',
  'Norwegian Method',
  'Canova',
  'Pyramidal',
  '80/20',
  'Threshold Training',
  'Block Periodization',
  'Linear Periodization',
  'Undulating Periodization',
  'HIIT',
  'Zone 2 Focus',
]

interface CoachProfile {
  id?: string
  slug?: string
  headline: string
  bio: string
  imageUrl: string
  coverImageUrl: string
  specialties: SportType[]
  methodologies: string[]
  experienceYears: number | null
  credentials: string[]
  isPublic: boolean
  isAcceptingClients: boolean
  location: string
  timezone: string
  languages: string[]
}

interface Props {
  locale?: 'en' | 'sv'
}

export function CoachProfileEditor({ locale = 'sv' }: Props) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [profile, setProfile] = useState<CoachProfile>({
    headline: '',
    bio: '',
    imageUrl: '',
    coverImageUrl: '',
    specialties: [],
    methodologies: [],
    experienceYears: null,
    credentials: [],
    isPublic: false,
    isAcceptingClients: true,
    location: '',
    timezone: 'Europe/Stockholm',
    languages: ['sv'],
  })
  const [newCredential, setNewCredential] = useState('')
  const [newMethodology, setNewMethodology] = useState('')

  const t = (en: string, sv: string) => locale === 'sv' ? sv : en

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/coach/profile')
        const data = await response.json()

        if (data.success && data.data) {
          setProfile({
            ...data.data,
            headline: data.data.headline || '',
            bio: data.data.bio || '',
            imageUrl: data.data.imageUrl || '',
            coverImageUrl: data.data.coverImageUrl || '',
            location: data.data.location || '',
            timezone: data.data.timezone || 'Europe/Stockholm',
          })
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/coach/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline: profile.headline || null,
          bio: profile.bio || null,
          imageUrl: profile.imageUrl || null,
          coverImageUrl: profile.coverImageUrl || null,
          specialties: profile.specialties,
          methodologies: profile.methodologies,
          experienceYears: profile.experienceYears,
          credentials: profile.credentials,
          isPublic: profile.isPublic,
          isAcceptingClients: profile.isAcceptingClients,
          location: profile.location || null,
          timezone: profile.timezone || null,
          languages: profile.languages,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setProfile(prev => ({ ...prev, ...data.data }))
        toast({
          title: t('Profile saved', 'Profil sparad'),
          description: t('Your coach profile has been updated.', 'Din coachprofil har uppdaterats.'),
        })
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: t('Error', 'Fel'),
        description: t('Failed to save profile. Please try again.', 'Kunde inte spara profil. Försök igen.'),
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const toggleSpecialty = (sport: SportType) => {
    setProfile(prev => ({
      ...prev,
      specialties: prev.specialties.includes(sport)
        ? prev.specialties.filter(s => s !== sport)
        : [...prev.specialties, sport],
    }))
  }

  const addCredential = () => {
    if (newCredential.trim() && !profile.credentials.includes(newCredential.trim())) {
      setProfile(prev => ({
        ...prev,
        credentials: [...prev.credentials, newCredential.trim()],
      }))
      setNewCredential('')
    }
  }

  const removeCredential = (credential: string) => {
    setProfile(prev => ({
      ...prev,
      credentials: prev.credentials.filter(c => c !== credential),
    }))
  }

  const addMethodology = () => {
    if (newMethodology && !profile.methodologies.includes(newMethodology)) {
      setProfile(prev => ({
        ...prev,
        methodologies: [...prev.methodologies, newMethodology],
      }))
      setNewMethodology('')
    }
  }

  const removeMethodology = (methodology: string) => {
    setProfile(prev => ({
      ...prev,
      methodologies: prev.methodologies.filter(m => m !== methodology),
    }))
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Visibility Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {profile.isPublic ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            {t('Marketplace Visibility', 'Synlighet på marknadsplatsen')}
          </CardTitle>
          <CardDescription>
            {t('Control whether athletes can find you in the coach directory.', 'Kontrollera om atleter kan hitta dig i coachkatalogen.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('Public Profile', 'Publik profil')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('Show your profile in the coach directory', 'Visa din profil i coachkatalogen')}
              </p>
            </div>
            <Switch
              checked={profile.isPublic}
              onCheckedChange={(checked) => setProfile(prev => ({ ...prev, isPublic: checked }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('Accepting Clients', 'Tar emot klienter')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('Allow athletes to send connection requests', 'Tillåt atleter att skicka kontaktförfrågningar')}
              </p>
            </div>
            <Switch
              checked={profile.isAcceptingClients}
              onCheckedChange={(checked) => setProfile(prev => ({ ...prev, isAcceptingClients: checked }))}
            />
          </div>
          {profile.slug && (
            <div className="pt-2 border-t">
              <Label className="text-xs text-muted-foreground">
                {t('Your profile URL', 'Din profil-URL')}
              </Label>
              <p className="text-sm font-mono">
                {typeof window !== 'undefined' && window.location.origin}/coaches/{profile.slug}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Profile Information', 'Profilinformation')}</CardTitle>
          <CardDescription>
            {t('Tell athletes about yourself and your coaching style.', 'Berätta för atleter om dig själv och din coachstil.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('Headline', 'Rubrik')}</Label>
            <Input
              value={profile.headline}
              onChange={(e) => setProfile(prev => ({ ...prev, headline: e.target.value }))}
              placeholder={t('e.g., Marathon Coach & Exercise Physiologist', 't.ex. Maratoncoach & träningsfysiolog')}
              maxLength={150}
            />
            <p className="text-xs text-muted-foreground">{profile.headline.length}/150</p>
          </div>

          <div className="space-y-2">
            <Label>{t('Bio', 'Beskrivning')}</Label>
            <Textarea
              value={profile.bio}
              onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
              placeholder={t('Describe your background, philosophy, and what athletes can expect...', 'Beskriv din bakgrund, filosofi och vad atleter kan förvänta sig...')}
              rows={6}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground">{profile.bio.length}/2000</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {t('Location', 'Plats')}
              </Label>
              <Input
                value={profile.location}
                onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
                placeholder={t('e.g., Stockholm, Sweden', 't.ex. Stockholm, Sverige')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('Years of Experience', 'År av erfarenhet')}</Label>
              <Input
                type="number"
                min={0}
                max={50}
                value={profile.experienceYears || ''}
                onChange={(e) => setProfile(prev => ({
                  ...prev,
                  experienceYears: e.target.value ? parseInt(e.target.value) : null,
                }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Specialties */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Specialties', 'Specialiteter')}</CardTitle>
          <CardDescription>
            {t('Select the sports and disciplines you specialize in.', 'Välj de sporter och discipliner du specialiserar dig på.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(SPORT_LABELS).map(([sport, labels]) => (
              <Badge
                key={sport}
                variant={profile.specialties.includes(sport as SportType) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleSpecialty(sport as SportType)}
              >
                {profile.specialties.includes(sport as SportType) && (
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                )}
                {locale === 'sv' ? labels.sv : labels.en}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Methodologies */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Training Methods', 'Träningsmetoder')}</CardTitle>
          <CardDescription>
            {t('Add the training methodologies you use.', 'Lägg till de träningsmetoder du använder.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select value={newMethodology} onValueChange={setNewMethodology}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={t('Select methodology', 'Välj metod')} />
              </SelectTrigger>
              <SelectContent>
                {METHODOLOGY_OPTIONS.filter(m => !profile.methodologies.includes(m)).map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addMethodology} disabled={!newMethodology}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {profile.methodologies.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {profile.methodologies.map(m => (
                <Badge key={m} variant="secondary" className="flex items-center gap-1">
                  {m}
                  <button onClick={() => removeMethodology(m)} className="ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credentials */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Credentials & Certifications', 'Certifieringar')}</CardTitle>
          <CardDescription>
            {t('List your relevant qualifications and certifications.', 'Lista dina relevanta kvalifikationer och certifieringar.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newCredential}
              onChange={(e) => setNewCredential(e.target.value)}
              placeholder={t('e.g., NSCA-CSCS', 't.ex. NSCA-CSCS')}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCredential())}
            />
            <Button onClick={addCredential} disabled={!newCredential.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {profile.credentials.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {profile.credentials.map(c => (
                <Badge key={c} variant="secondary" className="flex items-center gap-1">
                  {c}
                  <button onClick={() => removeCredential(c)} className="ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Languages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            {t('Languages', 'Språk')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              { code: 'sv', label: 'Svenska' },
              { code: 'en', label: 'English' },
              { code: 'no', label: 'Norsk' },
              { code: 'da', label: 'Dansk' },
              { code: 'fi', label: 'Suomi' },
              { code: 'de', label: 'Deutsch' },
            ].map(lang => (
              <Badge
                key={lang.code}
                variant={profile.languages.includes(lang.code) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => {
                  setProfile(prev => ({
                    ...prev,
                    languages: prev.languages.includes(lang.code)
                      ? prev.languages.filter(l => l !== lang.code)
                      : [...prev.languages, lang.code],
                  }))
                }}
              >
                {profile.languages.includes(lang.code) && (
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                )}
                {lang.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? t('Saving...', 'Sparar...') : t('Save Profile', 'Spara profil')}
        </Button>
      </div>
    </div>
  )
}
