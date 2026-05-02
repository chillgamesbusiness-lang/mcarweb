import {
  buildMutationResult,
  isAppointmentStatus,
  isFinanceStatus,
  isLeadStatus,
  normaliseBulkIds,
} from '../lib/adminDbMutations'

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

const validA = '11111111-1111-4111-8111-111111111111'
const validB = '22222222-2222-4222-8222-222222222222'
const ids = normaliseBulkIds([validA, validA, 'bad-id', validB])

assert('valid bulk ids are deduped', JSON.stringify(ids.validIds) === JSON.stringify([validA, validB]), ids.validIds.join(','))
assert('invalid bulk ids are reported', ids.failures.length === 1 && ids.failures[0].code === 'invalid_id')
assert('lead status accepts known value', isLeadStatus('appointment_booked'))
assert('lead status rejects unknown value', !isLeadStatus('purchased'))
assert('finance status accepts known value', isFinanceStatus('finance_found'))
assert('finance status rejects unknown value', !isFinanceStatus('unknown'))
assert('appointment status accepts known value', isAppointmentStatus('no_show'))
assert('appointment status rejects unknown value', !isAppointmentStatus('deleted'))

const result = buildMutationResult('Unit mutation', [validA], [validB], [{ id: 'bad-id', code: 'invalid_id', message: 'Invalid' }])
assert('mutation result fails on partial failure', result.success === false)
assert('mutation result includes affected count', result.affectedCount === 1)
assert('mutation result includes skipped ids', result.skippedIds.length === 1 && result.skippedIds[0] === validB)

console.log(`Admin mutation tests: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)