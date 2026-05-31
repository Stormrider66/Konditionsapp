import { describe, expect, it } from 'vitest';
import { getLoadRecommendation, getPartnerSynergyTips } from './position-training';

describe('padel position training localization', () => {
  it('uses English recommendation copy by default', () => {
    expect(getLoadRecommendation(120, 'right_side')).toBe('Low match load - can increase volume');
    expect(getLoadRecommendation(600, 'left_side')).toBe('High match load - prioritize recovery');
    expect(getLoadRecommendation(300, 'all_court')).toBe('Optimal match load');
  });

  it('uses Swedish recommendation copy when requested', () => {
    expect(getLoadRecommendation(120, 'right_side', 'sv')).toBe('Låg matchbelastning - kan öka volymen');
  });

  it('uses English partner synergy tips by default', () => {
    expect(getPartnerSynergyTips('right_side')[0]).toBe(
      'Communicate clearly with your partner about who takes the lob'
    );
  });

  it('uses Swedish partner synergy tips when requested', () => {
    expect(getPartnerSynergyTips('right_side', 'sv')[0]).toBe(
      'Kommunicera tydligt med din partner om vem som tar lobben'
    );
  });
});
