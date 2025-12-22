/**
 * TOON - Temporal Object-Oriented Notation for Skeletal Data
 *
 * Compression format for MediaPipe BlazePose skeletal landmark data.
 * Achieves 70-90% compression through:
 * - Delta encoding (storing differences between frames)
 * - Quantization (16-bit integers instead of 64-bit floats)
 * - Run-length encoding for static poses
 * - Keyframe support for random access
 * - Important landmark filtering (16 key points vs 33 full)
 */

import { z } from 'zod'

// BlazePose landmark indices
export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const

// Important landmarks for analysis (16 points)
export const IMPORTANT_LANDMARKS = [
  POSE_LANDMARKS.LEFT_SHOULDER,
  POSE_LANDMARKS.RIGHT_SHOULDER,
  POSE_LANDMARKS.LEFT_ELBOW,
  POSE_LANDMARKS.RIGHT_ELBOW,
  POSE_LANDMARKS.LEFT_WRIST,
  POSE_LANDMARKS.RIGHT_WRIST,
  POSE_LANDMARKS.LEFT_HIP,
  POSE_LANDMARKS.RIGHT_HIP,
  POSE_LANDMARKS.LEFT_KNEE,
  POSE_LANDMARKS.RIGHT_KNEE,
  POSE_LANDMARKS.LEFT_ANKLE,
  POSE_LANDMARKS.RIGHT_ANKLE,
  POSE_LANDMARKS.LEFT_HEEL,
  POSE_LANDMARKS.RIGHT_HEEL,
  POSE_LANDMARKS.LEFT_FOOT_INDEX,
  POSE_LANDMARKS.RIGHT_FOOT_INDEX,
] as const

// Input types from MediaPipe
export interface PoseLandmark {
  x: number // 0-1 normalized
  y: number // 0-1 normalized
  z: number // Depth
  visibility?: number // 0-1 confidence
}

export interface PoseFrame {
  timestamp: number // Seconds
  landmarks: PoseLandmark[]
}

// TOON compressed format types
export interface TOONHeader {
  version: 1
  format: 'TOON'
  compression: 'delta' | 'rle' | 'hybrid'
  landmarkCount: number // Number of landmarks per frame
  landmarkIndices: number[] // Which landmarks are stored
  keyframeInterval: number // Keyframe every N frames
  quantization: number // Bits for quantization (16 = 0-65535)
  frameCount: number
  duration: number // Total duration in seconds
  originalSize: number // Original size in bytes
  compressedSize: number // Compressed size in bytes
  compressionRatio: number // originalSize / compressedSize
}

export interface TOONKeyframe {
  frameIndex: number
  timestamp: number
  landmarks: QuantizedLandmark[]
}

export interface QuantizedLandmark {
  x: number // 0-65535
  y: number // 0-65535
  z: number // -32768 to 32767
  v: number // 0-255 visibility
}

export interface TOONDeltaFrame {
  frameIndex: number
  timestampDelta: number // Delta from previous frame in ms
  deltas: LandmarkDelta[]
  runLength?: number // If identical to previous, store RLE count
}

export interface LandmarkDelta {
  dx: number // -32768 to 32767
  dy: number // -32768 to 32767
  dz: number // -32768 to 32767
  dv: number // -128 to 127
}

export interface TOONData {
  header: TOONHeader
  keyframes: TOONKeyframe[]
  deltaFrames: TOONDeltaFrame[]
}

