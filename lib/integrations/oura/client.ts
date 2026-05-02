/**
 * Oura API v2 typed client.
 * Endpoints docs: https://cloud.ouraring.com/v2/docs
 */

import 'server-only'

import { fetchWithTimeoutAndRetry } from '@/lib/http/fetch'
import { getValidAccessToken } from './auth'

const OURA_API_BASE = 'https://api.ouraring.com'

export interface OuraPersonalInfo {
  id: string
  age?: number
  weight?: number
  height?: number
  biological_sex?: string
  email?: string
}

export interface OuraDailySleep {
  id: string
  day: string
  score: number | null
  timestamp?: string
  contributors?: Record<string, number>
}

export interface OuraSleep {
  id: string
  day: string
  bedtime_start: string
  bedtime_end: string
  type: string // "long_sleep" | "short_sleep" | "rest"
  total_sleep_duration: number | null // seconds
  time_in_bed: number | null
  awake_time: number | null
  efficiency: number | null
  average_heart_rate: number | null
  lowest_heart_rate: number | null
  average_hrv: number | null // RMSSD ms
  deep_sleep_duration: number | null
  light_sleep_duration: number | null
  rem_sleep_duration: number | null
}

export interface OuraDailyReadiness {
  id: string
  day: string
  score: number | null
  temperature_deviation: number | null
  temperature_trend_deviation: number | null
  contributors?: Record<string, number>
}

export interface OuraDailySpo2 {
  id: string
  day: string
  spo2_percentage?: { average: number } | null
}

export interface OuraDailyStress {
  id: string
  day: string
  stress_high: number | null
  recovery_high: number | null
  day_summary: string | null
}

export interface OuraWorkout {
  id: string
  activity: string
  start_datetime: string
  end_datetime: string
  day: string
  intensity?: 'easy' | 'moderate' | 'hard' | string
  distance?: number | null
  calories?: number | null
  source?: string
}

interface OuraCollectionResponse<T> {
  data: T[]
  next_token: string | null
}

async function ouraApi<T>(clientId: string, path: string): Promise<T> {
  const accessToken = await getValidAccessToken(clientId)
  if (!accessToken) throw new Error('No valid Oura access token')

  const response = await fetchWithTimeoutAndRetry(
    `${OURA_API_BASE}${path}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
    { timeoutMs: 10_000, maxAttempts: 3 },
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Oura API error ${response.status}: ${error}`)
  }

  return response.json()
}

function dateRangeQuery(startDate: Date, endDate: Date): string {
  const start = startDate.toISOString().slice(0, 10)
  const end = endDate.toISOString().slice(0, 10)
  return `start_date=${start}&end_date=${end}`
}

export async function getOuraPersonalInfo(clientId: string): Promise<OuraPersonalInfo> {
  return ouraApi(clientId, '/v2/usercollection/personal_info')
}

export async function getOuraDailySleep(clientId: string, startDate: Date, endDate: Date): Promise<OuraDailySleep[]> {
  const res = await ouraApi<OuraCollectionResponse<OuraDailySleep>>(
    clientId,
    `/v2/usercollection/daily_sleep?${dateRangeQuery(startDate, endDate)}`,
  )
  return res.data
}

export async function getOuraSleep(clientId: string, startDate: Date, endDate: Date): Promise<OuraSleep[]> {
  const res = await ouraApi<OuraCollectionResponse<OuraSleep>>(
    clientId,
    `/v2/usercollection/sleep?${dateRangeQuery(startDate, endDate)}`,
  )
  return res.data
}

export async function getOuraDailyReadiness(clientId: string, startDate: Date, endDate: Date): Promise<OuraDailyReadiness[]> {
  const res = await ouraApi<OuraCollectionResponse<OuraDailyReadiness>>(
    clientId,
    `/v2/usercollection/daily_readiness?${dateRangeQuery(startDate, endDate)}`,
  )
  return res.data
}

export async function getOuraDailySpo2(clientId: string, startDate: Date, endDate: Date): Promise<OuraDailySpo2[]> {
  const res = await ouraApi<OuraCollectionResponse<OuraDailySpo2>>(
    clientId,
    `/v2/usercollection/daily_spo2?${dateRangeQuery(startDate, endDate)}`,
  )
  return res.data
}

export async function getOuraDailyStress(clientId: string, startDate: Date, endDate: Date): Promise<OuraDailyStress[]> {
  const res = await ouraApi<OuraCollectionResponse<OuraDailyStress>>(
    clientId,
    `/v2/usercollection/daily_stress?${dateRangeQuery(startDate, endDate)}`,
  )
  return res.data
}

export async function getOuraWorkouts(clientId: string, startDate: Date, endDate: Date): Promise<OuraWorkout[]> {
  const start = startDate.toISOString()
  const end = endDate.toISOString()
  const res = await ouraApi<OuraCollectionResponse<OuraWorkout>>(
    clientId,
    `/v2/usercollection/workout?start_datetime=${encodeURIComponent(start)}&end_datetime=${encodeURIComponent(end)}`,
  )
  return res.data
}
