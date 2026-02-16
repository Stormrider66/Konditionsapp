#!/usr/bin/env node
/**
 * Generates a fresh Supabase auth session and writes load-tests/.env.k6
 *
 * Usage: node scripts/grab-auth-cookie.js
 *
 * Uses the service role key to create a magic-link session for the admin user,
 * then outputs the AUTH_COOKIE env var ready for k6.
 */

const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || 'henrik.lundholm@gmail.com';

  console.log(`Generating session for ${email}...`);

  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email
  });
  if (linkErr) { console.error('generateLink error:', linkErr); process.exit(1); }

  const { data: session, error: verifyErr } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: linkData.properties.hashed_token
  });
  if (verifyErr) { console.error('verifyOtp error:', verifyErr); process.exit(1); }

  const s = session.session;
  const ref = process.env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', '').split('.')[0];
  const cookieName = `sb-${ref}-auth-token`;

  const cookieValue = JSON.stringify({
    access_token: s.access_token,
    refresh_token: s.refresh_token,
    expires_at: s.expires_at,
    expires_in: s.expires_in,
    token_type: 'bearer',
    type: 'access',
    user: s.user
  });

  const authCookie = `${cookieName}=${encodeURIComponent(cookieValue)}`;

  const dbUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, selfAthleteClientId: true },
  });
  if (!dbUser) {
    console.error(`No app user found for email ${email}`);
    process.exit(1);
  }

  const accessibleClients = await prisma.client.findMany({
    where: {
      OR: [
        { userId: dbUser.id },
        { team: { userId: dbUser.id } },
      ],
    },
    select: { id: true },
    take: 30,
    orderBy: { createdAt: 'asc' },
  });

  const businessMembership = await prisma.businessMember.findFirst({
    where: { userId: dbUser.id, isActive: true },
    select: { businessId: true },
    orderBy: { createdAt: 'asc' },
  });

  const firstTeam = await prisma.team.findFirst({
    where: { userId: dbUser.id },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });

  const clientIds = Array.from(
    new Set([
      ...(dbUser.selfAthleteClientId ? [dbUser.selfAthleteClientId] : []),
      ...accessibleClients.map((c) => c.id),
    ])
  );
  const clientId = clientIds[0] || '1b428922-105f-4bab-bb27-bd4a403470b0';
  const businessId = businessMembership?.businessId || '67245126-13ce-436c-8474-346f96d02d7e';
  const teamId = firstTeam?.id || '3a467db1-16d7-4e63-b19c-322e4e3ad26f';

  const envContent = [
    'BASE_URL=http://localhost:3000',
    `CLIENT_ID=${clientId}`,
    `CLIENT_IDS=${clientIds.join(',')}`,
    `BUSINESS_ID=${businessId}`,
    `TEAM_ID=${teamId}`,
    `AUTH_COOKIE=${authCookie}`,
    `LOAD_TEST_BYPASS_USER_EMAIL=${email}`,
    `LOAD_TEST_BYPASS_SECRET=${process.env.LOAD_TEST_BYPASS_SECRET || 'change-me-' + require('crypto').randomBytes(16).toString('hex')}`,
    ''
  ].join('\n');

  const envPath = path.join(__dirname, '..', 'load-tests', '.env.k6');
  fs.writeFileSync(envPath, envContent);

  const expiresAt = new Date(s.expires_at * 1000);
  console.log(`Session created (expires ${expiresAt.toLocaleTimeString()})`);
  console.log(`Using CLIENT_ID=${clientId}`);
  console.log(`Using CLIENT_IDS count=${clientIds.length}`);
  console.log(`Using BUSINESS_ID=${businessId}`);
  console.log(`Using TEAM_ID=${teamId}`);
  console.log(`Written to ${envPath}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => {
    await prisma.$disconnect();
  });
