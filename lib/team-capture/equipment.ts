import { TeamCaptureMachineType } from '@prisma/client'

export type TeamCaptureMethod =
  | 'BLUETOOTH_STATION'
  | 'GARMIN_LAP_OR_MANUAL'
  | 'MANUAL'
  | 'REST'

export type TeamCaptureTargetMetric =
  | 'CALORIES'
  | 'DISTANCE'
  | 'DURATION'
  | 'POWER'
  | 'REPS'

export interface CaptureEquipmentDefinition {
  key: string
  label: string
  machineType: TeamCaptureMachineType
  captureMethod: TeamCaptureMethod
  receiverSlot?: string
  targetMetric: TeamCaptureTargetMetric
  estimatedSeconds: number
  bluetoothSupported: boolean
}

const EQUIPMENT_ALIASES: Record<string, string> = {
  BIKE: 'BIKE_ERG',
  BIKEERG: 'BIKE_ERG',
  BIKE_ERG: 'BIKE_ERG',
  CONCEPT2_BIKEERG: 'BIKE_ERG',
  CONCEPT2_BIKE_ERG: 'BIKE_ERG',
  ROW: 'ROW',
  ROWER: 'ROW',
  ROWERG: 'ROW',
  ROW_ERG: 'ROW',
  CONCEPT2_ROW: 'ROW',
  CONCEPT2_ROWER: 'ROW',
  SKI: 'SKI_ERG',
  SKIERG: 'SKI_ERG',
  SKI_ERG: 'SKI_ERG',
  CONCEPT2_SKIERG: 'SKI_ERG',
  CONCEPT2_SKI_ERG: 'SKI_ERG',
  WATTBIKE: 'WATTBIKE',
  WATT_BIKE: 'WATTBIKE',
  ASSAULTBIKE: 'ASSAULT_BIKE',
  ASSAULT_BIKE: 'ASSAULT_BIKE',
  ECHOBIKE: 'ECHO_BIKE',
  ECHO_BIKE: 'ECHO_BIKE',
  AIRBIKE: 'AIR_BIKE',
  AIR_BIKE: 'AIR_BIKE',
  RUN: 'RUN',
  RUNNING: 'RUN',
  INDOOR_RUN: 'RUN',
  REST: 'REST',
  RECOVERY: 'REST',
}

