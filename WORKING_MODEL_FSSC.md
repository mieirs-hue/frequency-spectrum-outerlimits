# WORKING_MODEL_FSSC

Date: 2026-07-14
Status: Active working model saved from mapping session.

## Core Model Shift
Transition from threshold event rendering to state-space coordinate mapping.

- Old behavior:
  - `if (energy > sensitivity) -> render detection object`
- New behavior:
  - `if (energy_A and energy_B are consistent) -> compute coordinates -> render StatefulVector`

## Required Tracking Behavior
1. Baseline/reference and live target are separated.
2. Orange target is coordinate-driven, not raw energy-driven.
3. Both boards must contribute to confidence before full target lock.
4. Target uses smoothing (EMA) to avoid jumpy motion.
5. When confidence drops, target enters ghost state (fades) instead of disappearing.
6. Tracker keeps path history (footprint trail over last N frames).

## Spatial Fusion Rules
- Board A is fixed on left, Board B on right.
- Trilateration chooses the solution nearest the prior estimate to avoid left/right flips.
- Confidence includes:
  - bilateral consistency
  - signal floor check
  - geometric feasibility

## Visual Requirements
- Display should show:
  - calibrated reference (blue)
  - live target (orange)
  - footprint history trail
  - ghost persistence during temporary signal loss
- Show per-board influence/rulers for operator interpretation.

## Calibration Requirements
- Empty-room baseline capture before run.
- Noise floor stored per board.
- Tracking only promoted to full lock after baseline + threshold on both boards.

## Immediate Next Build
A new project visual implementation exists in:
- `footprint_visual_model/`

That project is the first implementation of this working model.
