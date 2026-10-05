import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axiosClient from '../../api/axiosClient';
import { resolveApiError } from '../../utils/apiError';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ActionButton from '../../components/common/ActionButton';
import ConfirmModal from '../../components/common/ConfirmModal';
import { useAuth } from '../../hooks/useAuth';
import { CheckCircle2, XCircle, Trash2 } from 'lucide-react';

const StaffManagerPage = () => {
  const [staff, setStaff] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('waiter');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false);
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [recentlyToggled, setRecentlyToggled] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null, name: '' });
  // Ref locks make the duplicate-click guard synchronous — `togglingId` and
  // `deletingId` are state and do not update until the next render, so a double
  // tap would otherwise send two toggles and land the account back where it
  // started. Same reasoning as `creatingRef` above.
  const togglingIdRef = useRef(null);
  const deletingIdRef = useRef(null);
  const { t } = useTranslation();
  const { admin } = useAuth();

  // The server refuses to let an admin create a super_admin (see ROLE_RANK in
  // server/controllers/authController.js), so only offer the option to somebody
  // who could actually create one — otherwise the form presents a choice that
  // always fails.
  const canAssignSuperAdmin = admin?.role === 'super_admin';

  // Mirrors ROLE_RANK on the server. The server is the authority and re-checks
  // every one of these, but a management account must not be able to fill its own
  // staff panel with buttons that are guaranteed to fail.
  const ROLE_RANK = { waiter: 1, chef: 1, barista: 1, admin: 2, super_admin: 3 };
  const myRank = ROLE_RANK[admin?.role] || 0;

  // You cannot disable or delete yourself, and you cannot act on somebody who
  // outranks you. Both are refused server-side too; hiding them here is what
  // stops the roster from offering an action that always errors.
  const canManage = (member) =>
    member._id !== admin?._id && (ROLE_RANK[member.role] || 0) <= myRank;

  const fetchStaff = async () => {
    try {
      const res = await axiosClient.get('/auth/staff');
      if (res.data?.success) {
        setStaff(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Synchronous ref lock: `creating` is state and does not update until the
    // next render, so without this a double submit creates two staff accounts.
    if (creatingRef.current) return;
    creatingRef.current = true;
    setCreating(true);

    try {
      const res = await axiosClient.post('/auth/staff', { name, email, password, role });
      if (res.data?.success) {
        setSuccess(t('staff_created_success'));
        setName(''); setEmail(''); setPassword('');
        await fetchStaff();
      }
    } catch (err) {
      setError(resolveApiError(err, t, 'failed_create_staff'));
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
  };

  const handleToggleStatus = async (id) => {
    if (togglingIdRef.current === id) return;
    togglingIdRef.current = id;
    setTogglingId(id);
    try {
      const res = await axiosClient.patch(`/auth/staff/${id}/status`);
      const updated = res.data?.data;
      if (res.data?.success && updated) {
        // Paint the server's own answer on the frame the request settles rather
        // than leaving the row showing its old state until a refetch lands.
        setStaff((prev) => prev.map((s) => (s._id === updated._id ? { ...s, ...updated } : s)));
        setSuccess(updated.isActive ? t('staff_enabled_success') : t('staff_disabled_success'));
        setError('');
        // Brief confirmation on the pill, then back to its real label.
        setRecentlyToggled(id);
        window.setTimeout(() => setRecentlyToggled(null), 1200);
      }
    } catch (err) {
      setError(resolveApiError(err, t, 'failed_update_staff'));
    } finally {
      // Released in finally so the pill can never stay stuck mid-spin.
      togglingIdRef.current = null;
      setTogglingId((current) => (current === id ? null : current));
    }
  };

  const openDeleteConfirm = (id, memberName) => {
    setConfirmModal({ isOpen: true, id, name: memberName });
  };

  const handleConfirmDelete = async () => {
    const { id, name: memberName } = confirmModal;
    if (deletingIdRef.current === id) return;
    deletingIdRef.current = id;
    setDeletingId(id);
    try {
      const res = await axiosClient.delete(`/auth/staff/${id}`);
      if (res.data?.success) {
        setStaff((prev) => prev.filter((s) => s._id !== id));
        setSuccess(t('staff_deleted_success', { name: memberName }));
        setError('');
      }
    } catch (err) {
      setError(resolveApiError(err, t, 'failed_delete_staff'));
    } finally {
      deletingIdRef.current = null;
      setDeletingId((current) => (current === id ? null : current));
    }
  };

  if (loading) return <LoadingSpinner message={t('loading_staff')} />;

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-cafe-900">{t('staff_management')}</h1>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-cafe-200">
        <h2 className="text-lg font-semibold mb-4">{t('create_staff_account')}</h2>
        {error && <div className="text-red-500 mb-4 bg-red-50 p-3 rounded-xl text-sm">{error}</div>}
        {success && <div className="text-green-600 mb-4 bg-green-50 p-3 rounded-xl text-sm">{success}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-cafe-700 mb-1">{t('name')}</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full border rounded-xl px-4 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-cafe-700 mb-1">{t('email')}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full border rounded-xl px-4 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-cafe-700 mb-1">{t('password')}</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} className="w-full border rounded-xl px-4 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-cafe-700 mb-1">{t('role')}</label>
              <select value={role} onChange={e => setRole(e.target.value)} className="w-full border rounded-xl px-4 py-2">
                <option value="waiter">{t('role_waiter')}</option>
                <option value="chef">{t('role_chef')}</option>
                <option value="barista">{t('role_barista')}</option>
                {canAssignSuperAdmin && <option value="super_admin">{t('role_super_admin')}</option>}
                {canAssignSuperAdmin && <option value="admin">{t('role_admin')}</option>}
              </select>
            </div>
          </div>
          <ActionButton
            type="submit"
            loading={creating}
            loadingText={t('creating_account')}
            className="bg-cafe-800 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-cafe-900 transition"
          >
            {t('create_account')}
          </ActionButton>
        </form>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-cafe-200">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h2 className="text-lg font-semibold">{t('current_staff')}</h2>
          {error && <div className="text-red-500 bg-red-50 p-2 rounded-xl text-xs">{error}</div>}
          {success && <div className="text-green-600 bg-green-50 p-2 rounded-xl text-xs">{success}</div>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-cafe-50 text-cafe-600">
              <tr>
                <th className="px-4 py-3 font-semibold rounded-l-xl">{t('name')}</th>
                <th className="px-4 py-3 font-semibold">{t('email')}</th>
                <th className="px-4 py-3 font-semibold">{t('role')}</th>
                <th className="px-4 py-3 font-semibold">{t('status')}</th>
                <th className="px-4 py-3 font-semibold text-right rounded-r-xl">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {staff.map(s => {
                const manageable = canManage(s);
                // Accounts predating the isActive field come back from the server
                // already normalised, so only an explicit false means disabled.
                const isActive = s.isActive !== false;
                return (
                  <tr
                    key={s._id}
                    className={`border-b border-cafe-100 last:border-0 ${isActive ? '' : 'bg-cafe-50/60'}`}
                  >
                    <td className="px-4 py-3 font-medium text-cafe-900">
                      {s.name}
                      {s._id === admin?._id && (
                        <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-cafe-500">
                          {t('you')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-cafe-600">{s.email}</td>
                    <td className="px-4 py-3">
                      <span className="bg-cafe-100 text-cafe-800 px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">{t(`role_${s.role}`, { defaultValue: s.role })}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {isActive ? t('active') : t('disabled')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {!manageable ? (
                          <span
                            className="text-[11px] text-cafe-400 text-right"
                            title={t('cannot_manage_this_account')}
                          >
                            {s._id === admin?._id ? t('your_own_account') : t('higher_role')}
                          </span>
                        ) : (
                          <>
                            <ActionButton
                              onClick={() => handleToggleStatus(s._id)}
                              loading={togglingId === s._id}
                              loadingText={t('updating')}
                              success={togglingId === null && recentlyToggled === s._id}
                              successText={isActive ? t('disabled') : t('active')}
                              icon={isActive ? CheckCircle2 : XCircle}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors disabled:opacity-70 ${
                                isActive
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-red-100 text-red-800 hover:bg-red-200'
                              }`}
                              title={isActive ? t('disable_account') : t('enable_account')}
                            >
                              {isActive ? t('disable') : t('enable')}
                            </ActionButton>
                            <ActionButton
                              onClick={() => openDeleteConfirm(s._id, s.name)}
                              loading={deletingId === s._id}
                              icon={Trash2}
                              iconClassName="w-4 h-4 shrink-0"
                              className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
                              title={t('delete_staff_title')}
                              aria-label={t('delete_staff_title')}
                            />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={handleConfirmDelete}
        title={t('delete_staff_title', 'Delete Staff Account')}
        message={t('delete_staff_confirm', { name: confirmModal.name })}
        confirmText={t('delete', 'Delete')}
        isDestructive={true}
      />
    </div>
  );
};

export default StaffManagerPage;
