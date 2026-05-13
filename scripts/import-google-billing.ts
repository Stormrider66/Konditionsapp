import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { config } from 'dotenv';
import { importGoogleBillingCsv } from '@/lib/economics/google-billing-import';
import { prisma } from '@/lib/prisma';

config({ path: '.env.local' });

async function main() {
  const [, , csvPath, startArg, endArg] = process.argv;
  if (!csvPath || !startArg || !endArg) {
    console.error('Usage: npx tsx scripts/import-google-billing.ts <csv-path> <period-start> <period-end>');
    console.error('Example: npx tsx scripts/import-google-billing.ts ~/Desktop/google.csv 2026-05-01 2026-05-13');
    process.exit(1);
  }

  const csvText = await readFile(csvPath, 'utf8');
  const result = await importGoogleBillingCsv({
    csvText,
    periodStart: startOfDayUtc(startArg),
    periodEnd: endOfDayUtc(endArg),
    source: basename(csvPath),
  });

  console.log(JSON.stringify(result, null, 2));
}

function startOfDayUtc(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function endOfDayUtc(value: string): Date {
  return new Date(`${value}T23:59:59.999Z`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
