import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) => {
  const [mounted, setMounted] = useState(isOpen);
  useEffect(() => {
    let timer;
    if (isOpen) setMounted(true);
    else timer = window.setTimeout(() => setMounted(false), 200);
    return () => window.clearTimeout(timer);
  }, [isOpen]);
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!mounted) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0"}`}>
      <div
        className={`relative w-full ${maxWidth} bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-200 border border-cafe-100 max-h-[90vh] flex flex-col ${isOpen ? "translate-y-0 scale-100" : "translate-y-3 scale-95"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cafe-100 bg-cafe-50">
          <h3 className="text-base font-bold text-cafe-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-cafe-500 hover:text-cafe-900 hover:bg-cafe-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
