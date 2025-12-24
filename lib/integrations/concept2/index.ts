/**
 * Concept2 Logbook Integration
 *
 * Exports for OAuth, API client, sync, and types.
 */

// Client functions
export {
  getConcept2AuthUrl,
  exchangeConcept2Code,
  refreshConcept2Token,
  getValidAccessToken,
  concept2ApiRequest,
  getConcept2User,
  getConcept2Results,
  getConcept2Result,
  disconnectConcept2,
  hasConcept2Connection,
  getConcept2ConnectionStatus,
} from './client';

// Sync functions
export {
  syncConcept2Results,
  getSyncedConcept2Results,
  getTrainingLoadFromConcept2,
  formatPace500m,
  formatTime,
} from './sync';

// Types
export type {
  Concept2TokenResponse,
  Concept2User,
  Concept2Result,
  Concept2EquipmentType,
  Concept2WorkoutType,
  Concept2HeartRate,
  Concept2Split,
  Concept2Interval,
  Concept2StrokeData,
  Concept2ResultsResponse,
  Concept2SingleResultResponse,
  Concept2StrokeDataResponse,
  Concept2WebhookEventType,
  Concept2WebhookPayload,
  Concept2TypeMapping,
  Concept2SyncResult,
  Concept2SyncOptions,
  Concept2ConnectionStatus,
} from './types';
