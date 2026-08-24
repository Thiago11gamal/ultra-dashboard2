/**
 * modelHealth.js
 *
 * Lote 9 — Model health scoring para o Coach.
 *
 * Combina:
 * - drift de calibração;
 * - drift de probabilidade;
 * - drift de nota;
 * - drift de volatilidade;
 * - qualidade de calibração atual;
 * - volume amostral;
 * - governança de flags experimentais.
 */

import {
  detectScoreDrift,
  detectVolatilityDrift,
  detectCalibrationDrift,
  detectProbabilityCalibrationDrift,
} from './driftMonitor.js';

import {
  computeCalibrationDiagnostics,
} from '../../utils/calibration.js';

const HEALTH_STORAGE_KEY = 'coach_model_health_v1';
const HEALTH_STORAGE_MAX = 100;

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function getStorage() {
  try {
    return globalThis?.localStorage || null;
  } catch {
    return null;
  }
}

function createAlert({
  id,
  type,
  severity,
  message,
  metric = null,
}) {
  return {
    id,
    type,
    severity,
    message,
    metric,
    createdAt: Date.now(),
  };
}

/**
 * Avalia a saúde matemática do modelo.
 */
export function evaluateModelHealth(input = {}, options = {}) {
  const alerts = [];
  const metrics = {};

  let healthScore = 100;

  const calibrationEvents = Array.isArray(input.calibrationEvents)
    ? input.calibrationEvents
    : [];

  const probabilityPairs = Array.isArray(input.probabilityPairs)
    ? input.probabilityPairs
    : [];

  const scores = Array.isArray(input.scores) ? input.scores : [];
  const volatilities = Array.isArray(input.volatilities)
    ? input.volatilities
    : [];

  const features = input.features && typeof input.features === 'object'
    ? input.features
    : {};

  // ==================== CALIBRATION DRIFT ====================
  const calibrationDrift = detectCalibrationDrift(
    calibrationEvents,
    options.calibration || {}
  );

  metrics.calibrationDrift = calibrationDrift;

  if (calibrationDrift?.hasDrift) {
    const severity = calibrationDrift.worstSeverity;

    if (severity === 'high') {
      healthScore -= 25;

      alerts.push(
        createAlert({
          id: 'calibration_drift_high',
          type: 'calibration_drift',
          severity: 'high',
          message:
            'A calibração do modelo degradou significativamente nas amostras recentes.',
          metric: calibrationDrift.worstMetric,
        })
      );
    } else if (severity === 'medium') {
      healthScore -= 12;

      alerts.push(
        createAlert({
          id: 'calibration_drift_medium',
          type: 'calibration_drift',
          severity: 'medium',
          message:
            'A calibração do modelo apresentou degradação moderada recentemente.',
          metric: calibrationDrift.worstMetric,
        })
      );
    } else if (severity === 'low') {
      healthScore -= 5;

      alerts.push(
        createAlert({
          id: 'calibration_drift_low',
          type: 'calibration_drift',
          severity: 'low',
          message: 'Leve degradação de calibração detectada.',
          metric: calibrationDrift.worstMetric,
        })
      );
    }
  }

  // ==================== PROBABILITY CALIBRATION DRIFT ====================
  const probabilityCalibrationDrift = detectProbabilityCalibrationDrift(
    probabilityPairs,
    options.probabilityPairs || {}
  );

  metrics.probabilityCalibrationDrift = probabilityCalibrationDrift;

  if (probabilityCalibrationDrift?.isBadDrift) {
    if (probabilityCalibrationDrift.severity === 'high') {
      healthScore -= 20;

      alerts.push(
        createAlert({
          id: 'probability_calibration_drift_high',
          type: 'probability_calibration_drift',
          severity: 'high',
          message:
            'As probabilidades previstas estão perdendo confiabilidade recentemente.',
          metric: 'probability_pairs',
        })
      );
    } else if (probabilityCalibrationDrift.severity === 'medium') {
      healthScore -= 10;

      alerts.push(
        createAlert({
          id: 'probability_calibration_drift_medium',
          type: 'probability_calibration_drift',
          severity: 'medium',
          message:
            'Há sinais de degradação na confiabilidade das probabilidades previstas.',
          metric: 'probability_pairs',
        })
      );
    } else {
      healthScore -= 4;
    }
  }

  // ==================== CURRENT CALIBRATION QUALITY ====================
  if (probabilityPairs.length >= 5) {
    const diagnostics = computeCalibrationDiagnostics(probabilityPairs, {
      bins: options.bins ?? 6,
    });

    metrics.currentCalibration = {
      count: probabilityPairs.length,
      ece: Number(diagnostics.ece.toFixed(6)),
      mce: Number(diagnostics.mce.toFixed(6)),
      reliability: diagnostics.reliability || [],
      brierDecomposition: diagnostics.brierDecomposition || null,
    };

    if (diagnostics.ece > 0.15) {
      healthScore -= 15;

      alerts.push(
        createAlert({
          id: 'current_calibration Poor',
          type: 'current_calibration',
          severity: 'high',
          message: 'O erro de calibração atual está alto.',
          metric: 'ece',
        })
      );
    } else if (diagnostics.ece > 0.10) {
      healthScore -= 8;

      alerts.push(
        createAlert({
          id: 'current_calibration_moderate',
          type: 'current_calibration',
          severity: 'medium',
          message: 'O erro de calibração atual está moderado.',
          metric: 'ece',
        })
      );
    }
  } else {
    metrics.currentCalibration = {
      count: probabilityPairs.length,
      status: 'insufficient_data',
    };
  }

  // ==================== SCORE DRIFT ====================
  const scoreDrift = detectScoreDrift(scores, options.score || {});
  metrics.scoreDrift = scoreDrift;

  if (scoreDrift?.isBadDrift) {
    if (scoreDrift.severity === 'high') {
      healthScore -= 12;

      alerts.push(
        createAlert({
          id: 'score_drift_high',
          type: 'performance_drift',
          severity: 'high',
          message: 'Queda relevante de desempenho detectada recentemente.',
          metric: 'score',
        })
      );
    } else if (scoreDrift.severity === 'medium') {
      healthScore -= 6;

      alerts.push(
        createAlert({
          id: 'score_drift_medium',
          type: 'performance_drift',
          severity: 'medium',
          message: 'Queda moderada de desempenho detectada recentemente.',
          metric: 'score',
        })
      );
    }
  }

  // ==================== VOLATILITY DRIFT ====================
  const volatilityDrift = detectVolatilityDrift(
    volatilities,
    options.volatility || {}
  );

  metrics.volatilityDrift = volatilityDrift;

  if (volatilityDrift?.isBadDrift) {
    if (volatilityDrift.severity === 'high') {
      healthScore -= 10;

      alerts.push(
        createAlert({
          id: 'volatility_drift_high',
          type: 'volatility_drift',
          severity: 'high',
          message: 'A volatilidade do desempenho aumentou significativamente.',
          metric: 'volatility',
        })
      );
    } else if (volatilityDrift.severity === 'medium') {
      healthScore -= 5;

      alerts.push(
        createAlert({
          id: 'volatility_drift_medium',
          type: 'volatility_drift',
          severity: 'medium',
          message: 'A volatilidade do desempenho aumentou moderadamente.',
          metric: 'volatility',
        })
      );
    }
  }

  // ==================== SAMPLE ADEQUACY ====================
  const sampleSize = Number.isFinite(Number(input.sampleSize))
    ? Number(input.sampleSize)
    : scores.length;

  metrics.sampleSize = sampleSize;

  if (sampleSize < 5) {
    healthScore -= 15;

    alerts.push(
      createAlert({
        id: 'low_sample_size',
        type: 'data_adequacy',
        severity: 'high',
        message:
          'Há poucos dados para confiar nas projeções atuais. O sistema deve operar com mais conservadorismo.',
        metric: 'sample_size',
      })
    );
  } else if (sampleSize < 10) {
    healthScore -= 7;

    alerts.push(
      createAlert({
        id: 'moderate_sample_size',
        type: 'data_adequacy',
        severity: 'medium',
        message:
          'A quantidade de dados ainda é moderada. Projeções devem ser interpretadas com cautela.',
        metric: 'sample_size',
      })
    );
  }

  // ==================== FLAG GOVERNANCE ====================
  const experimentalFlags = [
    'useStateSpace',
    'useDynamicVolatility',
    'usePosteriorMonteCarlo',
    'useBayesianTopics',
    'useDecisionUtility',
    'useBanditPlanner',
    'useKnowledgeGraph',
    'useAdvancedFsrs',
  ];

  const activeExperimentalFlags = experimentalFlags.filter(
    (flag) => features[flag] === true
  );

  metrics.activeExperimentalFlags = activeExperimentalFlags;

  if (activeExperimentalFlags.length > 4) {
    healthScore -= 6;

    alerts.push(
      createAlert({
        id: 'too_many_experimental_flags',
        type: 'flag_governance',
        severity: 'medium',
        message:
          'Muitas flags experimentais estão ativas simultaneamente. Isso dificulta atribuir causa a mudanças de desempenho.',
        metric: 'experimental_flags',
      })
    );
  }

  // ==================== TELEMETRY STALENESS ====================
  const lastTelemetryTimestamp = Number(input.lastTelemetryTimestamp) || 0;

  if (lastTelemetryTimestamp > 0) {
    const daysSinceTelemetry =
      (Date.now() - lastTelemetryTimestamp) / 86400000;

    metrics.daysSinceLastTelemetry = Number(daysSinceTelemetry.toFixed(2));

    if (daysSinceTelemetry > 14) {
      healthScore -= 5;

      alerts.push(
        createAlert({
          id: 'stale_telemetry',
          type: 'telemetry',
          severity: 'low',
          message:
            'A telemetria de calibração está antiga. A avaliação de saúde pode estar defasada.',
          metric: 'telemetry_age',
        })
      );
    }
  } else {
    metrics.daysSinceLastTelemetry = null;
  }

  healthScore = clampFinite(healthScore, 0, 100, 100);

  let status = 'healthy';

  if (healthScore < 60) {
    status = 'critical';
  } else if (healthScore < 80) {
    status = 'degraded';
  }

  const recommendations = [];

  if (status === 'critical') {
    recommendations.push(
      'Reduza flags experimentais e volte para uma configuração mais conservadora.'
    );
  }

  if (alerts.some((alert) => alert.type === 'calibration_drift')) {
    recommendations.push(
      'Revise os thresholds de calibração e aumente o shrinkage de probabilidade.'
    );
  }

  if (alerts.some((alert) => alert.type === 'volatility_drift')) {
    recommendations.push(
      'Aumente a suavização de volatilidade e reduza a confiança em tendências recentes.'
    );
  }

  if (alerts.some((alert) => alert.type === 'performance_drift')) {
    recommendations.push(
      'Verifique se houve mudança real de nível do aluno ou apenas ruído amostral.'
    );
  }

  if (alerts.some((alert) => alert.type === 'data_adequacy')) {
    recommendations.push(
      'Evite decisões agressivas enquanto houver poucos dados.'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      'O sistema está estável. Mantenha monitoramento contínuo.'
    );
  }

  return {
    healthScore: Number(healthScore.toFixed(2)),
    status,
    generatedAt: Date.now(),
    alerts,
    metrics,
    recommendations,
  };
}

