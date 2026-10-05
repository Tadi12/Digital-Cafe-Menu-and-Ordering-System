import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { Bell, BellRing, Loader2 } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';

/**
 * Mirrors MAX_CALLS_PER_SOCKET in server/sockets/socketHandler.js.
 *
 * The server counts calls per SOCKET for the life of the connection and silently
 * drops everything past the cap — no error, no event. A button that kept
 * accepting taps past this point would show "waiter notified" for calls that were
 * thrown away, which is worse than not ringing at all: the guest believes help is
 * coming. So the budget is tracked here and the bell explains itself when it runs
 * out, rather than failing silently.
 */
const MAX_RINGS = 5;

/**
 * Minimum gap between two rings, in ms.
 *
 * Long enough that an impatient double tap cannot spend the whole budget in a
 * second, short enough that a guest who was genuinely not answered can ring again
 * without waiting.
 */
const RING_COOLDOWN_MS = 15000;

/**
 * The guest's "call the waiter" bell.
 *
 * Lives in the customer header rather than the page body, because ringing the floor
 * is a global guest action rather than a per-screen one: it must be reachable from
 * anywhere in the ordering flow, including mid-scroll with the cart closed, and it
 * should not disappear when a guest navigates between the menu, their orders and the
 * tracker.
 *
 * Only the table number is sent. The server generates the message staff see, so
 * nothing a guest types (or a tampered client sends) can reach a staff screen.
 *
 * @param {number}  props.tableNumber   the seated table; the bell is not rendered without one
 * @param {string}  [props.ringClassName] ring colour for the remaining-calls badge, so it
 *                                 separates from whatever surface the header is
 */
const CallWaiterButton = ({ tableNumber, ringClassName = 'ring-cafe-900' }) => {
  const { t } = useTranslation();
  const { socket, connected } = useSocket();

  const [ringing, setRinging] = useState(false);
  const [ringsLeft, setRingsLeft] = useState(MAX_RINGS);
  const [cooldownUntil, setCooldownUntil] = useState(0);

  // `ringsLeft` and the cooldown are state, which does not update until the next
  // render — so without these refs a double tap spends two of the budget and the
  // guest can burn all five before React has painted once.
  const ringsLeftRef = useRef(MAX_RINGS);
  const cooldownRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const exhausted = ringsLeft <= 0;
  const coolingDown = cooldownUntil > Date.now();

  const handleRing = useCallback(() => {
    if (ringsLeftRef.current <= 0) {
      toast.info(t('call_waiter_limit_reached'));
      return;
    }
    if (cooldownRef.current > Date.now()) return;
    if (!socket || !connected) {
      toast.error(t('realtime_offline_message'));
      return;
    }

    ringsLeftRef.current -= 1;
    setRingsLeft(ringsLeftRef.current);

    // One shared timer for the cooldown and for clearing the spinner, so a ring
    // cannot be interrupted by a second one racing it.
    window.clearTimeout(timerRef.current);
    cooldownRef.current = Date.now() + RING_COOLDOWN_MS;
    setCooldownUntil(cooldownRef.current);
    setRinging(true);

    socket.emit('call_waiter', { tableNumber });
    toast.success(t('call_waiter_sent', { number: tableNumber }));

    timerRef.current = window.setTimeout(() => {
      setRinging(false);
      cooldownRef.current = 0;
      setCooldownUntil(0);
    }, RING_COOLDOWN_MS);
  }, [socket, connected, tableNumber, t]);

  // A table is required: the server rejects a call with no valid table number, so
  // there is nothing to send and the control should not be offered at all.
  if (!Number.isFinite(Number(tableNumber)) || Number(tableNumber) <= 0) return null;

  // Not disabled when the socket is down: the handler toasts the reason instead.
  // A greyed-out bell with no explanation leaves the guest thinking the app is
  // broken, whereas saying "realtime is offline" tells them what is wrong.
  const disabled = ringing || coolingDown || exhausted;
  const Icon = ringing ? Loader2 : exhausted ? BellRing : Bell;

  return (
    <button
      type="button"
      onClick={handleRing}
      disabled={disabled}
      aria-label={exhausted ? t('call_waiter_limit_reached') : t('call_waiter')}
      aria-busy={ringing || undefined}
      title={exhausted ? t('call_waiter_limit_reached') : t('call_waiter')}
      // h-10/w-10 to match the ThemeToggle and LanguageSwitcher beside it in the
      // header. The badge is given a ring in the header's own colour so red stays
      // legible against the gold button.
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed ${
        exhausted
          ? 'bg-cafe-800 text-cafe-400'
          : 'bg-gold-500 text-cafe-900 hover:bg-gold-600 active:scale-95 disabled:opacity-70'
      }`}
    >
      <Icon
        className={`h-5 w-5 ${ringing ? 'animate-spin' : ''}`}
        aria-hidden="true"
      />
      {ringsLeft < MAX_RINGS && !exhausted && (
        <span
          className={`absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-extrabold text-white ring-2 ${ringClassName}`}
          aria-hidden="true"
        >
          {ringsLeft}
        </span>
      )}
    </button>
  );
};

export default CallWaiterButton;
