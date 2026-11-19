import {
  AgitationStyle,
  ConfidenceLevel,
  DrawdownObservation,
  FilterType,
  FreshnessState,
  KettleCapability,
  PrimaryAdjustmentLever,
  ProcessingMethod,
  RoastLevel,
  SensoryBalanceAxis,
  SensoryTargets,
  V60KnowledgeBase,
  WaterProfile,
} from '../knowledge/schema';

export type SimpleTastePreset = 'bright_and_crisp' | 'sweet_and_balanced' | 'rich_and_syrupy' | 'stronger_cup';

export interface BrewPlanInput {
  mode: 'simple' | 'expert';
  doseGrams: number;
  roastLevel: RoastLevel;
  freshnessState: FreshnessState;
  processing: ProcessingMethod;
  archetypeId: string;
  targetRatio?: number;
  targetWaterGrams?: number;
  bloomMultiplierOverride?: number;
  filterType: FilterType;
  kettleCapability: KettleCapability;
  waterProfile: WaterProfile;
  sensoryTargets: SensoryTargets;
  userGrinderSettingLabel?: string;
  previousBeanGrinderStepOffset?: number;
}

export interface CalculatedPourStep {
  stepId: string;
  label: string;
  startSeconds: number;
  endSeconds?: number;
  incrementalWaterGrams: number;
  cumulativeWaterGrams: number;
  agitationCue: string;
  isBloom: boolean;
}

export interface DeterministicBrewPlan {
  archetypeId: string;
  archetypeName: string;
  doseGrams: number;
  calculatedRatio: number;
  calculatedTotalWaterGrams: number;
  calculatedBloomWaterGrams: number;
  pourSteps: CalculatedPourStep[];
  recommendedTempRangeC: [number, number];
  recommendedKettleGuidance: string;
  recommendedGrindBandLabel: string;
  relativeGrindNudgeLabel: string;
  agitationStyle: AgitationStyle;
  expectedDrawdownSecondsRange: [number, number];
  confidence: ConfidenceLevel;
  validationWarnings: string[];
  advisories: { code: string; message: string; epistemicTier: string }[];
}

export interface BrewOutcomeInput {
  actualDrawdownSeconds: number;
  observation: DrawdownObservation;
  acidityRating: SensoryBalanceAxis;
  bitternessAstringencyRating: SensoryBalanceAxis;
  strengthBodyRating: SensoryBalanceAxis;
  clarityRating: SensoryBalanceAxis;
  measuredBeverageMassGrams?: number;
  measuredTdsPercent?: number;
}

export interface NextBrewAdjustment {
  calculatedExtractionYieldPercent: number | null;
  extractionYieldNote: string;
  hasConflictingCues: boolean;
  diagnosisSummary: string;
  primaryAdjustment: {
    lever: PrimaryAdjustmentLever;
    instruction: string;
    rationale: string;
    stepDelta: number;
  };
  secondaryAdjustment?: {
    lever: PrimaryAdjustmentLever;
    instruction: string;
  };
  confidence: ConfidenceLevel;
  uncertaintyNote: string;
}

function roundToTenth(value: number): number { return Math.round(value * 10) / 10; }
function roundToHundredth(value: number): number { return Math.round(value * 100) / 100; }
function clamp(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, value)); }

