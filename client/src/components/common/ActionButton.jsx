import React from 'react';
import { Loader2, Check } from 'lucide-react';

/**
 * The app's shared button for anything that talks to the API.
 *
 * Why this exists: a plain `<button>` gives the user no feedback between the click
 * and the response, so a slow request looks like a frozen button and invites a
 * second click — which for an order status button means a duplicate request, and
 * for "Place Order" means a duplicate order. This component makes the pending
 * state visible on the very first frame and keeps the button disabled until the
 * caller's promise settles.
 *
 * States:
 *   idle     -> `children` (+ `icon`)
 *   loading  -> spinner + `loadingText`, button disabled, aria-busy=true
 *   success  -> check + `successText` (the parent decides how long to hold it)
 *
 * Layout is deliberately stable across all three states: the icon slot keeps the
 * same box whether it holds the icon or the spinner, the label never wraps, and
 * any overflow is truncated instead of pushing the button wider or taller.
 */
const ActionButton = ({
  children,
  loading = false,
  loadingText,
  success = false,
  successText,
  icon: Icon,
  successIcon: SuccessIcon = Check,
  disabled = false,
  type = 'button',
  className = '',
  iconClassName = 'w-4 h-4 shrink-0',
  labelClassName = 'truncate',
  ...buttonProps
}) => {
  const isDisabled = disabled || loading;

  let label = children;
  if (loading && loadingText) {
    label = loadingText;
  } else if (success && successText) {
    label = successText;
  }

  let iconNode = null;
  if (loading) {
    iconNode = (
      <Loader2
        className={`${iconClassName} animate-spin`}
        aria-hidden="true"
      />
    );
  } else if (success) {
    iconNode = <SuccessIcon className={iconClassName} aria-hidden="true" />;
  } else if (Icon) {
    iconNode = <Icon className={iconClassName} aria-hidden="true" />;
  }

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`whitespace-nowrap disabled:cursor-not-allowed ${className}`}
      {...buttonProps}
    >
      <span
        className="flex items-center justify-center gap-1.5 min-w-0"
        aria-live="polite"
      >
        {iconNode}
        <span className={labelClassName}>{label}</span>
      </span>
    </button>
  );
};

export default ActionButton;
