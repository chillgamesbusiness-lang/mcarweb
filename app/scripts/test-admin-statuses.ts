import { VALID_STATUS_TRANSITIONS, type LeadStatus } from '../lib/types'

const expected: LeadStatus[] = [
  'new',
  'verified',
  'contacted',
  'appointment_booked',
  'inspected',
  'offer_made',
  'won',
  'lost',
  'expired',
  'no_response',
]

let failed = 0

function assert(name: string, ok: boolean, detail = '') {
  if (ok) {
    console.log(`PASS ${name}`)
  } else {
    failed += 1
    console.error(`FAIL ${name}${detail ? ` - ${detail}` : ''}`)
  }
}

const actual = Object.keys(VALID_STATUS_TRANSITIONS).sort()
assert('status set matches handoff lifecycle', JSON.stringify(actual) === JSON.stringify([...expected].sort()), actual.join(', '))

const expectedSet = new Set(expected)
for (const [from, targets] of Object.entries(VALID_STATUS_TRANSITIONS)) {
  assert(`${from} is known`, expectedSet.has(from as LeadStatus))
  for (const target of targets) {
    assert(`${from} -> ${target} target is known`, expectedSet.has(target))
  }
}

for (const legacy of ['offer_approved', 'offered', 'purchased', 'rejected']) {
  assert(`legacy status ${legacy} is not in UI lifecycle`, !actual.includes(legacy))
}

if (failed > 0) process.exit(1)
console.log('Admin status lifecycle tests passed.')