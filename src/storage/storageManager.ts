import {
  FilterType,
  FreshnessState,
  KettleCapability,
  PrimaryAdjustmentLever,
  ProcessingMethod,
  RoastLevel,
  SensoryBalanceAxis,
  SensoryTargets,
  WaterProfile,
  ConfidenceLevel,
  DrawdownObservation
} from '../knowledge/schema';

export const V60_STORAGE_KEY = 'v60_coffee_intelligence_v1';
export const CURRENT_SCHEMA_VERSION = 1;

export interface EquipmentProfile {
  id: string;
  displayName: string;
  grinderModel: string;
  userGrinderScaleUnitLabel: string;
  dripperLabel: string;
  filterType: FilterType;
  kettleCapability: KettleCapability;
  waterProfile: WaterProfile;
}

export interface PerGrinderDialHistory {
  equipmentProfileId: string;
  lastRecordedSettingLabel?: string;
  cumulativeStepOffset: number;
  lastUpdatedIso: string;
}

export interface BeanProfile {
  id: string;
  name: string;
  roastLevel: RoastLevel;
  freshnessState: FreshnessState;
  roastDateIso?: string;
  processing: ProcessingMethod;
  varietalOrOriginNotes?: string;
  preferredSensoryTargets?: SensoryTargets;
  dialHistoryByEquipmentId: Record<string, PerGrinderDialHistory>;
}

export interface BrewLogEntry {
  id: string;
  completedAtIso: string;
  modeUsed: 'simple' | 'expert';
  beanProfileId?: string;
  equipmentProfileId?: string;
  experimentId?: string;
  recipeSnapshot: {
    archetypeId: string;
    doseGrams: number;
    calculatedRatio: number;
    calculatedTotalWaterGrams: number;
    calculatedBloomWaterGrams: number;
    recommendedTempRangeC: [number, number];
    recommendedGrindBandLabel: string;
    userGrinderSettingLabelAtBrew?: string;
  };
  outcome: {
    actualDrawdownSeconds: number;
    acidityRating: SensoryBalanceAxis;
    bitternessAstringencyRating: SensoryBalanceAxis;
    strengthBodyRating: SensoryBalanceAxis;
    clarityRating: SensoryBalanceAxis;
    measuredBeverageMassGrams?: number;
    measuredTdsPercent?: number;
    calculatedExtractionYieldPercent: number | null;
    freeTextTastingNotes?: string;
  };
  deterministicAdjustment: {
    primaryLever: PrimaryAdjustmentLever;
    instruction: string;
    confidence: ConfidenceLevel;
  };
}

export interface ControlledExperimentSpec {
  id: string;
  title: string;
  controlledVariable: 'grind_step' | 'water_temperature' | 'bloom_duration' | 'pour_count_or_cadence' | 'brew_ratio';
  hypothesis: string;
  baselineDescription: string;
  variantDescription: string;
  createdAtIso: string;
  linkedBrewIds: string[];
  status: 'active' | 'concluded';
}

export interface V60AppState {
  activeMode: 'simple' | 'expert';
  activeBeanProfileId?: string;
  activeEquipmentProfileId?: string;
  equipmentProfiles: EquipmentProfile[];
  beanProfiles: BeanProfile[];
  brewLogs: BrewLogEntry[];
  experiments: ControlledExperimentSpec[];
}

export function createDefaultAppState(): V60AppState {
  const defaultEquipmentId = 'equip-default-v60';
  const defaultBeanId = 'bean-default-house';
  const now = new Date().toISOString();

  return {
    activeMode: 'simple',
    activeBeanProfileId: defaultBeanId,
    activeEquipmentProfileId: defaultEquipmentId,
    equipmentProfiles: [{
      id: defaultEquipmentId,
      displayName: 'Default V60 Setup',
      grinderModel: 'Home Burr Grinder',
      userGrinderScaleUnitLabel: 'Setting / Click',
      dripperLabel: 'Hario V60 02',
      filterType: 'standard_paper',
      kettleCapability: 'variable_temp_gooseneck',
      waterProfile: 'balanced_sca_like',
    }],
    beanProfiles: [{
      id: defaultBeanId,
      name: 'Washed Single Origin (Example)',
      roastLevel: 'light',
      freshnessState: 'rested_optimal',
      processing: 'washed',
      dialHistoryByEquipmentId: {
        [defaultEquipmentId]: {
          equipmentProfileId: defaultEquipmentId,
          lastRecordedSettingLabel: '',
          cumulativeStepOffset: 0,
          lastUpdatedIso: now,
        },
      },
    }],
    brewLogs: [],
    experiments: [],
  };
}

