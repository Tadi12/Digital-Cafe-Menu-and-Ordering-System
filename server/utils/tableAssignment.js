/**
 * Single source of truth for waiter <-> table ownership.
 *
 * A customer order belongs to a TABLE, and a table belongs to a WAITER. Ownership
 * is therefore always resolved as Order -> Table -> assignedWaiter rather than
 * stored on the order, so one order can never end up with two conflicting owners
 * and there is nothing to migrate or keep in sync.
 *
 * Every check here is server-side and works from the authenticated user on the
 * request. Nothing in this module trusts an id, a role or a filter supplied by the
 * client, which is what makes the waiter's view tamper-proof.
 */

/** Roles allowed to assign tables and see every table and order. */
const OVERSIGHT_ROLES = ['admin', 'super_admin'];

/** Order statuses that still need the waiter to act (not closed). */
const ACTIVE_ORDER_STATUSES = ['Pending', 'Preparing', 'Ready'];

/**
 * @param {object} user the authenticated staff member (req.user)
 * @returns {boolean}
 */
const isWaiter = (user) => user?.role === 'waiter';

/**
 * @param {object} user the authenticated staff member (req.user)
 * @returns {boolean} true when the role bypasses table ownership entirely
 */
const hasFullTableAccess = (user) => OVERSIGHT_ROLES.includes(user?.role);

/**
 * May this user act on this table?
 *
 * Admins and super admins always may. A waiter may only when the table is
 * assigned to them — compared as strings so a populated document and a bare
 * ObjectId behave identically.
 *
 * @param {object} user  authenticated staff member
 * @param {object} table the table document (assignedWaiter may be populated)
 * @returns {boolean}
 */
const isTableOwnedByUser = (user, table) => {
  if (hasFullTableAccess(user)) return true;
  if (!isWaiter(user)) return false;
  if (!table?.assignedWaiter) return false;

  const ownerId =
    typeof table.assignedWaiter === 'object'
      ? table.assignedWaiter._id
      : table.assignedWaiter;
  if (!ownerId) return false;

  return String(ownerId) === String(user._id);
};

/**
 * Table ids a waiter is responsible for.
 *
 * An oversight role gets `null`, meaning "no restriction" — callers must treat
 * null as unrestricted rather than as an empty list.
 *
 * @param {object} user authenticated staff member
 * @returns {Promise<string[]|null>} ids, or null when unrestricted
 */
const getAssignedTableIds = async (user) => {
  if (hasFullTableAccess(user)) return null;
  if (!isWaiter(user)) return [];

  const Table = require('../models/Table');
  const tables = await Table.find({ assignedWaiter: user._id }).select('_id');
  return tables.map((table) => String(table._id));
};

/**
 * A Mongo filter restricting an order query to the user's own tables.
 *
 * @param {object} user authenticated staff member
 * @param {string[]} tableIds from getAssignedTableIds
 * @returns {object} a fragment to merge into the query, or {} when unrestricted
 */
const tableOwnershipFilter = (user, tableIds) => {
  if (hasFullTableAccess(user)) return {};
  // A waiter with no tables must match nothing at all. `{$in: []}` does exactly
  // that, so an unassigned waiter sees an empty queue instead of every order.
  return { table: { $in: tableIds && tableIds.length ? tableIds : [] } };
};

/**
 * The standard 403 payload for a waiter reaching outside their own tables.
 *
 * Deliberately does not confirm whether the table or order exists.
 *
 * @returns {{status: number, body: object}}
 */
const forbiddenOwnership = () => ({
  status: 403,
  body: {
    success: false,
    code: 'AUTH_FORBIDDEN',
    message: 'Access Denied: this table is not assigned to you.',
  },
});

module.exports = {
  OVERSIGHT_ROLES,
  ACTIVE_ORDER_STATUSES,
  isWaiter,
  hasFullTableAccess,
  isTableOwnedByUser,
  getAssignedTableIds,
  tableOwnershipFilter,
  forbiddenOwnership,
};
