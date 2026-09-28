import React, { useState } from 'react';
import { FileSpreadsheet, Trash2, AlertTriangle, X, CheckSquare, Sparkles } from 'lucide-react';
import { exportCustomListToExcel } from '../services/excelExport';

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
  isLoading = false,
  selectedPlan = 'regular',
  onRemoveFund,
  onClearAll,
  meta,
  onSelectFund
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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

  // Group funds category-wise
  const groupedCategories = React.useMemo(() => {
    if (!funds || funds.length === 0) return [];

    const groupMap = new Map();
    funds.forEach(fund => {
      const cat = fund.category || 'Other';
      if (!groupMap.has(cat)) {
        groupMap.set(cat, []);
      }
      groupMap.get(cat).push(fund);
    });

    // Sort categories according to requested order
    const catKeys = Array.from(groupMap.keys());
    catKeys.sort((a, b) => {
      const orderA = CATEGORY_ORDER[a] || 99;
      const orderB = CATEGORY_ORDER[b] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.localeCompare(b);
    });

    return catKeys.map(catName => {
      const catFunds = groupMap.get(catName);
      // Sort alphabetically by displayName within category
      catFunds.sort((a, b) => a.displayName.localeCompare(b.displayName));
      return {
        categoryName: catName,
        funds: catFunds
      };
    });
  }, [funds]);

  const handleExport = () => {
    exportCustomListToExcel({
      funds,
      plan: selectedPlan,
      reportDate: meta?.reportDate || '28-Sep-2026'
    });
  };

  return (
    <div className="space-y-6 my-4">
      
      {/* Top Action Header Bar */}
      <div className="glass-card p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-400">
            <CheckSquare className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Custom Fund List</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/20 text-brand-300 border border-brand-500/40">
                {funds.length} Schemes Selected
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Personalized selection grouped category-wise • Showing {selectedPlan.toUpperCase()} Plan returns
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {/* Export Excel Button */}
          <button
            onClick={handleExport}
            disabled={funds.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg border border-emerald-500/40 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export Excel</span>
          </button>

          {/* Clear All Button */}
          <button
            onClick={() => setShowClearConfirm(true)}
            disabled={funds.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear All</span>
          </button>
        </div>
      </div>

      {/* Main Grouped Custom Fund Table */}
      {isLoading ? (
        <div className="glass-card p-12 rounded-2xl border border-slate-800 text-center text-slate-400">
          <div className="animate-pulse space-y-4 max-w-md mx-auto">
            <div className="h-4 bg-slate-800 rounded w-3/4 mx-auto"></div>
            <div className="h-4 bg-slate-800 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      ) : funds.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl border border-slate-800 text-center text-slate-400 space-y-3">
          <Sparkles className="h-10 w-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-200">Your Custom Fund List is Empty</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Go to the <span className="text-brand-400 font-semibold">All Schemes</span> tab and click the checkbox beside any mutual fund to add it to your custom portfolio list.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedCategories.map(({ categoryName, funds: catFunds }) => (
            <div key={categoryName} className="glass-card rounded-2xl border border-slate-800/90 shadow-xl overflow-hidden">
              
              {/* Category Header */}
              <div className="px-5 py-3 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-400"></span>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">{categoryName}</h3>
                </div>
                <span className="text-[11px] font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                  {catFunds.length} {catFunds.length === 1 ? 'Scheme' : 'Schemes'}
                </span>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800/60">
                    <tr>
                      <th className="p-3 pl-4 min-w-[240px]">Scheme Name</th>
                      <th className="p-3 min-w-[100px]">Current NAV</th>
                      <th className="p-3 min-w-[90px]">1 Yr (%)</th>
                      <th className="p-3 min-w-[90px]">2 Yr (%)</th>
                      <th className="p-3 min-w-[90px]">3 Yr (%)</th>
                      <th className="p-3 min-w-[90px]">5 Yr (%)</th>
                      <th className="p-3 min-w-[90px]">10 Yr (%)</th>
                      <th className="p-3 min-w-[110px]">AUM (Cr)</th>
                      <th className="p-3 text-right pr-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {catFunds.map((fund) => (
                      <tr 
                        key={fund.id}
                        onClick={() => onSelectFund && onSelectFund(fund)}
                        className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      >
                        {/* Scheme Name */}
                        <td className="p-3 pl-4">
                          <div className="font-bold text-white group-hover:text-brand-300 transition-colors">
                            {fund.displayName}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {fund.amcName}
                          </div>
                        </td>

                        {/* NAV */}
                        <td className="p-3 font-mono text-[11px] text-slate-200">
                          {formatNav(fund.currentNav)}
                        </td>

                        {/* 1Y Return */}
                        <td className="p-3 font-mono text-[11px]">
                          {formatPct(fund.return1Yr)}
                        </td>

                        {/* 2Y Return */}
                        <td className="p-3 font-mono text-[11px]">
                          {formatPct(fund.return2Yr)}
                        </td>

                        {/* 3Y Return */}
                        <td className="p-3 font-mono text-[11px]">
                          {formatPct(fund.return3Yr)}
                        </td>

                        {/* 5Y Return */}
                        <td className="p-3 font-mono text-[11px]">
                          {formatPct(fund.return5Yr)}
                        </td>

                        {/* 10Y Return */}
                        <td className="p-3 font-mono text-[11px]">
                          {formatPct(fund.return10Yr)}
                        </td>

                        {/* AUM */}
                        <td className="p-3 font-semibold text-slate-200">
                          {fund.dailyAUMFormatted || 'N/A'}
                        </td>

                        {/* Remove Action */}
                        <td className="p-3 text-right pr-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveFund(fund.id);
                            }}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-300 hover:text-white transition-all shadow-sm"
                            title="Remove scheme from Custom List"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card max-w-sm w-full p-6 rounded-2xl border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-white">Clear Custom Fund List?</h3>
            </div>
            
            <p className="text-xs text-slate-300">
              Are you sure you want to remove all <span className="font-bold text-white">{funds.length} selected schemes</span> from your Custom Fund List?
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
