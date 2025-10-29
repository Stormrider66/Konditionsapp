// lib/calculations/basic.ts

export function calculateBMI(weight: number, height: number): number {
  // weight i kg, height i cm
  const heightInMeters = height / 100
  return Number((weight / (heightInMeters * heightInMeters)).toFixed(1))
}

export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return 'Undervikt'
  if (bmi < 25) return 'Normalvikt'
  if (bmi < 30) return 'Övervikt'
  return 'Fetma'
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
