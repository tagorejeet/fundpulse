import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, AlertCircle, XCircle, ChevronLeft, ChevronRight, Check } from 'lucide-react';

const FundTable = ({
  funds = [],
  totalFunds = 0,
  page = 1,
  totalPages = 1,
  onPageChange,
  isLoading = false,
  selectedPlan = 'regular',
  selectedFundIds = new Set(),
  onToggleSelectFund,
  onToggleSelectAllPage,
  onSelectFund,
  searchQuery = '',
  setSearchQuery
}) => {
  const [sortField, setSortField] = useState('displayName');
  const [sortOrder, setSortOrder] = useState('asc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'category' || field === 'displayName' ? 'asc' : 'desc');
    }
  };

  const sortedFunds = useMemo(() => {
    if (!funds) return [];
    return [...funds].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (aVal === null || aVal === undefined || aVal === 'N/A') return 1;
      if (bVal === null || bVal === undefined || bVal === 'N/A') return -1;

      if (typeof aVal === 'string') {
        const comp = aVal.localeCompare(bVal);
        return sortOrder === 'asc' ? comp : -comp;
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [funds, sortField, sortOrder]);

  const allPageSelected = useMemo(() => {
    if (!funds || funds.length === 0) return false;
    return funds.every(f => selectedFundIds.has(f.id));
  }, [funds, selectedFundIds]);

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 text-slate-500 opacity-60 group-hover:opacity-100" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-brand-400 font-bold" />
    ) : (
      <ArrowDown className="h-3 w-3 text-brand-400 font-bold" />
    );
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

  const getRiskometerBadge = (risk) => {
    if (!risk || risk === 'N/A') return <span className="text-slate-500">N/A</span>;
    const lower = risk.toLowerCase();
    let style = 'bg-slate-800 text-slate-300 border-slate-700';
    if (lower.includes('very high')) style = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    else if (lower.includes('high')) style = 'bg-orange-500/10 text-orange-400 border-orange-500/30';
    else if (lower.includes('moderate')) style = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    else if (lower.includes('low')) style = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';

    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${style}`}>
        {risk}
      </span>
    );
  };

  return (
    <div className="space-y-4 my-4">
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search all Indian mutual fund schemes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2 text-xs font-medium rounded-xl bg-slate-900/90 text-white placeholder-slate-500 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <XCircle className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="text-xs text-slate-400 font-medium">
            Total Schemes: <span className="text-white font-bold">{totalFunds.toLocaleString('en-IN')}</span> | Showing <span className="text-brand-400 font-bold">{selectedPlan.toUpperCase()}</span> Plan
          </div>
        </div>
      </div>

      {/* Main Fund Table */}
      <div className="glass-card rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold border-b border-slate-800/80 tracking-wider">
              <tr>
                {/* Select All Checkbox */}
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={() => onToggleSelectAllPage && onToggleSelectAllPage(funds)}
                    title="Select/Deselect all schemes on this page"
                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-brand-600 focus:ring-brand-500 cursor-pointer accent-brand-500"
                  />
                </th>

                <th 
                  onClick={() => handleSort('displayName')} 
                  className="p-3.5 cursor-pointer hover:text-white transition-colors group select-none min-w-[220px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Scheme Name</span>
                    {renderSortIcon('displayName')}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('category')} 
                  className="p-3.5 cursor-pointer hover:text-white transition-colors group select-none min-w-[130px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Category</span>
                    {renderSortIcon('category')}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('currentNav')} 
                  className="p-3.5 cursor-pointer hover:text-white transition-colors group select-none min-w-[100px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Current NAV</span>
                    {renderSortIcon('currentNav')}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('return1Yr')} 
                  className="p-3.5 cursor-pointer hover:text-white transition-colors group select-none min-w-[90px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>1 Yr (%)</span>
                    {renderSortIcon('return1Yr')}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('return2Yr')} 
                  className="p-3.5 cursor-pointer hover:text-white transition-colors group select-none min-w-[90px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>2 Yr (%)</span>
                    {renderSortIcon('return2Yr')}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('return3Yr')} 
                  className="p-3.5 cursor-pointer hover:text-white transition-colors group select-none min-w-[90px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>3 Yr (%)</span>
                    {renderSortIcon('return3Yr')}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('return5Yr')} 
                  className="p-3.5 cursor-pointer hover:text-white transition-colors group select-none min-w-[90px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>5 Yr (%)</span>
                    {renderSortIcon('return5Yr')}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('return10Yr')} 
                  className="p-3.5 cursor-pointer hover:text-white transition-colors group select-none min-w-[90px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>10 Yr (%)</span>
                    {renderSortIcon('return10Yr')}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('dailyAUMRaw')} 
                  className="p-3.5 cursor-pointer hover:text-white transition-colors group select-none min-w-[110px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>AUM</span>
                    {renderSortIcon('dailyAUMRaw')}
                  </div>
                </th>

                <th className="p-3.5 min-w-[120px]">Riskometer</th>
                <th className="p-3.5 text-right">Details</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60 font-sans">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-3.5 text-center"><div className="h-4 w-4 bg-slate-800 rounded mx-auto"></div></td>
                    <td className="p-3.5"><div className="h-4 bg-slate-800 rounded w-48"></div></td>
                    <td className="p-3.5"><div className="h-4 bg-slate-800 rounded w-20"></div></td>
                    <td className="p-3.5"><div className="h-4 bg-slate-800 rounded w-16"></div></td>
                    <td className="p-3.5"><div className="h-4 bg-slate-800 rounded w-14"></div></td>
                    <td className="p-3.5"><div className="h-4 bg-slate-800 rounded w-14"></div></td>
                    <td className="p-3.5"><div className="h-4 bg-slate-800 rounded w-14"></div></td>
                    <td className="p-3.5"><div className="h-4 bg-slate-800 rounded w-14"></div></td>
                    <td className="p-3.5"><div className="h-4 bg-slate-800 rounded w-14"></div></td>
                    <td className="p-3.5"><div className="h-4 bg-slate-800 rounded w-20"></div></td>
                    <td className="p-3.5"><div className="h-4 bg-slate-800 rounded w-20"></div></td>
                    <td className="p-3.5"><div className="h-4 bg-slate-800 rounded w-8 ml-auto"></div></td>
                  </tr>
                ))
              ) : sortedFunds.length === 0 ? (
                <tr>
                  <td colSpan="12" className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="h-8 w-8 text-slate-500" />
                      <p className="text-sm font-semibold text-slate-300">No matching schemes found</p>
                      <p className="text-xs text-slate-500 max-w-sm">
                        Try searching for a different scheme name or clearing the category filter.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedFunds.map((fund) => {
                  const isChecked = selectedFundIds.has(fund.id);

                  return (
                    <tr 
                      key={fund.id}
                      onClick={() => onToggleSelectFund(fund.id)}
                      className={`hover:bg-slate-800/50 transition-colors duration-150 cursor-pointer group ${
                        isChecked ? 'bg-brand-500/10 border-l-2 border-l-brand-500' : ''
                      }`}
                    >
                      {/* Checkbox Column */}
                      <td 
                        className="p-3.5 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggleSelectFund(fund.id)}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-brand-600 focus:ring-brand-500 cursor-pointer accent-brand-500"
                        />
                      </td>

                      {/* Fund Name */}
                      <td className="p-3.5">
                        <div className="font-bold text-white group-hover:text-brand-300 transition-colors">
                          {fund.displayName}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {fund.amcName}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {fund.category}
                        </span>
                      </td>

                      {/* NAV */}
                      <td className="p-3.5 whitespace-nowrap font-mono text-[11px] text-slate-200">
                        {formatNav(fund.currentNav)}
                      </td>

                      {/* 1Y Return */}
                      <td className="p-3.5 whitespace-nowrap font-mono text-[11px]">
                        {formatPct(fund.return1Yr)}
                      </td>

                      {/* 2Y Return */}
                      <td className="p-3.5 whitespace-nowrap font-mono text-[11px]">
                        {formatPct(fund.return2Yr)}
                      </td>

                      {/* 3Y Return */}
                      <td className="p-3.5 whitespace-nowrap font-mono text-[11px]">
                        {formatPct(fund.return3Yr)}
                      </td>

                      {/* 5Y Return */}
                      <td className="p-3.5 whitespace-nowrap font-mono text-[11px]">
                        {formatPct(fund.return5Yr)}
                      </td>

                      {/* 10Y Return */}
                      <td className="p-3.5 whitespace-nowrap font-mono text-[11px]">
                        {formatPct(fund.return10Yr)}
                      </td>

                      {/* AUM */}
                      <td className="p-3.5 whitespace-nowrap font-semibold text-slate-200">
                        {fund.dailyAUMFormatted}
                      </td>

                      {/* Riskometer */}
                      <td className="p-3.5 whitespace-nowrap">
                        {getRiskometerBadge(fund.riskometerScheme)}
                      </td>

                      {/* Details Trigger */}
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectFund(fund);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-brand-600 text-slate-300 hover:text-white transition-all shadow-sm"
                          title="View detailed performance"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-5 py-3.5 bg-slate-900/90 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              Page <span className="font-bold text-white">{page}</span> of <span className="font-bold text-white">{totalPages}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </button>

              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FundTable;
