import React from 'react';
import { DeterministicBrewPlan, formatSecondsToMmSs, SimpleTastePreset } from '../engine/brewingEngine';
import { FreshnessState, RoastLevel } from '../knowledge/schema';
import { BeanProfile, EquipmentProfile } from '../storage/storageManager';

interface SimpleModeViewProps {
  doseGrams: number;
  roastLevel: RoastLevel;
  freshnessState: FreshnessState;
  tastePreset: SimpleTastePreset;
  userGrinderSettingLabel: string;
  beans: BeanProfile[];
  equipment: EquipmentProfile[];
  activeBeanId?: string;
  activeEquipmentId?: string;
  plan: DeterministicBrewPlan;
  onChangeDose: (dose: number) => void;
  onChangeRoast: (roast: RoastLevel) => void;
  onChangeFreshness: (freshness: FreshnessState) => void;
  onChangeTastePreset: (preset: SimpleTastePreset) => void;
  onChangeGrinderSettingLabel: (label: string) => void;
  onSelectBean: (beanId: string) => void;
  onSelectEquipment: (equipId: string) => void;
  onStartGuidedBrew: () => void;
}

const DOSE_PRESETS = [15, 18, 20, 22, 30];
const ROAST_OPTIONS: { value: RoastLevel; label: string }[] = [
  { value: 'light', label: 'Light' }, { value: 'medium_light', label: 'Med-Light' },
  { value: 'medium', label: 'Medium' }, { value: 'medium_dark', label: 'Med-Dark' }, { value: 'dark', label: 'Dark' },
];
const FRESHNESS_OPTIONS: { value: FreshnessState; label: string }[] = [
  { value: 'rested_optimal', label: 'Rested' }, { value: 'very_fresh_degassing', label: 'Fresh / Gassy' },
  { value: 'aged_or_frozen', label: 'Aged / Frozen' }, { value: 'unknown', label: 'Unknown' },
];
const TASTE_PRESETS: { value: SimpleTastePreset; label: string }[] = [
  { value: 'bright_and_crisp', label: 'Bright & Crisp' }, { value: 'sweet_and_balanced', label: 'Sweet & Balanced' },
  { value: 'rich_and_syrupy', label: 'Rich & Syrupy' }, { value: 'stronger_cup', label: 'Stronger Cup' },
];

export const SimpleModeView: React.FC<SimpleModeViewProps> = ({
  doseGrams, roastLevel, freshnessState, tastePreset, userGrinderSettingLabel, beans, equipment,
  activeBeanId, activeEquipmentId, plan, onChangeDose, onChangeRoast, onChangeFreshness,
  onChangeTastePreset, onChangeGrinderSettingLabel, onSelectBean, onSelectEquipment, onStartGuidedBrew
}) => {
  const [minDd, maxDd] = plan.expectedDrawdownSecondsRange;
  return (
    <div className="stack-lg">
      <section className="card">
        <span className="eyebrow">Simple Mode · Personalised Recipe</span>
        <h2>1. Dose & Coffee</h2>
        <div className="chip-row">
          {DOSE_PRESETS.map((preset) => (
            <button key={preset} type="button" className={`chip ${doseGrams === preset ? 'chip-active' : ''}`} onClick={() => onChangeDose(preset)}>{preset} g</button>
          ))}
        </div>
        <div className="field-group mt-sm">
          <label className="field-label">Exact Dose (g)</label>
          <input type="number" step="0.1" min="5" max="60" className="text-input" value={doseGrams} onChange={(e) => onChangeDose(Number(e.target.value))} />
        </div>
        <div className="field-group">
          <label className="field-label">Roast Profile</label>
          <div className="chip-row">
            {ROAST_OPTIONS.map((opt) => (
              <button key={opt.value} type="button" className={`chip ${roastLevel === opt.value ? 'chip-active' : ''}`} onClick={() => onChangeRoast(opt.value)}>{opt.label}</button>
            ))}
          </div>
        </div>
        <div className="field-group">
          <label className="field-label">Freshness / Degassing</label>
          <div className="chip-row">
            {FRESHNESS_OPTIONS.map((opt) => (
              <button key={opt.value} type="button" className={`chip ${freshnessState === opt.value ? 'chip-active' : ''}`} onClick={() => onChangeFreshness(opt.value)}>{opt.label}</button>
            ))}
          </div>
        </div>
        <div className="two-col">
          <div className="field-group">
            <label className="field-label">Saved Bean Profile</label>
            <select className="text-input" value={activeBeanId ?? ''} onChange={(e) => onSelectBean(e.target.value)}>
              {beans.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Grinder & Setup</label>
            <select className="text-input" value={activeEquipmentId ?? ''} onChange={(e) => onSelectEquipment(e.target.value)}>
              {equipment.map((eq) => <option key={eq.id} value={eq.id}>{eq.displayName}</option>)}
            </select>
          </div>
        </div>
        <div className="field-group">
          <label className="field-label">Your Grinder Setting Label (optional)</label>
          <input type="text" placeholder="e.g. Click 22" className="text-input" value={userGrinderSettingLabel} onChange={(e) => onChangeGrinderSettingLabel(e.target.value)} />
        </div>
      </section>

      <section className="card">
        <h2>2. Taste Goal</h2>
        <div className="chip-row">
          {TASTE_PRESETS.map((opt) => (
            <button key={opt.value} type="button" className={`chip ${tastePreset === opt.value ? 'chip-active' : ''}`} onClick={() => onChangeTastePreset(opt.value)}>{opt.label}</button>
          ))}
        </div>
      </section>

      <section className="card recipe-card">
        <div className="row-between">
          <div><span className="eyebrow">Calculated Recipe</span><h2>{plan.calculatedTotalWaterGrams} g Total Water</h2></div>
          <span className="pill">1:{plan.calculatedRatio}</span>
        </div>
        <p className="muted">Method: <strong>{plan.archetypeName}</strong> · Bloom: <strong>{plan.calculatedBloomWaterGrams} g</strong> · Expected drawdown: <strong>{formatSecondsToMmSs(minDd)}–{formatSecondsToMmSs(maxDd)}</strong></p>
        <div className="guidance-list">
          <p><strong>Temperature:</strong> {plan.recommendedKettleGuidance}</p>
          <p><strong>Grind band:</strong> {plan.recommendedGrindBandLabel}</p>
          <p className="muted">{plan.relativeGrindNudgeLabel}</p>
        </div>
        <div className="step-list">
          {plan.pourSteps.map((step) => (
            <div key={step.stepId} className="step-row">
              <span>{formatSecondsToMmSs(step.startSeconds)}</span>
              <span>{step.label} (+{step.incrementalWaterGrams} g)</span>
              <strong>{step.cumulativeWaterGrams} g</strong>
            </div>
          ))}
        </div>
        {plan.validationWarnings.map((warn, idx) => <p key={idx} className="warning-text">{warn}</p>)}
        <button type="button" className="btn btn-primary full-width" onClick={onStartGuidedBrew}>Start Guided Brew</button>
      </section>
    </div>
  );
};
