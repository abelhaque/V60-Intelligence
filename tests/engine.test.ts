import { describe, it, expect } from 'vitest';
import { buildDeterministicBrewPlan, computeNextBrewAdjustment, calculateExtractionYieldPercent } from '../src/engine/brewingEngine';
import { SEED_V60_KNOWLEDGE_BASE } from '../src/knowledge/seed';

describe('Brewing Engine', () => {
  it('calculates EY correctly with valid inputs', () => {
    const { eyPercent } = calculateExtractionYieldPercent(18, 250, 1.35);
    expect(eyPercent).toBe(18.75);
  });

  it('rejects impossible EY inputs, negative/zero dose, and unbounded values', () => {
    expect(calculateExtractionYieldPercent(18, 250, 150).eyPercent).toBeNull(); // TDS > 30%
    expect(calculateExtractionYieldPercent(18, 1600, 1.5).eyPercent).toBeNull(); // Mass >= 1500g
    expect(calculateExtractionYieldPercent(Infinity, 250, 1.35).eyPercent).toBeNull();
    expect(calculateExtractionYieldPercent(-18, 250, 1.35).eyPercent).toBeNull();
    expect(calculateExtractionYieldPercent(0, 250, 1.35).eyPercent).toBeNull();
    // (1400 * 29) / 18 = 2255.56
    expect(calculateExtractionYieldPercent(18, 1400, 29).eyPercent).toBeNull();
  });

  it('calculates Kasuya 10-pour bloom accurately to 10% of total water', () => {
    const plan = buildDeterministicBrewPlan({
      mode: 'expert', doseGrams: 20, roastLevel: 'light', freshnessState: 'rested_optimal', processing: 'washed', archetypeId: 'kasuya_ten_pour_coarse_v60', targetRatio: 15.0, filterType: 'standard_paper', kettleCapability: 'variable_temp_gooseneck', waterProfile: 'balanced_sca_like', sensoryTargets: { flavourClarityVsComplexity: 3, sweetness: 3, acidity: 3, strength: 3, body: 3 }
    }, SEED_V60_KNOWLEDGE_BASE);

    expect(plan.calculatedTotalWaterGrams).toBe(300);
    expect(plan.calculatedBloomWaterGrams).toBe(30);
  });
});
