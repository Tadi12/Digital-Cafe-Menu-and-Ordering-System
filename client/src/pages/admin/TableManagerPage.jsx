import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getTablesApi,
  createTableApi,
  updateTableApi,
  deleteTableApi,
} from '../../api/tableApi';
import TableQRModal from '../../components/admin/TableQRModal';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Plus, QrCode, Edit2, Trash2, CheckCircle2, XCircle, MapPin } from 'lucide-react';

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

  useEffect(() => {
    fetchTables();
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
      setError('Valid table number is required.');
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
      setError(err.response?.data?.message || 'Failed to save table.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTable = async (id, num) => {
    if (!window.confirm(`Are you sure you want to delete Table #${num}?`)) return;

    try {
      const res = await deleteTableApi(id);
      if (res.success) {
        setTables((prev) => prev.filter((t) => t._id !== id));
      }
    } catch (err) {
      alert('Failed to delete table.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-cafe-200 shadow-sm">
        <div>
          <h2 className="font-bold text-cafe-900 text-sm">{t('table_management')}</h2>
          <p className="text-xs text-cafe-500">
            Generate and manage unique QR code URLs for cafe tables
          </p>
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
        <LoadingSpinner message="Loading cafe tables & QR codes..." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.length === 0 ? (
            <div className="col-span-full py-12 text-center text-cafe-500 font-medium">
              No tables configured yet.
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
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" /> Out of Service
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(tbl)}
                      className="p-1.5 rounded-lg text-cafe-600 hover:text-cafe-900 hover:bg-cafe-100 transition-colors"
                      title="Edit Table"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTable(tbl._id, tbl.tableNumber)}
                      className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                      title="Delete Table"
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
                  <span>View / Download QR Code</span>
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add / Edit Table Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingTable ? 'Edit Table' : t('add_table')}
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
              placeholder="e.g. Terrace Window Table 1"
              className="w-full px-3 py-2 rounded-xl border border-cafe-200 text-sm focus:border-cafe-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-cafe-50 rounded-xl border border-cafe-200">
            <div>
              <span className="font-bold text-xs text-cafe-900 block">Table Active Status</span>
              <span className="text-[11px] text-cafe-500">Allow customers to scan & order from this table</span>
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-cafe-800 hover:bg-cafe-900 text-white px-5 py-2 rounded-xl font-bold text-xs shadow-md transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingTable ? 'Update Table' : 'Create Table'}
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
    </div>
  );
};

export default TableManagerPage;
