import React, { useState, useMemo } from 'react';
import { 
  Search, 
  TrendingUp, 
  Calendar, 
  Info, 
  Download, 
  Check, 
  RefreshCw, 
  ChevronRight, 
  X, 
  Calculator,
  ShieldCheck,
  Building2,
  Layers
} from 'lucide-react';

const NseIndicesTable = ({
  indices = [],
  isLoading = false,
  selectedDate = '',
  onSelectDate,
  mode = 'yearly',
  customDaysList = [33, 50, 67],
  source = 'NSE India / NSE Indices',
  lastUpdated = null,
  isCached = false,
  selectedNseIndexIds = new Set(),
  onToggleSelectIndex,
  onToggleSelectAll,
  onExportNseExcel,
  onRefreshNse
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAuditIndex, setSelectedAuditIndex] = useState(null);
  const [auditTab, setAuditTab] = useState(mode === 'days' ? 'days' : 'yearly');
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Helper to convert date to YYYY-MM-DD for date input
  const toInputDateFormat = (dateStr) => {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const parts = String(dateStr).split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 2 && parts[2].length === 4) {
        // DD-MM-YYYY -> YYYY-MM-DD
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return '';
  };

  // Helper to convert date to DD-MM-YYYY for display
  const toDisplayDateFormat = (dateStr) => {
    if (!dateStr) return '';
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return dateStr;
    const parts = String(dateStr).split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD -> DD-MM-YYYY
        return `${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[0]}`;
      }
    }
    return dateStr;
  };

  const getDayOfWeekInfo = (dateStr) => {
    if (!dateStr) return { dayName: '', fullDayName: '', isWeekend: false };
    try {
      const parts = String(dateStr).split(/[-/]/);
      let d;
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        } else {
          d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        }
        const dayIdx = d.getDay();
        return {
          dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
          fullDayName: d.toLocaleDateString('en-US', { weekday: 'long' }),
          isWeekend: dayIdx === 0 || dayIdx === 6
        };
      }
    } catch (e) {}
    return { dayName: '', fullDayName: '', isWeekend: false };
  };

  const daysListToUse = useMemo(() => {
    if (customDaysList && customDaysList.length > 0) return customDaysList;
    if (indices && indices[0]?.customDaysList) return indices[0].customDaysList;
    return [33, 50, 67];
  }, [customDaysList, indices]);

  // Keep audit tab in sync if mode changes
  const handleOpenAuditModal = (idx) => {
    setSelectedAuditIndex(idx);
    setAuditTab(mode === 'days' ? 'days' : 'yearly');
  };

  const [activeCategory, setActiveCategory] = useState('all');

  const categoryCounts = useMemo(() => {
    const counts = { all: indices.length, 'Broad Market': 0, 'Sectoral': 0, 'Thematic': 0 };
    indices.forEach(idx => {
      if (idx.category === 'Broad Market') counts['Broad Market']++;
      else if (idx.category === 'Sectoral') counts['Sectoral']++;
      else counts['Thematic']++;
    });
    return counts;
  }, [indices]);

  // Filter indices based on category and search query
  const filteredIndices = useMemo(() => {
    if (!indices || indices.length === 0) return [];
    return indices.filter(idx => {
      if (activeCategory !== 'all') {
        if (activeCategory === 'Thematic') {
          if (idx.category !== 'Thematic' && idx.category !== 'Strategy') return false;
        } else if (idx.category !== activeCategory) {
          return false;
        }
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        idx.displayName.toLowerCase().includes(q) ||
        idx.id.toLowerCase().includes(q) ||
        idx.officialName.toLowerCase().includes(q) ||
        (idx.category && idx.category.toLowerCase().includes(q)) ||
        (idx.subCategory && idx.subCategory.toLowerCase().includes(q))
      );
    });
  }, [indices, activeCategory, searchQuery]);

  const allIndicesSelected = useMemo(() => {
    if (!indices || indices.length === 0) return false;
    return indices.every(idx => selectedNseIndexIds.has(idx.id));
  }, [indices, selectedNseIndexIds]);

  const allFilteredSelected = useMemo(() => {
    if (!filteredIndices || filteredIndices.length === 0) return false;
    return filteredIndices.every(idx => selectedNseIndexIds.has(idx.id));
  }, [filteredIndices, selectedNseIndexIds]);

  const formatPct = (val) => {
    if (val === null || val === undefined || isNaN(val)) return <span className="text-slate-500 font-sans">N/A</span>;
    const num = Number(val);
    const formatted = num.toFixed(2);
    const isPositive = num > 0;
    return (
      <span className={num === 0 ? 'text-slate-300 font-medium' : isPositive ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
        {isPositive ? `+${formatted}%` : `${formatted}%`}
      </span>
    );
  };

  const formatValue = (val) => {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Get common data date from first available index
  const commonDataDate = useMemo(() => {
    const firstWithDate = indices.find(i => i.dataDate);
    return firstWithDate ? firstWithDate.dataDate : 'N/A';
  }, [indices]);

  const totalCols = mode === 'days' ? (5 + daysListToUse.length) : 10;

  return (
    <div className="mt-14 pt-10 border-t-2 border-slate-800/80 space-y-6">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                NSE Indices
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Benchmark Data
                </span>
                {mode === 'days' && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-brand-500/15 text-brand-300 border border-brand-500/30">
                    Day Returns ({daysListToUse.join('D, ')}D)
                  </span>
                )}
              </h2>
              <p className="text-sm text-slate-400">
                Official NSE benchmark index data
              </p>
            </div>
          </div>
        </div>

        {/* Source Badge & Status */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <span className="text-slate-500">Source:</span>
            <span className="font-semibold text-slate-200">NSE India / NSE Indices</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <span className={`w-2 h-2 rounded-full ${isCached ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
            <span className="text-slate-400 font-medium">
              NSE: <strong className={isCached ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>{isCached ? 'Cached' : 'Live'}</strong>
            </span>
          </div>

          {onRefreshNse && (
            <button
              onClick={onRefreshNse}
              disabled={isLoading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all disabled:opacity-50"
              title="Refresh NSE Data (Resets to Today's Values)"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-400' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Date Alignment & Interactive Calendar Picker Banner */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Calendar Date Picker Input */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-brand-500/30 shadow-inner">
            <Calendar className="w-4 h-4 text-brand-400 shrink-0" />
            <span className="text-slate-400 font-medium">Valuation Date:</span>
            <input
              type="date"
              value={toInputDateFormat(selectedDate) || todayStr}
              max={todayStr}
              onChange={(e) => onSelectDate && onSelectDate(e.target.value)}
              className="px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-900 text-white border border-slate-700 focus:outline-none focus:border-brand-500 cursor-pointer"
              title="Pick valuation date for NSE returns calculation"
            />
            {(() => {
              const info = getDayOfWeekInfo(selectedDate || todayStr);
              if (!info.dayName) return null;
              return (
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    info.isWeekend
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                  title={info.isWeekend ? `${info.fullDayName} (Weekend / Non-Trading Day)` : `${info.fullDayName} (Trading Day)`}
                >
                  {info.dayName} {info.isWeekend ? '• Closed' : '• Trading'}
                </span>
              );
            })()}

            {toInputDateFormat(selectedDate) && toInputDateFormat(selectedDate) !== todayStr && (
              <button
                type="button"
                onClick={() => onSelectDate && onSelectDate(todayStr)}
                className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-brand-600 hover:bg-brand-500 text-white transition-all shadow-sm"
                title="Reset Valuation Date to Today"
              >
                Today
              </button>
            )}
          </div>

          {/* Actual NSE Trading Date Badge */}
          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-xl text-slate-300 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Trading Session: <strong className="text-emerald-400 font-bold font-mono">{commonDataDate}</strong></span>
          </div>

          <span className="text-slate-500 text-[11px] hidden xl:inline">
            (Weekend / non-trading days automatically fallback to latest trading session ≤ chosen date)
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Master Select / Deselect All NSE Benchmarks Button */}
          <button
            type="button"
            onClick={() => onToggleSelectAll && onToggleSelectAll(null, !allIndicesSelected)}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all shadow-sm ${
              allIndicesSelected
                ? 'bg-brand-600/25 text-brand-300 border-brand-500/50 hover:bg-brand-600/35'
                : selectedNseIndexIds.size > 0
                ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
            title={allIndicesSelected ? "Deselect all NSE indices" : "Select all NSE indices"}
          >
            <input
              type="checkbox"
              checked={allIndicesSelected}
              onChange={() => onToggleSelectAll && onToggleSelectAll(null, !allIndicesSelected)}
              className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-800 text-brand-600 focus:ring-brand-500 cursor-pointer accent-brand-500"
              onClick={(e) => e.stopPropagation()}
            />
            <span>
              {allIndicesSelected 
                ? `Select All (${indices.length})` 
                : `Select All (${selectedNseIndexIds.size}/${indices.length})`}
            </span>
          </button>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search NSE indices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-950/80 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all w-44 sm:w-52"
            />
          </div>

          {/* Export NSE Button */}
          {onExportNseExcel && (
            <button
              onClick={() => onExportNseExcel(selectedNseIndexIds)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all"
              title="Download selected NSE benchmark indices into Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download NSE List ({selectedNseIndexIds.size})</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Pills Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeCategory === 'all'
                ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span>All Benchmarks</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800/90 text-brand-300 font-mono">
              {categoryCounts.all}
            </span>
          </button>

          <button
            onClick={() => setActiveCategory('Broad Market')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeCategory === 'Broad Market'
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span>Broad Market</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800/90 text-brand-300 font-mono">
              {categoryCounts['Broad Market']}
            </span>
          </button>

          <button
            onClick={() => setActiveCategory('Sectoral')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeCategory === 'Sectoral'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span>Sectoral</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800/90 text-emerald-300 font-mono">
              {categoryCounts['Sectoral']}
            </span>
          </button>

          <button
            onClick={() => setActiveCategory('Thematic')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeCategory === 'Thematic'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span>Thematic & Strategy</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800/90 text-amber-300 font-mono">
              {categoryCounts['Thematic']}
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-400 px-2 font-medium">
          Showing <strong className="text-white">{filteredIndices.length}</strong> of <strong className="text-white">{indices.length}</strong> indices
        </div>
      </div>

      {/* Main NSE Table */}
      <div className="glass-card rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold border-b border-slate-800/80 tracking-wider">
              <tr>
                {/* Select All Checkbox */}
                <th className="p-3.5 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={allIndicesSelected}
                    onChange={() => onToggleSelectAll && onToggleSelectAll(null, !allIndicesSelected)}
                    title={allIndicesSelected ? "Deselect all NSE indices" : "Select all NSE indices"}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-brand-600 focus:ring-brand-500 cursor-pointer accent-brand-500"
                  />
                </th>

                <th className="p-3.5 min-w-[200px]">Index Name</th>
                <th className="p-3.5 text-right min-w-[120px]">Index Value (Close)</th>
                
                {mode === 'days' ? (
                  daysListToUse.map(d => (
                    <th key={d} className="p-3.5 text-right min-w-[90px]">{d}D</th>
                  ))
                ) : (
                  <>
                    <th className="p-3.5 text-right min-w-[90px]">1Y</th>
                    <th className="p-3.5 text-right min-w-[90px]">2Y</th>
                    <th className="p-3.5 text-right min-w-[90px]">3Y</th>
                    <th className="p-3.5 text-right min-w-[90px]">5Y</th>
                    <th className="p-3.5 text-right min-w-[90px]">10Y</th>
                  </>
                )}

                <th className="p-3.5 text-center min-w-[140px]">Valuation Date</th>
                <th className="p-3.5 text-center w-24">Audit Details</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60 font-mono">
              {isLoading ? (
                <tr>
                  <td colSpan={totalCols} className="p-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-3">
                      <RefreshCw className="w-5 h-5 text-brand-400 animate-spin" />
                      <span className="font-sans text-sm">Fetching official NSE index benchmark data...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredIndices.length === 0 ? (
                <tr>
                  <td colSpan={totalCols} className="p-8 text-center text-slate-500 font-sans">
                    No matching NSE indices found for "{searchQuery}".
                  </td>
                </tr>
              ) : (
                filteredIndices.map((idx) => {
                  const isChecked = selectedNseIndexIds.has(idx.id);
                  return (
                    <tr
                      key={idx.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isChecked ? 'bg-brand-500/5' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggleSelectIndex && onToggleSelectIndex(idx.id)}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-brand-600 focus:ring-brand-500 cursor-pointer accent-brand-500"
                        />
                      </td>

                      {/* Index Display Name & Official Note */}
                      <td className="p-3.5 font-sans">
                        <div className="flex items-start gap-2.5">
                          <Building2 className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
                          <div>
                            <div className="text-white font-bold text-sm tracking-tight flex items-center gap-2">
                              {idx.displayName}
                              {idx.dayChangePct !== null && (
                                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                                  idx.dayChangePct >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                }`}>
                                  {idx.dayChangePct >= 0 ? `+${idx.dayChangePct}%` : `${idx.dayChangePct}%`}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span className="text-brand-300 font-mono font-medium">Official: {idx.officialName}</span>
                              <span>•</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700/60 font-semibold">
                                {idx.category}{idx.subCategory ? ` • ${idx.subCategory}` : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Index Value / Close */}
                      <td className="p-3.5 text-right font-bold text-white text-sm">
                        {formatValue(idx.currentValue)}
                        {idx.dayChange !== null && idx.dayChange !== undefined && typeof idx.dayChange === 'number' && !isNaN(idx.dayChange) && (
                          <div className={`text-[10px] font-normal ${idx.dayChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {idx.dayChange >= 0 ? `+₹${idx.dayChange.toFixed(2)}` : `-₹${Math.abs(idx.dayChange).toFixed(2)}`}
                          </div>
                        )}
                      </td>

                      {/* Conditional Returns: Day Return vs Yearly Return */}
                      {mode === 'days' ? (
                        daysListToUse.map(d => (
                          <td key={d} className="p-3.5 text-right">
                            {formatPct(idx.dayReturns?.[d] ?? idx[`return_${d}d`] ?? idx[`return${d}d`])}
                          </td>
                        ))
                      ) : (
                        <>
                          <td className="p-3.5 text-right">{formatPct(idx.return1Yr)}</td>
                          <td className="p-3.5 text-right">{formatPct(idx.return2Yr)}</td>
                          <td className="p-3.5 text-right">{formatPct(idx.return3Yr)}</td>
                          <td className="p-3.5 text-right">{formatPct(idx.return5Yr)}</td>
                          <td className="p-3.5 text-right">{formatPct(idx.return10Yr)}</td>
                        </>
                      )}

                      {/* Valuation Date & Effective Trading Date */}
                      <td className="p-3.5 text-center text-xs font-sans">
                        <div className="font-bold text-white font-mono text-[13px]">
                          {idx.selectedDate || toDisplayDateFormat(selectedDate) || 'Today'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center justify-center gap-1">
                          <span>Trading:</span>
                          <span className="text-emerald-400 font-semibold">{idx.dataDate || 'N/A'}</span>
                        </div>
                      </td>

                      {/* Audit Details Button */}
                      <td className="p-3.5 text-center font-sans">
                        <button
                          onClick={() => handleOpenAuditModal(idx)}
                          className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-slate-800 hover:bg-brand-600/30 text-slate-300 hover:text-white border border-slate-700 hover:border-brand-500/40 transition-all flex items-center justify-center gap-1 mx-auto"
                          title="View mathematical audit & formula breakdown"
                        >
                          <Calculator className="w-3 h-3 text-brand-400" />
                          <span>Audit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Breakdown Modal */}
      {selectedAuditIndex && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {selectedAuditIndex.displayName}
                    <span className="text-xs px-2 py-0.5 rounded font-mono font-normal bg-slate-800 text-slate-300">
                      {selectedAuditIndex.officialName}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Formula Return Audit Breakdown • Sourced from NSE Indices
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedAuditIndex(null)}
                className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto font-sans">
              {/* Context Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Chosen Calendar Date</div>
                  <div className="text-sm font-bold text-white font-mono mt-0.5 flex items-center gap-2">
                    <span>{selectedAuditIndex.selectedDate || toDisplayDateFormat(selectedDate) || 'Today'}</span>
                    {(() => {
                      const dayInfo = getDayOfWeekInfo(selectedAuditIndex.selectedDate || selectedDate);
                      return dayInfo.dayName ? (
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-sans font-bold bg-brand-500/20 text-brand-300">
                          {dayInfo.dayName}
                        </span>
                      ) : null;
                    })()}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Effective Trading Date</div>
                  <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5 flex items-center gap-2">
                    <span>{selectedAuditIndex.dataDate}</span>
                    {(() => {
                      const dayInfo = getDayOfWeekInfo(selectedAuditIndex.dataDate);
                      return dayInfo.dayName ? (
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-sans font-bold bg-emerald-500/20 text-emerald-300">
                          {dayInfo.dayName}
                        </span>
                      ) : null;
                    })()}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Terminal Value (VT)</div>
                  <div className="text-sm font-bold text-white font-mono mt-0.5">
                    ₹{selectedAuditIndex.currentValue?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* View Switcher: Yearly vs Day Calculation */}
              <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800 w-fit">
                <button
                  onClick={() => setAuditTab('yearly')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    auditTab === 'yearly'
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Yearly Returns (1Y - 10Y)
                </button>
                <button
                  onClick={() => setAuditTab('days')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    auditTab === 'days'
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Day Calculations ({daysListToUse.join('D, ')}D)
                </button>
              </div>

              {/* Day Calculation Audit View */}
              {auditTab === 'days' ? (
                <>
                  <div className="p-3.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs text-brand-300">
                    <div className="font-semibold text-brand-200 mb-1 flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-brand-400" />
                      Day Calculation Formula Applied:
                    </div>
                    <div className="font-mono bg-slate-950/70 p-2 rounded border border-brand-500/20 text-white text-[11px] overflow-x-auto">
                      &lt; 1 Year (D &lt; 365): Return = ((VT - V0) / V0) × 100 (Absolute) | ≥ 1 Year (D ≥ 365): Annualized = 4 × ((VT / V0)^(365 / (4 × D)) - 1) × 100
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                        <tr>
                          <th className="p-3">Period</th>
                          <th className="p-3">Days (D)</th>
                          <th className="p-3">Target Date</th>
                          <th className="p-3">Trading Date</th>
                          <th className="p-3 text-right">Base NAV (V0)</th>
                          <th className="p-3 text-right">Result (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 font-mono">
                        {daysListToUse.map((D) => {
                          const item = selectedAuditIndex.auditDetails?.[`${D}D`];
                          if (!item) return null;
                          return (
                            <tr key={D} className="hover:bg-slate-800/30">
                              <td className="p-3 font-bold text-white">{D}D</td>
                              <td className="p-3 text-slate-300">{D}</td>
                              <td className="p-3 text-slate-400">{item.targetDate}</td>
                              <td className="p-3 text-emerald-400">{item.actualDate || 'N/A'}</td>
                              <td className="p-3 text-right text-white">
                                {item.V0 ? `₹${item.V0.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'N/A'}
                              </td>
                              <td className="p-3 text-right font-bold">
                                {formatPct(item.returnPct)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs text-brand-300">
                    <div className="font-semibold text-brand-200 mb-1 flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-brand-400" />
                      Standard Annualized Return Formula Applied:
                    </div>
                    <div className="font-mono bg-slate-950/70 p-2 rounded border border-brand-500/20 text-white text-[11px] overflow-x-auto">
                      Annualized Return = 4 × ((VT / V0)^(1 / (4 × T)) - 1) × 100
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                        <tr>
                          <th className="p-3">Period</th>
                          <th className="p-3">Years (T)</th>
                          <th className="p-3">Target Date</th>
                          <th className="p-3">Trading Date</th>
                          <th className="p-3 text-right">Base NAV (V0)</th>
                          <th className="p-3 text-right">Result (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 font-mono">
                        {['1Y', '2Y', '3Y', '5Y', '10Y'].map((label) => {
                          const item = selectedAuditIndex.auditDetails?.[label];
                          if (!item) return null;
                          return (
                            <tr key={label} className="hover:bg-slate-800/30">
                              <td className="p-3 font-bold text-white">{label}</td>
                              <td className="p-3 text-slate-300">{item.T}</td>
                              <td className="p-3 text-slate-400">{item.targetDate}</td>
                              <td className="p-3 text-emerald-400">{item.actualDate || 'N/A'}</td>
                              <td className="p-3 text-right text-white">
                                {item.V0 ? `₹${item.V0.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'N/A'}
                              </td>
                              <td className="p-3 text-right font-bold">
                                {formatPct(item.returnPct)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Non-Trading Day Audit Explanation */}
              <div className="text-[11px] text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1">
                <div className="text-slate-300 font-semibold">Non-Trading Day Fallback Rule:</div>
                <p>
                  Target historical dates (e.g., 30-Aug-2024 for 2Y) falling on weekends or official market holidays are resolved to the latest available trading day on or before that date. Never is a future date utilized.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedAuditIndex(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NseIndicesTable;