export function loadAppState(): V60AppState {
  if (typeof window === 'undefined' || !window.localStorage) return createDefaultAppState();
  try {
    const raw = window.localStorage.getItem(V60_STORAGE_KEY);
    if (!raw) return createDefaultAppState();
    const parsed = JSON.parse(raw);
    return parsed.state ? { ...createDefaultAppState(), ...parsed.state } : createDefaultAppState();
  } catch {
    return createDefaultAppState();
  }
}

export function saveAppState(state: V60AppState): { ok: boolean; error?: string } {
  if (typeof window === 'undefined' || !window.localStorage) return { ok: false };
  try {
    window.localStorage.setItem(V60_STORAGE_KEY, JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, state }));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export function exportStateAsJsonString(state: V60AppState): string {
  return JSON.stringify({ app: 'v60-coffee-intelligence', schemaVersion: CURRENT_SCHEMA_VERSION, exportedAtIso: new Date().toISOString(), state }, null, 2);
}

// Strict Validation Helpers
const VALID_ROASTS = new Set(['light', 'medium_light', 'medium', 'medium_dark', 'dark']);
const VALID_FRESHNESS = new Set(['very_fresh_degassing', 'rested_optimal', 'aged_or_frozen', 'unknown']);
const VALID_PROCESS = new Set(['washed', 'honey', 'natural', 'fermented_anaerobic', 'unknown']);
const VALID_FILTER = new Set(['standard_paper', 'high_flow_abaca_t90', 'unknown']);
const VALID_KETTLE = new Set(['variable_temp_gooseneck', 'non_variable_kettle']);
const VALID_WATER = new Set(['soft_low_alkalinity', 'balanced_sca_like', 'hard_high_alkalinity', 'custom_remineralised', 'unknown']);
const VALID_AXIS = new Set(['too_low_or_muted', 'balanced', 'too_high_or_harsh']);
const VALID_VARS = new Set(['grind_step', 'water_temperature', 'bloom_duration', 'pour_count_or_cadence', 'brew_ratio']);
const VALID_MODES = new Set(['simple', 'expert']);
const VALID_STATUS = new Set(['active', 'concluded']);
const VALID_ADJ = new Set([
  'grind_finer_one_step', 'grind_coarser_one_step', 'grind_coarser_stall_recovery',
  'temperature_increase_1_to_2c', 'temperature_decrease_1_to_2c',
  'reduce_agitation_and_pour_height', 'increase_pour_stages_or_agitation',
  'tighten_ratio_slightly', 'widen_ratio_slightly',
  'stabilise_bed_uniformity_first', 'hold_baseline_and_log'
]);
const VALID_CONFIDENCE = new Set(['High', 'Moderate', 'Exploratory']);

function isFinitePositive(val: any): boolean {
    return typeof val === 'number' && Number.isFinite(val) && val >= 0;
}

function isValidBeanArray(arr: any): boolean {
  if (!Array.isArray(arr)) return false;
  return arr.every(item => 
    typeof item === 'object' && item !== null &&
    typeof item.id === 'string' && 
    typeof item.name === 'string' &&
    VALID_ROASTS.has(item.roastLevel) &&
    VALID_FRESHNESS.has(item.freshnessState) &&
    VALID_PROCESS.has(item.processing) &&
    typeof item.dialHistoryByEquipmentId === 'object' &&
    Object.values(item.dialHistoryByEquipmentId).every((dh: any) => 
      typeof dh === 'object' && dh !== null &&
      typeof dh.equipmentProfileId === 'string' &&
      typeof dh.cumulativeStepOffset === 'number' &&
      typeof dh.lastUpdatedIso === 'string'
    )
  );
}