/**
 * Gera dados prontos para dashboard.
 */
export function generateHealthDashboard(health = {}) {
  if (!health || typeof health !== 'object') return null;

  const metrics = health.metrics || {};
  const alerts = health.alerts || [];

  return {
    generatedAt: health.generatedAt || Date.now(),
    healthScore: health.healthScore ?? null,
    status: health.status ?? 'unknown',
    cards: [
      {
        id: 'health_score',
        label: 'Health Score',
        value: health.healthScore ?? null,
        goodDirection: 'higher',
      },
      {
        id: 'sample_size',
        label: 'Amostras',
        value: metrics.sampleSize ?? null,
        goodDirection: 'higher',
      },
      {
        id: 'calibration_drift',
        label: 'Drift de Calibração',
        value: metrics.calibrationDrift?.worstSeverity || 'none',
        goodDirection: 'lower',
      },
      {
        id: 'score_drift',
        label: 'Drift de Nota',
        value: metrics.scoreDrift?.severity || 'none',
        goodDirection: 'lower',
      },
      {
        id: 'volatility_drift',
        label: 'Drift de Volatilidade',
        value: metrics.volatilityDrift?.severity || 'none',
        goodDirection: 'lower',
      },
      {
        id: 'experimental_flags',
        label: 'Flags Experimentais',
        value: Array.isArray(metrics.activeExperimentalFlags)
          ? metrics.activeExperimentalFlags.length
          : 0,
        goodDirection: 'lower',
      },
    ],
    alerts,
    recommendations: health.recommendations || [],
    metrics,
  };
}

/**
 * Salva snapshot de saúde.
 */
export function saveModelHealthSnapshot(snapshot) {
  const storage = getStorage();
  if (!storage) return false;

  try {
    const raw = storage.getItem(HEALTH_STORAGE_KEY);
    const parsed = JSON.parse(raw || '[]');
    const current = Array.isArray(parsed) ? parsed : [];

    const next = [...current, snapshot]
      .filter(Boolean)
      .slice(-HEALTH_STORAGE_MAX);

    storage.setItem(HEALTH_STORAGE_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

/**
 * Carrega snapshots de saúde.
 */
export function loadModelHealthSnapshots() {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(HEALTH_STORAGE_KEY);
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Limpa snapshots de saúde.
 */
export function clearModelHealthSnapshots() {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(HEALTH_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export default {
  evaluateModelHealth,
  generateHealthDashboard,
  saveModelHealthSnapshot,
  loadModelHealthSnapshots,
  clearModelHealthSnapshots,
};

