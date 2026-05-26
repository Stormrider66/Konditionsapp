import type { AthleteData, FootballSettings, HockeySettings } from '../types'

type AppLocale = 'en' | 'sv'

const t = (locale: AppLocale, en: string, sv: string) => locale === 'sv' ? sv : en

export function buildHockeyContext(athlete: AthleteData, locale: AppLocale = 'en'): string {
  const sp = athlete.sportProfile;
  const settings = sp?.hockeySettings as HockeySettings | null;

  let context = `\n## ${t(locale, 'ICE HOCKEY-SPECIFIC DATA', 'ISHOCKEYSPECIFIK DATA')}\n`;

  // Team and position
  if (settings?.teamName) {
    context += `- **${t(locale, 'Team', 'Lag')}**: ${settings.teamName}\n`;
  }
  if (settings?.position) {
    const positionLabels: Record<string, string> = {
      center: 'Center',
      wing: 'Forward (Wing)',
      defense: t(locale, 'Defense', 'Back'),
      goalie: t(locale, 'Goalie', 'Målvakt'),
    };
    context += `- **Position**: ${positionLabels[settings.position] || settings.position}\n`;
  }
  if (settings?.leagueLevel) {
    const leagueLabels: Record<string, string> = {
      recreational: t(locale, 'Recreational hockey', 'Motionshockey'),
      junior: 'Junior',
      division_3: 'Division 3',
      division_2: 'Division 2',
      division_1: 'Division 1',
      hockeyettan: 'Hockeyettan',
      hockeyallsvenskan: 'Hockeyallsvenskan',
      shl: 'SHL',
    };
    context += `- **${t(locale, 'League', 'Liga')}**: ${leagueLabels[settings.leagueLevel] || settings.leagueLevel}\n`;
  }
  if (settings?.yearsPlaying) {
    context += `- **${t(locale, 'Years active', 'År aktiv')}**: ${settings.yearsPlaying} ${t(locale, 'years', 'år')}\n`;
  }

  // Season phase
  if (settings?.seasonPhase) {
    const phaseLabels: Record<string, string> = {
      off_season: t(locale, 'Off-season (summer training)', 'Off-season (sommarträning)'),
      pre_season: t(locale, 'Pre-season', 'Försäsong'),
      in_season: t(locale, 'In-season', 'Säsong'),
      playoffs: t(locale, 'Playoffs', 'Slutspel'),
    };
    context += `- **${t(locale, 'Season phase', 'Säsongsfas')}**: ${phaseLabels[settings.seasonPhase] || settings.seasonPhase}\n`;
  }

  // Ice time and shifts
  if (settings?.averageIceTimeMinutes || settings?.shiftsPerGame) {
    context += `\n### ${t(locale, 'Ice Time & Shifts', 'Istid & Byten')}\n`;
    if (settings?.averageIceTimeMinutes) {
      context += `- **${t(locale, 'Average ice time', 'Genomsnittlig istid')}**: ${settings.averageIceTimeMinutes} min/${t(locale, 'game', 'match')}\n`;
      // Calculate approximate shift length
      if (settings?.shiftsPerGame) {
        const avgShiftLength = Math.round((settings.averageIceTimeMinutes * 60) / settings.shiftsPerGame);
        context += `- **${t(locale, 'Shifts per game', 'Byten per match')}**: ${settings.shiftsPerGame}\n`;
        context += `- **${t(locale, 'Average shift length', 'Genomsnittlig byteslängd')}**: ${avgShiftLength} ${t(locale, 'seconds', 'sekunder')}\n`;
      }
    }
  }

  // Play style
  if (settings?.playStyle) {
    const styleLabels: Record<string, string> = {
      offensive: t(locale, 'Offensive - point producer', 'Offensiv - poängproducent'),
      defensive: t(locale, 'Defensive - reliable in own zone', 'Defensiv - pålitlig i egen zon'),
      two_way: t(locale, 'Two-way player - balanced', 'Tvåvägsspelare - balanserad'),
      physical: t(locale, 'Physical - body play', 'Fysisk - kroppsspel'),
      skill: t(locale, 'Technical - puck handling', 'Teknisk - puckhantering'),
    };
    context += `\n### ${t(locale, 'Playing Style', 'Spelstil')}\n`;
    context += `- **${t(locale, 'Type', 'Typ')}**: ${styleLabels[settings.playStyle] || settings.playStyle}\n`;
  }

  // Strengths and weaknesses
  if (settings?.strengthFocus && settings.strengthFocus.length > 0) {
    context += `\n### ${t(locale, 'Strengths', 'Styrkor')}\n`;
    for (const strength of settings.strengthFocus) {
      context += `- ${strength}\n`;
    }
  }
  if (settings?.weaknesses && settings.weaknesses.length > 0) {
    context += `\n### ${t(locale, 'Development Areas', 'Utvecklingsområden')}\n`;
    for (const weakness of settings.weaknesses) {
      context += `- ${weakness}\n`;
    }
  }

  // Injury history
  if (settings?.injuryHistory && settings.injuryHistory.length > 0) {
    context += `\n### ${t(locale, 'Injury History (to account for)', 'Skadehistorik (att ta hänsyn till)')}\n`;
    for (const injury of settings.injuryHistory) {
      context += `- ${injury}\n`;
    }
  }

  // Position-specific training recommendations
  context += `\n### ${t(locale, 'Position-Specific Training Recommendations', 'Positionsspecifika träningsrekommendationer')}\n`;
  if (settings?.position === 'goalie') {
    context += `- **${t(locale, 'Focus', 'Fokus')}**: ${t(locale, 'Reaction ability, flexibility, mental focus', 'Reaktionsförmåga, flexibilitet, mental fokus')}\n`;
    context += `- **${t(locale, 'Strength', 'Styrka')}**: ${t(locale, 'Core stability, explosive leg power', 'Core-stabilitet, explosiv kraft i benen')}\n`;
    context += `- **${t(locale, 'Conditioning', 'Kondition')}**: ${t(locale, 'Interval tolerance for short intense actions', 'Intervalltolerans för korta intensiva moment')}\n`;
    context += `- **${t(locale, 'Injury prevention', 'Skadeförebyggande')}**: ${t(locale, 'Hip flexibility, knee stability', 'Höftflexibilitet, knästabilitet')}\n`;
  } else if (settings?.position === 'defense') {
    context += `- **${t(locale, 'Focus', 'Fokus')}**: ${t(locale, 'Backward skating, positioning, physical strength', 'Baklängesåkning, positionering, fysisk styrka')}\n`;
    context += `- **${t(locale, 'Strength', 'Styrka')}**: ${t(locale, 'Upper-body strength for duels, leg strength for skating', 'Överkroppsstyrka för dueller, benstyrka för åkning')}\n`;
    context += `- **${t(locale, 'Conditioning', 'Kondition')}**: ${t(locale, 'Endurance for longer shifts, recovery ability', 'Uthållighet för längre byten, återhämtningsförmåga')}\n`;
    context += `- **${t(locale, 'Injury prevention', 'Skadeförebyggande')}**: ${t(locale, 'Hips, groin, shoulders', 'Höft, ljumske, axlar')}\n`;
  } else {
    context += `- **${t(locale, 'Focus', 'Fokus')}**: ${t(locale, 'Acceleration, shooting, offensive creativity', 'Acceleration, skott, offensiv kreativitet')}\n`;
    context += `- **${t(locale, 'Strength', 'Styrka')}**: ${t(locale, 'Explosive power, shot strength', 'Explosiv kraft, skottstyrka')}\n`;
    context += `- **${t(locale, 'Conditioning', 'Kondition')}**: ${t(locale, 'Sprint endurance, fast recovery', 'Sprint-uthållighet, snabb återhämtning')}\n`;
    context += `- **${t(locale, 'Injury prevention', 'Skadeförebyggande')}**: ${t(locale, 'Hamstrings, groin', 'Hamstrings, ljumske')}\n`;
  }

  // Season-specific training notes
  if (settings?.seasonPhase) {
    context += `\n### ${t(locale, 'Season-Adjusted Training', 'Säsongsanpassad träning')}\n`;
    switch (settings.seasonPhase) {
      case 'off_season':
        context += `- **${t(locale, 'Priority', 'Prioritet')}**: ${t(locale, 'Build aerobic base, max strength, address injuries', 'Bygg aerob bas, maxstyrka, åtgärda skador')}\n`;
        context += `- **${t(locale, 'Volume', 'Volym')}**: ${t(locale, 'High (4-6 sessions/week beyond ice)', 'Hög (4-6 pass/vecka utöver is)')}\n`;
        context += `- **${t(locale, 'Intensity', 'Intensitet')}**: ${t(locale, 'Medium-high, progressive', 'Medel-hög, progressiv')}\n`;
        context += `- **${t(locale, 'Focus', 'Fokus')}**: ${t(locale, 'Strength lifting, running/cycling, mobility', 'Styrkelyft, löpning/cykling, rörlighet')}\n`;
        break;
      case 'pre_season':
        context += `- **${t(locale, 'Priority', 'Prioritet')}**: ${t(locale, 'Sport-specific conditioning, explosiveness', 'Sport-specifik kondition, explosivitet')}\n`;
        context += `- **${t(locale, 'Volume', 'Volym')}**: ${t(locale, 'Medium-high (3-4 sessions/week beyond ice)', 'Medel-hög (3-4 pass/vecka utöver is)')}\n`;
        context += `- **${t(locale, 'Intensity', 'Intensitet')}**: ${t(locale, 'High, shift simulation', 'Hög, bytessimulering')}\n`;
        context += `- **${t(locale, 'Focus', 'Fokus')}**: ${t(locale, 'Intervals, plyometrics, on-ice technique', 'Intervaller, plyometrics, teknik på is')}\n`;
        break;
      case 'in_season':
        context += `- **${t(locale, 'Priority', 'Prioritet')}**: ${t(locale, 'Maintain strength, optimize recovery', 'Underhåll styrka, optimal återhämtning')}\n`;
        context += `- **${t(locale, 'Volume', 'Volym')}**: ${t(locale, 'Low-medium (1-2 strength sessions/week)', 'Låg-medel (1-2 styrkepass/vecka)')}\n`;
        context += `- **${t(locale, 'Intensity', 'Intensitet')}**: ${t(locale, 'Moderate, avoid overload', 'Måttlig, undvik överbelastning')}\n`;
        context += `- **${t(locale, 'Focus', 'Fokus')}**: ${t(locale, 'Game preparation, injury prevention', 'Matchförberedelse, skadeförebyggande')}\n`;
        break;
      case 'playoffs':
        context += `- **${t(locale, 'Priority', 'Prioritet')}**: ${t(locale, 'Maximum recovery, mental sharpness', 'Maximal återhämtning, mental skärpa')}\n`;
        context += `- **${t(locale, 'Volume', 'Volym')}**: ${t(locale, 'Minimal off-ice training', 'Minimal off-ice träning')}\n`;
        context += `- **${t(locale, 'Intensity', 'Intensitet')}**: ${t(locale, 'Activation only', 'Aktivering endast')}\n`;
        context += `- **${t(locale, 'Focus', 'Fokus')}**: ${t(locale, 'Rest, nutrition, mental preparation', 'Vila, nutrition, mental förberedelse')}\n`;
        break;
    }
  }

  return context;
}


