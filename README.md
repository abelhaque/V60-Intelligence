# V60 Coffee Intelligence - v1.0.7

An evidence-grounded, mobile-first V60 pour-over brewing application. This version explicitly addresses independent verification findings from v1.0.6, completing strict JSON import validation and safeguarding replacement operations.

## What's Restored & Fixed in v1.0.7
* **Strict Backup Structure Validation:** `storageManager.ts` now enforces that a backup state contains all arrays (`beanProfiles`, `equipmentProfiles`, `brewLogs`, `experiments`). If any are missing, the import preview explicitly rejects the JSON, ensuring a partial file cannot erase local logs or experiments during a "Replace" operation.
* **Deep Nested Log Integrity:** `isValidLogArray` has been hardened to verify that `calculatedTotalWaterGrams`, `calculatedBloomWaterGrams`, and `actualDrawdownSeconds` are strictly positive, finite numbers. `calculatedExtractionYieldPercent` is bounded to `[0, 35]` or `null`. Additionally, `recommendedTempRangeC` (a length-2 number tuple), `recommendedGrindBandLabel`, `instruction`, and `confidence` are now completely validated to prevent corrupt logs from crashing the history UI.
* **Preserved UI Modality & Side-Effect Safety:** Confirmed that `previewStateFromJsonString` remains a pure, read-only function that cannot overwrite `localStorage`, and that cancelling the preview discards the staged data cleanly.

## How to Run in Google AI Studio
1. Unzip the project folder (`v60-coffee-intelligence-v1.0.7.zip`) into your environment.
2. Verify that `src/App.tsx` and `src/main.tsx` are present.
3. Run `npm install`.
4. Run `npm run test` to verify calculations and strict validations.
5. Run `npm run dev` to start the application.
