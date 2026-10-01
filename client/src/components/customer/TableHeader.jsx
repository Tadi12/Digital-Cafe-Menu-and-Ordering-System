import React from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react';

const TableHeader = ({ table }) => {
  const { t } = useTranslation();

  if (!table) return null;

  // Use the custom cafe table setting image uploaded by the user
  const cafeTableBg = "/images/cafe-table-bg.jpg";

  // Check if tableName is distinct and not repeating "Table <number>" or the welcome text
  const isCustomTableName =
    table.tableName &&
    table.tableName.trim().toLowerCase() !== `table ${table.tableNumber}`.toLowerCase() &&
    table.tableName.trim().toLowerCase() !== `table #${table.tableNumber}`.toLowerCase() &&
    table.tableName.trim().toLowerCase() !== `table${table.tableNumber}`.toLowerCase();

  return (
    <div className="relative overflow-hidden shadow-lg border-b border-black/40 min-h-[105px] sm:min-h-[115px] flex items-center">
      {/* Background Image */}
      <img
        src={cafeTableBg}
        alt="Cafe Table Background"
        className="absolute inset-0 w-full h-full object-cover object-center transform scale-105"
      />

      {/* Subtle balanced dark gradient overlay so image shines through while text stays readable */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/45 to-black/60" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30" />

      {/* Decorative ambient warm glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/25 rounded-full blur-2xl pointer-events-none" />

      {/* Content Container */}
      <div className="relative z-10 w-full px-4 py-4 flex items-center justify-between gap-3">
        {/* Left: Table details */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/30 border border-amber-400/60 text-amber-300 shadow-lg shrink-0 backdrop-blur-sm">
            <MapPin className="w-6 h-6 text-amber-300 drop-shadow" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display font-black text-white text-lg sm:text-xl tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                {t('welcome_table', { number: table.tableNumber })}
              </span>
              {isCustomTableName && (
                <span className="bg-amber-950/70 text-amber-200 font-semibold text-xs px-2.5 py-0.5 rounded-md border border-amber-400/40 backdrop-blur-sm drop-shadow">
                  {table.tableName}
                </span>
              )}
            </div>

            <div className="text-xs text-amber-200 font-medium mt-1 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">
              
            </div>
          </div>
        </div>

        {/* Right: Verified QR Badge */}
        <div className="shrink-0">
          <span className="bg-black/75 backdrop-blur-md text-amber-300 px-3 py-1.5 rounded-full text-[11px] uppercase tracking-wider font-extrabold border border-amber-400/50 shadow-lg flex items-center gap-1.5 drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            <span className="text-white font-bold">{t('verified_qr')}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default TableHeader;



