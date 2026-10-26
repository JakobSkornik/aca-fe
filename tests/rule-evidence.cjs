// Focused regression checks for branch anchoring, signs, units and reference gates.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, file)
const { ruleEvidence, supportAnchor, contextSeries } = require('../src/helpers/ruleEvidence.ts')
const line = series => ({ start_fen: 'base', san: ['a3', 'a6', 'b3'], fens: ['p1', 'p2', 'p3'], feature_series: series })
const claim = (rule_id, features, extra = {}) => ({ rule_id, features, support_ply: 3, support_fen: 'p3', baseline_fen: 'base', ...extra })

const black = ruleEvidence(claim('king_under_pressure', ['BLACK_KING_DANGER', 'WHITE_KING_TROPISM']),
  line({ BLACK_KING_DANGER: [20, 30, 40, 100], WHITE_KING_TROPISM: [10, 11, 13, 17] }))
assert.deepEqual(black.checks.map(c => [c.value, c.limit, c.passed]), [[80, 60, true], [7, 5, true]])
const white = ruleEvidence(claim('king_under_pressure', ['WHITE_KING_DANGER', 'BLACK_KING_TROPISM']),
  line({ WHITE_KING_DANGER: [-20, -30, -40, -100], BLACK_KING_TROPISM: [-10, -11, -13, -17] }))
assert.deepEqual(white.checks.map(c => c.value), [80, 7])
const incomplete = ruleEvidence(claim('king_under_pressure', ['WHITE_KING_DANGER', 'BLACK_KING_TROPISM']),
  line({ WHITE_KING_DANGER: [-20, -30, -40, -100] }))
assert.equal(incomplete.checks[1].passed, null)

const mobility = ruleEvidence(claim('activity_improved', ['BLACK_PIECE_ACTIVITY']),
  line({ BLACK_PIECE_ACTIVITY: [-10, -12, -15, -17], MATERIAL_BALANCE: [0, 0, 0, 100] }))
assert.equal(mobility.checks[0].unit, 'squares')
assert.equal(mobility.checks[0].value, 7)
assert.equal(mobility.checks[1].passed, false) // strict <100, not <=100

const pawn = ruleEvidence(claim('pawn_structure_improved', ['BLACK_PAWN_DOUBLED', 'BLACK_PAWN_ISOLATED', 'BLACK_PAWN_BACKWARD', 'EVALUATE_PAWNS']),
  line({ EVALUATE_PAWNS: [0, 0, -4, -12], BLACK_PAWN_DOUBLED: [-2, -2, -2, -2], BLACK_PAWN_ISOLATED: [-2, -2, -2, -1], BLACK_PAWN_BACKWARD: [0, 0, 0, 0] }))
assert.deepEqual(pawn.checks.map(c => c.value), [12, 1])
assert.ok(pawn.checks.every(c => c.passed))

const anchorLine = { ...line({ WHITE_SPACE: [0, 12, 24, 50] }), fens: ['p1', 'p2', 'p1'] }
const anchored = claim('space_gained', ['WHITE_SPACE'], { support_ply: 1, support_fen: 'p1' })
assert.equal(supportAnchor(anchored, anchorLine), 1)
assert.equal(ruleEvidence(anchored, anchorLine).checks[0].value, 12) // not leaf=50
assert.equal(supportAnchor({ ...anchored, baseline_fen: 'wrong' }, anchorLine), null)
assert.equal(supportAnchor({ ...anchored, support_ply: 2 }, anchorLine), null)
assert.equal(contextSeries('WHITE_SPACE', line({ WHITE_SPACE: [1, 2] })), undefined)
assert.deepEqual(contextSeries('WHITE_SPACE', line({ WHITE_SPACE: [1, null, 3, 4] })), [0, null, 2, 3])

const doubled = ruleEvidence(claim('doubled_pawns_resolved', ['WHITE_PAWN_DOUBLED'], { flag_note: '2 -> 1' }), line({}))
assert.equal(doubled.checks[0].limit, 1) // not unused doubled_pawns=12 (ranking scale)
assert.equal(doubled.checks[0].value, 1)
const capture = ruleEvidence(claim('legal_capture', ['TACTICAL_CAPTURE']), line({}))
assert.equal(capture.kind, 'board')
assert.equal(capture.checks.length, 0)
assert.equal(ruleEvidence(claim('unrecognized_rule', ['WHITE_SPACE']), anchorLine).kind, 'unavailable')
console.log('Rule evidence: signs, compound gates, missing data, anchors, units and board rules passed.')
