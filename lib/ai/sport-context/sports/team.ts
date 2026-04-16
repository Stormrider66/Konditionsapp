import type { AthleteData, FootballSettings, HockeySettings } from '../types'

export function buildHockeyContext(athlete: AthleteData): string {
  const sp = athlete.sportProfile;
  const settings = sp?.hockeySettings as HockeySettings | null;

  let context = `\n## ISHOCKEYSPECIFIK DATA\n`;

  // Team and position
  if (settings?.teamName) {
    context += `- **Lag**: ${settings.teamName}\n`;
  }
  if (settings?.position) {
    const positionLabels: Record<string, string> = {
      center: 'Center',
      wing: 'Forward (Wing)',
      defense: 'Back',
      goalie: 'Målvakt',
    };
    context += `- **Position**: ${positionLabels[settings.position] || settings.position}\n`;
  }
  if (settings?.leagueLevel) {
    const leagueLabels: Record<string, string> = {
      recreational: 'Motionshockey',
      junior: 'Junior',
      division_3: 'Division 3',
      division_2: 'Division 2',
      division_1: 'Division 1',
      hockeyettan: 'Hockeyettan',
      hockeyallsvenskan: 'Hockeyallsvenskan',
      shl: 'SHL',
    };
    context += `- **Liga**: ${leagueLabels[settings.leagueLevel] || settings.leagueLevel}\n`;
  }
  if (settings?.yearsPlaying) {
    context += `- **År aktiv**: ${settings.yearsPlaying} år\n`;
  }

  // Season phase
  if (settings?.seasonPhase) {
    const phaseLabels: Record<string, string> = {
      off_season: 'Off-season (sommarträning)',
      pre_season: 'Försäsong',
      in_season: 'Säsong',
      playoffs: 'Slutspel',
    };
    context += `- **Säsongsfas**: ${phaseLabels[settings.seasonPhase] || settings.seasonPhase}\n`;
  }

  // Ice time and shifts
  if (settings?.averageIceTimeMinutes || settings?.shiftsPerGame) {
    context += `\n### Istid & Byten\n`;
    if (settings?.averageIceTimeMinutes) {
      context += `- **Genomsnittlig istid**: ${settings.averageIceTimeMinutes} min/match\n`;
      // Calculate approximate shift length
      if (settings?.shiftsPerGame) {
        const avgShiftLength = Math.round((settings.averageIceTimeMinutes * 60) / settings.shiftsPerGame);
        context += `- **Byten per match**: ${settings.shiftsPerGame}\n`;
        context += `- **Genomsnittlig byteslängd**: ${avgShiftLength} sekunder\n`;
      }
    }
  }

  // Play style
  if (settings?.playStyle) {
    const styleLabels: Record<string, string> = {
      offensive: 'Offensiv - poängproducent',
      defensive: 'Defensiv - pålitlig i egen zon',
      two_way: 'Tvåvägsspelare - balanserad',
      physical: 'Fysisk - kroppsspel',
      skill: 'Teknisk - puckhantering',
    };
    context += `\n### Spelstil\n`;
    context += `- **Typ**: ${styleLabels[settings.playStyle] || settings.playStyle}\n`;
  }

  // Strengths and weaknesses
  if (settings?.strengthFocus && settings.strengthFocus.length > 0) {
    context += `\n### Styrkor\n`;
    for (const strength of settings.strengthFocus) {
      context += `- ${strength}\n`;
    }
  }
  if (settings?.weaknesses && settings.weaknesses.length > 0) {
    context += `\n### Utvecklingsområden\n`;
    for (const weakness of settings.weaknesses) {
      context += `- ${weakness}\n`;
    }
  }

  // Injury history
  if (settings?.injuryHistory && settings.injuryHistory.length > 0) {
    context += `\n### Skadehistorik (att ta hänsyn till)\n`;
    for (const injury of settings.injuryHistory) {
      context += `- ${injury}\n`;
    }
  }

  // Position-specific training recommendations
  context += `\n### Positionsspecifika träningsrekommendationer\n`;
  if (settings?.position === 'goalie') {
    context += `- **Fokus**: Reaktionsförmåga, flexibilitet, mental fokus\n`;
    context += `- **Styrka**: Core-stabilitet, explosiv kraft i benen\n`;
    context += `- **Kondition**: Intervalltolerans för korta intensiva moment\n`;
    context += `- **Skadeförebyggande**: Höftflexibilitet, knästabilitet\n`;
  } else if (settings?.position === 'defense') {
    context += `- **Fokus**: Baklängesåkning, positionering, fysisk styrka\n`;
    context += `- **Styrka**: Överkroppsstyrka för dueller, benstyrka för åkning\n`;
    context += `- **Kondition**: Uthållighet för längre byten, återhämtningsförmåga\n`;
    context += `- **Skadeförebyggande**: Höft, ljumske, axlar\n`;
  } else {
    context += `- **Fokus**: Acceleration, skott, offensiv kreativitet\n`;
    context += `- **Styrka**: Explosiv kraft, skottstyrka\n`;
    context += `- **Kondition**: Sprint-uthållighet, snabb återhämtning\n`;
    context += `- **Skadeförebyggande**: Hamstrings, ljumske\n`;
  }

  // Season-specific training notes
  if (settings?.seasonPhase) {
    context += `\n### Säsongsanpassad träning\n`;
    switch (settings.seasonPhase) {
      case 'off_season':
        context += `- **Prioritet**: Bygg aerob bas, maxstyrka, åtgärda skador\n`;
        context += `- **Volym**: Hög (4-6 pass/vecka utöver is)\n`;
        context += `- **Intensitet**: Medel-hög, progressiv\n`;
        context += `- **Fokus**: Styrkelyft, löpning/cykling, rörlighet\n`;
        break;
      case 'pre_season':
        context += `- **Prioritet**: Sport-specifik kondition, explosivitet\n`;
        context += `- **Volym**: Medel-hög (3-4 pass/vecka utöver is)\n`;
        context += `- **Intensitet**: Hög, bytessimulering\n`;
        context += `- **Fokus**: Intervaller, plyometrics, teknik på is\n`;
        break;
      case 'in_season':
        context += `- **Prioritet**: Underhåll styrka, optimal återhämtning\n`;
        context += `- **Volym**: Låg-medel (1-2 styrkepass/vecka)\n`;
        context += `- **Intensitet**: Måttlig, undvik överbelastning\n`;
        context += `- **Fokus**: Matchförberedelse, skadeförebyggande\n`;
        break;
      case 'playoffs':
        context += `- **Prioritet**: Maximal återhämtning, mental skärpa\n`;
        context += `- **Volym**: Minimal off-ice träning\n`;
        context += `- **Intensitet**: Aktivering endast\n`;
        context += `- **Fokus**: Vila, nutrition, mental förberedelse\n`;
        break;
    }
  }

  return context;
}


