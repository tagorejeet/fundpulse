import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Trash2, 
  AlertTriangle, 
  X, 
  CheckSquare, 
  Sparkles, 
  Building2, 
  TrendingUp, 
  Download, 
  Layers,
  ChevronDown
} from 'lucide-react';
import { 
  exportCustomListToExcel, 
  exportNseListToExcel, 
  exportEverythingToExcel 
} from '../services/excelExport';

const CATEGORY_ORDER = {
  'Large Cap': 1,
  'Mid Cap': 2,
  'Large & Mid Cap': 3,
  'Small Cap': 4,
  'Multi Cap': 5,
  'Value': 6,
  'Flexi Cap': 7,
  'Sectoral / Thematic': 8,
  'ELSS': 9,
  'Contra': 10,
  'Dividend Yield': 11,
  'Focused': 12,
  'Index Funds': 13,
  'Hybrid': 14,
  'Debt / Liquid': 15,
  'Other': 16
};

export const CustomFundList = ({
  funds = [],
  nseIndices = [],
  selectedNseIndexIds = new Set(),
  onToggleSelectNseIndex,
  onRemoveNseIndex,
  isLoading = false,
  mode = 'yearly',
  customDays = 33,
  customDaysList = [33, 50, 67],
  selectedPlan = 'regular',
  calculationDate = null,
  onRemoveFund,
  onClearAll,
  meta,
  onSelectFund,
  type = 'custom',
  title = null
}) => {
  const isSuggestion = type === 'suggestion';
  const displayTitle = title || (isSuggestion ? 'Suggestion Sheet Portfolio' : 'Custom Portfolio Selection');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // Filter selected NSE indices
  const selectedNseIndicesList = useMemo(() => {
    if (!nseIndices) return [];
    return nseIndices.filter(idx => selectedNseIndexIds.has(idx.id));
  }, [nseIndices, selectedNseIndexIds]);

  // Checked state for AMFI funds (auto pre-checked on load and when new funds added)
  const [checkedForExportIds, setCheckedForExportIds] = useState(() => new Set(funds.map(f => f.id)));
  const prevTrackedFundsRef = useRef(new Set());

  // Checked state for NSE indices in Custom List (auto pre-checked)
  const [checkedNseExportIds, setCheckedNseExportIds] = useState(() => new Set(selectedNseIndicesList.map(i => i.id)));
  const prevTrackedNseRef = useRef(new Set());

  useEffect(() => {
    setCheckedForExportIds(prev => {
      const next = new Set(prev);
      funds.forEach(f => {
        if (!prevTrackedFundsRef.current.has(f.id)) {
          next.add(f.id);
        }
      });
      prevTrackedFundsRef.current = new Set(funds.map(f => f.id));
      return next;
    });
  }, [funds]);

  useEffect(() => {
    setCheckedNseExportIds(prev => {
      const next = new Set(prev);
      selectedNseIndicesList.forEach(i => {
        if (!prevTrackedNseRef.current.has(i.id)) {
          next.add(i.id);
        }
      });
      prevTrackedNseRef.current = new Set(selectedNseIndicesList.map(i => i.id));
      return next;
    });
  }, [selectedNseIndicesList]);

  const handleToggleExportFund = (id) => {
    setCheckedForExportIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleNseExport = (id) => {
    setCheckedNseExportIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleCategoryExport = (catFunds) => {
    const allCatChecked = catFunds.every(f => checkedForExportIds.has(f.id));
    setCheckedForExportIds(prev => {
      const next = new Set(prev);
      if (allCatChecked) catFunds.forEach(f => next.delete(f.id));
      else catFunds.forEach(f => next.add(f.id));
      return next;
    });
  };

  const handleToggleAllAmfiExport = () => {
    const allChecked = funds.every(f => checkedForExportIds.has(f.id));
    setCheckedForExportIds(prev => {
      if (allChecked) return new Set();
      return new Set(funds.map(f => f.id));
    });
  };

  const handleToggleAllNseExport = () => {
    const allChecked = selectedNseIndicesList.every(i => checkedNseExportIds.has(i.id));
    setCheckedNseExportIds(prev => {
      if (allChecked) return new Set();
      return new Set(selectedNseIndicesList.map(i => i.id));
    });
  };

  const formatPct = (val) => {
    if (val === null || val === undefined || isNaN(val)) return <span className="text-slate-500 font-sans">N/A</span>;
    const num = Number(val);
    const formatted = num.toFixed(2);
    const isPositive = num > 0;
    return (
      <span className={num === 0 ? 'text-slate-300' : isPositive ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
        {isPositive ? `+${formatted}%` : `${formatted}%`}
      </span>
    );
  };

  const formatNav = (val) => {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    return `₹${Number(val).toFixed(2)}`;
  };

  const formatValue = (val) => {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Group mutual funds by category
  const groupedFunds = useMemo(() => {
    const groups = {};
    funds.forEach(fund => {
      const cat = fund.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(fund);
    });

    return Object.entries(groups).sort(([catA], [catB]) => {
      const orderA = CATEGORY_ORDER[catA] || 99;
      const orderB = CATEGORY_ORDER[catB] || 99;
      return orderA - orderB;
    });
  }, [funds]);

  // Export handlers
  const handleExportCustomList = async () => {
    const exportableAmfi = funds.filter(f => checkedForExportIds.has(f.id));
    const exportableNse = selectedNseIndicesList.filter(i => checkedNseExportIds.has(i.id));
    await exportCustomListToExcel({
      funds: exportableAmfi,
      nseIndices: exportableNse,
      plan: selectedPlan,
      mode,
      customDays,
      customDaysList,
      reportDate: meta?.reportDate,
      calculationDate
    });
    setExportMenuOpen(false);
  };

  const handleExportNseOnly = async () => {
    const exportableNse = selectedNseIndicesList.filter(i => checkedNseExportIds.has(i.id));
    await exportNseListToExcel(exportableNse, calculationDate);
    setExportMenuOpen(false);
  };

  const handleExportEverything = async () => {
    const exportableAmfi = funds.filter(f => checkedForExportIds.has(f.id));
    const exportableNse = selectedNseIndicesList.filter(i => checkedNseExportIds.has(i.id));
    await exportEverythingToExcel({
      funds: exportableAmfi,
      nseIndices: exportableNse,
      plan: selectedPlan,
      mode,
      customDays,
      customDaysList,
      reportDate: meta?.reportDate,
      calculationDate
    });
    setExportMenuOpen(false);
  };

  const checkedAmfiCount = funds.filter(f => checkedForExportIds.has(f.id)).length;
  const checkedNseCount = selectedNseIndicesList.filter(i => checkedNseExportIds.has(i.id)).length;
  const isBoth = selectedPlan === 'both';
  const totalCustomItems = funds.length + selectedNseIndicesList.length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Controls & Comprehensive Portfolio Counters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            {isSuggestion ? (
              <Sparkles className="w-5 h-5 text-amber-400" />
            ) : (
              <CheckSquare className="w-5 h-5 text-blue-400" />
            )}
            <span>{displayTitle}</span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold font-mono ${
              isSuggestion 
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' 
                : 'bg-brand-500/10 text-brand-400 border border-brand-500/30'
            }`}>
              {funds.length} Mutual Funds{selectedNseIndicesList.length > 0 ? ` + ${selectedNseIndicesList.length} NSE Indices` : ''}
            </span>
          </h2>
          <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2">
            <span>AMFI: <strong className="text-white">{checkedAmfiCount}/{funds.length}</strong> checked for export</span>
            <span>•</span>
            <span>NSE: <strong className="text-emerald-400">{checkedNseCount}/{selectedNseIndicesList.length}</strong> checked for export</span>
            <span>•</span>
            <span className="text-slate-500">Unchecked items remain visible in list</span>
          </div>
        </div>

        {/* Action Buttons & Multi-Option Excel Exporter */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Multi-Option Excel Dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              disabled={checkedAmfiCount === 0 && checkedNseCount === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-lg shadow-emerald-600/20"
              title="Download Excel in exact Suggestion Sheet format"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Import / Export Excel ({checkedAmfiCount + checkedNseCount})</span>
              <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
            </button>

            {exportMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl z-30 overflow-hidden py-1.5 animate-scale-up font-sans">
                <button
                  onClick={handleExportCustomList}
                  className="w-full text-left px-4 py-2.5 text-xs text-slate-200 hover:bg-slate-800 hover:text-white flex items-start gap-2.5 transition-colors"
                >
                  <Download className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-emerald-300">Download Suggestion Sheet (Import Excel)</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Exact "Our Suggestion Sheet" format with Times New Roman & dynamic categories</div>
                  </div>
                </button>

                <button
                  onClick={handleExportNseOnly}
                  disabled={checkedNseCount === 0}
                  className="w-full text-left px-4 py-2.5 text-xs text-slate-200 hover:bg-slate-800 hover:text-white disabled:opacity-40 flex items-start gap-2.5 transition-colors border-t border-slate-800"
                >
                  <TrendingUp className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold">Download NSE Indices</div>
                    <div className="text-[10px] text-slate-400">Only selected NSE Benchmark Indices</div>
                  </div>
                </button>

                <button
                  onClick={handleExportEverything}
                  className="w-full text-left px-4 py-2.5 text-xs text-slate-200 hover:bg-slate-800 hover:text-white flex items-start gap-2.5 transition-colors border-t border-slate-800"
                >
                  <Layers className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold">Download Everything</div>
                    <div className="text-[10px] text-slate-400">Suggestion Sheet + NSE Indices + Combined Summary</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Clear All Button */}
          {totalCustomItems > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700/80 hover:border-rose-500/30 text-xs font-semibold transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      {/* SECTION 1: CUSTOM MUTUAL FUNDS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Custom Mutual Funds
            </h3>
            <span className="text-xs text-slate-400">({funds.length} schemes)</span>
          </div>

          {funds.length > 0 && (
            <button
              onClick={handleToggleAllAmfiExport}
              className="text-[11px] font-semibold text-brand-400 hover:text-brand-300 transition-colors"
            >
              {funds.every(f => checkedForExportIds.has(f.id)) ? 'Deselect All AMFI for Export' : 'Select All AMFI for Export'}
            </button>
          )}
        </div>

        {funds.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-center text-slate-400 text-xs">
            {isSuggestion 
              ? 'No mutual funds in Suggestion Sheet yet. Check the orange boxes beside schemes in the main table to add them.'
              : 'No mutual funds added to Custom List yet. Check the blue boxes beside schemes in the main table to add them.'}
          </div>
        ) : (
          <div className="space-y-6">
            {groupedFunds.map(([category, catFunds]) => {
              const allCatChecked = catFunds.every(f => checkedForExportIds.has(f.id));
              return (
                <div key={category} className="glass-card rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
                  {/* Category Header */}
                  <div className="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={allCatChecked}
                        onChange={() => handleToggleCategoryExport(catFunds)}
                        title="Toggle export for this category"
                        className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-brand-600 focus:ring-brand-500 cursor-pointer accent-brand-500"
                      />
                      <span className="font-bold text-white text-xs">{category}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                        {catFunds.length}
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleCategoryExport(catFunds)}
                      className="text-[11px] text-slate-400 hover:text-white transition-colors"
                    >
                      {allCatChecked ? 'Uncheck Category' : 'Check Category'}
                    </button>
                  </div>

                  {/* Fund Rows */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold border-b border-slate-800/80">
                        <tr>
                          <th className="p-3 w-10 text-center">Export</th>
                          <th className="p-3 min-w-[200px]">Scheme Name</th>
                          {isBoth ? (
                            <>
                              <th className="p-3">NAV Reg</th>
                              <th className="p-3">NAV Dir</th>
                            </>
                          ) : (
                            <th className="p-3">NAV</th>
                          )}
                          {mode === 'yearly' ? (
                            isBoth ? (
                              <>
                                <th className="p-3 text-center">1Y Reg</th>
                                <th className="p-3 text-center">1Y Dir</th>
                                <th className="p-3 text-center">2Y Reg</th>
                                <th className="p-3 text-center">2Y Dir</th>
                                <th className="p-3 text-center">3Y Reg</th>
                                <th className="p-3 text-center">3Y Dir</th>
                                <th className="p-3 text-center">5Y Reg</th>
                                <th className="p-3 text-center">5Y Dir</th>
                                <th className="p-3 text-center">10Y Reg</th>
                                <th className="p-3 text-center">10Y Dir</th>
                              </>
                            ) : (
                              <>
                                <th className="p-3 text-center">1Y</th>
                                <th className="p-3 text-center">2Y</th>
                                <th className="p-3 text-center">3Y</th>
                                <th className="p-3 text-center">5Y</th>
                                <th className="p-3 text-center">10Y</th>
                              </>
                            )
                          ) : (
                            customDaysList.map(d => isBoth ? (
                              <React.Fragment key={d}>
                                <th className="p-3 text-center">{d}D Reg</th>
                                <th className="p-3 text-center">{d}D Dir</th>
                              </React.Fragment>
                            ) : (
                              <th key={d} className="p-3 text-center">{d}D</th>
                            ))
                          )}
                          <th className="p-3">AUM (Cr)</th>
                          <th className="p-3 text-right pr-4">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {catFunds.map((fund) => {
                          const isChecked = checkedForExportIds.has(fund.id);
                          return (
                            <tr
                              key={fund.id}
                              onClick={() => onSelectFund && onSelectFund(fund)}
                              className={`hover:bg-slate-800/40 cursor-pointer transition-colors ${
                                !isChecked ? 'opacity-60 bg-slate-950/40' : ''
                              }`}
                            >
                              <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleExportFund(fund.id)}
                                  className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-brand-600 focus:ring-brand-500 cursor-pointer accent-brand-500"
                                />
                              </td>
                              <td className="p-3 font-sans">
                                <div className="font-bold text-white text-xs">{fund.displayName}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">{fund.amcName}</div>
                              </td>
                              {isBoth ? (
                                <>
                                  <td className="p-3 text-slate-200">{formatNav(fund.regNav ?? fund.currentNav)}</td>
                                  <td className="p-3 text-emerald-300">{formatNav(fund.dirNav ?? fund.currentNav)}</td>
                                </>
                              ) : (
                                <td className="p-3 text-slate-200">{formatNav(fund.currentNav)}</td>
                              )}
                              {mode === 'yearly' ? (
                                isBoth ? (
                                  <>
                                    <td className="p-3 text-center">{formatPct(fund.regReturn1Yr ?? fund.return1Yr)}</td>
                                    <td className="p-3 text-center">{formatPct(fund.dirReturn1Yr ?? fund.return1Yr)}</td>
                                    <td className="p-3 text-center">{formatPct(fund.regReturn2Yr ?? fund.return2Yr)}</td>
                                    <td className="p-3 text-center">{formatPct(fund.dirReturn2Yr ?? fund.return2Yr)}</td>
                                    <td className="p-3 text-center">{formatPct(fund.regReturn3Yr ?? fund.return3Yr)}</td>
                                    <td className="p-3 text-center">{formatPct(fund.dirReturn3Yr ?? fund.return3Yr)}</td>
                                    <td className="p-3 text-center">{formatPct(fund.regReturn5Yr ?? fund.return5Yr)}</td>
                                    <td className="p-3 text-center">{formatPct(fund.dirReturn5Yr ?? fund.return5Yr)}</td>
                                    <td className="p-3 text-center">{formatPct(fund.regReturn10Yr ?? fund.return10Yr)}</td>
                                    <td className="p-3 text-center">{formatPct(fund.dirReturn10Yr ?? fund.return10Yr)}</td>
                                  </>
                                ) : (
                                  <>
                                    <td className="p-3 text-center">{formatPct(fund.return1Yr)}</td>
                                    <td className="p-3 text-center">{formatPct(fund.return2Yr)}</td>
                                    <td className="p-3 text-center">{formatPct(fund.return3Yr)}</td>
                                    <td className="p-3 text-center">{formatPct(fund.return5Yr)}</td>
                                    <td className="p-3 text-center">{formatPct(fund.return10Yr)}</td>
                                  </>
                                )
                              ) : (
                                customDaysList.map((d) => {
                                  if (isBoth) {
                                    const regVal = fund.regDayReturns ? fund.regDayReturns[d] : fund[`reg_return_${d}d`];
                                    const dirVal = fund.dirDayReturns ? fund.dirDayReturns[d] : fund[`dir_return_${d}d`];
                                    return (
                                      <React.Fragment key={d}>
                                        <td className="p-3 text-center">{formatPct(regVal)}</td>
                                        <td className="p-3 text-center">{formatPct(dirVal)}</td>
                                      </React.Fragment>
                                    );
                                  }
                                  const val = fund.dayReturns ? fund.dayReturns[d] : fund[`return_${d}d`];
                                  return <td key={d} className="p-3 text-center">{formatPct(val)}</td>;
                                })
                              )}
                              <td className="p-3 text-slate-200">{fund.dailyAUMFormatted || 'N/A'}</td>
                              <td className="p-3 text-right pr-4" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => onRemoveFund(fund.id)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-300 hover:text-white transition-all"
                                  title="Remove scheme from Custom List"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: NSE INDICES (Dedicated separate container below mutual funds) */}
      <div className="space-y-4 pt-6 border-t-2 border-slate-800/80">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Custom NSE Indices
            </h3>
            <span className="text-xs text-slate-400">({selectedNseIndicesList.length} benchmark indices)</span>
          </div>

          {selectedNseIndicesList.length > 0 && (
            <button
              onClick={handleToggleAllNseExport}
              className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              {selectedNseIndicesList.every(i => checkedNseExportIds.has(i.id)) ? 'Deselect All NSE for Export' : 'Select All NSE for Export'}
            </button>
          )}
        </div>

        {selectedNseIndicesList.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-center text-slate-400 text-xs">
            No NSE indices selected yet. Select checkboxes in the "NSE Indices" section at the bottom of the page to add them here.
          </div>
        ) : (
          <div className="glass-card rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold border-b border-slate-800/80">
                  <tr>
                    <th className="p-3 w-10 text-center">Export</th>
                    <th className="p-3 min-w-[200px]">Index Name</th>
                    <th className="p-3 text-right">Value (Close)</th>
                    {mode === 'days' ? (
                      customDaysList.map(d => (
                        <th key={d} className="p-3 text-right min-w-[80px]">{d}D</th>
                      ))
                    ) : (
                      <>
                        <th className="p-3 text-right">1Y</th>
                        <th className="p-3 text-right">2Y</th>
                        <th className="p-3 text-right">3Y</th>
                        <th className="p-3 text-right">5Y</th>
                        <th className="p-3 text-right">10Y</th>
                      </>
                    )}
                    <th className="p-3 text-center min-w-[130px]">Valuation Date</th>
                    <th className="p-3 text-right pr-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {selectedNseIndicesList.map(idx => {
                    const isChecked = checkedNseExportIds.has(idx.id);
                    return (
                      <tr 
                        key={idx.id} 
                        className={`hover:bg-slate-800/40 transition-colors ${
                          !isChecked ? 'opacity-60 bg-slate-950/40' : ''
                        }`}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleNseExport(idx.id)}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-brand-600 focus:ring-brand-500 cursor-pointer accent-brand-500"
                          />
                        </td>
                        <td className="p-3 font-sans">
                          <div className="font-bold text-white text-xs">{idx.displayName}</div>
                          <div className="text-[10px] text-brand-300 mt-0.5">{idx.officialName}</div>
                        </td>
                        <td className="p-3 text-right font-bold text-white">
                          {formatValue(idx.currentValue)}
                        </td>
                        {mode === 'days' ? (
                          customDaysList.map(d => (
                            <td key={d} className="p-3 text-right">
                              {formatPct(idx.dayReturns?.[d] ?? idx[`return_${d}d`] ?? idx[`return${d}d`])}
                            </td>
                          ))
                        ) : (
                          <>
                            <td className="p-3 text-right">{formatPct(idx.return1Yr)}</td>
                            <td className="p-3 text-right">{formatPct(idx.return2Yr)}</td>
                            <td className="p-3 text-right">{formatPct(idx.return3Yr)}</td>
                            <td className="p-3 text-right">{formatPct(idx.return5Yr)}</td>
                            <td className="p-3 text-right">{formatPct(idx.return10Yr)}</td>
                          </>
                        )}
                        <td className="p-3 text-center text-xs font-sans">
                          <div className="font-bold text-white font-mono text-[12px]">
                            {idx.selectedDate || 'Today'}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Trading: <span className="text-emerald-400 font-semibold">{idx.dataDate || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="p-3 text-right pr-4">
                          <button
                            onClick={() => onRemoveNseIndex && onRemoveNseIndex(idx.id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-300 hover:text-white transition-all"
                            title="Remove index from Custom List"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in font-sans">
          <div className="glass-card max-w-sm w-full p-6 rounded-2xl border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-white">
                {isSuggestion ? 'Clear Suggestion Sheet?' : 'Clear Custom Selection?'}
              </h3>
            </div>
            
            <p className="text-xs text-slate-300">
              {isSuggestion 
                ? 'Are you sure you want to clear your selected mutual funds and NSE indices from the suggestion sheet?' 
                : 'Are you sure you want to clear your selected mutual funds and NSE indices from the custom list?'}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onClearAll();
                  setShowClearConfirm(false);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg transition-all"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomFundList;
