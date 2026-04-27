import { londonLocalToUtc, validateBookingSlot } from '../lib/bookingSlots'

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

const now = new Date('2026-04-27T08:00:00.000Z')

assert('invalid date rejected', !validateBookingSlot('not-a-date', now).valid)
assert('past slot rejected', !validateBookingSlot('2026-04-27T07:00:00.000Z', now).valid)
assert('weekend slot rejected', !validateBookingSlot(londonLocalToUtc(2026, 5, 2, 10).toISOString(), now).valid)
assert('midnight crafted slot rejected', !validateBookingSlot(londonLocalToUtc(2026, 4, 28, 0).toISOString(), now).valid)
assert('non-hour interval rejected', !validateBookingSlot(londonLocalToUtc(2026, 4, 28, 10, 30).toISOString(), now).valid)
assert('valid London business slot accepted', validateBookingSlot(londonLocalToUtc(2026, 4, 28, 10).toISOString(), now).valid)

const afterBstStart = londonLocalToUtc(2026, 3, 30, 10)
assert('BST slot stores as UTC 09:00', afterBstStart.toISOString() === '2026-03-30T09:00:00.000Z', afterBstStart.toISOString())
assert('BST slot accepted', validateBookingSlot(afterBstStart.toISOString(), new Date('2026-03-27T10:00:00.000Z')).valid)

console.log(`Booking slot tests: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)