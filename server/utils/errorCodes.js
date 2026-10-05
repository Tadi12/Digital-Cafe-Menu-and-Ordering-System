/**
 * Canonical, machine-readable error codes.
 *
 * Every error response should carry BOTH a stable `code` and a human-readable
 * `message`. The message is for logs and for the English fallback; the code is
 * what the client maps to a translated string, so UI copy never has to come
 * back from the server in English.
 *
 * The client mirror of this table lives in client/src/utils/apiError.js —
 * keep the two in sync (a code with no client mapping simply falls back to the
 * generic message for that HTTP status).
 */
const ERROR_CODES = {
  // ---- Auth / sessions ----
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',
  SESSION_TERMINATED: 'SESSION_TERMINATED',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  INVALID_SESSION_ID: 'INVALID_SESSION_ID',
  EMAIL_IN_USE: 'EMAIL_IN_USE',
  EMAIL_SEND_FAILED: 'EMAIL_SEND_FAILED',

  // ---- Staff roster ----
  STAFF_NOT_FOUND: 'STAFF_NOT_FOUND',
  // The account exists and the password was right, but the account is switched
  // off. Distinct from AUTH_INVALID_CREDENTIALS so the sign-in screen can say
  // "ask an admin to re-enable you" instead of "wrong password".
  STAFF_ACCOUNT_DISABLED: 'STAFF_ACCOUNT_DISABLED',

  // ---- Request validation ----
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  BAD_REQUEST: 'BAD_REQUEST',

  // ---- Access ----
  PIN_REQUIRED: 'PIN_REQUIRED',

  // ---- Tables ----
  TABLE_NOT_FOUND: 'TABLE_NOT_FOUND',
  TABLE_OCCUPIED: 'TABLE_OCCUPIED',
  TABLE_CLAIM_LOST: 'TABLE_CLAIM_LOST',
  TABLE_INACTIVE: 'TABLE_INACTIVE',
  INVALID_TABLE_ID: 'INVALID_TABLE_ID',

  // ---- Catalogue ----
  FOOD_NOT_FOUND: 'FOOD_NOT_FOUND',
  CATEGORY_NOT_FOUND: 'CATEGORY_NOT_FOUND',

  // ---- Orders ----
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  ORDER_CANCEL_NOT_ALLOWED: 'ORDER_CANCEL_NOT_ALLOWED',
  // Both preparation tracks must be ready before an order may be served.
  ORDER_NOT_READY: 'ORDER_NOT_READY',

  // ---- Generic ----
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
};

/**
 * Fallback code for a response that reached the error handler without one of
 * its own, so the client always receives something it can branch on.
 */
const codeForStatus = (status) => {
  switch (status) {
    case 400:
      return ERROR_CODES.BAD_REQUEST;
    case 401:
      return ERROR_CODES.AUTH_REQUIRED;
    case 403:
      return ERROR_CODES.AUTH_FORBIDDEN;
    case 404:
      return ERROR_CODES.NOT_FOUND;
    case 409:
      return ERROR_CODES.CONFLICT;
    case 422:
      return ERROR_CODES.VALIDATION_FAILED;
    case 503:
      return ERROR_CODES.SERVICE_UNAVAILABLE;
    default:
      return ERROR_CODES.INTERNAL_ERROR;
  }
};

module.exports = { ERROR_CODES, codeForStatus };