// Zod schema for validation
export const TOONDataSchema = z.object({
  header: z.object({
    version: z.literal(1),
    format: z.literal('TOON'),
    compression: z.enum(['delta', 'rle', 'hybrid']),
    landmarkCount: z.number(),
    landmarkIndices: z.array(z.number()),
    keyframeInterval: z.number(),
    quantization: z.number(),
    frameCount: z.number(),
    duration: z.number(),
    originalSize: z.number(),
    compressedSize: z.number(),
    compressionRatio: z.number(),
  }),
  keyframes: z.array(z.object({
    frameIndex: z.number(),
    timestamp: z.number(),
    landmarks: z.array(z.object({
      x: z.number(),
      y: z.number(),
      z: z.number(),
      v: z.number(),
    })),
  })),
  deltaFrames: z.array(z.object({
    frameIndex: z.number(),
    timestampDelta: z.number(),
    deltas: z.array(z.object({
      dx: z.number(),
      dy: z.number(),
      dz: z.number(),
      dv: z.number(),
    })),
    runLength: z.number().optional(),
  })),
})

/**
 * Compress skeletal data using TOON format
 */
export function compressSkeletalData(
  frames: PoseFrame[],
  options: {
    useImportantLandmarksOnly?: boolean
    keyframeInterval?: number
    enableRLE?: boolean
  } = {}
): TOONData {
  const {
    useImportantLandmarksOnly = true,
    keyframeInterval = 30, // Keyframe every 30 frames (~1 second at 30fps)
    enableRLE = true,
  } = options

  if (frames.length === 0) {
    throw new Error('No frames to compress')
  }

  const landmarkIndices = useImportantLandmarksOnly
    ? [...IMPORTANT_LANDMARKS]
    : Array.from({ length: 33 }, (_, i) => i)

  const keyframes: TOONKeyframe[] = []
  const deltaFrames: TOONDeltaFrame[] = []
  let previousFrame: QuantizedLandmark[] | null = null
  let rleCount = 0
  let lastDeltaIndex = -1

  // Calculate original size (uncompressed)
  const originalSize = frames.length * frames[0].landmarks.length * 4 * 8 // 4 floats x 8 bytes each

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i]
    const isKeyframe = i % keyframeInterval === 0

    // Extract and quantize landmarks
    const quantizedLandmarks = landmarkIndices.map(idx => {
      const lm = frame.landmarks[idx]
      return quantizeLandmark(lm)
    })

    if (isKeyframe || i === 0) {
      // Store full keyframe
      keyframes.push({
        frameIndex: i,
        timestamp: frame.timestamp,
        landmarks: quantizedLandmarks,
      })
      previousFrame = quantizedLandmarks
      rleCount = 0
    } else if (previousFrame) {
      // Calculate deltas
      const deltas = calculateDeltas(previousFrame, quantizedLandmarks)
      const isIdentical = enableRLE && isFrameIdentical(deltas)

      if (isIdentical && lastDeltaIndex >= 0) {
        // Increment RLE count for previous delta frame
        rleCount++
        const lastDelta = deltaFrames[deltaFrames.length - 1]
        if (lastDelta) {
          lastDelta.runLength = rleCount
        }
      } else {
        // Store delta frame
        const timestampDelta = Math.round(
          (frame.timestamp - (i > 0 ? frames[i - 1].timestamp : 0)) * 1000
        )

        deltaFrames.push({
          frameIndex: i,
          timestampDelta,
          deltas,
          runLength: undefined,
        })

        lastDeltaIndex = deltaFrames.length - 1
        rleCount = 0
        previousFrame = quantizedLandmarks
      }
    }
  }

  // Calculate compressed size
  const compressedSize = calculateCompressedSize(keyframes, deltaFrames)

  const header: TOONHeader = {
    version: 1,
    format: 'TOON',
    compression: enableRLE ? 'hybrid' : 'delta',
    landmarkCount: landmarkIndices.length,
    landmarkIndices,
    keyframeInterval,
    quantization: 16,
    frameCount: frames.length,
    duration: frames[frames.length - 1].timestamp - frames[0].timestamp,
    originalSize,
    compressedSize,
    compressionRatio: originalSize / compressedSize,
  }

  return {
    header,
    keyframes,
    deltaFrames,
  }
}

/**
 * Decompress TOON data back to PoseFrame array
 */
