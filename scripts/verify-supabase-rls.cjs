#!/usr/bin/env node
/**
 * Verify Supabase RLS - ensure anon key cannot access sensitive tables
 *
 * Run: node scripts/verify-supabase-rls.js
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * This script attempts to query tables using the public anon key (no auth).
 * If RLS is correctly configured, all queries should return empty or 401.
 */

const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('Missing .env.local - create from .env.example');
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
    process.exit(1);
  }

  // Tables that MUST not be accessible to anon (sensitive data)
  const criticalTables = [
    'User',
    'BusinessMember',
    'Business',
    'Client',
    'AthleteAccount',
    'IntegrationToken',
    'UserApiKey',
    'AthleteSubscription',
    'Subscription',
    'Test',
    'TrainingProgram',
    'CoachDocument',
    'KnowledgeChunk',
    'VideoAnalysis',
    'AIConversation',
    'BusinessApiKey',
    'BusinessAiKeys',
    'Invitation',
    'StravaActivity',
    'GarminActivity',
    'DailyMetrics',
    'BodyComposition',
    'InjuryAssessment',
  ];

  console.log('Supabase RLS Verification\n');
  console.log('Testing anon key access to critical tables...\n');

  let failed = 0;
  let passed = 0;

  for (const table of criticalTables) {
    try {
      const res = await fetch(`${url}/rest/v1/${table}?limit=1`, {
        method: 'GET',
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
          'Accept': 'application/json',
          'Prefer': 'return=representation',
        },
      });

      const data = await res.json().catch(() => null);

      // RLS working: 200 with empty array, or 401/403
      const isEmptyArray = Array.isArray(data) && data.length === 0;
      const isError = res.status >= 400;
      const isLeaking = Array.isArray(data) && data.length > 0;

      if (isLeaking) {
        console.log(`❌ ${table}: LEAKING ${data.length} rows to anon!`);
        failed++;
      } else if (isEmptyArray || isError) {
        console.log(`✅ ${table}: protected`);
        passed++;
      } else {
        console.log(`⚠️  ${table}: unexpected (status=${res.status})`);
        failed++;
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
      failed++;
    }
  }

  console.log('\n---');
  console.log(`Passed: ${passed}, Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n⚠️  Some tables may be exposed. Review RLS policies in Supabase.');
    process.exit(1);
  }

  console.log('\n✅ All critical tables are protected from anon access.');
}

main();
