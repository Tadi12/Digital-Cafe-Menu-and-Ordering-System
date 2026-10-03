import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  getTablesApi,
  createTableApi,
  updateTableApi,
  deleteTableApi,
  clearTableOccupancyApi,
} from '../../api/tableApi';
import TableQRModal from '../../components/admin/TableQRModal';
import Modal from '../../components/common/Modal';
import ConfirmModal from '../../components/common/ConfirmModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Plus, QrCode, Edit2, Trash2, CheckCircle2, XCircle, MapPin, Users, Unlock } from 'lucide-react';
import { resolveApiError } from '../../utils/apiError';

const TableManagerPage = () => {
  const { t } = useTranslation();

  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQRTable, setSelectedQRTable] = useState(null);

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [tableNumber, setTableNumber] = useState('');
  const [tableName, setTableName] = useState('');
  const [active, setActive] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null, num: '' });

  // Staff force-free (unlock) confirmation for an occupied table
  const [freeModal, setFreeModal] = useState({ isOpen: false, id: null, num: '' });

  const fetchTables = async () => {
    try {
      const res = await getTablesApi();
      if (res.success) setTables(res.data);
    } catch (err) {
      console.error('[Table Fetch Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  // Occupancy can expire server-side; treat an expired claim as free even if
  // the last poll predates the expiry.
  const isTableOccupied = (tbl) =>
    Boolean(
      tbl &&
        tbl.occupied &&
        (!tbl.occupancyExpiresAt || new Date(tbl.occupancyExpiresAt) > new Date()),
    );

  useEffect(() => {
    fetchTables();
  }, []);

  // Keep occupancy badges fresh: guests claim and release tables at any time.
  useEffect(() => {
    const refreshTimer = window.setInterval(() => {
      fetchTables();
    }, 30000);
    return () => window.clearInterval(refreshTimer);
  }, []);

  const handleOpenAdd = () => {
    setEditingTable(null);
    const nextNumber = tables.length > 0 ? Math.max(...tables.map((t) => t.tableNumber)) + 1 : 1;
    setTableNumber(nextNumber);
    setTableName(`Table ${nextNumber}`);
    setActive(true);
    setError('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (tbl) => {
    setEditingTable(tbl);
    setTableNumber(tbl.tableNumber);
    setTableName(tbl.tableName || '');
    setActive(tbl.active);
    setError('');
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!tableNumber || Number(tableNumber) <= 0) {
      setError(t('valid_table_number'));
      return;
    }

    setSaving(true);
    setError('');
    try {
      let res;
      if (editingTable) {
        res = await updateTableApi(editingTable._id, {
          tableNumber: Number(tableNumber),
          tableName,
          active,
        });
      } else {
        res = await createTableApi({
          tableNumber: Number(tableNumber),
          tableName,
          active,
        });
      }

      if (res.success) {
        setIsFormOpen(false);
        fetchTables();
      }
    } catch (err) {
      setError(resolveApiError(err, t, 'failed_save_table'));
    } finally {
      setSaving(false);
    }
  };

  const openDeleteConfirm = (id, num) => {
    setConfirmModal({ isOpen: true, id, num });
  };

  const handleConfirmDelete = async () => {
    const { id } = confirmModal;
    try {
      const res = await deleteTableApi(id);
      if (res.success) {
        setTables((prev) => prev.filter((t) => t._id !== id));
      }
    } catch (err) {
      toast.error(resolveApiError(err, t, 'failed_delete'));
    }
  };

  const handleConfirmFree = async () => {
    const { id } = freeModal;
    try {
      const res = await clearTableOccupancyApi(id);
      if (res.success) {
        setFreeModal({ isOpen: false, id: null, num: '' });
        fetchTables();
      }
    } catch (err) {
      toast.error(resolveApiError(err, t, 'free_table_failed'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-cafe-200 shadow-sm">
        <div>
          <h2 className="font-display font-semibold text-cafe-900 text-base">{t('table_management')}</h2>
         
        </div>
        <button
          onClick={handleOpenAdd}
          className="bg-cafe-800 hover:bg-cafe-900 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>{t('add_table')}</span>
        </button>
      </div>

      {/* Tables Grid */}
      {loading ? (
        <LoadingSpinner message={t('loading_tables')} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.length === 0 ? (
            <div className="col-span-full py-12 text-center text-cafe-500 font-medium">
              {t('no_tables')}
            </div>
          ) : (
            tables.map((tbl) => (
              <div
                key={tbl._id}
                className="bg-white rounded-2xl border border-cafe-200 p-4 shadow-sm space-y-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-cafe-100 text-cafe-900 font-black flex items-center justify-center text-base border border-cafe-200">
                      #{tbl.tableNumber}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-cafe-900">
                        {tbl.tableName || `Table ${tbl.tableNumber}`}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                          tbl.active ? 'text-emerald-600' : 'text-red-500'
                        }`}
                      >
                        {tbl.active ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> {t('active')}
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" /> {t('out_of_service')}
                          </>
                        )}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${isTableOccupied(tbl) ? 'text-amber-600' : 'text-emerald-700'}`}>
                        {isTableOccupied(tbl) ? (
                          <>
                            <Users className="w-3 h-3" /> {t('table_occupied')}
                          </>
                        ) : (
                          <>
                            <Unlock className="w-3 h-3" /> {t('table_free')}
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(tbl)}
                      className="p-1.5 rounded-lg text-cafe-600 hover:text-cafe-900 hover:bg-cafe-100 transition-colors"
                      title={t('edit_table')}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openDeleteConfirm(tbl._id, tbl.tableNumber)}
                      className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                      title={t('delete_table_title')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* QR Code Action Button */}
                <button
                  onClick={() => setSelectedQRTable(tbl)}
                  className="w-full bg-cafe-50 hover:bg-cafe-100 text-cafe-800 border border-cafe-200 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <QrCode className="w-4 h-4 text-cafe-600" />
                  <span>{t('view_download_qr')}</span>
                </button>

                {isTableOccupied(tbl) && (
                  <button
                    onClick={() => setFreeModal({ isOpen: true, id: tbl._id, num: tbl.tableNumber })}
                    className="w-full bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <Unlock className="w-4 h-4 text-amber-600" />
                    <span>{t('free_table_action')}</span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Add / Edit Table Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingTable ? t('edit_table') : t('add_table')}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-cafe-800 uppercase tracking-wider mb-1">
              {t('table_number')} *
            </label>
            <input
              type="number"
              min="1"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-cafe-200 text-sm focus:border-cafe-600 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-cafe-800 uppercase tracking-wider mb-1">
              {t('table_name')}
            </label>
            <input
              type="text"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder={t('table_name_placeholder')}
              className="w-full px-3 py-2 rounded-xl border border-cafe-200 text-sm focus:border-cafe-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-cafe-50 rounded-xl border border-cafe-200">
            <div>
              <span className="font-bold text-xs text-cafe-900 block">{t('table_active_status')}</span>
              <span className="text-[11px] text-cafe-500">{t('allow_table_orders')}</span>
            </div>
            <button
              type="button"
              onClick={() => setActive(!active)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                active ? 'bg-emerald-600' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform ${
                  active ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-cafe-100">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-cafe-700 hover:bg-cafe-100 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-cafe-800 hover:bg-cafe-900 text-white px-5 py-2 rounded-xl font-bold text-xs shadow-md transition-all disabled:opacity-50"
            >
              {saving ? t('updating') : editingTable ? t('update') : t('create')}
            </button>
          </div>
        </form>
      </Modal>

      {/* QR Preview & Download Modal */}
      <TableQRModal
        isOpen={!!selectedQRTable}
        onClose={() => setSelectedQRTable(null)}
        table={selectedQRTable}
      />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={handleConfirmDelete}
        title={t('delete_table_title', 'Delete Table')}
        message={t('delete_table_confirm', { number: confirmModal.num })}
        confirmText={t('delete', 'Delete')}
        isDestructive={true}
      />
      <ConfirmModal
        isOpen={freeModal.isOpen}
        onClose={() => setFreeModal({ isOpen: false, id: null, num: '' })}
        onConfirm={handleConfirmFree}
        title={t('free_table_action')}
        message={t('free_table_confirm', { number: freeModal.num })}
        confirmText={t('free_table_action')}
      />
    </div>
  );
};

export default TableManagerPage;


