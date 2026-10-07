import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Trash2,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  Search,
  Plus,
  Eye,
  CheckSquare,
  Square,
  Calculator,
  Layers,
  ArrowRight
} from 'lucide-react';
import { NSE_INDICES } from '../../config/nseConfig';
import { fuzzyFilterSchemes } from '../../utils/fuzzySearch';

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

const PRESET_POPULAR_FUNDS = [
  { id: 'nippon-india-small-cap-growth', displayName: 'Nippon India Small Cap Fund - Growth', category: 'Small Cap', amcName: 'Nippon India Mutual Fund' },
  { id: 'edelweiss-mid-cap-growth', displayName: 'Edelweiss Mid Cap Fund - Growth', category: 'Mid Cap', amcName: 'Edelweiss Mutual Fund' },
  { id: 'hdfc-mid-cap-growth', displayName: 'HDFC Mid Cap Fund - Growth', category: 'Mid Cap', amcName: 'HDFC Mutual Fund' },
  { id: 'icici-prudential-bluechip-growth', displayName: 'ICICI Prudential Bluechip Fund - Growth', category: 'Large Cap', amcName: 'ICICI Prudential Mutual Fund' }
];

export const SipCustomFundList = ({
  results = [],
  selectedFundIds = [],
  fundMetaMap = {},
  allFunds = [],
  checkedExportIds = new Set(),
  onToggleExportFund,
  onToggleSelectAllFunds,
  onRemoveFund,
  onClearAll,
  onAddFund,
  onOpenDetail,
  onExport,
  monthlySip = 100000,
  calculationDate = '',
  sipDay = 25,
  plan = 'regular',
  onSwitchToCalculator,
  isCalculating = false
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Search suggestions
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const map = new Map();
    const qLower = searchQuery.toLowerCase().trim();

    // 1. NSE Indices
    NSE_INDICES.forEach(idx => {
      if (
        idx.id.toLowerCase().includes(qLower) ||
        idx.displayName.toLowerCase().includes(qLower) ||
        idx.officialName.toLowerCase().includes(qLower)
      ) {
        map.set(idx.id, {
          id: idx.id,
          displayName: `${idx.displayName} (NSE Benchmark)`,
          category: idx.category,
          amcName: 'NSE Indices',
          isNseIndex: true
        });
      }
    });

    // 2. Fuzzy match local allFunds
    if (allFunds && allFunds.length > 0) {
      const fuzzyLocal = fuzzyFilterSchemes(allFunds, searchQuery);
      fuzzyLocal.slice(0, 12).forEach(f => {
        if (!map.has(f.id)) map.set(f.id, f);
      });
    }

    return Array.from(map.values()).slice(0, 15);
  }, [searchQuery, allFunds]);

  // Build unified item list for all selected items (combining results and selected IDs)
  const resultsMap = useMemo(() => {
    const map = new Map();
    results.forEach(r => {
      if (r.fundId) map.set(r.fundId, r);
    });
    return map;
  }, [results]);

  // Combine mutual funds and NSE indices from selectedFundIds & official benchmarks
  const { mutualFundsList, nseIndicesList } = useMemo(() => {
    const mf = [];
    const nse = [];
    const processedIds = new Set();

    // Ensure all items in selectedFundIds are included
    selectedFundIds.forEach(id => {
      if (processedIds.has(id)) return;
      processedIds.add(id);

      const res = resultsMap.get(id);
      const meta = fundMetaMap[id] || (allFunds && allFunds.find(f => f.id === id)) || {};
      const isNse = res?.isNseIndex || res?.plan === 'Benchmark' || meta?.isNseIndex || id.startsWith('NIFTY');

      const item = {
        id,
        fundId: id,
        displayName: res?.displayName || meta?.displayName || id,
        category: res?.category || meta?.category || (isNse ? 'Benchmark' : 'Other'),
        amcName: res?.amcName || meta?.amcName || (isNse ? 'NSE Indices' : ''),
        currentNav: res?.currentNav ?? meta?.currentNav,
        returns: res?.returns || {},
        periods: res?.periods || {},
        isNseIndex: isNse,
        result: res
      };

      if (isNse) {
        nse.push(item);
      } else {
        mf.push(item);
      }
    });

    // Also include any NSE results returned by backend that might not be in selectedFundIds
    results.forEach(r => {
      if ((r.isNseIndex || r.plan === 'Benchmark') && !processedIds.has(r.fundId)) {
        processedIds.add(r.fundId);
        nse.push({
          id: r.fundId,
          fundId: r.fundId,
          displayName: r.displayName || r.fundId,
          category: r.category || 'Benchmark',
          amcName: r.amcName || 'NSE Indices',
          currentNav: r.currentNav,
          returns: r.returns || {},
          periods: r.periods || {},
          isNseIndex: true,
          result: r
        });
      }
    });

    return { mutualFundsList: mf, nseIndicesList: nse };
  }, [selectedFundIds, resultsMap, fundMetaMap, allFunds, results]);

  // Group mutual funds by category
  const groupedMutualFunds = useMemo(() => {
    const groups = {};
    mutualFundsList.forEach(fund => {
      const cat = fund.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(fund);
    });

    return Object.entries(groups).sort(([catA], [catB]) => {
      const orderA = CATEGORY_ORDER[catA] || 99;
      const orderB = CATEGORY_ORDER[catB] || 99;
      return orderA - orderB;
    });
  }, [mutualFundsList]);

  // Checked counts
  const checkedAmfiCount = mutualFundsList.filter(f => checkedExportIds.has(f.id)).length;
  const checkedNseCount = nseIndicesList.filter(i => checkedExportIds.has(i.id)).length;
  const totalCheckedCount = checkedAmfiCount + checkedNseCount;
  const totalItemsCount = mutualFundsList.length + nseIndicesList.length;

  const handleToggleCategoryExport = (catFunds) => {
    const allChecked = catFunds.every(f => checkedExportIds.has(f.id));
    catFunds.forEach(f => {
      if (allChecked) {
        if (checkedExportIds.has(f.id)) onToggleExportFund(f.id);
      } else {
        if (!checkedExportIds.has(f.id)) onToggleExportFund(f.id);
      }
    });
  };

  const handleToggleAllAmfi = () => {
    onToggleSelectAllFunds(mutualFundsList);
  };

  const handleToggleAllNse = () => {
    onToggleSelectAllFunds(nseIndicesList);
  };

  const formatPct = (val) => {
    if (val === null || val === undefined || isNaN(val)) {
      return <span className="text-slate-500 font-sans">N/A</span>;
    }
    const num = Number(val);
    const isPositive = num > 0;
    return (
      <span className={`font-mono font-bold ${num === 0 ? 'text-slate-300' : isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
        {isPositive ? `+${num.toFixed(2)}%` : `${num.toFixed(2)}%`}
      </span>
    );
  };

  const formatCurrency = (val) => {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    return `₹${Math.round(Number(val)).toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">

      {/* Top Banner & Comprehensive Portfolio Counters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>SIP Custom Portfolio & Benchmarks</span>
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
              {mutualFundsList.length} Mutual Funds + {nseIndicesList.length} NSE Benchmarks
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-1.5 flex flex-wrap items-center gap-2">
            <span>AMFI: <strong className="text-white font-mono">{checkedAmfiCount}/{mutualFundsList.length}</strong> checked for export</span>
            <span>•</span>
            <span>NSE: <strong className="text-emerald-400 font-mono">{checkedNseCount}/{nseIndicesList.length}</strong> checked for export</span>
            <span>•</span>
            <span className="text-slate-500">Unchecked funds remain visible in list</span>
          </div>
        </div>

        {/* Action Buttons: Export to Excel, Clear All, Switch View */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Export to Excel */}
          <button
            onClick={onExport}
            disabled={totalCheckedCount === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold text-xs transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
            title="Export checked mutual funds and NSE indices to Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export to Excel ({totalCheckedCount} Selected)</span>
          </button>

          {/* Switch to Calculator View */}
          {onSwitchToCalculator && (
            <button
              onClick={onSwitchToCalculator}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all active:scale-95"
            >
              <Calculator className="w-3.5 h-3.5 text-brand-400" />
              <span>Calculator View</span>
            </button>
          )}

          {/* Clear All */}
          {totalItemsCount > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 text-xs font-semibold transition-all"
              title="Clear all funds from SIP analysis"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Add / Search Bar inside Custom List */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 shadow-lg space-y-3">
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Search more mutual funds or NSE indices to add to this custom list..."
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-inner"
            />
          </div>

          {isSearchOpen && (
            <div
              className="fixed inset-0 z-20"
              onClick={() => setIsSearchOpen(false)}
            />
          )}

          {isSearchOpen && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-30 glass-card rounded-xl border border-slate-700 shadow-2xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-800">
              {searchResults.map(fund => {
                const isAdded = selectedFundIds.includes(fund.id);
                return (
                  <div
                    key={fund.id}
                    onClick={() => {
                      onAddFund(fund);
                      setSearchQuery('');
                      setIsSearchOpen(false);
                    }}
                    className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                      isAdded ? 'bg-slate-800/80 text-brand-300' : 'hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="min-w-0 pr-3">
                      <div className="font-semibold text-xs text-white truncate">{fund.displayName}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="text-brand-300 font-medium">{fund.category}</span>
                        <span>•</span>
                        <span>{fund.amcName}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-[10px] font-semibold ${isAdded ? 'bg-brand-500/20 text-brand-300' : 'bg-slate-700 hover:bg-brand-600 text-white'}`}>
                      {isAdded ? 'Added' : '+ Add'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Preset & Benchmark Quick Buttons */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-[11px] text-slate-400 font-semibold">Quick Add:</span>
          {PRESET_POPULAR_FUNDS.map(preset => {
            const isAdded = selectedFundIds.includes(preset.id);
            return (
              <button
                key={preset.id}
                onClick={() => onAddFund(preset)}
                disabled={isAdded}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                  isAdded
                    ? 'bg-slate-800/60 text-slate-500 border border-slate-800 cursor-default'
                    : 'bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/80'
                }`}
              >
                <Plus className="h-3 w-3" />
                <span>{preset.displayName.replace(' - Growth', '')}</span>
              </button>
            );
          })}

          {NSE_INDICES.map(idx => {
            const isAdded = selectedFundIds.includes(idx.id);
            return (
              <button
                key={idx.id}
                onClick={() => onAddFund({
                  id: idx.id,
                  displayName: `${idx.displayName} (NSE Benchmark)`,
                  category: idx.category,
                  amcName: 'NSE Indices',
                  isNseIndex: true
                })}
                disabled={isAdded}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                  isAdded
                    ? 'bg-amber-500/10 text-amber-500/40 border border-amber-500/20 cursor-default'
                    : 'bg-amber-500/15 text-amber-300 hover:text-white hover:bg-amber-500/30 border border-amber-500/30'
                }`}
              >
                <Plus className="h-3 w-3" />
                <span>{idx.displayName}</span>
              </button>
            );
          })}
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
            <span className="text-xs text-slate-400">({mutualFundsList.length} schemes)</span>
          </div>

          {mutualFundsList.length > 0 && (
            <button
              onClick={handleToggleAllAmfi}
              className="text-[11px] font-semibold text-brand-400 hover:text-brand-300 transition-colors"
            >
              {mutualFundsList.every(f => checkedExportIds.has(f.id)) ? 'Deselect All AMFI for Export' : 'Select All AMFI for Export'}
            </button>
          )}
        </div>

        {mutualFundsList.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-center text-slate-400 text-xs">
            No mutual funds added to SIP Custom List yet. Search above or click presets to add schemes.
          </div>
        ) : (
          <div className="space-y-6">
            {groupedMutualFunds.map(([category, catFunds]) => {
              const allCatChecked = catFunds.every(f => checkedExportIds.has(f.id));
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
                      <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800/80">
                        <tr>
                          <th className="p-3 w-10 text-center">Export</th>
                          <th className="p-3 min-w-[220px]">Scheme Name</th>
                          <th className="p-3 min-w-[90px]">NAV</th>
                          <th className="p-3 text-center min-w-[80px]">1Y SIP</th>
                          <th className="p-3 text-center min-w-[80px]">2Y SIP</th>
                          <th className="p-3 text-center min-w-[80px]">3Y SIP</th>
                          <th className="p-3 text-center min-w-[80px]">5Y SIP</th>
                          <th className="p-3 text-center min-w-[80px]">10Y SIP</th>
                          <th className="p-3 min-w-[120px]">3Y Value</th>
                          <th className="p-3 text-right pr-4 min-w-[90px]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-sans">
                        {catFunds.map((fund) => {
                          const isChecked = checkedExportIds.has(fund.id);
                          const p3 = fund.periods?.['3Y'];
                          const p1 = fund.periods?.['1Y'];
                          const valueDisplay = p3?.hasSufficientData
                            ? formatCurrency(p3.finalPortfolioValue)
                            : p1?.hasSufficientData
                              ? `${formatCurrency(p1.finalPortfolioValue)} (1Y)`
                              : 'N/A';

                          return (
                            <tr
                              key={fund.id}
                              onClick={() => fund.result && onOpenDetail && onOpenDetail(fund.result)}
                              className={`hover:bg-slate-800/40 transition-colors cursor-pointer group ${
                                !isChecked ? 'opacity-60 bg-slate-950/40' : ''
                              }`}
                            >
                              <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => onToggleExportFund(fund.id)}
                                  className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-brand-600 focus:ring-brand-500 cursor-pointer accent-brand-500"
                                  title="Check to include in Excel export; uncheck to exclude"
                                />
                              </td>

                              <td className="p-3">
                                <div className="font-bold text-white text-xs group-hover:text-brand-300 transition-colors">
                                  {fund.displayName}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">{fund.amcName}</div>
                              </td>

                              <td className="p-3 font-mono text-slate-200">
                                {fund.currentNav ? `₹${Number(fund.currentNav).toFixed(2)}` : 'N/A'}
                              </td>

                              <td className="p-3 text-center">{formatPct(fund.returns?.return1Yr)}</td>
                              <td className="p-3 text-center">{formatPct(fund.returns?.return2Yr)}</td>
                              <td className="p-3 text-center">{formatPct(fund.returns?.return3Yr)}</td>
                              <td className="p-3 text-center">{formatPct(fund.returns?.return5Yr)}</td>
                              <td className="p-3 text-center">{formatPct(fund.returns?.return10Yr)}</td>

                              <td className="p-3 font-mono text-emerald-400 font-semibold">
                                {valueDisplay}
                              </td>

                              <td className="p-3 text-right pr-4" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1.5">
                                  {fund.result && onOpenDetail && (
                                    <button
                                      onClick={() => onOpenDetail(fund.result)}
                                      className="p-1.5 rounded-lg bg-brand-500/10 hover:bg-brand-500 text-brand-300 hover:text-white transition-all"
                                      title="View detailed ledger"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => onRemoveFund(fund.id)}
                                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-300 hover:text-white transition-all"
                                    title="Remove scheme from SIP analysis"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
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

      {/* SECTION 2: NSE BENCHMARK INDICES (Dedicated Separate Container) */}
      <div className="space-y-4 pt-4 border-t-2 border-slate-800/80">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              NSE Benchmark Indices
            </h3>
            <span className="text-xs text-slate-400">({nseIndicesList.length} benchmark indices)</span>
          </div>

          {nseIndicesList.length > 0 && (
            <button
              onClick={handleToggleAllNse}
              className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              {nseIndicesList.every(i => checkedExportIds.has(i.id)) ? 'Deselect All NSE for Export' : 'Select All NSE for Export'}
            </button>
          )}
        </div>

        {nseIndicesList.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-center text-slate-400 text-xs">
            No NSE benchmark indices in custom list. Add NIFTY 50, NIFTY 500, etc. above.
          </div>
        ) : (
          <div className="glass-card rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950/70 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800/80">
                  <tr>
                    <th className="p-3 w-10 text-center">Export</th>
                    <th className="p-3 min-w-[220px]">Benchmark Index</th>
                    <th className="p-3 min-w-[100px]">Index Value (NAV)</th>
                    <th className="p-3 text-center min-w-[80px]">1Y SIP</th>
                    <th className="p-3 text-center min-w-[80px]">2Y SIP</th>
                    <th className="p-3 text-center min-w-[80px]">3Y SIP</th>
                    <th className="p-3 text-center min-w-[80px]">5Y SIP</th>
                    <th className="p-3 text-center min-w-[80px]">10Y SIP</th>
                    <th className="p-3 min-w-[120px]">3Y Value</th>
                    <th className="p-3 text-right pr-4 min-w-[90px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {nseIndicesList.map(idx => {
                    const isChecked = checkedExportIds.has(idx.id);
                    const p3 = idx.periods?.['3Y'];
                    const p1 = idx.periods?.['1Y'];
                    const valueDisplay = p3?.hasSufficientData
                      ? formatCurrency(p3.finalPortfolioValue)
                      : p1?.hasSufficientData
                        ? `${formatCurrency(p1.finalPortfolioValue)} (1Y)`
                        : 'N/A';

                    return (
                      <tr
                        key={idx.id}
                        onClick={() => idx.result && onOpenDetail && onOpenDetail(idx.result)}
                        className={`hover:bg-slate-800/40 transition-colors cursor-pointer group ${
                          !isChecked ? 'opacity-60 bg-slate-950/40' : ''
                        }`}
                      >
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => onToggleExportFund(idx.id)}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-brand-600 focus:ring-brand-500 cursor-pointer accent-brand-500"
                            title="Check to include in Excel export; uncheck to exclude"
                          />
                        </td>

                        <td className="p-3">
                          <div className="font-bold text-white text-xs group-hover:text-emerald-300 transition-colors">
                            {idx.displayName}
                          </div>
                          <div className="text-[10px] text-emerald-400 mt-0.5">{idx.amcName || 'Official Benchmark'}</div>
                        </td>

                        <td className="p-3 font-mono font-bold text-white">
                          {idx.currentNav ? `₹${Number(idx.currentNav).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'N/A'}
                        </td>

                        <td className="p-3 text-center">{formatPct(idx.returns?.return1Yr)}</td>
                        <td className="p-3 text-center">{formatPct(idx.returns?.return2Yr)}</td>
                        <td className="p-3 text-center">{formatPct(idx.returns?.return3Yr)}</td>
                        <td className="p-3 text-center">{formatPct(idx.returns?.return5Yr)}</td>
                        <td className="p-3 text-center">{formatPct(idx.returns?.return10Yr)}</td>

                        <td className="p-3 font-mono text-emerald-400 font-semibold">
                          {valueDisplay}
                        </td>

                        <td className="p-3 text-right pr-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {idx.result && onOpenDetail && (
                              <button
                                onClick={() => onOpenDetail(idx.result)}
                                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-300 hover:text-white transition-all"
                                title="View detailed ledger"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => onRemoveFund(idx.id)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-300 hover:text-white transition-all"
                              title="Remove index from SIP analysis"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
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
              <h3 className="text-base font-bold text-white">Clear SIP Custom Selection?</h3>
            </div>
            
            <p className="text-xs text-slate-300">
              Are you sure you want to clear all mutual funds and NSE benchmark indices from this SIP analysis list?
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

export default SipCustomFundList;
