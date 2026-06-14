import { redirect } from 'next/navigation'

export default function NutritionSettingsRedirectPage() {
  redirect('/athlete/settings#nutrition-settings')
}
