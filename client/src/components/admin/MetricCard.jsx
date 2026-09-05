import React from 'react';

const MetricCard = ({ title, value, icon: Icon, color = 'bg-cafe-800 text-white', subtext }) => {
  return (
    <div className="bg-white rounded-2xl p-4 border border-cafe-100 shadow-sm flex items-center justify-between">
      <div>
        <p className="text-xs font-semibold text-cafe-500 uppercase tracking-wider mb-1">
          {title}
        </p>
        <h3 className="text-xl font-extrabold text-cafe-900 tracking-tight">{value}</h3>
        {subtext && <p className="text-[11px] text-cafe-400 mt-0.5">{subtext}</p>}
      </div>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-xs shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
};

export default MetricCard;
