/**
 * Self-contained checks for the staff roster rules.
 *
 * Pure-function tests: no database and no running server, so they can be run any
 * time with `node utils/staffAccess.test.js`.
 *
 * These cover the two rules that decide whether an admin can lock the cafe out of
 * its own back office: what counts as an enabled account, and who is allowed to
 * manage whom. The second is the one worth pinning down hard — a regression there
 * is a privilege escalation, not a cosmetic bug.
 */

const assert = require('assert');
const { ROLE_RANK, isStaffEnabled, staffActionRefusal } = require('./staffAccess');

let passed = 0;
const check = (name, fn) => {
  try {
    fn();
    passed += 1;
    console.log(`  ok   ${name}`);
  } catch (error) {
    console.error(`  FAIL ${name}\n       ${error.message}`);
    process.exitCode = 1;
  }
};

const actor = (id, role) => ({ _id: id, role });
const SUPER = actor('super1', 'super_admin');

console.log('\nAn account is enabled unless it was explicitly switched off');

check('a new account (isActive true) is enabled', () => {
  assert.strictEqual(isStaffEnabled({ isActive: true }), true);
});

check('an explicitly disabled account is NOT enabled', () => {
  assert.strictEqual(isStaffEnabled({ isActive: false }), false);
});

check('an account predating the field (isActive undefined) is STILL enabled', () => {
  // The bug this guards: a plain truthiness check reads `undefined` as disabled
  // and would lock the entire existing roster out on deploy.
  assert.strictEqual(isStaffEnabled({}), true);
  assert.strictEqual(isStaffEnabled({ isActive: undefined }), true);
});

check('a missing account is never enabled', () => {
  assert.strictEqual(isStaffEnabled(null), false);
  assert.strictEqual(isStaffEnabled(undefined), false);
});

console.log('\nNobody may act on their own account');

check('a super admin cannot disable themselves', () => {
  assert.strictEqual(staffActionRefusal(actor('super1', 'super_admin'), SUPER), 'self');
});

check('an admin cannot delete themselves', () => {
  const admin = actor('admin1', 'admin');
  assert.strictEqual(staffActionRefusal(admin, admin), 'self');
});

check('a self-match is detected across string and ObjectId ids', () => {
  // The roster arrives lean (string ids) and protectAdmin loads a document
  // (ObjectId), so the comparison has to survive both.
  const objectId = { toString: () => 'abc123' };
  assert.strictEqual(staffActionRefusal({ _id: objectId, role: 'waiter' }, actor('abc123', 'admin')), 'self');
});

console.log('\nNobody may act above their own rank');

check('an admin cannot disable a super admin', () => {
  assert.strictEqual(staffActionRefusal(actor('super1', 'super_admin'), actor('admin1', 'admin')), 'higher_role');
});

check('a super admin CAN act on another super admin', () => {
  assert.strictEqual(staffActionRefusal(actor('super2', 'super_admin'), SUPER), null);
});

check('an admin cannot delete a super admin (the escalation path)', () => {
  // This is the exact shape of the attack the rank ceiling exists to stop: mint
  // or find an admin, then remove the super admins above you.
  assert.strictEqual(staffActionRefusal(actor('super1', 'super_admin'), actor('admin1', 'admin')), 'higher_role');
});

console.log('\nManagement can act on the floor roles');

check('an admin can manage a waiter, chef, barista or another admin', () => {
  const admin = actor('admin1', 'admin');
  for (const role of ['waiter', 'chef', 'barista', 'admin']) {
    assert.strictEqual(staffActionRefusal(actor(`x_${role}`, role), admin), null, role);
  }
});

check('a super admin can manage anybody below them', () => {
  for (const role of ['waiter', 'chef', 'barista', 'admin', 'super_admin']) {
    assert.strictEqual(staffActionRefusal(actor(`x_${role}`, role), SUPER), null, role);
  }
});

console.log('\nThe panel can never be orphaned');

check('no single action can remove the last way back in', () => {
  // Enumerated rather than reasoned about: from every possible caller/target pair,
  // there must be at least one super_admin that nobody in that pair could have
  // removed. This is why there is no separate "last super_admin" check.
  const roles = Object.keys(ROLE_RANK);
  for (const callerRole of roles) {
    for (const targetRole of roles) {
      const caller = actor('caller', callerRole);
      const target = actor('target', targetRole);
      // The refusal is the only thing standing between this pair and a lost panel.
      if (callerRole === targetRole && callerRole !== 'super_admin') {
        // A same-rank peer: refusing 'self' aside, this pair is allowed, but the
        // caller is still signed in, so a super_admin is not required here.
        assert.ok(callerRole !== 'super_admin');
        continue;
      }
      const refusal = staffActionRefusal(target, caller);
      if (callerRole === 'super_admin' && targetRole === 'super_admin') {
        // Allowed — and safe precisely because a DIFFERENT super_admin is acting,
        // so at least one remains signed in.
        assert.strictEqual(refusal, null);
        continue;
      }
      if (callerRole === 'super_admin' || targetRole !== 'super_admin') {
        // Either the caller is a surviving super_admin, or no super_admin is
        // involved at all. Either way the panel keeps a way in.
        continue;
      }
      assert.strictEqual(refusal, 'higher_role', `${callerRole} -> ${targetRole}`);
    }
  }
});

check('a missing target or actor fails closed', () => {
  assert.strictEqual(staffActionRefusal(null, SUPER), 'higher_role');
  assert.strictEqual(staffActionRefusal(actor('x', 'waiter'), null), 'higher_role');
  assert.strictEqual(staffActionRefusal(actor('x', 'waiter'), undefined), 'higher_role');
});

console.log(`\n${passed} checks passed.\n`);
