import type { VideoAnalysis } from './types'
import {
  getViewSpecificMetricsLabel,
  translateCameraAngle,
  translateFootStrike,
  translateRiskLevel,
} from './formatters'

type SportContextLocale = 'en' | 'sv'

function dateLocale(locale: SportContextLocale): string {
  return locale === 'sv' ? 'sv-SE' : 'en-US'
}

/**
 * Build video analysis context from running gait analysis
 */
export function buildVideoAnalysisContext(
  videoAnalyses: VideoAnalysis[],
  locale: SportContextLocale = 'en'
): string {
  if (!videoAnalyses || videoAnalyses.length === 0) return '';

  let context = `\n## VIDEOANALYSER - LÖPTEKNIK\n`;
  context += `*Följande data kommer från AI-driven videoanalys av atletens löpteknik:*\n`;

  // Check which camera angles are available for cross-referencing
  const availableAngles = videoAnalyses
    .filter(v => v.cameraAngle)
    .map(v => v.cameraAngle);
  const hasMultipleViews = new Set(availableAngles).size > 1;

  for (const video of videoAnalyses) {
    const date = new Date(video.createdAt).toLocaleDateString(dateLocale(locale));
    const angleLabel = translateCameraAngle(video.cameraAngle);
    const angleInfo = angleLabel ? ` (${angleLabel})` : '';
    context += `\n### Analys från ${date}${angleInfo}\n`;

    // Add view-specific context
    if (video.cameraAngle) {
      context += getViewSpecificMetricsLabel(video.cameraAngle);
    }

    if (video.formScore) {
      context += `- **Teknisk formpoäng**: ${video.formScore}/100\n`;
    }

    // Issues and recommendations from general video analysis
    if (video.issuesDetected && video.issuesDetected.length > 0) {
      context += `- **Identifierade problem**: ${video.issuesDetected.join(', ')}\n`;
    }
    if (video.recommendations && video.recommendations.length > 0) {
      context += `- **Generella rekommendationer**: ${video.recommendations.join(', ')}\n`;
    }

    // Structured AI Pose Analysis from Gemini
    const poseAnalysis = video.aiPoseAnalysis;
    if (poseAnalysis) {
      context += `\n#### AI Poseanalys (Gemini)\n`;

      if (poseAnalysis.interpretation) {
        context += `**Tolkning**: ${poseAnalysis.interpretation}\n\n`;
      }

      if (poseAnalysis.technicalFeedback && poseAnalysis.technicalFeedback.length > 0) {
        context += `**Teknisk feedback**:\n`;
        for (const fb of poseAnalysis.technicalFeedback) {
          context += `- **${fb.area}**: ${fb.observation}\n`;
          context += `  - Påverkan: ${fb.impact}\n`;
          context += `  - Förslag: ${fb.suggestion}\n`;
        }
        context += '\n';
      }

      if (poseAnalysis.patterns && poseAnalysis.patterns.length > 0) {
        context += `**Identifierade rörelsemönster**:\n`;
        for (const p of poseAnalysis.patterns) {
          context += `- **${p.pattern}**: ${p.significance}\n`;
        }
        context += '\n';
      }

      if (poseAnalysis.recommendations && poseAnalysis.recommendations.length > 0) {
        context += `**AI-rekommendationer (prioritetsordning)**:\n`;
        const sortedRecs = [...poseAnalysis.recommendations].sort((a, b) => a.priority - b.priority);
        for (const rec of sortedRecs) {
          context += `${rec.priority}. **${rec.title}**: ${rec.description}\n`;
          if (rec.exercises && rec.exercises.length > 0) {
            context += `   - Övningar: ${rec.exercises.join(', ')}\n`;
          }
        }
        context += '\n';
      }

      if (poseAnalysis.overallAssessment) {
        context += `**Sammanfattande bedömning**: ${poseAnalysis.overallAssessment}\n`;
      }
    }

    // Detailed running gait analysis
    const gait = video.runningGaitAnalysis;
    if (gait) {
      context += `\n#### Biomekanisk löpanalys\n`;

      // Cadence and timing metrics
      if (gait.cadence) {
        const cadenceStatus = gait.cadence < 170 ? '(låg - kan förbättras)' :
                              gait.cadence > 190 ? '(hög - bra effektivitet)' :
                              '(normal)';
        context += `- **Kadans**: ${gait.cadence} steg/min ${cadenceStatus}\n`;
      }
      if (gait.groundContactTime) {
        const gctStatus = gait.groundContactTime > 280 ? '(lång - indikerar ineffektivitet)' :
                          gait.groundContactTime < 200 ? '(kort - elitliknande)' :
                          '(normal)';
        context += `- **Markkontakttid**: ${gait.groundContactTime} ms ${gctStatus}\n`;
      }
      if (gait.verticalOscillation) {
        const voStatus = gait.verticalOscillation > 10 ? '(hög - energiläckage)' :
                         gait.verticalOscillation < 6 ? '(låg - effektivt)' :
                         '(normal)';
        context += `- **Vertikal oscillation**: ${gait.verticalOscillation} cm ${voStatus}\n`;
      }
      if (gait.strideLength) {
        context += `- **Steglängd**: ${gait.strideLength} m\n`;
      }
      if (gait.footStrikePattern) {
        context += `- **Fotisättning**: ${translateFootStrike(gait.footStrikePattern)}\n`;
      }

      // Asymmetry analysis - critical for injury prevention
      if (gait.asymmetryPercent !== null) {
        const asymmetryStatus = gait.asymmetryPercent > 8 ? '⚠️ HÖG ASYMMETRI - skaderisk' :
                                gait.asymmetryPercent > 4 ? '⚡ Måttlig asymmetri' :
                                '✅ Balanserad';
        context += `\n#### Asymmetrianalys\n`;
        context += `- **Asymmetrigrad**: ${gait.asymmetryPercent}% ${asymmetryStatus}\n`;
        if (gait.leftContactTime && gait.rightContactTime) {
          const longerSide = gait.leftContactTime > gait.rightContactTime ? 'vänster' : 'höger';
          context += `- **Markkontakt vänster/höger**: ${gait.leftContactTime}/${gait.rightContactTime} ms (längre på ${longerSide} sida)\n`;
        }
      }

      // Injury risk assessment
      if (gait.injuryRiskLevel) {
        context += `\n#### Skaderiskbedömning\n`;
        const riskEmoji = gait.injuryRiskLevel === 'HIGH' ? '🔴' :
                          gait.injuryRiskLevel === 'MODERATE' ? '🟡' : '🟢';
        context += `- **Skaderisk**: ${riskEmoji} ${translateRiskLevel(gait.injuryRiskLevel)}`;
        if (gait.injuryRiskScore) {
          context += ` (${gait.injuryRiskScore}/100)`;
        }
        context += '\n';
        if (gait.injuryRiskFactors && gait.injuryRiskFactors.length > 0) {
          context += `- **Riskfaktorer**: ${gait.injuryRiskFactors.join(', ')}\n`;
        }
      }

      // Efficiency metrics
      if (gait.runningEfficiency) {
        context += `\n#### Löpeffektivitet\n`;
        context += `- **Effektivitetspoäng**: ${gait.runningEfficiency}%\n`;
      }
      if (gait.energyLeakages && gait.energyLeakages.length > 0) {
        context += `- **Identifierade energiläckage**: ${gait.energyLeakages.join(', ')}\n`;
      }

      // Coaching recommendations - critical for program design
      if (gait.coachingCues && gait.coachingCues.length > 0) {
        context += `\n#### Coachingråd för träningen\n`;
        for (const cue of gait.coachingCues) {
          context += `- ${cue}\n`;
        }
      }

      if (gait.drillRecommendations && gait.drillRecommendations.length > 0) {
        context += `\n#### Rekommenderade tekniska övningar\n`;
        for (const drill of gait.drillRecommendations) {
          context += `- ${drill}\n`;
        }
      }

      if (gait.summary) {
        context += `\n#### Sammanfattning\n${gait.summary}\n`;
      }
    }
  }

  // Add cross-referencing guidance when multiple views are available
  if (hasMultipleViews) {
    context += `\n### Korsreferens - Flera kameraperspektiv tillgängliga\n`;
    context += `*Atleten har analyserats från flera vinklar. Korrelera fynd mellan perspektiven:*\n`;
    context += `- **Front + Sida**: Kontrollera att knäspårning (front) matchar fotisättning (sida)\n`;
    context += `- **Front + Bak**: Jämför höftfall från båda perspektiv för fullständig symmetrianalys\n`;
    context += `- **Sida + Bak**: Korrelera gluteal aktivering (bak) med höftextension (sida)\n`;
    context += `- Vid motsägande data, prioritera sidovyn för sagittalplansmekanik och frontvyn för frontalplansmekanik\n`;
  }

  // Add guidance for using video analysis in program design
  context += `\n### Hur använda videoanalysdata i programdesign\n`;
  context += `- Hög asymmetri (>8%) → Inkludera unilaterala styrkeövningar och balansarbete\n`;
  context += `- Lång markkontakttid → Lägg till plyometriska övningar och kadensdrills\n`;
  context += `- Hög vertikal oscillation → Fokusera på core-styrka och höftflexibilitet\n`;
  context += `- Identifierade skaderisker → Anpassa volym och intensitet, lägg till preventionsövningar\n`;
  context += `- Använd rekommenderade övningar som uppvärmning eller teknikpass\n`;

  return context;
}
