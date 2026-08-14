/**
 * Shared chart theme — single source of truth for the dataviz palette.
 *
 * Brand color mirrors the app's `--color-primary` (#039855) so charts stay
 * on-brand with the rest of the UI. Neutral tokens drive gridlines, axes,
 * labels and tooltips. Centralizing them means every chart (line, and any
 * future bar/donut) reads from one place instead of scattering hex values.
 */
export const chartTheme = {
  /** Primary brand/accent color. Matches app.css `--color-primary`. */
  brand: '#039855',
  /** Horizontal gridlines. */
  grid: '#ececec',
  /** Axis lines (left + bottom frame). */
  axis: '#d4d4d4',
  /** Axis tick / category labels. */
  axisLabel: '#9ca3af',
  /** Hover tooltip background. */
  tooltipBg: '#0f172a',
  /** Secondary tooltip text (label line). */
  tooltipText: '#e2e8f0',
  /** Tooltip value text. */
  tooltipValue: '#ffffff',
  /** Data-point fill (unselected). */
  pointFill: '#ffffff',
} as const;

export type ChartTheme = typeof chartTheme;
