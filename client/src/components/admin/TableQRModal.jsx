import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../common/Modal';
import { Download, Printer, ExternalLink } from 'lucide-react';

const TableQRModal = ({ isOpen, onClose, table }) => {
  const { t } = useTranslation();

  if (!table) return null;

  const menuUrl = `${window.location.origin}/menu/table/${table._id}`;

  const handleDownload = () => {
    if (!table.qrCodeUrl) return;
    const link = document.createElement('a');
    link.href = table.qrCodeUrl;
    link.download = `Cafe-Table-${table.tableNumber}-QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${t('qr_modal_title', { number: table.tableNumber })}</title>
          <style>
            body {
              font-family: 'Inter', sans-serif;
              text-align: center;
              padding: 40px;
              background-color: #FAF7F2;
            }
            .card {
              border: 3px solid #3D2314;
              border-radius: 20px;
              padding: 30px;
              max-width: 380px;
              margin: 0 auto;
              background: white;
            }
            h1 { color: #3D2314; margin-bottom: 5px; font-size: 28px; }
            h2 { color: #8B5A2B; margin-top: 0; font-size: 18px; }
            img { width: 260px; height: 260px; margin: 20px 0; }
            p { color: #5C3A21; font-size: 14px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>${t('qr_print_heading')}</h1>
            <h2>${t('table_number_label', { number: table.tableNumber })} ${table.tableName ? `(${table.tableName})` : ''}</h2>
            <img src="${table.qrCodeUrl}" alt="QR Code" />
            <p>${t('qr_print_instruction')}</p>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('qr_modal_title', { number: table.tableNumber })}
      maxWidth="max-w-sm"
    >
      <div className="flex flex-col items-center text-center space-y-4">
        {/* QR Code Container */}
        <div className="p-4 bg-cafe-50 border-2 border-cafe-800 rounded-2xl shadow-inner">
          <img
            src={table.qrCodeUrl}
            alt={t('qr_modal_title', { number: table.tableNumber })}
            className="w-56 h-56 object-contain rounded-lg"
          />
        </div>

        {/* Info */}
        <div>
          <h4 className="font-bold text-cafe-900 text-base">
            {t('table_number_label', { number: table.tableNumber })}
          </h4>
          {table.tableName && (
            <p className="text-xs text-cafe-600 font-medium">{table.tableName}</p>
          )}
          <a
            href={menuUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-cafe-500 hover:text-cafe-800 underline mt-1 inline-flex items-center gap-1 font-mono"
          >
            <span>/menu/table/{table._id}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 w-full pt-2">
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 bg-cafe-800 hover:bg-cafe-900 text-white py-2.5 px-3 rounded-xl font-bold text-xs shadow transition-all"
          >
            <Download className="w-4 h-4" />
            <span>{t('download')}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 bg-cafe-100 hover:bg-cafe-200 text-cafe-800 border border-cafe-300 py-2.5 px-3 rounded-xl font-bold text-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>{t('print')}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default TableQRModal;