const DEFINITIONS: Record<string, CaptureEquipmentDefinition> = {
  BIKE_ERG: {
    key: 'BIKE_ERG',
    label: 'BikeErg',
    machineType: TeamCaptureMachineType.BIKEERG,
    captureMethod: 'BLUETOOTH_STATION',
    receiverSlot: 'BIKE_ERG',
    targetMetric: 'CALORIES',
    estimatedSeconds: 75,
    bluetoothSupported: true,
  },
  ROW: {
    key: 'ROW',
    label: 'RowErg',
    machineType: TeamCaptureMachineType.ROWER,
    captureMethod: 'BLUETOOTH_STATION',
    receiverSlot: 'ROW',
    targetMetric: 'CALORIES',
    estimatedSeconds: 75,
    bluetoothSupported: true,
  },
  SKI_ERG: {
    key: 'SKI_ERG',
    label: 'SkiErg',
    machineType: TeamCaptureMachineType.SKIERG,
    captureMethod: 'BLUETOOTH_STATION',
    receiverSlot: 'SKI_ERG',
    targetMetric: 'CALORIES',
    estimatedSeconds: 75,
    bluetoothSupported: true,
  },
  WATTBIKE: {
    key: 'WATTBIKE',
    label: 'Wattbike',
    machineType: TeamCaptureMachineType.WATTBIKE,
    captureMethod: 'BLUETOOTH_STATION',
    receiverSlot: 'WATTBIKE',
    targetMetric: 'CALORIES',
    estimatedSeconds: 75,
    bluetoothSupported: true,
  },
  ASSAULT_BIKE: {
    key: 'ASSAULT_BIKE',
    label: 'AssaultBike',
    machineType: TeamCaptureMachineType.ASSAULT_BIKE,
    captureMethod: 'BLUETOOTH_STATION',
    receiverSlot: 'ASSAULT_BIKE',
    targetMetric: 'CALORIES',
    estimatedSeconds: 75,
    bluetoothSupported: true,
  },
  ECHO_BIKE: {
    key: 'ECHO_BIKE',
    label: 'Echo Bike',
    machineType: TeamCaptureMachineType.ECHO_BIKE,
    captureMethod: 'BLUETOOTH_STATION',
    receiverSlot: 'ECHO_BIKE',
    targetMetric: 'CALORIES',
    estimatedSeconds: 75,
    bluetoothSupported: true,
  },
  AIR_BIKE: {
    key: 'AIR_BIKE',
    label: 'AirBike',
    machineType: TeamCaptureMachineType.AIR_BIKE,
    captureMethod: 'BLUETOOTH_STATION',
    receiverSlot: 'ASSAULT_BIKE',
    targetMetric: 'CALORIES',
    estimatedSeconds: 75,
    bluetoothSupported: true,
  },
  RUN: {
    key: 'RUN',
    label: 'Run',
    machineType: TeamCaptureMachineType.RUN,
    captureMethod: 'GARMIN_LAP_OR_MANUAL',
    targetMetric: 'DISTANCE',
    estimatedSeconds: 45,
    bluetoothSupported: false,
  },
  REST: {
    key: 'REST',
    label: 'Rest',
    machineType: TeamCaptureMachineType.REST,
    captureMethod: 'REST',
    targetMetric: 'DURATION',
    estimatedSeconds: 60,
    bluetoothSupported: false,
  },
}

export function normalizeEquipmentKey(value?: string | null): string {
  if (!value) return 'RUN'
  const compact = value
    .trim()
    .toUpperCase()
    .replace(/Å/g, 'A')
    .replace(/Ä/g, 'A')
    .replace(/Ö/g, 'O')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return EQUIPMENT_ALIASES[compact] ?? compact
}

export function equipmentDefinition(value?: string | null): CaptureEquipmentDefinition {
  const key = normalizeEquipmentKey(value)
  return DEFINITIONS[key] ?? {
    key,
    label: labelFromKey(key),
    machineType: TeamCaptureMachineType.BIKEERG,
    captureMethod: 'MANUAL',
    targetMetric: 'DURATION',
    estimatedSeconds: 60,
    bluetoothSupported: false,
  }
}

export function inferEquipmentFromText(...values: Array<string | null | undefined>): CaptureEquipmentDefinition {
  const text = values.filter(Boolean).join(' ').toUpperCase()
  if (/(SKI[\s_-]?ERG|SKIERG)/.test(text)) return equipmentDefinition('SKI_ERG')
  if (/(ROW[\s_-]?ERG|ROWER|RODD|ROW\b)/.test(text)) return equipmentDefinition('ROW')
  if (/(ECHO[\s_-]?BIKE)/.test(text)) return equipmentDefinition('ECHO_BIKE')
  if (/(ASSAULT[\s_-]?BIKE)/.test(text)) return equipmentDefinition('ASSAULT_BIKE')
  if (/(WATT[\s_-]?BIKE)/.test(text)) return equipmentDefinition('WATTBIKE')
  if (/(BIKE[\s_-]?ERG|BIKEERG)/.test(text)) return equipmentDefinition('BIKE_ERG')
  if (/(RUN|RUNNING|SPRINT|L[OÖ]P|L[OÖ]PNING)/.test(text)) return equipmentDefinition('RUN')
  return equipmentDefinition(values.find(Boolean) ?? 'RUN')
}

export function labelFromEquipmentKey(value?: string | null): string {
  return equipmentDefinition(value).label
}

export function receiverSlotForEquipment(value?: string | null): string | undefined {
  return equipmentDefinition(value).receiverSlot
}

function labelFromKey(key: string): string {
  return key
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
