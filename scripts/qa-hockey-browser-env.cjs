#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

function normalizeEnvValue(rawValue) {
  let value = rawValue.trim()

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }

  const inlineCommentIndex = value.search(/\s#/)
  if (inlineCommentIndex !== -1) {
    value = value.slice(0, inlineCommentIndex).trim()
  }

  return value
}

function loadLocalEnv(filePath = path.join(process.cwd(), '.env.local')) {
  if (!fs.existsSync(filePath)) return {}

  const env = {}
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separatorIndex = line.indexOf('=')
    if (separatorIndex === -1) continue
    const key = line.slice(0, separatorIndex).trim()
    const value = normalizeEnvValue(line.slice(separatorIndex + 1))
    if (key) env[key] = value
  }
  return env
}

function browserQaConfig(env = process.env) {
  return {
    baseUrl: env.TRAINOMICS_QA_BASE_URL || env.E2E_BASE_URL || 'http://localhost:3000',
    businessSlug: env.TRAINOMICS_QA_BUSINESS_SLUG || env.E2E_BUSINESS_SLUG || 'skelleftea-aik',
    email: env.TRAINOMICS_QA_EMAIL || env.E2E_COACH_EMAIL || '',
    password: env.TRAINOMICS_QA_PASSWORD || env.E2E_COACH_PASSWORD || '',
  }
}

function validateBrowserQaConfig(config) {
  const errors = []
  const warnings = []

  if (!config.baseUrl) {
    errors.push('TRAINOMICS_QA_BASE_URL or E2E_BASE_URL is required for browser QA.')
  } else {
    try {
      const url = new URL(config.baseUrl)
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push('Browser QA base URL must use http or https.')
      }
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        warnings.push('Browser QA target is local; use a production-like URL before inviting external teams.')
      }
      if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
        warnings.push('Browser QA target is not https; production-like pilot checks should use https.')
      }
    } catch {
      errors.push('Browser QA base URL is not a valid URL.')
    }
  }

  if (!config.businessSlug) {
    errors.push('TRAINOMICS_QA_BUSINESS_SLUG or E2E_BUSINESS_SLUG is required for browser QA.')
  }
  if (!config.email) {
    errors.push('TRAINOMICS_QA_EMAIL or E2E_COACH_EMAIL is required for browser QA.')
  }
  if (!config.password) {
    errors.push('TRAINOMICS_QA_PASSWORD or E2E_COACH_PASSWORD is required for browser QA.')
  }

  return { errors, warnings }
}

function main() {
  const env = { ...loadLocalEnv(), ...process.env }
  const config = browserQaConfig(env)
  const { errors, warnings } = validateBrowserQaConfig(config)

  if (errors.length > 0) {
    console.error('Hockey browser QA env failed:')
    for (const error of errors) console.error(`- ${error}`)
    for (const warning of warnings) console.warn(`Warning: ${warning}`)
    process.exitCode = 1
    return
  }

  console.log('Hockey browser QA env passed.')
  console.log(`Target: ${config.baseUrl}`)
  console.log(`Business slug: ${config.businessSlug}`)
  console.log(`Coach login: ${config.email}`)
  for (const warning of warnings) console.warn(`Warning: ${warning}`)
}

if (require.main === module) {
  main()
}

module.exports = {
  browserQaConfig,
  loadLocalEnv,
  normalizeEnvValue,
  validateBrowserQaConfig,
}
