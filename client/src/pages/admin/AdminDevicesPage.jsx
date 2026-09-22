import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MonitorSmartphone, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { getAdminSessionsApi, terminateAdminSessionApi } from '../../api/authApi';
import { useAuth } from '../../hooks/useAuth';

const formatDate = (value) => new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium', timeStyle: 'short',
}).format(new Date(value));

const AdminDevicesPage = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [terminatingId, setTerminatingId] = useState(null);
  const { logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getAdminSessionsApi();
      setSessions(response.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || t('devices_load_failed'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const terminate = async (session) => {
    const action = session.isCurrent ? t('sign_out_self_action') : t('terminate_session_action');
    if (!window.confirm(t('terminate_confirm', { action }))) return;
    setTerminatingId(session._id);
    try {
      const response = await terminateAdminSessionApi(session._id);
      if (session.isCurrent || response.data?.isCurrent) {
        logout();
        navigate('/admin/login', { replace: true });
        return;
      }
      setSessions((current) => current.filter((item) => item._id !== session._id));
      toast.success(t('device_terminated'));
    } catch (error) {
      toast.error(error.response?.data?.message || t('device_terminate_failed'));
    } finally {
      setTerminatingId(null);
    }
  };

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-2xl border border-cafe-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cafe-100 text-cafe-700">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-cafe-900">{t('admin_page_devices')}</h2>
            
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-cafe-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-cafe-100 px-5 py-4">
          <p className="text-sm font-semibold text-cafe-900">{t('active_sessions', { count: sessions.length })}</p>
          <button onClick={loadSessions} disabled={loading} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-cafe-700 hover:bg-cafe-100 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> {t('refresh')}
          </button>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-cafe-600">{t('loading_devices')}</p>
        ) : sessions.length === 0 ? (
          <p className="p-6 text-sm text-cafe-600">{t('no_device_sessions')}</p>
        ) : (
          <ul className="divide-y divide-cafe-100">
            {sessions.map((session) => (
              <li key={session._id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <MonitorSmartphone className="mt-0.5 h-5 w-5 shrink-0 text-cafe-600" aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-cafe-900">{session.deviceName}</p>
                      {session.isCurrent && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">{t('this_device')}</span>}
                    </div>
                    <p className="mt-1 text-xs text-cafe-600">{t('signed_in_last_active', { signedIn: formatDate(session.createdAt), lastActive: formatDate(session.lastActiveAt) })}</p>
                    {session.ipAddress && <p className="mt-1 text-xs text-cafe-500">{t('ip_address_label', { ip: session.ipAddress })}</p>}
                  </div>
                </div>
                <button onClick={() => terminate(session)} disabled={terminatingId === session._id} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50">
                  <Trash2 className="h-4 w-4" /> {terminatingId === session._id ? t('terminating') : t('terminate')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default AdminDevicesPage;