export function buildFootballContext(athlete: AthleteData): string {
  const sp = athlete.sportProfile;
  const settings = sp?.footballSettings as FootballSettings | null;

  let context = `\n## FOTBOLLSSPECIFIK DATA\n`;

  if (settings?.teamName) {
    context += `- **Lag**: ${settings.teamName}\n`;
  }
  if (settings?.position) {
    const positionLabels: Record<string, string> = {
      goalkeeper: 'Målvakt',
      defender: 'Försvarare',
      midfielder: 'Mittfältare',
      forward: 'Anfallare',
    };
    context += `- **Position**: ${positionLabels[settings.position] || settings.position}\n`;
  }
  if (settings?.leagueLevel) {
    const leagueLabels: Record<string, string> = {
      recreational: 'Motion/Korpen',
      division_4: 'Division 4',
      division_3: 'Division 3',
      division_2: 'Division 2',
      division_1: 'Division 1',
      superettan: 'Superettan',
      allsvenskan: 'Allsvenskan',
    };
    context += `- **Liga**: ${leagueLabels[settings.leagueLevel] || settings.leagueLevel}\n`;
  }

  // GPS data if available
  if (settings?.avgMatchDistanceKm) {
    context += `\n### Matchstatistik (GPS)\n`;
    context += `- **Genomsnittlig matchdistans**: ${settings.avgMatchDistanceKm} km\n`;
    if (settings?.avgSprintDistanceKm) {
      context += `- **Sprintdistans/match**: ${settings.avgSprintDistanceKm} km\n`;
    }
    if (settings?.gpsProvider) {
      context += `- **GPS-system**: ${settings.gpsProvider}\n`;
    }
  }

  if (settings?.playStyle) {
    const styleLabels: Record<string, string> = {
      possession: 'Bollinnehav - passingsspel',
      counter: 'Kontring - snabba omställningar',
      pressing: 'Högt press - aggressiv',
      physical: 'Fysisk - duellstark',
    };
    context += `- **Lagstil**: ${styleLabels[settings.playStyle] || settings.playStyle}\n`;
  }

  return context;
}


