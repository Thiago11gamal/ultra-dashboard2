import { describe, it, expect } from 'vitest';
import { isSystemAlertTask, cleanCoachTags, parseCoachTask } from '../coachText.js';

describe('coachText — especificidade de alertas (regressão C1)', () => {
  it('não classifica tarefa comum como alerta de sistema', () => {
    expect(isSystemAlertTask('Matemática: [Revisão de Frações]')).toBe(false);
    expect(isSystemAlertTask('Estudar leitura e interpretação')).toBe(false);
  });

  it('classifica alertas reais corretamente', () => {
    expect(isSystemAlertTask('Matemática: [ALERTA MESTRE] 🚨 VETOR CRÍTICO')).toBe(true);
    expect(isSystemAlertTask('História: [STATUS] Revisão')).toBe(true);
  });

  it('cleanCoachTags remove tags sem deletar letras do título', () => {
    expect(cleanCoachTags('[PROTOCOLO PRIORITÁRIO] Matemática: Frações'))
      .toBe('Matemática: Frações');
  });

  it('parseCoachTask extrai tópico entre colchetes', () => {
    const parsed = parseCoachTask({ text: 'Matemática: [Frações] Resolver listas' }, []);
    expect(parsed.topicRaw).toBe('Frações');
    expect(parsed.subjectRaw).toBe('Matemática');
  });

  it('RX_NOISE_ACTION não destrói substrings (regressão C2)', () => {
    const parsed = parseCoachTask({ text: 'Direito: [Inovação Legislativa]' }, []);
    expect(parsed.topic).toContain('Inovação');
  });
});
