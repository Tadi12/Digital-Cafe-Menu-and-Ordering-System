import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageContext } from '../../context/LanguageContext';
import OrderStatusBadge from '../customer/OrderStatusBadge';
import OrderStatusActionButton from '../common/OrderStatusActionButton';
import PreparationStatusButton from '../common/PreparationStatusButton';
import { formatCurrency } from '../../utils/currencyFormatter';
import { Clock, User, MapPin, Banknote, Coffee, UtensilsCrossed } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import {
  paymentMethodLabel,
  paymentStatusLabel,
  preparationStatusLabel,
  canCompleteOrder,
  pendingPreparationTrack,
  activePreparationTracks,
  isOrderClosed,
  stationStatusLabel,
} from '../../utils/orderStatus';
import { roleTrack, isStationRole } from '../../utils/staffRoles';
import PreparationProgress from './PreparationProgress';

// Label and icon per preparation track. Only which tracks an order HAS is a rule
// (activePreparationTracks in utils/orderStatus); how a track looks is presentation,
// so it stays here.
const TRACK_DISPLAY = {
  food: { labelKey: 'food_section_label', Icon: UtensilsCrossed },
  drink: { labelKey: 'drink_section_label', Icon: Coffee },
};

const OrderCard = ({ order, onUpdateStatus, pendingTarget, succeededStatus, onUpdatePreparation, pendingPreparationTarget, succeededPreparation }) => {
  const { t } = useTranslation();
  const { currentLang } = useContext(LanguageContext);
  const { admin } = useAuth();
  const role = admin?.role || 'waiter';

  // A chef or a barista sees only the items for their own station. The API has
  // already narrowed `order.items` to that half and set `stationStatus`, so this
  // is a display concern only — it never decides what they may change.
  const track = roleTrack(role);
  const stationOnly = isStationRole(role);
  // A waiter delivers: they see both preparation tracks and own the final
  // "Mark Order Completed" step, so they get the combined progress panel.
  const isWaiterRole = role === 'waiter';

  // Only the halves this order actually contains. A food-only order must not be
  // captioned "Drinks: Not required" — that reads as a status OF the drinks rather
  // than the absence of them, and it appeared on every single food-only card.
  const activeTracks = activePreparationTracks(order);

  const formattedTime = new Date(order.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const formattedDate = new Date(order.createdAt).toLocaleDateString();

  const StationIcon = track === 'drink' ? Coffee : UtensilsCrossed;

  return (
    <div className="bg-white rounded-2xl border border-cafe-200 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
      {/* Header Banner */}
      <div className="bg-cafe-50 px-4 py-3 border-b border-cafe-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-sm text-cafe-900">{order.orderNumber}</span>
          <span className="text-xs text-cafe-400 font-mono">({formattedTime})</span>
        </div>
        {stationOnly && !isOrderClosed(order.status) ? (
          // A station shows the status of the half it actually owns, not the
          // overall order status, which may still be held back by the other half.
          //
          // Once the order is closed that distinction stops being useful: the
          // track is pinned at 'ready' and would claim an order the floor has
          // already served is still waiting to be collected. A closed order falls
          // through to the overall badge, which is the outcome the kitchen is
          // actually waiting to hear.
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-cafe-100 text-cafe-800">
            <StationIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            {/* stationStatusLabel, not a direct preparationStatusLabel call: it owns
                the '|| pending' fallback for a ticket whose stationStatus has not
                arrived yet, which is what a fresh order looks like here. */}
            <span>{stationStatusLabel(order, t)}</span>
          </span>
        ) : (
          <OrderStatusBadge status={order.status} />
        )}
      </div>

      {/* Body Details */}
      <div className="p-4 space-y-3 flex-1">
        {/* Customer & Table */}
        <div className="flex items-center justify-between text-xs border-b border-cafe-50 pb-2">
          <div className="flex items-center gap-1.5 font-bold text-cafe-900">
            <User className="w-3.5 h-3.5 text-cafe-600" />
            <span>{order.customerName}</span>
          </div>
          <div className="flex items-center gap-1 font-extrabold text-cafe-800 bg-cafe-100 px-2 py-0.5 rounded-md">
            <MapPin className="w-3 h-3 text-gold-600" />
            <span>{t('table_number_label', { number: order.tableNumberSnapshot })}</span>
          </div>
        </div>

        {/* Items List */}
        <div className="space-y-1.5 py-1">
          {order.items.map((item, idx) => {
            const foodName = item.foodName ? item.foodName[currentLang] || item.foodName.en : t('food');
            return (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded bg-cafe-100 text-cafe-900 font-bold flex items-center justify-center text-[10px] shrink-0">
                    {item.quantity}x
                  </span>
                  <span className="text-cafe-800 font-medium truncate">{foodName}</span>
                </div>
                <span className="font-semibold text-cafe-700 shrink-0">
                  {formatCurrency(item.price * item.quantity, currentLang)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Total & Payment */}
        <div className="flex items-center justify-between border-t border-cafe-100 pt-2.5">
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
            <Banknote className="w-3.5 h-3.5" />
            <span>{paymentMethodLabel(order.paymentMethod, t)} ({paymentStatusLabel(order.paymentStatus, t)})</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-cafe-500 block uppercase font-bold">{t('total')}</span>
            <span className="text-base font-black text-cafe-900">
              {formatCurrency(order.totalAmount, currentLang)}
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer: a station drives its own track; everyone else keeps the
          single overall-status button they always had. */}
      <div className="p-3 bg-cafe-50 border-t border-cafe-100 space-y-2">
        {/* The compact per-track strip is for the admin, who is scanning a grid of
            cards and just needs to see which stations still owe something.

            It is deliberately NOT rendered for a waiter: PreparationProgress below
            already shows the same tracks — filtered the same way — plus the line
            naming the station they are still waiting on, which is the part that
            actually matters when you are the one carrying the tray. Drawing both
            printed every status twice.

            Nothing renders at all when the order has no preparation tracks (a
            cancelled order, or a legacy one missing both fields). */}
        {!stationOnly && !isWaiterRole && activeTracks.length > 0 && (
          <div
            className={`grid gap-2 text-[11px] font-bold ${
              activeTracks.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
            }`}
          >
            {activeTracks.map((key) => {
              const { labelKey, Icon } = TRACK_DISPLAY[key];
              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-1 rounded-lg px-2 py-1 bg-white border border-cafe-100"
                >
                  <span className="flex items-center gap-1 text-cafe-600">
                    <Icon className="w-3 h-3" aria-hidden="true" />
                    {t(labelKey)}
                  </span>
                  <span className="text-cafe-900">
                    {preparationStatusLabel(order[`${key}Status`], t)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {stationOnly ? (
          <PreparationStatusButton
            order={order}
            track={track}
            onUpdate={onUpdatePreparation}
            pendingTarget={pendingPreparationTarget}
            succeededStatus={succeededPreparation}
          />
        ) : (
          <>
            {/* The waiter sees BOTH halves separately so it is obvious which
                station still owes them something, plus a completion action that
                only appears once every required track says ready. */}
            {isWaiterRole && (
              <PreparationProgress
                order={order}
                onUpdate={onUpdateStatus}
                pendingTarget={pendingTarget}
                succeededStatus={succeededStatus}
              />
            )}
            <OrderStatusActionButton
              order={order}
              role={role}
              onUpdate={onUpdateStatus}
              pendingTarget={pendingTarget}
              succeededStatus={succeededStatus}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default OrderCard;