export function decompressSkeletalData(toonData: TOONData): PoseFrame[] {
  const { header, keyframes, deltaFrames } = toonData
  const frames: PoseFrame[] = []

  // Build frame index maps
  const keyframeMap = new Map<number, TOONKeyframe>()
  keyframes.forEach(kf => keyframeMap.set(kf.frameIndex, kf))

  const deltaMap = new Map<number, TOONDeltaFrame>()
  deltaFrames.forEach(df => deltaMap.set(df.frameIndex, df))

  let currentLandmarks: QuantizedLandmark[] | null = null
  let currentTimestamp = 0

  for (let i = 0; i < header.frameCount; i++) {
    const keyframe = keyframeMap.get(i)
    const deltaFrame = deltaMap.get(i)

    if (keyframe) {
      // Restore from keyframe
      currentLandmarks = keyframe.landmarks
      currentTimestamp = keyframe.timestamp
    } else if (deltaFrame && currentLandmarks) {
      // Apply deltas
      currentLandmarks = applyDeltas(currentLandmarks, deltaFrame.deltas)
      currentTimestamp += deltaFrame.timestampDelta / 1000

      // Handle RLE
      if (deltaFrame.runLength && deltaFrame.runLength > 0) {
        for (let r = 0; r < deltaFrame.runLength; r++) {
          frames.push(createFrame(currentLandmarks, currentTimestamp, header.landmarkIndices))
          currentTimestamp += deltaFrame.timestampDelta / 1000
          i++
        }
      }
    }

    if (currentLandmarks) {
      frames.push(createFrame(currentLandmarks, currentTimestamp, header.landmarkIndices))
    }
  }

  return frames
}

/**
 * Serialize TOON data to binary format for storage
 */
export function serializeToBuffer(toonData: TOONData): ArrayBuffer {
  const { header, keyframes, deltaFrames } = toonData

  // Calculate buffer size
  const headerSize = 128 // Fixed header size
  const keyframeSize = keyframes.length * (8 + header.landmarkCount * 8) // frameIndex + timestamp + landmarks
  const deltaFrameSize = deltaFrames.reduce((acc, df) => {
    return acc + 8 + df.deltas.length * 8 + (df.runLength ? 4 : 0)
  }, 0)

  const totalSize = headerSize + keyframeSize + deltaFrameSize
  const buffer = new ArrayBuffer(totalSize)
  const view = new DataView(buffer)
  let offset = 0

  // Write header
  view.setUint8(offset++, header.version)
  view.setUint8(offset++, header.compression === 'delta' ? 0 : header.compression === 'rle' ? 1 : 2)
  view.setUint16(offset, header.landmarkCount, true)
  offset += 2
  view.setUint16(offset, header.keyframeInterval, true)
  offset += 2
  view.setUint32(offset, header.frameCount, true)
  offset += 4
  view.setFloat32(offset, header.duration, true)
  offset += 4
  view.setUint32(offset, header.originalSize, true)
  offset += 4
  view.setUint32(offset, header.compressedSize, true)
  offset += 4
  view.setUint16(offset, keyframes.length, true)
  offset += 2
  view.setUint16(offset, deltaFrames.length, true)
  offset += 2

  // Write landmark indices
  for (let i = 0; i < header.landmarkCount; i++) {
    view.setUint8(offset++, header.landmarkIndices[i])
  }

  // Pad to fixed header size
  offset = headerSize

  // Write keyframes
  for (const kf of keyframes) {
    view.setUint32(offset, kf.frameIndex, true)
    offset += 4
    view.setFloat32(offset, kf.timestamp, true)
    offset += 4

    for (const lm of kf.landmarks) {
      view.setUint16(offset, lm.x, true)
      offset += 2
      view.setUint16(offset, lm.y, true)
      offset += 2
      view.setInt16(offset, lm.z, true)
      offset += 2
      view.setUint8(offset++, lm.v)
      offset++ // Padding for alignment
    }
  }

  // Write delta frames
  for (const df of deltaFrames) {
    view.setUint32(offset, df.frameIndex, true)
    offset += 4
    view.setUint16(offset, df.timestampDelta, true)
    offset += 2
    view.setUint16(offset, df.runLength || 0, true)
    offset += 2

    for (const delta of df.deltas) {
      view.setInt16(offset, delta.dx, true)
      offset += 2
      view.setInt16(offset, delta.dy, true)
      offset += 2
      view.setInt16(offset, delta.dz, true)
      offset += 2
      view.setInt8(offset++, delta.dv)
      offset++ // Padding
    }
  }

  return buffer
}

