/**
 * Single source of truth for who may manage whom on the staff roster.
 *
 * Enabling, disabling and deleting a staff account is the most dangerous thing an
 * admin can do in this app: the roster gates everything else, and a mistake here
 * can lock the cafe out of its own back office. So the rules live here, free of
 * Mongoose, Express and sockets, and every caller asks this module rather than
 * re-deriving the answer.
 *
 * Like utils/orderStatus.js and utils/tableAssignment.js, nothing in this file
 * trusts a value supplied by the client. Roles are read from the Admin documents
 * that the auth layer already loaded from the database.
 */

/**
 * Roles ranked by the authority they carry.
 *
 * Ranking rather than a flat list is what stops privilege escalation: a caller may
 * only ever act on accounts at or below their own rank, so an 'admin' can manage
 * waiters, chefs, baristas and other admins, but never a 'super_admin'. The
 * floor roles share rank 1 because none of them manages the roster at all — the
 * route gate is what keeps them off it.
 */
const ROLE_RANK = { waiter: 1, chef: 1, barista: 1, admin: 2, super_admin: 3 };

/**
 * Is this account allowed to sign in and keep using an existing session?
 *
 * Written as `!== false` on purpose. The `isActive` field defaults to true, but a
 * default only applies to documents created from now on — every staff account that
 * predates the field reads back as `undefined`. A plain truthiness check would
 * treat those as disabled and lock the entire existing roster out of the admin
 * panel the moment this ships. Only an explicit `false` disables an account.
 *
 * @param {object|null} admin an Admin document, lean object, or null
 * @returns {boolean}
 */
const isStaffEnabled = (admin) => !!admin && admin.isActive !== false;

/**
 * Why `actor` may not act on `target`'s account, or null when they may.
 *
 * Returns a reason rather than a response so this module stays free of HTTP: the
 * controller turns the reason into a 403 with a message that fits the action.
 *
 * Two refusals, and both are load-bearing:
 *
 *   'self'       A caller can never act on their own account. A stray click on the
 *                wrong table row would otherwise sign the operator out mid-shift,
 *                and there is no undo — a disabled account looks exactly like a
 *                deleted one until somebody tries to sign in.
 *
 *   'higher_role' A caller can never act above their own rank. Without this an
 *                'admin' could disable or delete every 'super_admin' and take the
 *                panel for themselves. This mirrors the check that already stops
 *                an 'admin' from *creating* a 'super_admin'; without both, the
 *                ceiling is only half-enforced.
 *
 * Together they also make it impossible to orphan the panel: a caller can never
 * remove themselves, and can only remove accounts at or below their own rank, so
 * the last usable super_admin is always still signed in somewhere and able to undo
 * it. That is why there is no separate "don't delete the last super_admin" check —
 * it is unreachable while these two hold.
 *
 * @param {object} target the Admin document being acted on
 * @param {object} actor  the authenticated caller (req.user)
 * @returns {'self'|'higher_role'|null}
 */
const staffActionRefusal = (target, actor) => {
  if (!target || !actor) return 'higher_role';
  if (String(target._id) === String(actor._id)) return 'self';
  if ((ROLE_RANK[target.role] || 0) > (ROLE_RANK[actor.role] || 0)) return 'higher_role';
  return null;
};

module.exports = { ROLE_RANK, isStaffEnabled, staffActionRefusal };
