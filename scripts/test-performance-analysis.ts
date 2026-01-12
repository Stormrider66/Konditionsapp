/**
 * Test script for Deep Performance Analysis
 * Run with: npx ts-node scripts/test-performance-analysis.ts
 */

import { buildAnalysisContext } from '../lib/ai/performance-analysis/context-builder'
import { analyzeTest } from '../lib/ai/performance-analysis/test-analyzer'

const TEST_ID = 'c6adf1f9-39e2-4d59-81e5-3be30930a231'

async function main() {
  console.log('Testing Deep Performance Analysis...\n')

  try {
    // Test 1: Build context
    console.log('1. Building analysis context...')
    const context = await buildAnalysisContext(TEST_ID)

    if (!context) {
      console.error('Failed to build context')
      process.exit(1)
    }

    console.log('   ✓ Context built successfully')
    console.log(`   - Test date: ${context.test.date}`)
    console.log(`   - Test type: ${context.test.testType}`)
    console.log(`   - VO2max: ${context.test.vo2max}`)
    console.log(`   - Max HR: ${context.test.maxHR}`)
    console.log(`   - Stages: ${context.test.stages.length}`)
    console.log(`   - Previous tests: ${context.previousTests.length}`)
    console.log(`   - Has training context: ${!!context.trainingContext}`)
    console.log(`   - Athlete: ${context.athlete.name}`)
    console.log('')

    // Test 2: Run AI analysis (requires GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY)
    const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY
    if (geminiKey) {
      console.log('2. Running AI analysis with Gemini...')
      const result = await analyzeTest(TEST_ID, {
        includePredictions: true,
        includeRecommendations: true,
      })

      if (result) {
        console.log('   ✓ Analysis completed')
        console.log(`   - Model: ${result.modelUsed}`)
        console.log(`   - Confidence: ${result.confidence}`)
        console.log(`   - Data quality: ${result.dataQuality}`)
        console.log(`   - Key findings: ${result.keyFindings.length}`)
        console.log(`   - Predictions: ${result.predictions.length}`)
        console.log(`   - Recommendations: ${result.recommendations.length}`)
        console.log(`   - Tokens used: ${result.tokensUsed}`)
        console.log('')
        console.log('Executive Summary:')
        console.log(result.executiveSummary)
      } else {
        console.log('   ✗ Analysis returned null')
      }
    } else {
      console.log('2. Skipping AI analysis (no GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY)')
    }

    console.log('\n✓ All tests passed!')
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

main()