function isValidEquipmentArray(arr: any): boolean {
  if (!Array.isArray(arr)) return false;
  return arr.every(item => 
    typeof item === 'object' && item !== null &&
    typeof item.id === 'string' && 
    typeof item.displayName === 'string' && 
    typeof item.grinderModel === 'string' &&
    typeof item.userGrinderScaleUnitLabel === 'string' &&
    typeof item.dripperLabel === 'string' &&
    VALID_FILTER.has(item.filterType) &&
    VALID_KETTLE.has(item.kettleCapability) &&
    VALID_WATER.has(item.waterProfile)
  );
}

function isValidLogArray(arr: any): boolean {
  if (!Array.isArray(arr)) return false;
  return arr.every(item => 
    typeof item === 'object' && item !== null &&
    typeof item.id === 'string' && 
    typeof item.completedAtIso === 'string' &&
    VALID_MODES.has(item.modeUsed) &&
    
    item.recipeSnapshot && typeof item.recipeSnapshot === 'object' &&
    typeof item.recipeSnapshot.archetypeId === 'string' &&
    isFinitePositive(item.recipeSnapshot.doseGrams) && item.recipeSnapshot.doseGrams > 0 &&
    isFinitePositive(item.recipeSnapshot.calculatedRatio) && item.recipeSnapshot.calculatedRatio > 0 &&
    isFinitePositive(item.recipeSnapshot.calculatedTotalWaterGrams) &&
    isFinitePositive(item.recipeSnapshot.calculatedBloomWaterGrams) &&
    Array.isArray(item.recipeSnapshot.recommendedTempRangeC) && item.recipeSnapshot.recommendedTempRangeC.length === 2 &&
    typeof item.recipeSnapshot.recommendedGrindBandLabel === 'string' &&
    
    item.outcome && typeof item.outcome === 'object' &&
    isFinitePositive(item.outcome.actualDrawdownSeconds) &&
    VALID_AXIS.has(item.outcome.acidityRating) &&
    VALID_AXIS.has(item.outcome.bitternessAstringencyRating) &&
    VALID_AXIS.has(item.outcome.strengthBodyRating) &&
    VALID_AXIS.has(item.outcome.clarityRating) &&
    (item.outcome.calculatedExtractionYieldPercent === null || (isFinitePositive(item.outcome.calculatedExtractionYieldPercent) && item.outcome.calculatedExtractionYieldPercent <= 35)) &&
    
    item.deterministicAdjustment && typeof item.deterministicAdjustment === 'object' &&
    VALID_ADJ.has(item.deterministicAdjustment.primaryLever) &&
    typeof item.deterministicAdjustment.instruction === 'string' &&
    VALID_CONFIDENCE.has(item.deterministicAdjustment.confidence)
  );
}

function isValidExperimentArray(arr: any): boolean {
  if (!Array.isArray(arr)) return false;
  return arr.every(item => 
    typeof item === 'object' && item !== null &&
    typeof item.id === 'string' && 
    typeof item.title === 'string' && 
    VALID_VARS.has(item.controlledVariable) &&
    typeof item.hypothesis === 'string' &&
    typeof item.baselineDescription === 'string' &&
    typeof item.variantDescription === 'string' &&
    typeof item.createdAtIso === 'string' &&
    VALID_STATUS.has(item.status) &&
    Array.isArray(item.linkedBrewIds) &&
    item.linkedBrewIds.every((lid: any) => typeof lid === 'string')
  );
}

