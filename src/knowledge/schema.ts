export type EpistemicTier = 'ES' | 'ER' | 'EH' | 'UP';
export type ConfidenceLevel = 'High' | 'Moderate' | 'Exploratory';
export type RoastLevel = 'light' | 'medium_light' | 'medium' | 'medium_dark' | 'dark';
export type FreshnessState = 'very_fresh_degassing' | 'rested_optimal' | 'aged_or_frozen' | 'unknown';
export type ProcessingMethod = 'washed' | 'honey' | 'natural' | 'fermented_anaerobic' | 'unknown';
export type FilterType = 'standard_paper' | 'high_flow_abaca_t90' | 'unknown';
export type KettleCapability = 'variable_temp_gooseneck' | 'non_variable_kettle';
export type WaterProfile = 'soft_low_alkalinity' | 'balanced_sca_like' | 'hard_high_alkalinity' | 'custom_remineralised' | 'unknown';
export type AgitationStyle = 'low_laminar' | 'moderate_swirl_and_stir' | 'high_bloom_saturation' | 'frequent_pulse_cadence';
export type DrawdownObservation = 'fast' | 'on_target' | 'slow' | 'stalled' | 'uneven_bed_high_grounds';
export type SensoryBalanceAxis = 'too_low_or_muted' | 'balanced' | 'too_high_or_harsh';

export type PrimaryAdjustmentLever =
  | 'grind_finer_one_step'
  | 'grind_coarser_one_step'
  | 'grind_coarser_stall_recovery'
  | 'temperature_increase_1_to_2c'
  | 'temperature_decrease_1_to_2c'
  | 'reduce_agitation_and_pour_height'
  | 'increase_pour_stages_or_agitation'
  | 'tighten_ratio_slightly'
  | 'widen_ratio_slightly'
  | 'stabilise_bed_uniformity_first'
  | 'hold_baseline_and_log';

export interface SensoryTargets {
  flavourClarityVsComplexity: number;
  sweetness: number;
  acidity: number;
  strength: number;
  body: number;
}

export interface PourMilestoneTemplate {
  stepId: string;
  label: string;
  startSeconds: number;
  endSeconds?: number;
  cumulativeWaterFraction: number;
  agitationCue: string;
  isBloom?: boolean;
}

export interface RecipeArchetype {
  id: string;
  name: string;
  description: string;
  defaultRatio: number;
  allowedRatioRange: [number, number];
  bloomMultiplierRange: [number, number];
  defaultBloomMultiplier: number;
  defaultBloomDurationSeconds: number;
  recommendedGrindBandLabel: string;
  agitationStyle: AgitationStyle;
  expectedDrawdownSecondsRange: [number, number];
  milestones: PourMilestoneTemplate[];
  epistemicTier: EpistemicTier;
  sourceTitles: string[];
}

export interface RoastThermalRule {
  roastLevel: RoastLevel;
  recommendedTempRangeC: [number, number];
  defaultTempC: number;
  nonVariableKettleCue: string;
  notes: string;
  confidence: ConfidenceLevel;
}

export interface KnowledgeClaim {
  id: string;
  domain: string;
  epistemicTier: EpistemicTier;
  summary: string;
  sourceTitles: string[];
  uncertaintyNote?: string;
}

export interface V60KnowledgeBase {
  version: string;
  claims: KnowledgeClaim[];
  archetypes: Record<string, RecipeArchetype>;
  roastThermalRules: Record<RoastLevel, RoastThermalRule>;
}
