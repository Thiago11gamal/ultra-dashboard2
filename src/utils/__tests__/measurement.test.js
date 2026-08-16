import { describe, it, expect } from "vitest";
import {
  safeDomain,
  normalizeScoreValue,
  sanitizeSimuladoRow,
  mergeQuestionResult,
  toProb01,
  toProbPct,
  resolveTargetPoints,
  deduplicateSimulados,
  latestByDate,
  pointsToPct,
  pctToPoints
} from "../measurement.js";

describe("measurement", () => {
  it("cria domínio seguro", () => {
    const d = safeDomain(1000, 200);

    expect(d.min).toBe(200);
    expect(d.max).toBe(1000);
    expect(d.range).toBe(800);
  });

  it("converte pct para points com minScore", () => {
    expect(pctToPoints(50, 1000, 200)).toBe(600);
  });

  it("converte points para pct com minScore", () => {
    expect(pointsToPct(600, 1000, 200)).toBe(50);
  });

  it("normaliza percentual explícito", () => {
    const norm = normalizeScoreValue(
      { score: 80, isPercentage: true },
      1000,
      0
    );

    expect(norm.points).toBe(800);
    expect(norm.pct).toBe(80);
  });

  it("total/correct manda mais que score", () => {
    const norm = normalizeScoreValue(
      { total: 10, correct: 8, score: 10 },
      1000,
      0
    );

    expect(norm.points).toBe(800);
    expect(norm.pct).toBe(80);
  });

  it("sanitize zera correct quando total é zero", () => {
    const row = sanitizeSimuladoRow(
      { total: 0, correct: 5 },
      100
    );

    expect(row.total).toBe(0);
    expect(row.correct).toBe(0);
  });

  it("sanitize clamp correct > total", () => {
    const row = sanitizeSimuladoRow(
      { total: 10, correct: 20 },
      100
    );

    expect(row.correct).toBe(10);
    expect(row.total).toBe(10);
  });

  it("mergeQuestionResult nunca deixa correct maior que total", () => {
    const row = mergeQuestionResult(
      { total: 10, correct: 8 },
      { total: 5, correct: 10 },
      100
    );

    expect(row.total).toBe(15);
    expect(row.correct).toBeLessThanOrEqual(15);
  });

  it("probabilidade aceita 0-1 e 0-100", () => {
    expect(toProb01(0.7)).toBe(0.7);
    expect(toProb01(70)).toBe(0.7);
    expect(toProb01(70, "pct")).toBe(0.7);
    expect(toProbPct(0.7)).toBe(70);
  });

  it("resolve meta percentual para pontos", () => {
    const domain = safeDomain(1000, 0);
    expect(resolveTargetPoints(70, domain, "pct")).toBe(700);
  });

  it("deduplicação preserva matérias diferentes na mesma data", () => {
    const rows = [
      {
        subject: "Português",
        date: "2026-01-01",
        score: 80,
        isPercentage: true
      },
      {
        subject: "Matemática",
        date: "2026-01-01",
        score: 80,
        isPercentage: true
      }
    ];

    const unique = deduplicateSimulados(rows, {
      maxScore: 1000,
      minScore: 0,
      getDateKey: (d) => String(d).slice(0, 10)
    });

    expect(unique).toHaveLength(2);
  });

  it("latestByDate retorna o mais recente por data real", () => {
    const rows = [
      { date: "2026-01-01", id: "a" },
      { date: "2026-02-01", id: "b" },
      { date: "2026-01-15", id: "c" }
    ];

    const latest = latestByDate(rows);
    expect(latest.id).toBe("b");
  });
});
