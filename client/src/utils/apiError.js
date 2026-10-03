/**
 * Turns an axios error into a translated, user-facing string.
 *
 * Why this exists: the API used to return only an English `message`, so every
 * error toast fell back to English even when the app was in Amharic. The server
 * now returns a stable machine-readable `code` alongside the message (see
 * server/utils/errorCodes.js). This module is the client mirror of that table
 * and resolves, in priority order:
 *
 *   1. `data.code`  -> a specific translation (best: names the actual problem)
 *   2. HTTP status  -> a generic translation for that class of failure
 *   3. the caller's own fallback key  -> the page-specific wording it already had
 *
 * The raw server message is never shown to the user; it goes to the console so
 * debugging information is not lost.
 */

/** Error code (from the API) -> translation key. */
const CODE_KEYS = {
  // auth / sessions
  AUTH_INVALID_CREDENTIALS: 'invalid_credentials',
  AUTH_REQUIRED: 'error_unauthorized_message',
  AUTH_FORBIDDEN: 'access_denied',
  SESSION_TERMINATED: 'session_terminated',
  SESSION_NOT_FOUND: 'error_not_found_message',
  INVALID_SESSION_ID: 'error_bad_request_message',
  EMAIL_IN_USE: 'api_code_email_in_use',
  EMAIL_SEND_FAILED: 'api_code_email_send_failed',

  // validation
  VALIDATION_FAILED: 'error_bad_request_message',
  BAD_REQUEST: 'error_bad_request_message',

  // access
  PIN_REQUIRED: 'invalid_pin',

  // tables
  TABLE_NOT_FOUND: 'api_code_table_not_found',
  TABLE_OCCUPIED: 'occupied_table_desc',
  TABLE_CLAIM_LOST: 'occupied_table_hint',
  TABLE_INACTIVE: 'inactive_table_desc',
  INVALID_TABLE_ID: 'invalid_table_desc',

  // catalogue
  FOOD_NOT_FOUND: 'api_code_food_not_found',
  CATEGORY_NOT_FOUND: 'api_code_category_not_found',

  // orders
  ORDER_NOT_FOUND: 'api_code_order_not_found',
  INVALID_STATUS_TRANSITION: 'api_code_invalid_transition',
  ORDER_CANCEL_NOT_ALLOWED: 'cannot_cancel_notice',

  // generic
  NOT_FOUND: 'error_not_found_message',
  CONFLICT: 'error_bad_request_message',
  INTERNAL_ERROR: 'error_server_message',
  SERVICE_UNAVAILABLE: 'error_unavailable_message',
};

/** HTTP status -> generic translation key, used when no code is recognised. */
const STATUS_KEYS = {
  400: 'error_bad_request_message',
  401: 'error_unauthorized_message',
  403: 'access_denied',
  404: 'error_not_found_message',
  409: 'error_bad_request_message',
  422: 'error_bad_request_message',
  500: 'error_server_message',
  503: 'error_unavailable_message',
};

const NO_RESPONSE_KEY = 'error_unavailable_message';

/**
 * @param {unknown} err          the rejected value from an API call
 * @param {Function} t           i18next `t`
 * @param {string} fallbackKey   key the caller already had for this failure
 * @returns {string} translated message safe to show a user
 */
export const resolveApiError = (err, t, fallbackKey) => {
  const status = err?.response?.status;
  const code = err?.response?.data?.code;
  const serverMessage = err?.response?.data?.message;

  // Keep the server's wording available for developers without showing it.
  if (serverMessage) {
    console.warn(`[API] ${code || status || 'error'}: ${serverMessage}`);
  } else if (!err?.response) {
    console.warn('[API] no response — the request did not reach the server', err);
  }

  const key = (code && CODE_KEYS[code]) || STATUS_KEYS[status] || NO_RESPONSE_KEY;
  const resolved = t(key);

  // If the chosen key is not in the resource bundle, i18next hands back the key
  // itself; fall back to the caller's own key before giving up.
  if (resolved === key && fallbackKey) return t(fallbackKey);
  return resolved;
};

export default resolveApiError;