/**
 * Per-frame joint-angle computation for pose analysis.
 *
 * Extracted from PoseAnalyzer.tsx as a pure function so the component
 * stays focused on rendering / canvas / MediaPipe orchestration. The
 * math here only depends on the landmark array, the video type
 * (exercise category), and the detected camera angle — no React state.
 */

import {
  POSE_LANDMARKS,
  calculateAngle,
  evaluateAngle,
  calculateShinAngle,
  calculateAnkleAngle,
  calculateTrunkAngle,
  calculateLateralTrunkSway,
  calculateHipDrop,
  calculateKneeAlignment,
  type PoseLandmark,
  type CameraAngle,
} from './utils'

export interface JointAngle {
  name: string
  angle: number
  status: 'good' | 'warning' | 'critical'
}

export function calculateJointAngles(
  landmarks: PoseLandmark[],
  type: string,
  cameraAngle: CameraAngle
): JointAngle[] {
    const angles: JointAngle[] = []

    if (type === 'RUNNING_GAIT') {
      // CAMERA ANGLE SPECIFIC CALCULATIONS FOR RUNNING
      if (cameraAngle === 'FRONTAL') {
        // ============================================
        // FRONTAL VIEW (Behind/Front) - Different angles!
        // Can measure: hip drop, knee valgus, lateral sway, foot alignment
        // CANNOT accurately measure: trunk forward lean, hip flexion/extension, knee lift
        // ============================================

        // Hip drop / Pelvic tilt (frontal plane)
        const hipDrop = calculateHipDrop(
          landmarks[POSE_LANDMARKS.LEFT_HIP],
          landmarks[POSE_LANDMARKS.RIGHT_HIP]
        )
        angles.push({
          name: 'Bäckentippning (sidovinkel)',
          angle: Math.round(Math.abs(hipDrop)),
          status: evaluateAngle(Math.abs(hipDrop), 0, 8), // 0-8° is acceptable
        })

        // Lateral trunk sway
        const trunkSway = calculateLateralTrunkSway(
          landmarks[POSE_LANDMARKS.LEFT_SHOULDER],
          landmarks[POSE_LANDMARKS.RIGHT_SHOULDER],
          landmarks[POSE_LANDMARKS.LEFT_HIP],
          landmarks[POSE_LANDMARKS.RIGHT_HIP]
        )
        angles.push({
          name: 'Överkroppssväng (sidled)',
          angle: Math.round(Math.abs(trunkSway)),
          status: evaluateAngle(Math.abs(trunkSway), 0, 15), // Low sway is better
        })

        // Knee valgus/varus (left)
        const leftKneeAlignment = calculateKneeAlignment(
          landmarks[POSE_LANDMARKS.LEFT_HIP],
          landmarks[POSE_LANDMARKS.LEFT_KNEE],
          landmarks[POSE_LANDMARKS.LEFT_ANKLE]
        )
        angles.push({
          name: 'Knästabilitet vänster',
          angle: Math.round(Math.abs(leftKneeAlignment)),
          status: evaluateAngle(Math.abs(leftKneeAlignment), 0, 30), // Near 0 is good
        })

        // Knee valgus/varus (right)
        const rightKneeAlignment = calculateKneeAlignment(
          landmarks[POSE_LANDMARKS.RIGHT_HIP],
          landmarks[POSE_LANDMARKS.RIGHT_KNEE],
          landmarks[POSE_LANDMARKS.RIGHT_ANKLE]
        )
        angles.push({
          name: 'Knästabilitet höger',
          angle: Math.round(Math.abs(rightKneeAlignment)),
          status: evaluateAngle(Math.abs(rightKneeAlignment), 0, 30),
        })

        // Shoulder symmetry (arm swing in frontal plane - crossing body)
        const shoulderWidth = Math.abs(landmarks[POSE_LANDMARKS.RIGHT_SHOULDER].x - landmarks[POSE_LANDMARKS.LEFT_SHOULDER].x)
        const leftArmCross = Math.abs(landmarks[POSE_LANDMARKS.LEFT_WRIST].x - landmarks[POSE_LANDMARKS.LEFT_SHOULDER].x) / (shoulderWidth + 0.01) * 100
        const rightArmCross = Math.abs(landmarks[POSE_LANDMARKS.RIGHT_WRIST].x - landmarks[POSE_LANDMARKS.RIGHT_SHOULDER].x) / (shoulderWidth + 0.01) * 100

        angles.push({
          name: 'Armkorsning vänster',
          angle: Math.round(leftArmCross),
          status: evaluateAngle(leftArmCross, 0, 50), // Arms should stay near body
        })
        angles.push({
          name: 'Armkorsning höger',
          angle: Math.round(rightArmCross),
          status: evaluateAngle(rightArmCross, 0, 50),
        })

        // Elbow angles (still relevant from behind)
        const leftElbowAngle = calculateAngle(
          landmarks[POSE_LANDMARKS.LEFT_SHOULDER],
          landmarks[POSE_LANDMARKS.LEFT_ELBOW],
          landmarks[POSE_LANDMARKS.LEFT_WRIST]
        )
        const rightElbowAngle = calculateAngle(
          landmarks[POSE_LANDMARKS.RIGHT_SHOULDER],
          landmarks[POSE_LANDMARKS.RIGHT_ELBOW],
          landmarks[POSE_LANDMARKS.RIGHT_WRIST]
        )
        angles.push({
          name: 'Armbågsvinkel vänster',
          angle: Math.round(leftElbowAngle),
          status: evaluateAngle(leftElbowAngle, 70, 120),
        })
        angles.push({
          name: 'Armbågsvinkel höger',
          angle: Math.round(rightElbowAngle),
          status: evaluateAngle(rightElbowAngle, 70, 120),
        })

      } else {
        // ============================================
        // SAGITTAL VIEW (Side) - Standard running angles
        // Can measure: trunk forward lean, hip flexion/extension, knee lift, foot strike
        // ============================================

        // Knee angles (knee lift/flexion during swing)
        const leftKneeAngle = calculateAngle(
          landmarks[POSE_LANDMARKS.LEFT_HIP],
          landmarks[POSE_LANDMARKS.LEFT_KNEE],
          landmarks[POSE_LANDMARKS.LEFT_ANKLE]
        )
        const rightKneeAngle = calculateAngle(
          landmarks[POSE_LANDMARKS.RIGHT_HIP],
          landmarks[POSE_LANDMARKS.RIGHT_KNEE],
          landmarks[POSE_LANDMARKS.RIGHT_ANKLE]
        )
        angles.push({
          name: 'Knälyft vänster',
          angle: Math.round(180 - leftKneeAngle),
          status: evaluateAngle(180 - leftKneeAngle, 30, 90),
        })
        angles.push({
          name: 'Knälyft höger',
          angle: Math.round(180 - rightKneeAngle),
          status: evaluateAngle(180 - rightKneeAngle, 30, 90),
        })

        // Hip angles (hip flexion/extension)
        const leftHipAngle = calculateAngle(
          landmarks[POSE_LANDMARKS.LEFT_SHOULDER],
          landmarks[POSE_LANDMARKS.LEFT_HIP],
          landmarks[POSE_LANDMARKS.LEFT_KNEE]
        )
        const rightHipAngle = calculateAngle(
          landmarks[POSE_LANDMARKS.RIGHT_SHOULDER],
          landmarks[POSE_LANDMARKS.RIGHT_HIP],
          landmarks[POSE_LANDMARKS.RIGHT_KNEE]
        )
        angles.push({
          name: 'Höftvinkel vänster',
          angle: Math.round(leftHipAngle),
          status: evaluateAngle(leftHipAngle, 140, 180),
        })
        angles.push({
          name: 'Höftvinkel höger',
          angle: Math.round(rightHipAngle),
          status: evaluateAngle(rightHipAngle, 140, 180),
        })

        // Foot/Ankle angles (dorsiflexion)
        const leftAnkleAngle = calculateAnkleAngle(
          landmarks[POSE_LANDMARKS.LEFT_KNEE],
          landmarks[POSE_LANDMARKS.LEFT_ANKLE],
          landmarks[POSE_LANDMARKS.LEFT_FOOT_INDEX]
        )
        const rightAnkleAngle = calculateAnkleAngle(
          landmarks[POSE_LANDMARKS.RIGHT_KNEE],
          landmarks[POSE_LANDMARKS.RIGHT_ANKLE],
          landmarks[POSE_LANDMARKS.RIGHT_FOOT_INDEX]
        )
        angles.push({
          name: 'Fotvinkel vänster',
          angle: Math.round(leftAnkleAngle),
          status: evaluateAngle(leftAnkleAngle, 80, 130),
        })
        angles.push({
          name: 'Fotvinkel höger',
          angle: Math.round(rightAnkleAngle),
          status: evaluateAngle(rightAnkleAngle, 80, 130),
        })

        // Trunk lean (forward lean from vertical)
        const leftTrunkAngle = calculateTrunkAngle(
          landmarks[POSE_LANDMARKS.LEFT_SHOULDER],
          landmarks[POSE_LANDMARKS.LEFT_HIP]
        )
        const rightTrunkAngle = calculateTrunkAngle(
          landmarks[POSE_LANDMARKS.RIGHT_SHOULDER],
          landmarks[POSE_LANDMARKS.RIGHT_HIP]
        )
        const trunkAngle = (leftTrunkAngle + rightTrunkAngle) / 2
        angles.push({
          name: 'Bålvinkel (framåtlutning)',
          angle: Math.round(Math.abs(trunkAngle)),
          status: evaluateAngle(Math.abs(trunkAngle), 5, 20),
        })

        // Arm swing angles
        const leftElbowAngle = calculateAngle(
          landmarks[POSE_LANDMARKS.LEFT_SHOULDER],
          landmarks[POSE_LANDMARKS.LEFT_ELBOW],
          landmarks[POSE_LANDMARKS.LEFT_WRIST]
        )
        const rightElbowAngle = calculateAngle(
          landmarks[POSE_LANDMARKS.RIGHT_SHOULDER],
          landmarks[POSE_LANDMARKS.RIGHT_ELBOW],
          landmarks[POSE_LANDMARKS.RIGHT_WRIST]
        )
        angles.push({
          name: 'Armsving vänster',
          angle: Math.round(leftElbowAngle),
          status: evaluateAngle(leftElbowAngle, 70, 110),
        })
        angles.push({
          name: 'Armsving höger',
          angle: Math.round(rightElbowAngle),
          status: evaluateAngle(rightElbowAngle, 70, 110),
        })
      }
    } else if (type === 'STRENGTH') {
      // Strength exercises - camera angle less critical but still relevant
      const leftKneeAngle = calculateAngle(
        landmarks[POSE_LANDMARKS.LEFT_HIP],
        landmarks[POSE_LANDMARKS.LEFT_KNEE],
        landmarks[POSE_LANDMARKS.LEFT_ANKLE]
      )
      const rightKneeAngle = calculateAngle(
        landmarks[POSE_LANDMARKS.RIGHT_HIP],
        landmarks[POSE_LANDMARKS.RIGHT_KNEE],
        landmarks[POSE_LANDMARKS.RIGHT_ANKLE]
      )
      const leftHipAngle = calculateAngle(
        landmarks[POSE_LANDMARKS.LEFT_SHOULDER],
        landmarks[POSE_LANDMARKS.LEFT_HIP],
        landmarks[POSE_LANDMARKS.LEFT_KNEE]
      )
      const rightHipAngle = calculateAngle(
        landmarks[POSE_LANDMARKS.RIGHT_SHOULDER],
        landmarks[POSE_LANDMARKS.RIGHT_HIP],
        landmarks[POSE_LANDMARKS.RIGHT_KNEE]
      )
      const leftShinAngle = calculateShinAngle(
        landmarks[POSE_LANDMARKS.LEFT_KNEE],
        landmarks[POSE_LANDMARKS.LEFT_ANKLE]
      )
      const rightShinAngle = calculateShinAngle(
        landmarks[POSE_LANDMARKS.RIGHT_KNEE],
        landmarks[POSE_LANDMARKS.RIGHT_ANKLE]
      )
      const leftAnkleAngle = calculateAnkleAngle(
        landmarks[POSE_LANDMARKS.LEFT_KNEE],
        landmarks[POSE_LANDMARKS.LEFT_ANKLE],
        landmarks[POSE_LANDMARKS.LEFT_FOOT_INDEX]
      )
      const rightAnkleAngle = calculateAnkleAngle(
        landmarks[POSE_LANDMARKS.RIGHT_KNEE],
        landmarks[POSE_LANDMARKS.RIGHT_ANKLE],
        landmarks[POSE_LANDMARKS.RIGHT_FOOT_INDEX]
      )

      angles.push({
        name: 'Vänster knä',
        angle: Math.round(leftKneeAngle),
        status: evaluateAngle(leftKneeAngle, 80, 170),
      })
      angles.push({
        name: 'Höger knä',
        angle: Math.round(rightKneeAngle),
        status: evaluateAngle(rightKneeAngle, 80, 170),
      })
      angles.push({
        name: 'Vänster höft',
        angle: Math.round(leftHipAngle),
        status: evaluateAngle(leftHipAngle, 70, 180),
      })
      angles.push({
        name: 'Höger höft',
        angle: Math.round(rightHipAngle),
        status: evaluateAngle(rightHipAngle, 70, 180),
      })
      angles.push({
        name: 'Vänster skenben',
        angle: Math.round(leftShinAngle),
        status: evaluateAngle(leftShinAngle, 5, 35),
      })
      angles.push({
        name: 'Höger skenben',
        angle: Math.round(rightShinAngle),
        status: evaluateAngle(rightShinAngle, 5, 35),
      })
      angles.push({
        name: 'Vänster fotled',
        angle: Math.round(leftAnkleAngle),
        status: evaluateAngle(leftAnkleAngle, 70, 130),
      })
      angles.push({
        name: 'Höger fotled',
        angle: Math.round(rightAnkleAngle),
        status: evaluateAngle(rightAnkleAngle, 70, 130),
      })
    } else {
      // Sport-specific (general)
      const leftKneeAngle = calculateAngle(
        landmarks[POSE_LANDMARKS.LEFT_HIP],
        landmarks[POSE_LANDMARKS.LEFT_KNEE],
        landmarks[POSE_LANDMARKS.LEFT_ANKLE]
      )
      const rightKneeAngle = calculateAngle(
        landmarks[POSE_LANDMARKS.RIGHT_HIP],
        landmarks[POSE_LANDMARKS.RIGHT_KNEE],
        landmarks[POSE_LANDMARKS.RIGHT_ANKLE]
      )
      const leftElbowAngle = calculateAngle(
        landmarks[POSE_LANDMARKS.LEFT_SHOULDER],
        landmarks[POSE_LANDMARKS.LEFT_ELBOW],
        landmarks[POSE_LANDMARKS.LEFT_WRIST]
      )
      const rightElbowAngle = calculateAngle(
        landmarks[POSE_LANDMARKS.RIGHT_SHOULDER],
        landmarks[POSE_LANDMARKS.RIGHT_ELBOW],
        landmarks[POSE_LANDMARKS.RIGHT_WRIST]
      )

      angles.push({
        name: 'Vänster knä',
        angle: Math.round(leftKneeAngle),
        status: evaluateAngle(leftKneeAngle, 60, 180),
      })
      angles.push({
        name: 'Höger knä',
        angle: Math.round(rightKneeAngle),
        status: evaluateAngle(rightKneeAngle, 60, 180),
      })
      angles.push({
        name: 'Vänster armbåge',
        angle: Math.round(leftElbowAngle),
        status: evaluateAngle(leftElbowAngle, 30, 180),
      })
      angles.push({
        name: 'Höger armbåge',
        angle: Math.round(rightElbowAngle),
        status: evaluateAngle(rightElbowAngle, 30, 180),
      })
    }

    return angles
}
