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

  const ownerId = idOf(table.assignedWaiter);
  if (!ownerId) return false;

  return ownerId === idOf(user._id);
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
 * Reduce any of the shapes an id can arrive in to a comparable string.
 *
 * A table id may be a bare ObjectId, an ObjectId-like object, or a string, and a
 * populated `assignedWaiter`/`table` arrives as a whole document. Comparing with
 * `===` on those would silently fail, so every id comparison in this module goes
 * through here.
 *
 * @param {*} value
 * @returns {string|null}
 */
const idOf = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && value._id) return String(value._id);
  return String(value);
};

/**
 * Build the query for "the orders on THIS table".
 *
 * This exists as a named, tested helper because of a real bug: the per-table
 * endpoint used to start from `{ table: table._id }` and then `Object.assign` the
 * waiter's assigned-table list on top of it, which overwrote the single-table
 * filter with `{ table: { $in: [all my tables] } }`. Every table card then rendered
 * the waiter's entire order history. Two levels of filtering are being combined
 * here and they must never be conflated:
 *
 *   assignedTableIds  -> WHICH TABLES this waiter may access at all
 *   tableId           -> WHICH of those tables this request is about
 *
 * The result always names exactly one table, so the second level can only ever
 * narrow the first. If the table is somehow not in the caller's assigned list the
 * intersection is empty and the query matches nothing: it fails closed rather than
 * silently widening.
 *
 * @param {object} user             authenticated staff member
 * @param {string} tableId          the single table this request is about
 * @param {Array|null} assignedTableIds from getAssignedTableIds (null = unrestricted)
 * @returns {object} a Mongo filter
 */
const buildTableOrdersQuery = (user, tableId, assignedTableIds) => {
  // An oversight role may view any table, but this endpoint is still about ONE
  // table, so the filter stays single-table for every role.
  if (assignedTableIds === null) return { table: tableId };

  const wanted = idOf(tableId);
  // Both sides are normalised to plain id strings before intersecting, so the
  // `$in` list only ever contains comparable values and never a stray document.
  const mine = assignedTableIds.map(idOf).filter((id) => id === wanted);
  return { table: { $in: mine } };
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
  idOf,
  isWaiter,
  hasFullTableAccess,
  isTableOwnedByUser,
  getAssignedTableIds,
  tableOwnershipFilter,
  buildTableOrdersQuery,
  forbiddenOwnership,
};
