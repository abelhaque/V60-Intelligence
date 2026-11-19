import { describe, it, expect } from 'vitest';
import { previewStateFromJsonString, applyImportedState, createDefaultAppState, CURRENT_SCHEMA_VERSION } from '../src/storage/storageManager';

describe('Storage Manager & Strict Import Validation', () => {
  it('rejects invalid JSON syntax safely', () => {
    const res = previewStateFromJsonString('{ bad json');
    expect(res.ok).toBe(false);
  });

  it('rejects empty state lacking collections to replace', () => {
    const payload = JSON.stringify({ app: 'v60-coffee-intelligence', schemaVersion: CURRENT_SCHEMA_VERSION, state: {} });
    const res = previewStateFromJsonString(payload);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/no usable data collections to replace/i);
  });

  it('rejects logs missing required deterministic fields and correct types', () => {
    const payload = JSON.stringify({ 
      app: 'v60-coffee-intelligence', schemaVersion: CURRENT_SCHEMA_VERSION, 
      state: { brewLogs: [{ id: "log-1", completedAtIso: "2026-01-01T00:00:00Z", modeUsed: "simple", outcome: { actualDrawdownSeconds: 120, acidityRating: 'balanced', bitternessAstringencyRating: 'balanced', strengthBodyRating: 'balanced', clarityRating: 'balanced' }, recipeSnapshot: { archetypeId: "kasuya_ten_pour_coarse_v60", doseGrams: -5 }, deterministicAdjustment: { primaryLever: 'hold_baseline_and_log' } }] } 
    });
    const res = previewStateFromJsonString(payload);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/Malformed brew logs/);
  });

  it('rejects impossible negative EY% from logged outcomes', () => {
    const payload = JSON.stringify({ 
      app: 'v60-coffee-intelligence', schemaVersion: CURRENT_SCHEMA_VERSION, 
      state: { brewLogs: [{ id: "log-1", completedAtIso: "2026-01-01T00:00:00Z", modeUsed: "simple", outcome: { actualDrawdownSeconds: 120, acidityRating: 'balanced', bitternessAstringencyRating: 'balanced', strengthBodyRating: 'balanced', clarityRating: 'balanced', calculatedExtractionYieldPercent: -15 }, recipeSnapshot: { archetypeId: "kasuya_ten_pour_coarse_v60", doseGrams: 18, calculatedRatio: 15, calculatedTotalWaterGrams: 270, calculatedBloomWaterGrams: 30, recommendedTempRangeC: [95, 100], recommendedGrindBandLabel: 'Coarse' }, deterministicAdjustment: { primaryLever: 'hold_baseline_and_log', instruction: "Keep it", confidence: "High" } }] } 
    });
    const res = previewStateFromJsonString(payload);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/Malformed brew logs/);
  });

  it('rejects malformed experiments lacking status or timestamp', () => {
    const payload = JSON.stringify({ 
      app: 'v60-coffee-intelligence', schemaVersion: CURRENT_SCHEMA_VERSION, 
      state: { experiments: [{ id: "exp-1", title: "Test", controlledVariable: "grind_step", hypothesis: "", baselineDescription: "", variantDescription: "", linkedBrewIds: [] }] } 
    });
    const res = previewStateFromJsonString(payload);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/Malformed experiments/);
  });

  it('preview accepts completely valid backup payload and returns accurate counts without modifying app state', () => {
    const validState = createDefaultAppState();
    const payload = JSON.stringify({ app: 'v60-coffee-intelligence', schemaVersion: CURRENT_SCHEMA_VERSION, state: validState });
    const res = previewStateFromJsonString(payload);
    expect(res.ok).toBe(true);
    expect(res.counts!.beans).toBe(1);
    expect(res.counts!.equipment).toBe(1);
  });

  it('merges by ID protecting local records on collision', () => {
    const local = createDefaultAppState();
    local.beanProfiles[0].name = 'Local Custom Bean';
    
    const incoming = createDefaultAppState();
    incoming.beanProfiles[0].name = 'Overwritten Backup Bean';

    const res = applyImportedState(incoming, local, 'merge');
    expect(res.ok).toBe(true);
    expect(res.state!.beanProfiles[0].name).toBe('Local Custom Bean');
  });
});
