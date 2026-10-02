import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../common/Modal';
import { composeQrCard, qrCardFileName } from '../../utils/qrCardImage';
import { Download, Printer, ExternalLink, Loader2, AlertCircle } from 'lucide-react';

const TableQRModal = ({ isOpen, onClose, table }) => {
  const { t } = useTranslation();
  const [cardUrl, setCardUrl] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  const menuUrl = table ? `${window.location.origin}/menu/table/${table._id}` : '';

  // Compose the branded card whenever the modal opens for a table
  useEffect(() => {
    if (!isOpen || !table) return;

    let cancelled = false;
    setStatus('loading');
    setCardUrl(null);

    composeQrCard({ qrSrc: table.qrCodeUrl, table })
      .then((canvas) => {
        if (cancelled) return;
        setCardUrl(canvas.toDataURL('image/png'));
        setStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, table]);

  const handleDownload = useCallback(() => {
    if (!cardUrl || !table) return;
    const link = document.createElement('a');
    link.href = cardUrl;
    link.download = qrCardFileName(table);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [cardUrl, table]);

  const handlePrint = useCallback(() => {
    if (!cardUrl || !table) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const heading = t('qr_modal_title', { number: table.tableNumber });
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${heading}</title>
          <style>
            @page { size: 1080px 1440px; margin: 0; }
            html, body { margin: 0; padding: 0; background: #ffffff; }
            img { display: block; width: 1080px; height: 1440px; }
          </style>
        </head>
        <body>
          <img src="${cardUrl}" alt="${heading}" />
          <script>
            window.onload = function () { window.focus(); window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, [cardUrl, table, t]);

  if (!table) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('qr_modal_title', { number: table.tableNumber })}
      maxWidth="max-w-sm"
    >
      <div className="flex flex-col items-center text-center space-y-4">
        {/* Composed print-ready card */}
        <div className="w-full rounded-2xl overflow-hidden border border-cafe-200 shadow-lg bg-cafe-50 dark:border-recipe-border dark:bg-recipe-card">
          {status === 'loading' && (
            <div className="aspect-[3/4] flex flex-col items-center justify-center gap-2 text-cafe-500">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs font-semibold">{t('generating_qr_card')}</span>
            </div>
          )}

          {status === 'error' && (
            <div className="aspect-[3/4] flex flex-col items-center justify-center gap-2 px-6 text-center">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <span className="text-xs font-semibold text-cafe-700 dark:text-recipe-muted">
                {t('qr_card_failed')}
              </span>
              {table.qrCodeUrl && (
                <img
                  src={table.qrCodeUrl}
                  alt={t('qr_modal_title', { number: table.tableNumber })}
                  className="w-40 h-40 object-contain"
                />
              )}
            </div>
          )}

          {status === 'ready' && cardUrl && (
            <img
              src={cardUrl}
              alt={t('qr_modal_title', { number: table.tableNumber })}
              className="w-full h-auto block"
            />
          )}
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
            disabled={!cardUrl}
            className="flex items-center justify-center gap-2 bg-cafe-800 hover:bg-cafe-900 text-white py-2.5 px-3 rounded-xl font-bold text-xs shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <span>{t('download')}</span>
          </button>
          <button
            onClick={handlePrint}
            disabled={!cardUrl}
            className="flex items-center justify-center gap-2 bg-cafe-100 hover:bg-cafe-200 text-cafe-800 border border-cafe-300 py-2.5 px-3 rounded-xl font-bold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:bg-recipe-pill dark:text-recipe-text dark:border-recipe-border"
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
