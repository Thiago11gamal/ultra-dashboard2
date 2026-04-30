# Calibration Governance Playbook

## Thresholds

- **Critical Brier threshold**: `0.28`
- **High penalty threshold**: `0.20`
- **Alert cooldown**: `12h` per category

## Retention

- `calibrationHistoryByCategory`: last `60` events per category and last `45` days
- `calibrationAuditLog`: last `500` events overall in contest state
- local telemetry mirror (`coach_calibration_events_v1`): last `1000` events

## Operational Rules

1. If `avgBrier >= 0.28` for a category, show warning toast and mark category as degraded.
2. If `calibrationPenalty >= 0.20`, emit `console.warn` + telemetry event.
3. Use `adaptiveCalibrationEnabled` flag to turn adaptive calibration off for troubleshooting/A-B checks.