/**
 * Deserialize binary buffer back to TOON data
 */
export function deserializeFromBuffer(buffer: ArrayBuffer): TOONData {
  const view = new DataView(buffer)
  let offset = 0

  // Read header
  const version = view.getUint8(offset++) as 1
  const compressionCode = view.getUint8(offset++)
  const compression = compressionCode === 0 ? 'delta' : compressionCode === 1 ? 'rle' : 'hybrid'
  const landmarkCount = view.getUint16(offset, true)
  offset += 2
  const keyframeInterval = view.getUint16(offset, true)
  offset += 2
  const frameCount = view.getUint32(offset, true)
  offset += 4
  const duration = view.getFloat32(offset, true)
  offset += 4
  const originalSize = view.getUint32(offset, true)
  offset += 4
  const compressedSize = view.getUint32(offset, true)
  offset += 4
  const keyframeCount = view.getUint16(offset, true)
  offset += 2
  const deltaFrameCount = view.getUint16(offset, true)
  offset += 2

  // Read landmark indices
  const landmarkIndices: number[] = []
  for (let i = 0; i < landmarkCount; i++) {
    landmarkIndices.push(view.getUint8(offset++))
  }

  // Skip to data section
  offset = 128

  // Read keyframes
  const keyframes: TOONKeyframe[] = []
  for (let i = 0; i < keyframeCount; i++) {
    const frameIndex = view.getUint32(offset, true)
    offset += 4
    const timestamp = view.getFloat32(offset, true)
    offset += 4

    const landmarks: QuantizedLandmark[] = []
    for (let j = 0; j < landmarkCount; j++) {
      landmarks.push({
        x: view.getUint16(offset, true),
        y: view.getUint16(offset + 2, true),
        z: view.getInt16(offset + 4, true),
        v: view.getUint8(offset + 6),
      })
      offset += 8
    }

    keyframes.push({ frameIndex, timestamp, landmarks })
  }

  // Read delta frames
  const deltaFrames: TOONDeltaFrame[] = []
  for (let i = 0; i < deltaFrameCount; i++) {
    const frameIndex = view.getUint32(offset, true)
    offset += 4
    const timestampDelta = view.getUint16(offset, true)
    offset += 2
    const runLength = view.getUint16(offset, true)
    offset += 2

    const deltas: LandmarkDelta[] = []
    for (let j = 0; j < landmarkCount; j++) {
      deltas.push({
        dx: view.getInt16(offset, true),
        dy: view.getInt16(offset + 2, true),
        dz: view.getInt16(offset + 4, true),
        dv: view.getInt8(offset + 6),
      })
      offset += 8
    }

    deltaFrames.push({
      frameIndex,
      timestampDelta,
      deltas,
      runLength: runLength > 0 ? runLength : undefined,
    })
  }

  const header: TOONHeader = {
    version,
    format: 'TOON',
    compression,
    landmarkCount,
    landmarkIndices,
    keyframeInterval,
    quantization: 16,
    frameCount,
    duration,
    originalSize,
    compressedSize,
    compressionRatio: originalSize / compressedSize,
  }

  return { header, keyframes, deltaFrames }
}

/**
 * Convert TOON data to base64 string for JSON storage
 */