// 1. Pure validation & preview parsing. Never changes state.
export function previewStateFromJsonString(jsonText: string): { ok: boolean; parsedState?: Partial<V60AppState>; error?: string; counts?: { beans: number; equipment: number; logs: number; experiments: number } } {
  try {
    const parsed = JSON.parse(jsonText);
    if (!parsed || typeof parsed !== 'object') return { ok: false, error: 'Invalid JSON structure.' };
    if (parsed.app !== 'v60-coffee-intelligence') return { ok: false, error: 'Not a valid V60 Coffee Intelligence backup file.' };
    if (parsed.schemaVersion !== CURRENT_SCHEMA_VERSION) return { ok: false, error: `Incompatible schema version (expected ${CURRENT_SCHEMA_VERSION}).` };
    if (!parsed.state || typeof parsed.state !== 'object') return { ok: false, error: 'Missing app state data.' };

    const incoming = parsed.state as Partial<V60AppState>;

    if (incoming.activeMode && !VALID_MODES.has(incoming.activeMode)) return { ok: false, error: 'Invalid activeMode in backup.' };
    if (incoming.beanProfiles && !isValidBeanArray(incoming.beanProfiles)) return { ok: false, error: 'Malformed bean profiles or invalid enums in backup.' };
    if (incoming.equipmentProfiles && !isValidEquipmentArray(incoming.equipmentProfiles)) return { ok: false, error: 'Malformed equipment profiles in backup.' };
    if (incoming.brewLogs && !isValidLogArray(incoming.brewLogs)) return { ok: false, error: 'Malformed brew logs or missing mandatory fields in backup.' };
    if (incoming.experiments && !isValidExperimentArray(incoming.experiments)) return { ok: false, error: 'Malformed experiments in backup.' };

    // Prevent accepting a backup file containing ONLY an active selection but no collections.
    const beansCount = incoming.beanProfiles?.length || 0;
    const equipCount = incoming.equipmentProfiles?.length || 0;
    const logsCount = incoming.brewLogs?.length || 0;
    const expCount = incoming.experiments?.length || 0;
    
    // Explicit protection against empty replacements
    if (beansCount === 0 && equipCount === 0 && logsCount === 0 && expCount === 0) {
       return { ok: false, error: 'Backup payload does not contain any valid profile or log collections.' };
    }

    return { 
      ok: true,
      parsedState: incoming,
      counts: { beans: beansCount, equipment: equipCount, logs: logsCount, experiments: expCount }
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'JSON Parsing failed.' };
  }
}

// 2. The actual mutation function, applied only after explicit confirmation
export function applyImportedState(incoming: Partial<V60AppState>, currentState: V60AppState, mode: 'merge' | 'replace'): { ok: boolean; state?: V60AppState; error?: string } {
    const incomingEquipment = incoming.equipmentProfiles || [];
    const incomingBeans = incoming.beanProfiles || [];
    const incomingLogs = incoming.brewLogs || [];
    const incomingExperiments = incoming.experiments || [];

    if (mode === 'replace') {
      const base = createDefaultAppState();
      return { 
        ok: true, 
        state: {
          activeMode: incoming.activeMode === 'expert' ? 'expert' : 'simple',
          activeEquipmentProfileId: incoming.activeEquipmentProfileId ?? incomingEquipment[0]?.id ?? base.activeEquipmentProfileId,
          activeBeanProfileId: incoming.activeBeanProfileId ?? incomingBeans[0]?.id ?? base.activeBeanProfileId,
          equipmentProfiles: incomingEquipment.length > 0 ? incomingEquipment : base.equipmentProfiles,
          beanProfiles: incomingBeans.length > 0 ? incomingBeans : base.beanProfiles,
          brewLogs: incomingLogs,
          experiments: incomingExperiments,
        }
      };
    }

    // Merge Mode: Existing Local Data Takes Precedence
    const mergeKeepLocal = <T extends { id: string }>(existing: T[], added: T[]): T[] => {
      const map = new Map<string, T>();
      for (const item of added) map.set(item.id, item); // Add incoming first
      for (const item of existing) map.set(item.id, item); // Overwrite with local to preserve current state
      return Array.from(map.values());
    };

    const mergedState: V60AppState = {
      ...currentState,
      equipmentProfiles: mergeKeepLocal(currentState.equipmentProfiles, incomingEquipment),
      beanProfiles: mergeKeepLocal(currentState.beanProfiles, incomingBeans),
      brewLogs: mergeKeepLocal(currentState.brewLogs, incomingLogs),
      experiments: mergeKeepLocal(currentState.experiments, incomingExperiments),
    };
    
    return { ok: true, state: mergedState };
}
