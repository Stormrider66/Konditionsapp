// Simple test
console.log('Starting simple test...')

import { speedToPace } from '@/lib/program-generator/zone-calculator'

console.log('Testing speedToPace function')
const pace = speedToPace(12.5)
console.log(`12.5 km/h = ${pace}`)

console.log('✅ Simple test passed!')
