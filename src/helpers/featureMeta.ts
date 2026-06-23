/**
 * Human-readable labels, units and explanations for the positional features.
 * The data is generated from the backend feature catalog (the single source of
 * truth) — see featureMeta.generated.ts and scripts/export_feature_meta.py.
 * Feature keys are either a global term (e.g. MATERIAL_BALANCE) or side-prefixed
 * (WHITE_/BLACK_) base concepts.
 */

import { FEATURE_META, type FeatureUnit } from './featureMeta.generated'

function titleCase(base: string): string {
  return base
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function baseName(name: string): string {
  return name.replace(/^WHITE_/, '').replace(/^BLACK_/, '')
}

/** Readable chart title, e.g. `WHITE_KING_DANGER` -> `W King Danger`. */
export function featureLabel(name: string): string {
  const meta = FEATURE_META[name]
  if (meta) return meta.label
  const side = name.startsWith('WHITE_') ? 'W ' : name.startsWith('BLACK_') ? 'B ' : ''
  const base = baseName(name)
  return side + (FEATURE_META[base]?.label ?? titleCase(base))
}

/** One-line explanation for a feature (for hover popups), or '' if unknown. */
export function featureDescription(name: string): string {
  return FEATURE_META[name]?.description ?? FEATURE_META[baseName(name)]?.description ?? ''
}

/** Natural unit for a feature ('cp' shows as pawns; others as integer counts). */
export function featureUnit(name: string): FeatureUnit {
  return (FEATURE_META[name] ?? FEATURE_META[baseName(name)])?.unit ?? 'cp'
}

const UNIT_SUFFIX: Record<FeatureUnit, string> = {
  cp: '',
  squares: ' sq',
  pawns: ' pawns',
  count: '',
  flag: '',
}

/** Short suffix shown after an integer-count delta (empty for centipawns). */
export function featureUnitSuffix(unit: FeatureUnit): string {
  return UNIT_SUFFIX[unit]
}

/** Provenance of a feature's definition: a Stockfish predicate, or our own. */
export function featureSource(name: string): 'stockfish' | 'custom' | undefined {
  return (FEATURE_META[name] ?? FEATURE_META[baseName(name)])?.source
}