export function formatSecondsToMmSs(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function sensoryTargetsFromSimplePreset(preset: SimpleTastePreset): SensoryTargets {
  switch (preset) {
    case 'bright_and_crisp': return { flavourClarityVsComplexity: 2, sweetness: 3, acidity: 4, strength: 2, body: 2 };
    case 'rich_and_syrupy': return { flavourClarityVsComplexity: 4, sweetness: 4, acidity: 2, strength: 4, body: 5 };
    case 'stronger_cup': return { flavourClarityVsComplexity: 3, sweetness: 3, acidity: 3, strength: 5, body: 4 };
    case 'sweet_and_balanced': default: return { flavourClarityVsComplexity: 3, sweetness: 4, acidity: 3, strength: 3, body: 3 };
  }
}

export function calculateExtractionYieldPercent(
  doseGrams: number,
  measuredBeverageMassGrams?: number,
  measuredTdsPercent?: number
): { eyPercent: number | null; note: string } {
  if (
    typeof measuredBeverageMassGrams !== 'number' || typeof measuredTdsPercent !== 'number' ||
    Number.isNaN(measuredBeverageMassGrams) || Number.isNaN(measuredTdsPercent) ||
    !Number.isFinite(measuredBeverageMassGrams) || !Number.isFinite(measuredTdsPercent) ||
    measuredBeverageMassGrams <= 0 || measuredTdsPercent <= 0 ||
    measuredTdsPercent >= 30 || measuredBeverageMassGrams >= 1500
  ) {
    return { eyPercent: null, note: 'Extraction yield (EY %) is calculated only when plausible finite beverage mass (g) and refractometer TDS (%) are provided.' };
  }
  
  if (typeof doseGrams !== 'number' || doseGrams <= 0 || !Number.isFinite(doseGrams) || Number.isNaN(doseGrams)) {
    return { eyPercent: null, note: 'Coffee dose must be a valid positive number to compute extraction yield.' };
  }
  
  const rawEy = (measuredBeverageMassGrams * measuredTdsPercent) / doseGrams;
  
  if (!Number.isFinite(rawEy) || rawEy <= 0 || rawEy > 35) {
      return { eyPercent: null, note: 'Computed Extraction Yield exceeds plausible physical limits for percolation.' };
  }

  return { eyPercent: roundToHundredth(rawEy), note: 'Computed from EY (%) = (beverage_mass * TDS (%)) / dry_coffee_mass.' };
}

export function buildDeterministicBrewPlan(
  input: BrewPlanInput,
  kb: V60KnowledgeBase
): DeterministicBrewPlan {
  const validationWarnings: string[] = [];
  const advisories: { code: string; message: string; epistemicTier: string }[] = [];

  const archetype = kb.archetypes[input.archetypeId] ?? kb.archetypes.hoffmann_two_pour_v60;
  const safeDose = (typeof input.doseGrams === 'number' && input.doseGrams > 0 && Number.isFinite(input.doseGrams)) ? clamp(input.doseGrams, 5, 60) : 18;

  const [minRatio, maxRatio] = archetype.allowedRatioRange;
  let effectiveRatio: number;

  if (typeof input.targetWaterGrams === 'number' && input.targetWaterGrams > 0) {
    effectiveRatio = clamp(input.targetWaterGrams / safeDose, minRatio, maxRatio);
  } else if (typeof input.targetRatio === 'number' && input.targetRatio > 0) {
    effectiveRatio = clamp(input.targetRatio, minRatio, maxRatio);
  } else {
    const strengthDelta = (3 - input.sensoryTargets.strength) * 0.25;
    const bodyDelta = (3 - input.sensoryTargets.body) * 0.15;
    effectiveRatio = clamp(archetype.defaultRatio + strengthDelta + bodyDelta, minRatio, maxRatio);
  }

  const calculatedRatio = roundToTenth(effectiveRatio);
  const calculatedTotalWaterGrams = roundToTenth(safeDose * calculatedRatio);

  const pourSteps: CalculatedPourStep[] = [];
  let previousCumulative = 0;

  archetype.milestones.forEach((m, index) => {
    const isLast = index === archetype.milestones.length - 1;
    const cumulative = isLast
      ? calculatedTotalWaterGrams
      : roundToTenth(Math.max(previousCumulative, Math.min(calculatedTotalWaterGrams, calculatedTotalWaterGrams * m.cumulativeWaterFraction)));
    const incremental = roundToTenth(Math.max(0, cumulative - previousCumulative));
    
    pourSteps.push({
      stepId: m.stepId,
      label: m.label,
      startSeconds: m.startSeconds,
      endSeconds: m.endSeconds,
      incrementalWaterGrams: incremental,
      cumulativeWaterGrams: cumulative,
      agitationCue: m.agitationCue,
      isBloom: Boolean(m.isBloom),
    });
    previousCumulative = cumulative;
  });

  const firstMilestone = archetype.milestones[0];
  const calculatedBloomWaterGrams = firstMilestone?.isBloom
    ? roundToTenth(calculatedTotalWaterGrams * firstMilestone.cumulativeWaterFraction)
    : roundToTenth(Math.min(calculatedTotalWaterGrams, safeDose * archetype.defaultBloomMultiplier));

  const thermalRule = kb.roastThermalRules[input.roastLevel] || kb.roastThermalRules.medium;
  
  const offset = input.previousBeanGrinderStepOffset ?? 0;
  const settingPrefix = input.userGrinderSettingLabel ? `Your grinder (${input.userGrinderSettingLabel})` : 'Your grinder';
  const relativeGrindNudgeLabel = offset === 0
    ? `${settingPrefix}: start at your current baseline.`
    : offset > 0 ? `${settingPrefix}: logged ${offset} step(s) finer than baseline.` : `${settingPrefix}: logged ${Math.abs(offset)} step(s) coarser than baseline.`;

  advisories.push({ code: 'metadata_context_log', message: 'Note: Processing method, freshness state, filter type, and kettle capability serve as context logs; they do not currently alter the deterministic calculation engine outputs.', epistemicTier: 'UP' });

  return {
    archetypeId: archetype.id,
    archetypeName: archetype.name,
    doseGrams: safeDose,
    calculatedRatio,
    calculatedTotalWaterGrams,
    calculatedBloomWaterGrams,
    pourSteps,
    recommendedTempRangeC: thermalRule.recommendedTempRangeC,
    recommendedKettleGuidance: thermalRule.nonVariableKettleCue,
    recommendedGrindBandLabel: archetype.recommendedGrindBandLabel,
    relativeGrindNudgeLabel,
    agitationStyle: archetype.agitationStyle,
    expectedDrawdownSecondsRange: archetype.expectedDrawdownSecondsRange,
    confidence: thermalRule.confidence,
    validationWarnings,
    advisories,
  };
}

export function computeNextBrewAdjustment(doseGrams: number, outcome: BrewOutcomeInput): NextBrewAdjustment {
  const { eyPercent, note: extractionYieldNote } = calculateExtractionYieldPercent(doseGrams, outcome.measuredBeverageMassGrams, outcome.measuredTdsPercent);

  const hasConflictingCues = (outcome.acidityRating === 'too_high_or_harsh' && outcome.bitternessAstringencyRating === 'too_high_or_harsh') ||
    (outcome.observation === 'fast' && outcome.bitternessAstringencyRating === 'too_high_or_harsh');

  if (hasConflictingCues) {
    return {
      calculatedExtractionYieldPercent: eyPercent,
      extractionYieldNote,
      hasConflictingCues: true,
      diagnosisSummary: 'Conflicting sensory or drawdown cues suggest uneven extraction.',
      primaryAdjustment: {
        lever: 'stabilise_bed_uniformity_first',
        instruction: 'Keep grinder setting unchanged and focus on even saturation and level bed.',
        rationale: 'Stabilising bed uniformity prevents simultaneous under- and over-extraction.',
        stepDelta: 0,
      },
      confidence: 'Exploratory',
      uncertaintyNote: 'Confidence is exploratory when sour/fast and bitter/astringent signals compete.',
    };
  }

  if (outcome.observation === 'stalled') {
    return {
      calculatedExtractionYieldPercent: eyPercent,
      extractionYieldNote,
      hasConflictingCues: false,
      diagnosisSummary: `Drawdown stalled at ${formatSecondsToMmSs(outcome.actualDrawdownSeconds)}.`,
      primaryAdjustment: {
        lever: 'grind_coarser_stall_recovery',
        instruction: 'Move 1-2 steps coarser on your grinder.',
        rationale: 'Coarser grinding reduces fines generation and filter blinding.',
        stepDelta: -2,
      },
      confidence: 'High',
      uncertaintyNote: 'Filter stall mechanics are well supported.',
    };
  }

  if (outcome.bitternessAstringencyRating === 'too_high_or_harsh') {
    return {
      calculatedExtractionYieldPercent: eyPercent,
      extractionYieldNote,
      hasConflictingCues: false,
      diagnosisSummary: 'Elevated bitterness or astringency points toward over-extraction.',
      primaryAdjustment: {
        lever: 'grind_coarser_one_step',
        instruction: 'Adjust your grinder 1 step coarser.',
        rationale: 'Reduces extraction intensity.',
        stepDelta: -1,
      },
      confidence: 'Moderate',
      uncertaintyNote: 'Evaluate one adjustment per cup.',
    };
  }

  if (outcome.acidityRating === 'too_high_or_harsh' || (outcome.observation === 'fast' && outcome.strengthBodyRating === 'too_low_or_muted')) {
    return {
      calculatedExtractionYieldPercent: eyPercent,
      extractionYieldNote,
      hasConflictingCues: false,
      diagnosisSummary: `Sharp acidity or fast drawdown (${formatSecondsToMmSs(outcome.actualDrawdownSeconds)}) indicates under-extraction.`,
      primaryAdjustment: {
        lever: 'grind_finer_one_step',
        instruction: 'Adjust your grinder 1 step finer.',
        rationale: 'Grinding slightly finer increases surface contact.',
        stepDelta: 1,
      },
      confidence: 'Moderate',
      uncertaintyNote: 'Evaluate one adjustment per cup.',
    };
  }

  return {
    calculatedExtractionYieldPercent: eyPercent,
    extractionYieldNote,
    hasConflictingCues: false,
    diagnosisSummary: 'Drawdown and sensory axes read balanced.',
    primaryAdjustment: {
      lever: 'hold_baseline_and_log',
      instruction: 'Keep your current recipe and grinder setting.',
      rationale: 'Repeating a balanced baseline builds reliable repeatability.',
      stepDelta: 0,
    },
    confidence: 'High',
    uncertaintyNote: 'Freshness degassing may warrant minor tuning later.',
  };
}
