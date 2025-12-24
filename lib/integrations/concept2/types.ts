/**
 * Concept2 Logbook API Type Definitions
 *
 * Types for OAuth responses, API data, and internal mappings
 * for the Concept2 Logbook integration.
 */

// ==================== OAuth Types ====================

export interface Concept2TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number; // seconds until expiry
}

// ==================== User Types ====================

export interface Concept2User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  gender: 'M' | 'F';
  dob: string; // YYYY-MM-DD
  email: string;
  country: string;
  profile_image: string | null;
  logbook_privacy: string;
  max_hr?: number;
  weight?: number; // kg
}

// ==================== Equipment Types ====================

export type Concept2EquipmentType =
  | 'rower'
  | 'skierg'
  | 'bike'
  | 'dynamic'
  | 'slides'
  | 'multierg'
  | 'water'
  | 'snow'
  | 'rollerski'
  | 'paddle';

export type Concept2WorkoutType =
  | 'JustRow'
  | 'JustSki'
  | 'JustBike'
  | 'FixedDistanceSplits'
  | 'FixedTimeSplits'
  | 'FixedCalorieSplits'
  | 'VariableInterval'
  | 'FixedDistanceInterval'
  | 'FixedTimeInterval'
  | 'FixedCalorieInterval';

// ==================== Result/Workout Types ====================

export interface Concept2HeartRate {
  average?: number;
  max?: number;
  min?: number;
}

export interface Concept2Split {
  type: 'time' | 'distance' | 'calorie';
  time: number; // tenths of seconds
  distance: number; // meters
  stroke_rate?: number;
  calories?: number;
  heart_rate?: Concept2HeartRate;
}

export interface Concept2Interval {
  type: 'time' | 'distance' | 'calorie';
  time: number; // tenths of seconds
  distance: number; // meters
  rest_time?: number; // tenths of seconds
  rest_distance?: number; // meters
  stroke_rate?: number;
  calories?: number;
  heart_rate?: Concept2HeartRate;
}

export interface Concept2StrokeData {
  t: number; // time in tenths of seconds
  d: number; // distance in meters
  p: number; // pace in seconds per 500m
  spm: number; // strokes per minute
  hr?: number; // heart rate
}

export interface Concept2Result {
  id: number;
  user_id: number;
  date: string; // "YYYY-MM-DD HH:MM:SS"
  timezone: string;
  date_utc?: string;
  type: Concept2EquipmentType;
  workout_type: Concept2WorkoutType | string;
  source?: string;

  // Core metrics
  distance: number; // meters
  time: number; // tenths of seconds
  calories_total?: number;
  stroke_rate?: number; // avg strokes/min (or rpm for bike)
  stroke_count?: number;
  drag_factor?: number;

  // Heart rate
  heart_rate?: Concept2HeartRate;

  // Workout structure
  workout?: Concept2Split[] | Concept2Interval[];
  stroke_data?: boolean; // whether stroke data is available

  // Metadata
  comments?: string;
  privacy?: 'private' | 'partners' | 'logged_in' | 'everyone';
  weight_class?: 'H' | 'L';

  // Verification
  verified?: boolean;
  ranked?: boolean;
}

// ==================== API Response Types ====================

export interface Concept2ResultsResponse {
  data: Concept2Result[];
  meta: {
    total: number;
    offset: number;
    limit: number;
  };
}

export interface Concept2SingleResultResponse {
  data: Concept2Result;
}

export interface Concept2StrokeDataResponse {
  data: Concept2StrokeData[];
}

// ==================== Webhook Types ====================

export type Concept2WebhookEventType =
  | 'result-added'
  | 'result-updated'
  | 'result-deleted';

export interface Concept2WebhookPayload {
  data: {
    type: Concept2WebhookEventType;
    result?: Concept2Result;
    result_id?: number; // For deletions
  };
}

// ==================== Internal Mapping Types ====================

export interface Concept2TypeMapping {
  type: 'ROWING' | 'SKIING' | 'CYCLING' | 'CROSS_TRAINING';
  intensity: 'EASY' | 'MODERATE' | 'HARD';
}

export interface Concept2SyncResult {
  synced: number;
  skipped: number;
  errors: string[];
}

export interface Concept2SyncOptions {
  daysBack?: number;
  forceResync?: boolean;
  type?: Concept2EquipmentType;
}

// ==================== Connection Status Types ====================

export interface Concept2ConnectionStatus {
  connected: boolean;
  clientId: string;
  userId?: string;
  username?: string;
  scope?: string;
  lastSyncAt?: Date;
  lastSyncError?: string;
  syncEnabled?: boolean;
  connectedAt?: Date;
  resultCount?: number;
  resultsByType?: Record<string, number>;
  latestResult?: {
    id: string;
    type: string;
    date: Date;
    distance: number;
    time: number;
  };
}
