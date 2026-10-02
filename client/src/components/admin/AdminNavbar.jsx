import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../common/LanguageSwitcher';
import ThemeToggle from '../common/ThemeToggle';
import { Bell, CheckCheck, ClipboardList, Menu, Radio, X } from 'lucide-react';

const MAX_NOTIFICATIONS = 30;

// Shared list body so the mobile modal and the desktop dropdown stay identical.
const NotificationsPanel = ({ notifications, onClear, onClose, onSelect, t }) => (
  <div className="flex min-h-0 flex-1 flex-col">
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-cafe-100 px-4 py-3 dark:border-recipe-border">
      <div className="min-w-0">
        <h2 className="truncate text-sm font-bold text-cafe-900 dark:text-recipe-text">{t('admin_notifications')}</h2>
        <p className="truncate text-xs text-cafe-500 dark:text-recipe-muted">{t('admin_notifications_recent')}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {notifications.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="whitespace-nowrap rounded-lg px-2 py-2 text-xs font-semibold text-cafe-600 hover:bg-cafe-100 dark:text-recipe-muted dark:hover:bg-recipe-cardHover"
          >
            {t('admin_notifications_clear')}
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label={t('close')}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-cafe-500 hover:bg-cafe-100 dark:text-recipe-muted dark:hover:bg-recipe-cardHover"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>

    {notifications.length === 0 ? (
      <div className="flex flex-1 flex-col items-center overflow-y-auto px-5 py-10 text-center">
        <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-cafe-100 text-cafe-600 dark:bg-recipe-cardHover dark:text-recipe-orange">
          <CheckCheck className="h-5 w-5" />
        </span>
        <p className="text-sm font-semibold text-cafe-800 dark:text-recipe-text">{t('admin_notifications_empty')}</p>
      </div>
    ) : (
      <ul className="min-h-0 flex-1 overscroll-contain overflow-y-auto divide-y divide-cafe-100 dark:divide-recipe-border">
        {notifications.map((notification) => (
          <li key={notification.id}>
            <button
              type="button"
              onClick={onSelect}
              className="flex w-full items-start gap-2.5 px-3 py-3 text-left transition-colors hover:bg-cafe-50 sm:gap-3 sm:px-4 dark:hover:bg-recipe-cardHover"
            >
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-recipe-orange/15 dark:text-recipe-orange">
                <ClipboardList className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-2">
                  <span className="min-w-0 flex-1 break-words text-sm font-bold text-cafe-900 dark:text-recipe-text">{notification.title}</span>
                  {!notification.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-recipe-orange" />}
                </span>
                <span className="mt-0.5 block break-words text-xs text-cafe-600 dark:text-recipe-muted">{notification.message}</span>
                <time className="mt-1 block text-[10px] text-cafe-400 dark:text-recipe-subtle" dateTime={notification.createdAt}>
                  {new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(notification.createdAt))}
                </time>
              </span>
            </button>
          </li>
        ))}
      </ul>
    )}
  </div>
);

const getNotificationDetails = (order, type, t) => {
  const orderNumber = order?.orderNumber || order?._id?.slice(-6) || '';
  const tableNumber = order?.tableNumberSnapshot;

  if (type === 'new') {
    return {
      title: t('admin_notification_new_order'),
      message: t('admin_notification_new_order_detail', { orderNumber, tableNumber }),
    };
  }
  if (type === 'cancelled') {
    return {
      title: t('admin_notification_order_cancelled'),
      message: t('admin_notification_order_cancelled_detail', { orderNumber }),
    };
  }
  const statusKey = order?.status ? `status_${order.status.toLowerCase()}` : '';
  return {
    title: t('admin_notification_order_updated'),
    message: t('admin_notification_order_updated_detail', {
      orderNumber,
      status: statusKey ? t(statusKey) : '',
    }),
  };
};

const AdminNavbar = ({ onOpenSidebar, pageTitle }) => {
  const { admin } = useAuth();
  const { socket, connected } = useSocket();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches,
  );
  const notificationsRef = useRef(null);

  // Mobile gets a centered modal dialog; desktop keeps the anchored dropdown.
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 639px)');
    const handleChange = (event) => setIsMobile(event.matches);
    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Lock background scrolling while the mobile dialog is open.
  useEffect(() => {
    if (!notificationsOpen || !isMobile) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [notificationsOpen, isMobile]);

  useEffect(() => {
    if (!socket || !connected) return undefined;

    const addNotification = (order, type) => {
      const details = getNotificationDetails(order, type, t);
      setNotifications((current) => [
        {
          id: `${order?._id || 'order'}-${type}-${Date.now()}`,
          orderId: order?._id,
          ...details,
          createdAt: new Date().toISOString(),
          read: false,
        },
        ...current,
      ].slice(0, MAX_NOTIFICATIONS));
    };
    const handleNewOrder = (order) => addNotification(order, 'new');
    const handleOrderUpdated = (order) => addNotification(order, 'updated');
    const handleOrderCancelled = (order) => addNotification(order, 'cancelled');

    socket.on('new_order', handleNewOrder);
    socket.on('order_updated', handleOrderUpdated);
    socket.on('order_cancelled', handleOrderCancelled);
    socket.emit('join_admin_room');

    return () => {
      socket.off('new_order', handleNewOrder);
      socket.off('order_updated', handleOrderUpdated);
      socket.off('order_cancelled', handleOrderCancelled);
    };
  }, [socket, connected, t]);

  useEffect(() => {
    if (!notificationsOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!notificationsRef.current?.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setNotificationsOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [notificationsOpen]);

  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const toggleNotifications = () => {
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);
    if (nextOpen) {
      setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-cafe-200 px-4 py-3 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenSidebar}
            className="lg:hidden min-h-10 min-w-10 rounded-lg text-cafe-700 hover:bg-cafe-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="font-display text-xl font-bold text-cafe-900 tracking-tight">
            {pageTitle}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Socket Connection Status */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              connected
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-red-50 text-red-700 border-red-200"
            }`}
            title={
              connected
                ? "Real-time WebSocket Live"
                : "Real-time Socket Disconnected"
            }
          >
            <Radio
              className={`w-3 h-3 ${connected ? "animate-pulse text-emerald-600" : ""}`}
            />
            <span>{connected ? "Live Sync" : "Offline"}</span>
          </div>

          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={toggleNotifications}
              aria-label={t('admin_notifications')}
              aria-expanded={notificationsOpen}
              aria-haspopup="dialog"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-cafe-700 transition-colors hover:bg-cafe-100 dark:text-recipe-text dark:hover:bg-recipe-cardHover"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white dark:ring-recipe-bg">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              isMobile ? (
                // ---- Mobile: centered modal dialog with dimmed backdrop ----
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4"
                  role="dialog"
                  aria-modal="true"
                  aria-label={t('admin_notifications')}
                >
                  <button
                    type="button"
                    aria-label={t('close')}
                    onClick={() => setNotificationsOpen(false)}
                    className="absolute inset-0 h-full w-full cursor-default bg-black/50 backdrop-blur-[2px] dark:bg-black/60"
                  />
                  <div className="relative flex max-h-[85dvh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-cafe-200 bg-white shadow-2xl dark:border-recipe-border dark:bg-recipe-card dark:shadow-black/60">
                    <NotificationsPanel
                      notifications={notifications}
                      onClear={() => setNotifications([])}
                      onClose={() => setNotificationsOpen(false)}
                      onSelect={() => {
                        setNotificationsOpen(false);
                        navigate('/admin/orders');
                      }}
                      t={t}
                    />
                  </div>
                </div>
              ) : (
                // ---- Desktop: anchored dropdown below the bell ----
                <div
                  role="dialog"
                  aria-label={t('admin_notifications')}
                  className="absolute right-0 top-12 z-50 flex max-h-[min(65vh,28rem)] w-[calc(100vw-2rem)] max-w-[22rem] flex-col overflow-hidden rounded-2xl border border-cafe-200 bg-white shadow-xl dark:border-recipe-border dark:bg-recipe-card dark:shadow-black/40"
                >
                  <NotificationsPanel
                    notifications={notifications}
                    onClear={() => setNotifications([])}
                    onClose={() => setNotificationsOpen(false)}
                    onSelect={() => {
                      setNotificationsOpen(false);
                      navigate('/admin/orders');
                    }}
                    t={t}
                  />
                </div>
              )
            )}
          </div>

          <ThemeToggle />

          <LanguageSwitcher />

          {/* Admin Profile */}
          <div className="flex items-center pl-2 border-l border-cafe-200">
            <span className="hidden md:inline-block text-xs font-bold text-cafe-800">
              {admin?.name}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminNavbar;
