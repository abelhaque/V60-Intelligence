import React, { useRef, useState } from 'react';
import { DeterministicBrewPlan, formatSecondsToMmSs } from '../engine/brewingEngine';
import { FilterType, FreshnessState, KettleCapability, ProcessingMethod, RoastLevel, SensoryTargets, WaterProfile } from '../knowledge/schema';
import { BeanProfile, ControlledExperimentSpec, EquipmentProfile } from '../storage/storageManager';

interface ExpertModeViewProps {
  archetypeId: string; archetypeOptions: { id: string; name: string }[];
  doseGrams: number; customRatioInput: string;
  roastLevel: RoastLevel; freshnessState: FreshnessState; processing: ProcessingMethod;
  varietalOrOriginNotes: string; filterType: FilterType; kettleCapability: KettleCapability; waterProfile: WaterProfile;
  userGrinderSettingLabel: string; sensoryTargets: SensoryTargets; plan: DeterministicBrewPlan;
  beans: BeanProfile[]; equipment: EquipmentProfile[]; activeBeanId?: string; activeEquipmentId?: string;
  experiments: ControlledExperimentSpec[]; brewLogs: any[];
  onChangeArchetype: (id: string) => void; onChangeDose: (dose: number) => void; onChangeCustomRatioInput: (val: string) => void;
  onChangeRoast: (roast: RoastLevel) => void; onChangeFreshness: (freshness: FreshnessState) => void; onChangeProcessing: (proc: ProcessingMethod) => void;
  onChangeVarietalNotes: (notes: string) => void; onChangeFilterType: (filter: FilterType) => void; onChangeKettleCapability: (kettle: KettleCapability) => void;
  onChangeWaterProfile: (water: WaterProfile) => void; onChangeGrinderSettingLabel: (label: string) => void; onChangeSensoryTargets: (targets: SensoryTargets) => void;
  onSelectBean: (beanId: string) => void; onSelectEquipment: (equipId: string) => void;
  onAddBeanProfile: (name: string, roast: RoastLevel, process: ProcessingMethod) => void;
  onAddEquipmentProfile: (displayName: string, grinderModel: string, scaleLabel: string, filterType: FilterType, kettleCapability: KettleCapability, waterProfile: WaterProfile) => void;
  onCreateExperiment: (title: string, controlledVariable: any, hypothesis: string, baselineDescription: string, variantDescription: string) => void;
  onExportJson: () => void;
  onPreviewImportJson: (jsonText: string) => { ok: boolean; parsedState?: any; error?: string; counts?: { beans: number; equipment: number; logs: number; experiments: number } };
  onApplyImportJson: (parsedState: any, mode: 'merge' | 'replace') => { ok: boolean; error?: string };
  onStartGuidedBrew: () => void;
}

