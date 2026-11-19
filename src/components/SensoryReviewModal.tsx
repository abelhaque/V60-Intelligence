import React, { useMemo, useState } from 'react';
import { BrewOutcomeInput, computeNextBrewAdjustment, DeterministicBrewPlan, formatSecondsToMmSs } from '../engine/brewingEngine';
import { DrawdownObservation, SensoryBalanceAxis } from '../knowledge/schema';

interface SensoryReviewModalProps {
  plan: DeterministicBrewPlan;
  initialDrawdownSeconds: number;
  onSaveBrewLog: (
    outcome: BrewOutcomeInput,
    adjustment: ReturnType<typeof computeNextBrewAdjustment>,
    freeTextTastingNotes: string,
    applyAdjustment: boolean
  ) => void;
  onDiscard: () => void;
}

const AXIS_OPTIONS: { value: SensoryBalanceAxis; label: string }[] = [
  { value: 'too_low_or_muted', label: 'Low / Muted' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'too_high_or_harsh', label: 'High / Harsh' },
];

const OBSERVATION_OPTIONS: { value: DrawdownObservation; label: string }[] = [
  { value: 'fast', label: 'Fast' },
  { value: 'on_target', label: 'On target' },
  { value: 'slow', label: 'Slow' },
  { value: 'stalled', label: 'Stalled' },
  { value: 'uneven_bed_high_grounds', label: 'Uneven bed' },
];

export const SensoryReviewModal: React.FC<SensoryReviewModalProps> = ({ plan, initialDrawdownSeconds, onSaveBrewLog, onDiscard }) => {
  const [drawdownSeconds, setDrawdownSeconds] = useState(initialDrawdownSeconds);
  const [observation, setObservation] = useState<DrawdownObservation>('on_target');
  const [acidityRating, setAcidityRating] = useState<SensoryBalanceAxis>('balanced');
  const [bitternessAstringencyRating, setBitternessAstringencyRating] = useState<SensoryBalanceAxis>('balanced');
  const [strengthBodyRating, setStrengthBodyRating] = useState<SensoryBalanceAxis>('balanced');
  const [clarityRating, setClarityRating] = useState<SensoryBalanceAxis>('balanced');
  const [beverageMassInput, setBeverageMassInput] = useState('');
  const [tdsInput, setTdsInput] = useState('');
  const [freeTextTastingNotes, setFreeTextTastingNotes] = useState('');
  const [applyAdjustment, setApplyAdjustment] = useState(false);

  const outcomeInput = useMemo(() => {
    const parsedMass = parseFloat(beverageMassInput);
    const parsedTds = parseFloat(tdsInput);
    return {
      actualDrawdownSeconds: Math.max(1, drawdownSeconds),
      observation,
      acidityRating,
      bitternessAstringencyRating,
      strengthBodyRating,
      clarityRating,
      measuredBeverageMassGrams: Number.isFinite(parsedMass) ? parsedMass : undefined,
      measuredTdsPercent: Number.isFinite(parsedTds) ? parsedTds : undefined,
    };
  }, [drawdownSeconds, observation, acidityRating, bitternessAstringencyRating, strengthBodyRating, clarityRating, beverageMassInput, tdsInput]);

  const adjustment = useMemo(() => computeNextBrewAdjustment(plan.doseGrams, outcomeInput), [plan.doseGrams, outcomeInput]);

  const renderAxisRow = (title: string, value: SensoryBalanceAxis, onChange: (next: SensoryBalanceAxis) => void) => (
    <div className="field-group">
      <label className="field-label">{title}</label>
      <div className="chip-row">
        {AXIS_OPTIONS.map((opt) => (
          <button key={opt.value} type="button" className={`chip ${value === opt.value ? 'chip-active' : ''}`} onClick={() => onChange(opt.value)}>{opt.label}</button>
        ))}
      </div>
    </div>
  );

  return (
    <section className="card">
      <div className="row-between">
        <div><span className="eyebrow">Post-Brew Sensory Feedback</span><h2>Review Cup</h2></div>
        <button type="button" className="btn btn-ghost" onClick={onDiscard}>Discard</button>
      </div>
      <div className="field-group">
        <label className="field-label">Actual Drawdown Time (seconds)</label>
        <input type="number" min={10} max={1200} className="text-input" value={drawdownSeconds} onChange={(e) => setDrawdownSeconds(Math.max(1, Number(e.target.value) || 1))} />
      </div>
      <div className="field-group">
        <label className="field-label">Flow & Bed Observation</label>
        <div className="chip-row">
          {OBSERVATION_OPTIONS.map((opt) => (
            <button key={opt.value} type="button" className={`chip ${observation === opt.value ? 'chip-active' : ''}`} onClick={() => setObservation(opt.value)}>{opt.label}</button>
          ))}
        </div>
      </div>
      {renderAxisRow('Acidity', acidityRating, setAcidityRating)}
      {renderAxisRow('Bitterness / Astringency', bitternessAstringencyRating, setBitternessAstringencyRating)}
      {renderAxisRow('Strength & Body', strengthBodyRating, setStrengthBodyRating)}
      {renderAxisRow('Clarity', clarityRating, setClarityRating)}
      
      <div className="two-col">
        <div className="field-group">
          <label className="field-label">Beverage Mass (g, optional)</label>
          <input type="number" step="0.1" placeholder="e.g. 255" className="text-input" value={beverageMassInput} onChange={(e) => setBeverageMassInput(e.target.value)} />
        </div>
        <div className="field-group">
          <label className="field-label">TDS % (optional)</label>
          <input type="number" step="0.01" placeholder="e.g. 1.35" className="text-input" value={tdsInput} onChange={(e) => setTdsInput(e.target.value)} />
        </div>
      </div>

      <div className="adjustment-box">
        <div className="row-between"><strong>Next-Brew Recommendation</strong><span className="pill">{adjustment.confidence}</span></div>
        <p>{adjustment.diagnosisSummary}</p>
        <p><strong>Primary adjustment:</strong> {adjustment.primaryAdjustment.instruction}</p>
        {adjustment.calculatedExtractionYieldPercent !== null && (
          <p><strong>Calculated Extraction Yield:</strong> {adjustment.calculatedExtractionYieldPercent.toFixed(2)}%</p>
        )}
        <p className="muted small-text">{adjustment.extractionYieldNote}</p>
        
        {adjustment.primaryAdjustment.stepDelta !== 0 && (
          <div className="field-group mt-sm">
            <label className="row-gap" style={{cursor: 'pointer'}}>
              <input type="checkbox" checked={applyAdjustment} onChange={(e) => setApplyAdjustment(e.target.checked)} />
              <span className="small-text">Save this grinder adjustment ({adjustment.primaryAdjustment.stepDelta > 0 ? '+' : ''}{adjustment.primaryAdjustment.stepDelta} steps) to my profile for next time</span>
            </label>
          </div>
        )}
      </div>

      <button type="button" className="btn btn-primary full-width" onClick={() => onSaveBrewLog(outcomeInput, adjustment, freeTextTastingNotes.trim(), applyAdjustment)}>
        Save Brew Record
      </button>
    </section>
  );
};
