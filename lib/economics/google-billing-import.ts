import { prisma } from '@/lib/prisma';

export interface ParsedGoogleBillingRow {
  serviceDescription: string;
  serviceId?: string;
  skuDescription?: string;
  skuId?: string;
  usageAmount?: number;
  usageUnit?: string;
  costSek: number;
  subtotalSek?: number;
  taxSek?: number;
  raw: Record<string, string>;
}

export interface ImportGoogleBillingParams {
  csvText: string;
  periodStart: Date;
  periodEnd: Date;
  source?: string;
}

export async function importGoogleBillingCsv(params: ImportGoogleBillingParams) {
  const rows = parseGoogleBillingCsv(params.csvText);
  const imported = [];

  for (const row of rows) {
    if (!row.serviceDescription) continue;

    const record = await prisma.aIProviderBillingImport.upsert({
      where: {
        provider_periodStart_periodEnd_serviceDescription_skuId_skuDescription: {
          provider: 'GOOGLE',
          periodStart: params.periodStart,
          periodEnd: params.periodEnd,
          serviceDescription: row.serviceDescription,
          skuId: row.skuId ?? '',
          skuDescription: row.skuDescription ?? '',
        },
      },
      create: {
        provider: 'GOOGLE',
        source: params.source ?? 'google_billing_csv',
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        serviceDescription: row.serviceDescription,
        serviceId: row.serviceId,
        skuDescription: row.skuDescription ?? '',
        skuId: row.skuId ?? '',
        usageAmount: row.usageAmount,
        usageUnit: row.usageUnit,
        costSek: row.costSek,
        subtotalSek: row.subtotalSek,
        taxSek: row.taxSek,
        raw: row.raw,
      },
      update: {
        source: params.source ?? 'google_billing_csv',
        serviceId: row.serviceId,
        usageAmount: row.usageAmount,
        usageUnit: row.usageUnit,
        costSek: row.costSek,
        subtotalSek: row.subtotalSek,
        taxSek: row.taxSek,
        raw: row.raw,
      },
    });
    imported.push(record);
  }

  return {
    importedRows: imported.length,
    totalCostSek: Math.round(imported.reduce((sum, row) => sum + row.costSek, 0) * 100) / 100,
    geminiCostSek: Math.round(
      imported
        .filter((row) => isGeminiBillingService(row.serviceDescription))
        .reduce((sum, row) => sum + row.costSek, 0) * 100
    ) / 100,
  };
}

export function parseGoogleBillingCsv(csvText: string): ParsedGoogleBillingRow[] {
  const [headerLine, ...lines] = csvText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (!headerLine) return [];

  const headers = parseCsvLine(headerLine);
  return lines
    .map((line) => rowFromCells(headers, parseCsvLine(line)))
    .filter((row): row is ParsedGoogleBillingRow => Boolean(row));
}

export function isGeminiBillingService(serviceDescription: string): boolean {
  return serviceDescription.toLowerCase().includes('gemini');
}

function rowFromCells(headers: string[], cells: string[]): ParsedGoogleBillingRow | null {
  const raw = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']));
  const serviceDescription = raw['Service description']?.trim();

  if (!serviceDescription) return null;
  if (serviceDescription.toLowerCase().includes('subtotal')) return null;
  if (serviceDescription.toLowerCase().includes('tax')) return null;
  if (serviceDescription.toLowerCase().includes('total')) return null;

  return {
    serviceDescription,
    serviceId: emptyToUndefined(raw['Service ID']),
    skuDescription: emptyToUndefined(raw['SKU description']),
    skuId: emptyToUndefined(raw['SKU ID']),
    usageAmount: parseNumber(raw['Usage amount']),
    usageUnit: emptyToUndefined(raw['Usage unit']),
    costSek: parseNumber(raw['Subtotal (kr)']) ?? parseNumber(raw['Cost (kr)']) ?? 0,
    subtotalSek: parseNumber(raw['Subtotal (kr)']),
    taxSek: raw['Service description'] === 'Tax' ? parseNumber(raw['Cost (kr)']) : undefined,
    raw,
  };
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && next === '"') {
      current += '"';
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function parseNumber(value?: string): number | undefined {
  if (!value) return undefined;
  const normalized = value.replace(/"/g, '').replace(/\s/g, '').replace(/,/g, '');
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function emptyToUndefined(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