export function buildFootballContext(athlete: AthleteData, locale: AppLocale = 'en'): string {
  const sp = athlete.sportProfile;
  const settings = sp?.footballSettings as FootballSettings | null;

  let context = `\n## ${t(locale, 'FOOTBALL-SPECIFIC DATA', 'FOTBOLLSSPECIFIK DATA')}\n`;

  if (settings?.teamName) {
    context += `- **${t(locale, 'Team', 'Lag')}**: ${settings.teamName}\n`;
  }
  if (settings?.position) {
    const positionLabels: Record<string, string> = {
      goalkeeper: t(locale, 'Goalkeeper', 'Målvakt'),
      defender: t(locale, 'Defender', 'Försvarare'),
      midfielder: t(locale, 'Midfielder', 'Mittfältare'),
      forward: t(locale, 'Forward', 'Anfallare'),
    };
    context += `- **Position**: ${positionLabels[settings.position] || settings.position}\n`;
  }
  if (settings?.leagueLevel) {
    const leagueLabels: Record<string, string> = {
      recreational: t(locale, 'Recreational', 'Motion/Korpen'),
      division_4: 'Division 4',
      division_3: 'Division 3',
      division_2: 'Division 2',
      division_1: 'Division 1',
      superettan: 'Superettan',
      allsvenskan: 'Allsvenskan',
    };
    context += `- **${t(locale, 'League', 'Liga')}**: ${leagueLabels[settings.leagueLevel] || settings.leagueLevel}\n`;
  }

  // GPS data if available
  if (settings?.avgMatchDistanceKm) {
    context += `\n### ${t(locale, 'Match Statistics (GPS)', 'Matchstatistik (GPS)')}\n`;
    context += `- **${t(locale, 'Average match distance', 'Genomsnittlig matchdistans')}**: ${settings.avgMatchDistanceKm} km\n`;
    if (settings?.avgSprintDistanceKm) {
      context += `- **${t(locale, 'Sprint distance/game', 'Sprintdistans/match')}**: ${settings.avgSprintDistanceKm} km\n`;
    }
    if (settings?.gpsProvider) {
      context += `- **${t(locale, 'GPS system', 'GPS-system')}**: ${settings.gpsProvider}\n`;
    }
  }

  if (settings?.playStyle) {
    const styleLabels: Record<string, string> = {
      possession: t(locale, 'Possession - passing play', 'Bollinnehav - passingsspel'),
      counter: t(locale, 'Counterattack - fast transitions', 'Kontring - snabba omställningar'),
      pressing: t(locale, 'High press - aggressive', 'Högt press - aggressiv'),
      physical: t(locale, 'Physical - strong in duels', 'Fysisk - duellstark'),
    };
    context += `- **${t(locale, 'Team style', 'Lagstil')}**: ${styleLabels[settings.playStyle] || settings.playStyle}\n`;
  }

  return context;
}