export const ExpertModeView: React.FC<ExpertModeViewProps> = ({
  archetypeId, archetypeOptions, doseGrams, customRatioInput, roastLevel, freshnessState, processing, varietalOrOriginNotes,
  filterType, kettleCapability, waterProfile, userGrinderSettingLabel, sensoryTargets, plan, beans, equipment,
  activeBeanId, activeEquipmentId, experiments, brewLogs,
  onChangeArchetype, onChangeDose, onChangeCustomRatioInput, onChangeRoast, onChangeFreshness, onChangeProcessing,
  onChangeVarietalNotes, onChangeFilterType, onChangeKettleCapability, onChangeWaterProfile, onChangeGrinderSettingLabel,
  onChangeSensoryTargets, onSelectBean, onSelectEquipment, onAddBeanProfile, onAddEquipmentProfile, onCreateExperiment,
  onExportJson, onPreviewImportJson, onApplyImportJson, onStartGuidedBrew
}) => {
  const [tab, setTab] = useState<'controls' | 'experiments' | 'profiles_history'>('controls');
  const [newBeanName, setNewBeanName] = useState('');
  const [newEquipName, setNewEquipName] = useState('');
  const [newGrinderModel, setNewGrinderModel] = useState('');
  const [newScaleLabel, setNewScaleLabel] = useState('Click / Setting');
  const [expTitle, setExpTitle] = useState('');
  const [expVariable, setExpVariable] = useState<ControlledExperimentSpec['controlledVariable']>('grind_step');
  const [expHypothesis, setExpHypothesis] = useState('');
  const [expBaseline, setExpBaseline] = useState('');
  const [expVariant, setExpVariant] = useState('');
  
  const [stagedImport, setStagedImport] = useState<any>(null);
  const [importStatus, setImportStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const renderSlider = (label: string, key: keyof SensoryTargets, minLabel: string, maxLabel: string) => (
    <div className="field-group">
      <div className="row-between"><label className="field-label">{label}</label><strong>{sensoryTargets[key]} / 5</strong></div>
      <input type="range" min={1} max={5} step={1} value={sensoryTargets[key]} onChange={(e) => onChangeSensoryTargets({ ...sensoryTargets, [key]: Number(e.target.value) })} />
      <div className="row-between muted small-text"><span>{minLabel}</span><span>{maxLabel}</span></div>
    </div>
  );

  return (
    <div className="stack-lg">
      <div className="chip-row">
        <button type="button" className={`chip ${tab === 'controls' ? 'chip-active' : ''}`} onClick={() => setTab('controls')}>Controls & Sensory</button>
        <button type="button" className={`chip ${tab === 'experiments' ? 'chip-active' : ''}`} onClick={() => setTab('experiments')}>Experiments ({experiments.length})</button>
        <button type="button" className={`chip ${tab === 'profiles_history' ? 'chip-active' : ''}`} onClick={() => setTab('profiles_history')}>Profiles, History & JSON</button>
      </div>

      {tab === 'controls' && (
        <div className="stack-lg">
          <section className="card">
            <span className="eyebrow">Expert Mode · Parameters</span>
            <h2>Recipe, Bean & Equipment</h2>
            <div className="field-group">
              <label className="field-label">Recipe Archetype</label>
              <select className="text-input" value={archetypeId} onChange={(e) => onChangeArchetype(e.target.value)}>
                {archetypeOptions.map((opt) => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
              </select>
            </div>
            <div className="two-col">
              <div className="field-group">
                <label className="field-label">Dose (g)</label>
                <input type="number" step="0.1" className="text-input" value={doseGrams} onChange={(e) => onChangeDose(Number(e.target.value))} />
              </div>
              <div className="field-group">
                <label className="field-label">Target Ratio</label>
                <input type="number" step="0.1" placeholder="Auto from targets" className="text-input" value={customRatioInput} onChange={(e) => onChangeCustomRatioInput(e.target.value)} />
              </div>
            </div>
            <div className="two-col">
              <div className="field-group">
                <label className="field-label">Roast Level</label>
                <select className="text-input" value={roastLevel} onChange={(e) => onChangeRoast(e.target.value as RoastLevel)}>
                  <option value="light">Light</option><option value="medium_light">Medium-Light</option><option value="medium">Medium</option><option value="medium_dark">Medium-Dark</option><option value="dark">Dark</option>
                </select>
              </div>
              <div className="field-group">
                <label className="field-label">Freshness State</label>
                <select className="text-input" value={freshnessState} onChange={(e) => onChangeFreshness(e.target.value as FreshnessState)}>
                  <option value="rested_optimal">Rested</option><option value="very_fresh_degassing">Very Fresh / Degassing</option><option value="aged_or_frozen">Aged or Frozen</option><option value="unknown">Unknown</option>
                </select>
              </div>
            </div>
            <div className="two-col">
              <div className="field-group">
                <label className="field-label">Processing</label>
                <select className="text-input" value={processing} onChange={(e) => onChangeProcessing(e.target.value as ProcessingMethod)}>
                  <option value="washed">Washed</option><option value="honey">Honey</option><option value="natural">Natural</option><option value="fermented_anaerobic">Fermented / Anaerobic</option><option value="unknown">Unknown</option>
                </select>
              </div>
              <div className="field-group">
                <label className="field-label">Filter Type</label>
                <select className="text-input" value={filterType} onChange={(e) => onChangeFilterType(e.target.value as FilterType)}>
                  <option value="standard_paper">Standard Paper</option><option value="high_flow_abaca_t90">High-Flow / Abaca / T-90</option><option value="unknown">Unknown</option>
                </select>
              </div>
            </div>
            <div className="two-col">
              <div className="field-group">
                <label className="field-label">Kettle Capability</label>
                <select className="text-input" value={kettleCapability} onChange={(e) => onChangeKettleCapability(e.target.value as KettleCapability)}>
                  <option value="variable_temp_gooseneck">Variable °C Gooseneck</option><option value="non_variable_kettle">Non-Variable Kettle</option>
                </select>
              </div>
              <div className="field-group">
                <label className="field-label">Water Profile</label>
                <select className="text-input" value={waterProfile} onChange={(e) => onChangeWaterProfile(e.target.value as WaterProfile)}>
                  <option value="balanced_sca_like">Balanced / SCA-like</option><option value="soft_low_alkalinity">Soft / Low Alkalinity</option><option value="hard_high_alkalinity">Hard / High Alkalinity</option><option value="custom_remineralised">Custom / Remineralised</option><option value="unknown">Unknown</option>
                </select>
              </div>
            </div>
            <div className="field-group">
              <label className="field-label">Grinder Setting</label>
              <input type="text" className="text-input" placeholder="e.g. Click 24" value={userGrinderSettingLabel} onChange={(e) => onChangeGrinderSettingLabel(e.target.value)} />
            </div>
            <div className="field-group">
              <label className="field-label">Varietal, Origin & Altitude Notes</label>
              <input type="text" className="text-input" value={varietalOrOriginNotes} onChange={(e) => onChangeVarietalNotes(e.target.value)} />
            </div>
          </section>

          <section className="card">
            <h2>Five-Axis Sensory Targets</h2>
            {renderSlider('Flavour Balance', 'flavourClarityVsComplexity', 'Clarity', 'Complexity')}
            {renderSlider('Sweetness', 'sweetness', 'Subtle', 'Pronounced')}
            {renderSlider('Acidity', 'acidity', 'Soft / Muted', 'Lively / Bright')}
            {renderSlider('Strength', 'strength', 'Light', 'Strong')}
            {renderSlider('Body', 'body', 'Delicate / Thin', 'Full / Syrupy')}
          </section>

          <section className="card recipe-card">
            <div className="row-between"><h2>Calculated Plan: {plan.calculatedTotalWaterGrams} g</h2><span className="pill">1:{plan.calculatedRatio}</span></div>
            <p className="muted">Bloom: <strong>{plan.calculatedBloomWaterGrams} g</strong> · Temp: <strong>{plan.recommendedKettleGuidance}</strong></p>
            <p className="muted">{plan.relativeGrindNudgeLabel}</p>
            {plan.advisories.map(a => <p key={a.code} className="muted small-text">[{a.epistemicTier}] {a.message}</p>)}
            <button type="button" className="btn btn-primary full-width" onClick={onStartGuidedBrew}>Start Guided Brew</button>
          </section>
        </div>
      )}

      {tab === 'experiments' && (
        <div className="stack-lg">
          <section className="card">
            <h2>Controlled Single-Variable Experiment</h2>
            <div className="field-group">
              <label className="field-label">Experiment Title</label>
              <input type="text" className="text-input" value={expTitle} onChange={(e) => setExpTitle(e.target.value)} />
            </div>
            <div className="field-group">
              <label className="field-label">Controlled Variable</label>
              <select className="text-input" value={expVariable} onChange={(e) => setExpVariable(e.target.value as any)}>
                <option value="grind_step">Grinder step</option><option value="water_temperature">Water temperature</option><option value="bloom_duration">Bloom duration</option><option value="brew_ratio">Brew ratio</option><option value="pour_count_or_cadence">Pour count / cadence</option>
              </select>
            </div>
            <div className="field-group">
              <label className="field-label">Hypothesis</label>
              <input type="text" className="text-input" value={expHypothesis} onChange={(e) => setExpHypothesis(e.target.value)} />
            </div>
            <div className="two-col">
              <div className="field-group">
                <label className="field-label">Baseline Setup</label>
                <input type="text" className="text-input" value={expBaseline} onChange={(e) => setExpBaseline(e.target.value)} />
              </div>
              <div className="field-group">
                <label className="field-label">Variant Change</label>
                <input type="text" className="text-input" value={expVariant} onChange={(e) => setExpVariant(e.target.value)} />
              </div>
            </div>
            <button type="button" className="btn btn-primary full-width" onClick={() => {
              if (!expTitle.trim()) return;
              onCreateExperiment(expTitle.trim(), expVariable, expHypothesis.trim(), expBaseline.trim(), expVariant.trim());
              setExpTitle(''); setExpHypothesis(''); setExpBaseline(''); setExpVariant('');
            }}>Save Experiment</button>
          </section>
          {experiments.map(exp => (
            <section key={exp.id} className="card">
              <div className="row-between"><strong>{exp.title}</strong><span className="pill">{exp.controlledVariable}</span></div>
              <p>{exp.hypothesis}</p>
              <p className="muted small-text">Baseline: {exp.baselineDescription} &rarr; Variant: {exp.variantDescription}</p>
            </section>
          ))}
        </div>
      )}

      {tab === 'profiles_history' && (
        <div className="stack-lg">
          <section className="card">
            <h2>Saved Beans & Equipment</h2>
            <div className="two-col">
              <div className="field-group">
                <label className="field-label">Active Bean</label>
                <select className="text-input" value={activeBeanId ?? ''} onChange={(e) => onSelectBean(e.target.value)}>
                  {beans.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="field-group">
                <label className="field-label">Active Equipment</label>
                <select className="text-input" value={activeEquipmentId ?? ''} onChange={(e) => onSelectEquipment(e.target.value)}>
                  {equipment.map((eq) => <option key={eq.id} value={eq.id}>{eq.displayName}</option>)}
                </select>
              </div>
            </div>

            <div className="field-group mt-sm">
              <label className="field-label">Add Bean Profile</label>
              <div className="row-gap">
                <input type="text" className="text-input" placeholder="Bean name & origin" value={newBeanName} onChange={(e) => setNewBeanName(e.target.value)} />
                <button type="button" className="btn btn-secondary" onClick={() => { if (!newBeanName.trim()) return; onAddBeanProfile(newBeanName.trim(), roastLevel, processing); setNewBeanName(''); }}>Add Bean</button>
              </div>
            </div>
            <div className="field-group">
              <label className="field-label">Add Equipment Setup</label>
              <div className="two-col">
                <input type="text" className="text-input" placeholder="Setup name" value={newEquipName} onChange={(e) => setNewEquipName(e.target.value)} />
                <input type="text" className="text-input" placeholder="Grinder model" value={newGrinderModel} onChange={(e) => setNewGrinderModel(e.target.value)} />
              </div>
              <div className="row-gap mt-sm">
                <input type="text" className="text-input" placeholder="Scale label" value={newScaleLabel} onChange={(e) => setNewScaleLabel(e.target.value)} />
                <button type="button" className="btn btn-secondary" onClick={() => { if (!newEquipName.trim()) return; onAddEquipmentProfile(newEquipName.trim(), newGrinderModel.trim() || 'Grinder', newScaleLabel.trim() || 'Setting', filterType, kettleCapability, waterProfile); setNewEquipName(''); setNewGrinderModel(''); }}>Add Setup</button>
              </div>
            </div>
          </section>

          <section className="card">
            <h2>JSON Export & Import</h2>
            <p className="muted">Export a JSON snapshot to move your beans, grinder settings, and logs.</p>
            {stagedImport ? (
              <div className="adjustment-box">
                <p><strong>Confirm Import Preview</strong></p>
                <p className="small-text">Beans: {stagedImport.counts?.beans || 0} | Equipment: {stagedImport.counts?.equipment || 0} | Logs: {stagedImport.counts?.logs || 0}</p>
                <div className="button-grid mt-sm">
                  <button className="btn btn-primary" onClick={() => { 
                    const res = onApplyImportJson(stagedImport.parsedState, 'merge'); 
                    if (res.ok) {
                        setImportStatus('Merge successful (local kept on conflict).');
                        setStagedImport(null); 
                    } else {
                        setImportStatus(`Apply failed: ${res.error}`);
                    }
                  }}>Merge Data</button>
                  <button className="btn btn-danger" onClick={() => { 
                    if(window.confirm('Are you sure you want to replace all local data?')) {
                      const res = onApplyImportJson(stagedImport.parsedState, 'replace');
                      if (res.ok) {
                          setImportStatus('Data replaced successfully.');
                          setStagedImport(null);
                      } else {
                          setImportStatus(`Replace failed: ${res.error}`);
                      }
                    }
                  }}>Replace Data</button>
                </div>
                <button className="btn btn-ghost full-width mt-sm" onClick={() => { setStagedImport(null); setImportStatus(''); }}>Cancel</button>
              </div>
            ) : (
              <div className="button-grid">
                <button type="button" className="btn btn-secondary" onClick={onExportJson}>Export JSON Backup</button>
                <button type="button" className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>Import JSON File</button>
              </div>
            )}
            <input
              ref={fileInputRef} type="file" accept="application/json,.json" style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  const text = String(reader.result);
                  // Pure read-only validation. No state mutation!
                  const testRes = onPreviewImportJson(text);
                  if(!testRes.ok) {
                      setImportStatus(`Import failed: ${testRes.error}`);
                      setStagedImport(null);
                  } else {
                      setStagedImport({ parsedState: testRes.parsedState, counts: testRes.counts });
                      setImportStatus('');
                  }
                };
                reader.readAsText(file);
                e.target.value = '';
              }}
            />
            {importStatus && <p className={importStatus.includes('failed') ? "warning-text mt-sm" : "muted mt-sm"}>{importStatus}</p>}
          </section>

          <section className="card">
            <h2>Brewing History ({brewLogs.length})</h2>
            {brewLogs.length === 0 ? <p className="muted">No completed brews logged yet.</p> : (
              <div className="stack-md">
                {brewLogs.slice(0, 15).map((log) => (
                  <div key={log.id} className="history-item">
                    <div className="row-between">
                      <strong>{log.recipeSnapshot.doseGrams} g &rarr; {log.recipeSnapshot.calculatedTotalWaterGrams} g</strong>
                      <span className="pill">{formatSecondsToMmSs(log.outcome.actualDrawdownSeconds)}</span>
                    </div>
                    <p className="muted small-text">
                      {new Date(log.completedAtIso).toLocaleString('en-GB')}
                      {log.outcome.calculatedExtractionYieldPercent !== null && typeof log.outcome.calculatedExtractionYieldPercent === 'number' && ` · EY: ${log.outcome.calculatedExtractionYieldPercent.toFixed(2)}%`}
                    </p>
                    <p className="small-text">Next brew: {log.deterministicAdjustment.instruction}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
