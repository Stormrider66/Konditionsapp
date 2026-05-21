// lib/calculations/basic.ts

export function calculateBMI(weight: number, height: number): number {
  // weight i kg, height i cm
  const heightInMeters = height / 100
  return Number((weight / (heightInMeters * heightInMeters)).toFixed(1))
}

type AppLocale = 'en' | 'sv'

export function getBMICategory(bmi: number, locale: AppLocale = 'en'): string {
  const labels = locale === 'sv'
    ? {
        underweight: 'Undervikt',
        normal: 'Normalvikt',
        overweight: 'Övervikt',
        obesity: 'Fetma',
      }
    : {
        underweight: 'Underweight',
        normal: 'Normal weight',
        overweight: 'Overweight',
        obesity: 'Obesity',
      }

  if (bmi < 18.5) return labels.underweight
  if (bmi < 25) return labels.normal
  if (bmi < 30) return labels.overweight
  return labels.obesity
}

export function calculateAge(birthDateInput: Date | string): number {
  const birthDate = birthDateInput instanceof Date ? birthDateInput : new Date(birthDateInput)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  return age
}
