import React, { useEffect, useState } from 'react';
import { DeterministicBrewPlan, formatSecondsToMmSs } from '../engine/brewingEngine';

interface GuidedBrewTimerProps {
  plan: DeterministicBrewPlan;
  onCompleteBrew: (actualDrawdownSeconds: number) => void;
  onCancel: () => void;
}

export const GuidedBrewTimer: React.FC<GuidedBrewTimerProps> = ({ plan, onCompleteBrew, onCancel }) => {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [baseTime, setBaseTime] = useState<number>(Date.now());

  useEffect(() => {
    if (!isRunning) return;
    const interval = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - baseTime) / 1000));
    }, 250);
    return () => window.clearInterval(interval);
  }, [isRunning, baseTime]);

  const toggleTimer = () => {
    if (isRunning) {
      setIsRunning(false);
    } else {
      setBaseTime(Date.now() - elapsedSeconds * 1000);
      setIsRunning(true);
    }
  };

  const activeStep = plan.pourSteps.find((step, idx) => {
    const nextStep = plan.pourSteps[idx + 1];
    return nextStep ? elapsedSeconds < nextStep.startSeconds : true;
  }) ?? plan.pourSteps[plan.pourSteps.length - 1];

  const [minTarget, maxTarget] = plan.expectedDrawdownSecondsRange;

  return (
    <section className="card timer-card">
      <div className="row-between">
        <div>
          <span className="eyebrow">Guided Brew Timer</span>
          <h2 className="timer-readout">{formatSecondsToMmSs(elapsedSeconds)}</h2>
        </div>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
      <p className="muted">Target total water: <strong>{plan.calculatedTotalWaterGrams} g</strong></p>
      {activeStep && (
        <div className="milestone-banner">
          <div className="row-between">
            <strong>{activeStep.label}</strong>
            <span className="pill">+{activeStep.incrementalWaterGrams} g &rarr; {activeStep.cumulativeWaterGrams} g</span>
          </div>
          <p className="cue-text">{activeStep.agitationCue}</p>
        </div>
      )}
      <div className="step-list">
        {plan.pourSteps.map((step) => {
          const isCurrent = activeStep?.stepId === step.stepId;
          return (
            <div key={step.stepId} className={`step-row ${isCurrent ? 'step-row-active' : ''}`}>
              <span>{formatSecondsToMmSs(step.startSeconds)}</span>
              <span>{step.label}</span>
              <strong>{step.cumulativeWaterGrams} g</strong>
            </div>
          );
        })}
      </div>
      <div className="button-grid">
        <button type="button" className="btn btn-secondary" onClick={toggleTimer}>
          {isRunning ? 'Pause Timer' : 'Resume Timer'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => { setElapsedSeconds(0); setIsRunning(false); }}>
          Reset to 0:00
        </button>
      </div>
      <button type="button" className="btn btn-primary full-width" onClick={() => { setIsRunning(false); onCompleteBrew(Math.max(1, elapsedSeconds)); }}>
        Drawdown Complete ({formatSecondsToMmSs(Math.max(1, elapsedSeconds))})
      </button>
    </section>
  );
};
