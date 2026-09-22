import React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';

const MetricCard = ({ title, value, icon: Icon, color = 'bg-cafe-800 text-white', subtext, delta }) => {
  const tone = color.includes('emerald') ? 'bg-emerald-100 text-emerald-700' : color.includes('amber') ? 'bg-amber-100 text-amber-700' : color.includes('blue') ? 'bg-blue-100 text-blue-700' : 'bg-cafe-100 text-cafe-800';
  const hasDelta = delta !== undefined && delta !== null && delta !== '';
  const isPositive = Number(delta) >= 0;
  return (
    <div className="bg-white rounded-2xl p-4 border border-cafe-100 shadow-sm flex items-center justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div>
        <p className="text-xs font-semibold text-cafe-500 uppercase tracking-wider mb-1">
          {title}
        </p>
        <h3 className="font-display text-xl font-extrabold text-cafe-900 tracking-tight">{value}</h3>
        {hasDelta ? <p className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold ${isPositive ? 'text-emerald-700' : 'text-red-700'}`}><span aria-hidden="true">{isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}</span>{typeof delta === 'number' ? `${Math.abs(delta)}%` : delta}</p> : subtext && <p className="text-[11px] text-cafe-400 mt-0.5">{subtext}</p>}
      </div>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${tone}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
};

export default MetricCard;
