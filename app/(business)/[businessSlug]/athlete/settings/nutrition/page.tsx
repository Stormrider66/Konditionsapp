import { redirect } from 'next/navigation'

interface BusinessNutritionSettingsRedirectPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessNutritionSettingsRedirectPage({
  params,
}: BusinessNutritionSettingsRedirectPageProps) {
  const { businessSlug } = await params
  redirect(`/${businessSlug}/athlete/settings#nutrition-settings`)
}
