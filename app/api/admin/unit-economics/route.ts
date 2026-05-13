import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
import { getUnitEconomicsSummary } from '@/lib/economics/unit-economics';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const days = readNumber(searchParams, 'range', 30);

    const data = await getUnitEconomicsSummary(days, {
      usdToSek: readNumber(searchParams, 'usdToSek', 9.2),
      fixedInfraSekPerMonth: readNumber(searchParams, 'fixedInfraSek', 4000),
      variableInfraSekPerActiveUser: readNumber(searchParams, 'variableInfraSekPerUser', 3),
      paymentFeePercent: readNumber(searchParams, 'paymentFeePercent', 1.5),
      paymentFixedFeeSek: readNumber(searchParams, 'paymentFixedFeeSek', 1.8),
      supportMinutesPerTicket: readNumber(searchParams, 'supportMinutesPerTicket', 15),
      onboardingHoursPerNewPaidCustomer: readNumber(searchParams, 'onboardingHoursPerNewCustomer', 1.5),
      internalHourlyCostSek: readNumber(searchParams, 'internalHourlyCostSek', 700),
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('Error fetching unit economics', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch unit economics' },
      { status: 500 }
    );
  }
}

function readNumber(searchParams: URLSearchParams, key: string, fallback: number): number {
  const value = searchParams.get(key);
  if (!value) return fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