export function toBase64(toonData: TOONData): string {
  const buffer = serializeToBuffer(toonData)
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Convert base64 string back to TOON data
 */
export function fromBase64(base64: string): TOONData {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return deserializeFromBuffer(bytes.buffer)
}

// Helper functions

function quantizeLandmark(lm: PoseLandmark): QuantizedLandmark {
  return {
    x: Math.round(lm.x * 65535), // 0-65535
    y: Math.round(lm.y * 65535),
    z: Math.round(lm.z * 32767), // -32768 to 32767
    v: Math.round((lm.visibility ?? 1) * 255), // 0-255
  }
}

function dequantizeLandmark(qlm: QuantizedLandmark): PoseLandmark {
  return {
    x: qlm.x / 65535,
    y: qlm.y / 65535,
    z: qlm.z / 32767,
    visibility: qlm.v / 255,
  }
}

function calculateDeltas(
  prev: QuantizedLandmark[],
  curr: QuantizedLandmark[]
): LandmarkDelta[] {
  return prev.map((p, i) => ({
    dx: curr[i].x - p.x,
    dy: curr[i].y - p.y,
    dz: curr[i].z - p.z,
    dv: curr[i].v - p.v,
  }))
}

function applyDeltas(
  prev: QuantizedLandmark[],
  deltas: LandmarkDelta[]
): QuantizedLandmark[] {
  return prev.map((p, i) => ({
    x: Math.max(0, Math.min(65535, p.x + deltas[i].dx)),
    y: Math.max(0, Math.min(65535, p.y + deltas[i].dy)),
    z: Math.max(-32768, Math.min(32767, p.z + deltas[i].dz)),
    v: Math.max(0, Math.min(255, p.v + deltas[i].dv)),
  }))
}

function isFrameIdentical(deltas: LandmarkDelta[]): boolean {
  return deltas.every(d => d.dx === 0 && d.dy === 0 && d.dz === 0 && d.dv === 0)
}

function createFrame(
  landmarks: QuantizedLandmark[],
  timestamp: number,
  landmarkIndices: number[]
): PoseFrame {
  // Create full 33-landmark array
  const fullLandmarks: PoseLandmark[] = Array.from({ length: 33 }, () => ({
    x: 0,
    y: 0,
    z: 0,
    visibility: 0,
  }))

  // Fill in the landmarks we have
  landmarks.forEach((qlm, i) => {
    fullLandmarks[landmarkIndices[i]] = dequantizeLandmark(qlm)
  })

  return { timestamp, landmarks: fullLandmarks }
}

function calculateCompressedSize(
  keyframes: TOONKeyframe[],
  deltaFrames: TOONDeltaFrame[]
): number {
  // Approximate size calculation
  const headerSize = 128
  const keyframeSize = keyframes.reduce((acc, kf) => acc + 8 + kf.landmarks.length * 7, 0)
  const deltaSize = deltaFrames.reduce((acc, df) => {
    // RLE frames are free
    if (df.runLength) return acc
    return acc + 8 + df.deltas.length * 7
  }, 0)

  return headerSize + keyframeSize + deltaSize
}

/**
 * Get compression statistics
 */
export function getCompressionStats(toonData: TOONData): {
  originalSizeKB: number
  compressedSizeKB: number
  compressionRatio: number
  keyframeCount: number
  deltaFrameCount: number
  rleFrames: number
  landmarksStored: number
  landmarksOriginal: number
} {
  const rleFrames = toonData.deltaFrames.reduce(
    (acc, df) => acc + (df.runLength || 0),
    0
  )

  return {
    originalSizeKB: Math.round(toonData.header.originalSize / 1024),
    compressedSizeKB: Math.round(toonData.header.compressedSize / 1024),
    compressionRatio: Math.round(toonData.header.compressionRatio * 100) / 100,
    keyframeCount: toonData.keyframes.length,
    deltaFrameCount: toonData.deltaFrames.length,
    rleFrames,
    landmarksStored: toonData.header.landmarkCount,
    landmarksOriginal: 33,
  }
}
