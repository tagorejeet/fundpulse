import React from 'react';

const StatusBadge = ({ isCached, lastUpdated, reportDate }) => {
  const formattedTime = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    : '';

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${
        isCached
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
      }`}>
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            isCached ? 'bg-amber-400' : 'bg-emerald-400'
          }`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${
            isCached ? 'bg-amber-500' : 'bg-emerald-500'
          }`}></span>
        </span>
        <span>{isCached ? 'Cached AMFI Data' : 'Live AMFI Data'}</span>
      </div>

      {reportDate && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/60">
          <span className="text-slate-400">AMFI Date:</span>
          <span className="font-semibold text-slate-100">{reportDate}</span>
        </div>
      )}

      {formattedTime && (
        <div className="hidden sm:inline-flex items-center gap-1.5 text-slate-400">
          <span>Synced: {formattedTime}</span>
        </div>
      )}
    </div>
  );
};

export default StatusBadge;
