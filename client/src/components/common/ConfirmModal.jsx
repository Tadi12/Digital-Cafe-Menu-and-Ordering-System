import React from 'react';
import Modal from './Modal';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText, isDestructive = true }) => {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-sm">
      <div className="flex flex-col items-center text-center">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isDestructive ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-cafe-100 text-cafe-600 dark:bg-cafe-900/30 dark:text-cafe-400'}`}>
          <AlertCircle className="w-6 h-6" />
        </div>
        <p className="text-cafe-700 dark:text-recipe-muted mb-6">
          {message}
        </p>
        <div className="flex gap-3 w-full">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-cafe-200 text-cafe-700 font-medium hover:bg-cafe-50 transition-colors dark:border-recipe-border dark:text-recipe-text dark:hover:bg-recipe-pill"
          >
            {cancelText || t('cancel', 'Cancel')}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-white transition-colors ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2'
                : 'bg-cafe-800 hover:bg-cafe-900 focus:ring-2 focus:ring-cafe-800 focus:ring-offset-2'
            }`}
          >
            {confirmText || t('confirm', 'Confirm')}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
