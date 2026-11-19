import React, { useEffect, useMemo, useState } from 'react';
import { buildDeterministicBrewPlan, BrewOutcomeInput, computeNextBrewAdjustment, sensoryTargetsFromSimplePreset, SimpleTastePreset } from './engine/brewingEngine';
import { SEED_V60_KNOWLEDGE_BASE } from './knowledge/seed';
import { FilterType, FreshnessState, KettleCapability, ProcessingMethod, RoastLevel, SensoryTargets, WaterProfile } from './knowledge/schema';
import { BeanProfile, BrewLogEntry, ControlledExperimentSpec, EquipmentProfile, exportStateAsJsonString, previewStateFromJsonString, applyImportedState, loadAppState, saveAppState, V60AppState } from './storage/storageManager';
import { SimpleModeView } from './components/SimpleModeView';
import { ExpertModeView } from './components/ExpertModeView';
import { GuidedBrewTimer } from './components/GuidedBrewTimer';
import { SensoryReviewModal } from './components/SensoryReviewModal';

type ActiveScreen = 'planner' | 'timer' | 'review';

export const App: React.FC = () => {
  const [appState, setAppState] = useState<V60AppState>(() => loadAppState());
  const [screen, setScreen] = useState<ActiveScreen>('planner');
  const [completedSeconds, setCompletedSeconds] = useState<number>(0);

  const activeBean = useMemo(() => appState.beanProfiles.find((b) => b.id === appState.activeBeanProfileId) ?? appState.beanProfiles[0], [appState.beanProfiles, appState.activeBeanProfileId]);
  const activeEquipment = useMemo(() => appState.equipmentProfiles.find((e) => e.id === appState.activeEquipmentProfileId) ?? appState.equipmentProfiles[0], [appState.equipmentProfiles, appState.activeEquipmentProfileId]);

  const [archetypeId, setArchetypeId] = useState<string>('hoffmann_two_pour_v60');
  const [doseGrams, setDoseGrams] = useState<number>(18);
  const [customRatioInput, setCustomRatioInput] = useState<string>('');
  
  const [roastLevel, setRoastLevel] = useState<RoastLevel>(activeBean?.roastLevel ?? 'light');
  const [freshnessState, setFreshnessState] = useState<FreshnessState>(activeBean?.freshnessState ?? 'rested_optimal');
  const [processing, setProcessing] = useState<ProcessingMethod>(activeBean?.processing ?? 'washed');
  const [varietalOrOriginNotes, setVarietalOrOriginNotes] = useState<string>(activeBean?.varietalOrOriginNotes ?? '');
  
  const [tastePreset, setTastePreset] = useState<SimpleTastePreset>('sweet_and_balanced');
  const [sensoryTargets, setSensoryTargets] = useState<SensoryTargets>(() => sensoryTargetsFromSimplePreset('sweet_and_balanced'));

  const [filterType, setFilterType] = useState<FilterType>(activeEquipment?.filterType ?? 'standard_paper');
  const [kettleCapability, setKettleCapability] = useState<KettleCapability>(activeEquipment?.kettleCapability ?? 'variable_temp_gooseneck');
  const [waterProfile, setWaterProfile] = useState<WaterProfile>(activeEquipment?.waterProfile ?? 'balanced_sca_like');

  const dialHistory = useMemo(() => {
    if (!activeBean || !activeEquipment) return undefined;
    return activeBean.dialHistoryByEquipmentId[activeEquipment.id];
  }, [activeBean, activeEquipment]);

  const [userGrinderSettingLabel, setUserGrinderSettingLabel] = useState<string>(dialHistory?.lastRecordedSettingLabel ?? '');

  useEffect(() => {
    saveAppState(appState);
  }, [appState]);

  const parsedCustomRatio = useMemo(() => {
    const val = parseFloat(customRatioInput);
    return Number.isFinite(val) && val > 0 ? val : undefined;
  }, [customRatioInput]);

  const brewPlan = useMemo(() => buildDeterministicBrewPlan({
    mode: appState.activeMode,
    doseGrams,
    roastLevel,
    freshnessState,
    processing,
    archetypeId,
    targetRatio: parsedCustomRatio,
    filterType,
    kettleCapability,
    waterProfile,
    sensoryTargets,
    userGrinderSettingLabel,
    previousBeanGrinderStepOffset: dialHistory?.cumulativeStepOffset ?? 0,
  }, SEED_V60_KNOWLEDGE_BASE), [appState.activeMode, doseGrams, roastLevel, freshnessState, processing, archetypeId, parsedCustomRatio, filterType, kettleCapability, waterProfile, sensoryTargets, userGrinderSettingLabel, dialHistory?.cumulativeStepOffset]);

  const handleToggleMode = (nextMode: 'simple' | 'expert') => { setAppState((prev) => ({ ...prev, activeMode: nextMode })); };

  const handleSelectBean = (beanId: string) => {
    const chosen = appState.beanProfiles.find((b) => b.id === beanId);
    setAppState((prev) => ({ ...prev, activeBeanProfileId: beanId }));
    if (chosen) {
      setRoastLevel(chosen.roastLevel); setFreshnessState(chosen.freshnessState); setProcessing(chosen.processing); setVarietalOrOriginNotes(chosen.varietalOrOriginNotes ?? '');
      const hist = activeEquipment ? chosen.dialHistoryByEquipmentId[activeEquipment.id] : undefined;
      setUserGrinderSettingLabel(hist?.lastRecordedSettingLabel ?? '');
    }
  };

  const handleSelectEquipment = (equipId: string) => {
    const chosen = appState.equipmentProfiles.find((e) => e.id === equipId);
    setAppState((prev) => ({ ...prev, activeEquipmentProfileId: equipId }));
    if (chosen) {
      setFilterType(chosen.filterType); setKettleCapability(chosen.kettleCapability); setWaterProfile(chosen.waterProfile);
      const hist = activeBean ? activeBean.dialHistoryByEquipmentId[chosen.id] : undefined;
      setUserGrinderSettingLabel(hist?.lastRecordedSettingLabel ?? '');
    }
  };

  const handleSaveBrewLog = (outcome: BrewOutcomeInput, adjustment: ReturnType<typeof computeNextBrewAdjustment>, freeTextTastingNotes: string, applyAdj: boolean) => {
    const now = new Date().toISOString();
    const logEntry: BrewLogEntry = {
      id: `brew-${Date.now()}`,
      completedAtIso: now,
      modeUsed: appState.activeMode,
      beanProfileId: activeBean?.id,
      equipmentProfileId: activeEquipment?.id,
      recipeSnapshot: {
        archetypeId: brewPlan.archetypeId, doseGrams: brewPlan.doseGrams, calculatedRatio: brewPlan.calculatedRatio,
        calculatedTotalWaterGrams: brewPlan.calculatedTotalWaterGrams, calculatedBloomWaterGrams: brewPlan.calculatedBloomWaterGrams,
        recommendedTempRangeC: brewPlan.recommendedTempRangeC, recommendedGrindBandLabel: brewPlan.recommendedGrindBandLabel,
        userGrinderSettingLabelAtBrew: userGrinderSettingLabel || undefined,
      },
      outcome: { ...outcome, calculatedExtractionYieldPercent: adjustment.calculatedExtractionYieldPercent, freeTextTastingNotes: freeTextTastingNotes || undefined },
      deterministicAdjustment: { primaryLever: adjustment.primaryAdjustment.lever, instruction: adjustment.primaryAdjustment.instruction, confidence: adjustment.confidence },
    };

    setAppState((prev) => {
      const updatedBeans = prev.beanProfiles.map((bean) => {
        if (!activeBean || bean.id !== activeBean.id || !activeEquipment) return bean;
        const prior = bean.dialHistoryByEquipmentId[activeEquipment.id] ?? { equipmentProfileId: activeEquipment.id, cumulativeStepOffset: 0, lastUpdatedIso: now };
        const newDelta = applyAdj ? adjustment.primaryAdjustment.stepDelta : 0;
        return {
          ...bean,
          dialHistoryByEquipmentId: {
            ...bean.dialHistoryByEquipmentId,
            [activeEquipment.id]: {
              equipmentProfileId: activeEquipment.id,
              lastRecordedSettingLabel: userGrinderSettingLabel.trim() || prior.lastRecordedSettingLabel,
              cumulativeStepOffset: prior.cumulativeStepOffset + newDelta,
              lastUpdatedIso: now,
            },
          },
        };
      });
      return { ...prev, beanProfiles: updatedBeans, brewLogs: [logEntry, ...prev.brewLogs] };
    });
    setScreen('planner');
  };

  const handleExportJson = () => {
    const content = exportStateAsJsonString(appState);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `v60-coffee-intelligence-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const archetypeOptions = Object.values(SEED_V60_KNOWLEDGE_BASE.archetypes).map((a) => ({ id: a.id, name: a.name }));

  return (
    <div className="app-shell">
      <header className="topbar">
        <div><span className="eyebrow">V60 Coffee Intelligence</span><h1>Pour-Over Brew Planner</h1></div>
        <div className="mode-switch">
          <button type="button" className={`chip ${appState.activeMode === 'simple' ? 'chip-active' : ''}`} onClick={() => handleToggleMode('simple')}>Simple</button>
          <button type="button" className={`chip ${appState.activeMode === 'expert' ? 'chip-active' : ''}`} onClick={() => handleToggleMode('expert')}>Expert</button>
        </div>
      </header>
      <main className="container">
        {screen === 'timer' && <GuidedBrewTimer plan={brewPlan} onCompleteBrew={(seconds) => { setCompletedSeconds(seconds); setScreen('review'); }} onCancel={() => setScreen('planner')} />}
        {screen === 'review' && <SensoryReviewModal plan={brewPlan} initialDrawdownSeconds={completedSeconds} onSaveBrewLog={handleSaveBrewLog} onDiscard={() => setScreen('planner')} />}
        
        {screen === 'planner' && appState.activeMode === 'simple' && (
          <SimpleModeView
            doseGrams={doseGrams} roastLevel={roastLevel} freshnessState={freshnessState} tastePreset={tastePreset} userGrinderSettingLabel={userGrinderSettingLabel}
            beans={appState.beanProfiles} equipment={appState.equipmentProfiles} activeBeanId={activeBean?.id} activeEquipmentId={activeEquipment?.id} plan={brewPlan}
            onChangeDose={setDoseGrams} onChangeRoast={setRoastLevel} onChangeFreshness={setFreshnessState} onChangeTastePreset={(preset) => { setTastePreset(preset); setSensoryTargets(sensoryTargetsFromSimplePreset(preset)); }}
            onChangeGrinderSettingLabel={setUserGrinderSettingLabel} onSelectBean={handleSelectBean} onSelectEquipment={handleSelectEquipment} onStartGuidedBrew={() => setScreen('timer')}
          />
        )}
        
        {screen === 'planner' && appState.activeMode === 'expert' && (
          <ExpertModeView
            archetypeId={archetypeId} archetypeOptions={archetypeOptions} doseGrams={doseGrams} customRatioInput={customRatioInput}
            roastLevel={roastLevel} freshnessState={freshnessState} processing={processing} varietalOrOriginNotes={varietalOrOriginNotes}
            filterType={filterType} kettleCapability={kettleCapability} waterProfile={waterProfile} userGrinderSettingLabel={userGrinderSettingLabel}
            sensoryTargets={sensoryTargets} plan={brewPlan} beans={appState.beanProfiles} equipment={appState.equipmentProfiles}
            activeBeanId={activeBean?.id} activeEquipmentId={activeEquipment?.id} experiments={appState.experiments} brewLogs={appState.brewLogs}
            onChangeArchetype={setArchetypeId} onChangeDose={setDoseGrams} onChangeCustomRatioInput={setCustomRatioInput} onChangeRoast={setRoastLevel}
            onChangeFreshness={setFreshnessState} onChangeProcessing={setProcessing} onChangeVarietalNotes={setVarietalOrOriginNotes}
            onChangeFilterType={setFilterType} onChangeKettleCapability={setKettleCapability} onChangeWaterProfile={setWaterProfile}
            onChangeGrinderSettingLabel={setUserGrinderSettingLabel} onChangeSensoryTargets={setSensoryTargets} onSelectBean={handleSelectBean} onSelectEquipment={handleSelectEquipment}
            onAddBeanProfile={(name, roast, proc) => {
              const id = `bean-${Date.now()}`;
              const newBean: BeanProfile = {
                id, name, roastLevel: roast, freshnessState: freshnessState, processing: proc, varietalOrOriginNotes: varietalOrOriginNotes || undefined, dialHistoryByEquipmentId: {},
              };
              setAppState((prev) => ({ ...prev, activeBeanProfileId: id, beanProfiles: [newBean, ...prev.beanProfiles] }));
            }}
            onAddEquipmentProfile={(displayName, grinderModel, scaleLabel, fType, kCap, wProf) => {
              const id = `equip-${Date.now()}`;
              const newEq: EquipmentProfile = {
                id, displayName, grinderModel, userGrinderScaleUnitLabel: scaleLabel, dripperLabel: 'Hario V60', filterType: fType, kettleCapability: kCap, waterProfile: wProf,
              };
              setAppState((prev) => ({ ...prev, activeEquipmentProfileId: id, equipmentProfiles: [...prev.equipmentProfiles, newEq] }));
            }}
            onCreateExperiment={(title, controlledVariable, hypothesis, baselineDescription, variantDescription) => {
              const exp: ControlledExperimentSpec = {
                id: `exp-${Date.now()}`, title, controlledVariable, hypothesis, baselineDescription, variantDescription, createdAtIso: new Date().toISOString(), linkedBrewIds: [], status: 'active',
              };
              setAppState((prev) => ({ ...prev, experiments: [exp, ...prev.experiments] }));
            }}
            onExportJson={handleExportJson}
            onPreviewImportJson={previewStateFromJsonString}
            onApplyImportJson={(parsedState, mode) => {
              const result = applyImportedState(parsedState, appState, mode);
              if (result.ok && result.state) {
                setAppState(result.state);
                return { ok: true };
              }
              return { ok: false, error: result.error };
            }}
            onStartGuidedBrew={() => setScreen('timer')}
          />
        )}
      </main>
    </div>
  );
};
