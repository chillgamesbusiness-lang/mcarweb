import { createBulkSelectionState, keepOnlyVisibleSelection, toggleVisibleSelection } from '../lib/bulkSelection'

let passed = 0
let failed = 0

function assert(name: string, ok: boolean, detail = '') {
  if (ok) {
    passed += 1
    console.log(`PASS ${name}`)
  } else {
    failed += 1
    console.error(`FAIL ${name}${detail ? ` - ${detail}` : ''}`)
  }
}

const visible = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222']
const hidden = '33333333-3333-4333-8333-333333333333'

const none = createBulkSelectionState(visible, [])
assert('empty selection is not all selected', none.allVisibleSelected === false)
assert('empty selection is not partial', none.someVisibleSelected === false)

const all = createBulkSelectionState(visible, visible)
assert('all visible selected', all.allVisibleSelected === true)
assert('all visible not partial', all.someVisibleSelected === false)

const partial = createBulkSelectionState(visible, [visible[0]])
assert('partial visible selected', partial.someVisibleSelected === true)
assert('partial visible not all', partial.allVisibleSelected === false)

const selectedAll = toggleVisibleSelection(visible, [], true)
assert('select all returns visible ids only', JSON.stringify(selectedAll) === JSON.stringify(visible), selectedAll.join(','))

const clearedVisible = toggleVisibleSelection(visible, [...visible, hidden], false)
assert('deselect all preserves hidden ids for caller cleanup', JSON.stringify(clearedVisible) === JSON.stringify([hidden]), clearedVisible.join(','))

const cleaned = keepOnlyVisibleSelection(visible, [visible[0], hidden])
assert('filter change drops hidden selected ids', JSON.stringify(cleaned) === JSON.stringify([visible[0]]), cleaned.join(','))

console.log(`Bulk selection tests: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)