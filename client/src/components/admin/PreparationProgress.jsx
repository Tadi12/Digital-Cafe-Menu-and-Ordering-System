import React from 'react';
import { useTranslation } from 'react-i18next';
import { UtensilsCrossed, Coffee, Check, Clock } from 'lucide-react';
import { preparationStatusLabel, canCompleteOrder, pendingPreparationTrack } from '../../utils/orderStatus';

const TRACK_ROWS = [
  { key: 'food', labelKey: 'food_section_label', Icon: UtensilsCrossed },
  { key: 'drink', labelKey: 'drink_section_label', Icon: Coffee },
];

/**
 * The waiter's combined view of an order's two preparation tracks.
 *
 * The problem this solves: on a food + drink order the waiter used to see a single
 * flattened status, so "food ready, drinks still brewing" looked the same as "both
 * ready". Each half is now shown on its own line with its own status, and the copy
 * underneath says which station the order is still waiting on.
 *
 * It renders no buttons. Closing the customer order is handled by
 * OrderStatusActionButton, which only offers "Mark Order Completed" once every
 * required track says ready — so this component stays a read-only progress
 * indicator and the two cannot disagree about what is allowed.
 */
const PreparationProgress = ({ order }) => {
  const { t } = useTranslation();

  // A half the order does not contain is skipped entirely: no phantom row for a
  // food-only order, and no misleading "Drinks: not required" noise.
  const rows = TRACK_ROWS.filter(
    ({ key }) => order?.[`${key}Status`] !== 'not_required',
  );
  if (rows.length === 0) return null;

  const ready = canCompleteOrder(order);
  const waitingOn = pendingPreparationTrack(order);

  return (
    <div className="space-y-1.5">
      {rows.map(({ key, labelKey, Icon }) => {
        const status = order[`${key}Status`];
        const isReady = status === 'ready';

        return (
          <div
            key={key}
            className="flex items-center justify-between gap-2 text-[11px] font-bold"
          >
            <span className="flex items-center gap-1.5 text-cafe-600">
              <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              {t(labelKey)}
            </span>
            <span
              className={`flex items-center gap-1 ${
                isReady ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {isReady ? (
                <Check className="w-3 h-3 shrink-0" aria-hidden="true" />
              ) : (
                <Clock className="w-3 h-3 shrink-0" aria-hidden="true" />
              )}
              {preparationStatusLabel(status, t)}
            </span>
          </div>
        );
      })}

      {/* Names the outstanding station instead of a vague "not ready yet". */}
      <p
        className={`text-[11px] font-bold pt-1.5 border-t border-cafe-100 ${
          ready ? 'text-emerald-700' : 'text-amber-700'
        }`}
      >
        {ready
          ? t('order_ready_to_serve')
          : waitingOn === 'drink'
            ? t('waiting_for_drinks')
            : waitingOn === 'food'
              ? t('waiting_for_food')
              : t('waiting_for_preparation')}
      </p>
    </div>
  );
};

export default PreparationProgress;
