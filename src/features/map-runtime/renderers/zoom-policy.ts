export type CanvasZoomState = {
  ratio: number;
  minRatio: number;
  maxRatio: number;
  dotEnterRatio: number;
  dotExitRatio: number;
};

type ZoomBounds = Pick<CanvasZoomState, "minRatio" | "maxRatio">;
type LodThresholds = Pick<CanvasZoomState, "dotEnterRatio" | "dotExitRatio">;

const HARD_MIN_RATIO = 0.5;
const HARD_MAX_RATIO = 2.4;
const SOFT_MIN_MULTIPLIER = 0.6;
const SOFT_MAX_MULTIPLIER = 1.9;
const DOT_ENTER_FRACTION = 0.58;
const DOT_EXIT_FRACTION = 0.52;
const MIN_SPAN = 0.02;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function deriveZoomBounds(baseRatio: number): ZoomBounds {
  const safeBaseRatio =
    Number.isFinite(baseRatio) && baseRatio > 0 ? baseRatio : 1;

  let minRatio = Math.max(HARD_MIN_RATIO, safeBaseRatio * SOFT_MIN_MULTIPLIER);
  let maxRatio = Math.min(HARD_MAX_RATIO, safeBaseRatio * SOFT_MAX_MULTIPLIER);

  if (maxRatio - minRatio < MIN_SPAN) {
    const center = clamp(safeBaseRatio, HARD_MIN_RATIO, HARD_MAX_RATIO);
    minRatio = clamp(center - MIN_SPAN / 2, HARD_MIN_RATIO, HARD_MAX_RATIO);
    maxRatio = clamp(center + MIN_SPAN / 2, HARD_MIN_RATIO, HARD_MAX_RATIO);

    if (maxRatio - minRatio < MIN_SPAN) {
      minRatio = HARD_MIN_RATIO;
      maxRatio = HARD_MAX_RATIO;
    }
  }

  return { minRatio, maxRatio };
}

export function deriveLodThresholds(
  minRatio: number,
  maxRatio: number
): LodThresholds {
  const safeMin = Math.max(Math.min(minRatio, maxRatio), 0.0001);
  const safeMax = Math.max(maxRatio, safeMin + MIN_SPAN);
  const span = safeMax - safeMin;

  let dotEnterRatio = safeMin + span * DOT_ENTER_FRACTION;
  let dotExitRatio = safeMin + span * DOT_EXIT_FRACTION;

  if (dotExitRatio >= dotEnterRatio) {
    dotExitRatio = safeMin + span * 0.51;
    dotEnterRatio = safeMin + span * 0.59;
  }

  return { dotEnterRatio, dotExitRatio };
}
