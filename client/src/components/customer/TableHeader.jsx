import React from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react';

const TableHeader = ({ table }) => {
  const { t } = useTranslation();

  if (!table) return null;

  return (
    <div className="bg-cafe-700 text-cafe-100 px-4 py-2.5 shadow-inner border-b border-cafe-600 flex items-center justify-between text-xs">
      <div className="flex items-center gap-1.5 font-medium">
        <MapPin className="w-4 h-4 text-gold-500 shrink-0" />
        <span>
          {t('welcome_table', { number: table.tableNumber })}
          {table.tableName && <span className="text-cafe-300 ml-1">({table.tableName})</span>}
        </span>
      </div>
      <span className="bg-cafe-800 text-cafe-200 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-semibold border border-cafe-600">
        Verified QR
      </span>
    </div>
  );
};

export default TableHeader;
