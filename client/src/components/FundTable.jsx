import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, AlertCircle, XCircle, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

const CATEGORY_ORDER = {
  'Large Cap': 1,
  'Mid Cap': 2,
  'Large & Mid Cap': 3,
  'Small Cap': 4,
  'Multi Cap': 5,
  'Value': 6,
  'Flexi Cap': 7,
  'Sectoral / Thematic': 8
};

const FundTable = ({ funds, isLoading, onSelectFund, searchQuery, setSearchQuery, meta }) => {
  const [sortField, setSortField] = useState('category');
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
      if (sortField === 'category') {
        const orderA = CATEGORY_ORDER[a.category] || 99;
        const orderB = CATEGORY_ORDER[b.category] || 99;
        if (orderA !== orderB) {
          return sortOrder === 'asc' ? orderA - orderB : orderB - orderA;
        }
        // Secondary sort by name
        return a.displayName.localeCompare(b.displayName);
      }

      let aVal = a[sortField];
      let bVal = b[sortField];

      // Special handling for null values (push to bottom)
      if (aVal === null || aVal === undefined || aVal === 'N/A') return 1;
      if (bVal === null || bVal === undefined || bVal === 'N/A') return -1;

      if (typeof aVal === 'string') {
        const comp = aVal.localeCompare(bVal);
        return sortOrder === 'asc' ? comp : -comp;
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [funds, sortField, sortOrder]);

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

  // Export to Excel Functionality (Streamlined to user's exact requested fields)
  const handleExportExcel = () => {
    if (!sortedFunds || sortedFunds.length === 0) return;

    const exportRows = sortedFunds.map((fund, index) => ({
      'S.No': index + 1,
      'Scheme Name': fund.displayName,
      'Category': fund.category,
      '1Y Regular Return (%)': fund.return1YearRegular !== null ? fund.return1YearRegular : 'N/A',
      '3Y Regular Return (%)': fund.return3YearRegular !== null ? fund.return3YearRegular : 'N/A',
      '5Y Regular Return (%)': fund.return5YearRegular !== null ? fund.return5YearRegular : 'N/A',
      '10Y Regular Return (%)': fund.return10YearRegular !== null ? fund.return10YearRegular : 'N/A',
      'AUM': fund.dailyAUMFormatted
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);

    // Auto-fit column widths
    const columnWidths = Object.keys(exportRows[0]).map(key => ({
      wch: Math.max(key.length + 3, 14)
    }));
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Mutual Funds Performance');

    const reportDateStr = meta?.reportDate ? meta.reportDate.replace(/[^a-zA-Z0-9]/g, '_') : 'Latest';
    const fileName = `FundPulse_Mutual_Funds_${reportDateStr}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-4 my-4">
      {/* Top Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search 34 allowed schemes..."
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
            Showing <span className="text-white font-bold">{sortedFunds.length}</span> of <span className="text-white font-bold">34</span> Master Funds
          </div>

          {/* Export to Excel Button */}
          <button
            onClick={handleExportExcel}
            disabled={isLoading || sortedFunds.length === 0}
            title="Download scheme data in Excel format (.xlsx)"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/40 transition-all duration-200 shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Main Fund Table (Desktop View) */}
      <div className="glass-card rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold border-b border-slate-800/80 tracking-wider">
              <tr>
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
                  onClick={() => handleSort('navRegular')} 
                  className="p-3.5 cursor-pointer hover:text-white transition-colors group select-none min-w-[110px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>NAV (Reg / Dir)</span>
                    {renderSortIcon('navRegular')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('return1YearDirect')} 
                  className="p-3.5 cursor-pointer hover:text-white transition-colors group select-none min-w-[110px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>1Y (Reg / Dir)</span>
                    {renderSortIcon('return1YearDirect')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('return3YearDirect')} 
                  className="p-3.5 cursor-pointer hover:text-white transition-colors group select-none min-w-[110px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>3Y (Reg / Dir)</span>
                    {renderSortIcon('return3YearDirect')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('return5YearDirect')} 
                  className="p-3.5 cursor-pointer hover:text-white transition-colors group select-none min-w-[110px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>5Y (Reg / Dir)</span>
                    {renderSortIcon('return5YearDirect')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('return10YearDirect')} 
                  className="p-3.5 cursor-pointer hover:text-white transition-colors group select-none min-w-[110px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>10Y (Reg / Dir)</span>
                    {renderSortIcon('return10YearDirect')}
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
                <th className="p-3.5 min-w-[140px]">Riskometer</th>
                <th className="p-3.5 text-right">Details</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60 font-sans">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-3.5"><div className="h-4 bg-slate-800 rounded w-48"></div></td>
                    <td className="p-3.5"><div className="h-4 bg-slate-800 rounded w-20"></div></td>
                    <td className="p-3.5"><div className="h-4 bg-slate-800 rounded w-16"></div></td>
                    <td className="p-3.5"><div className="h-4 bg-slate-800 rounded w-16"></div></td>
                    <td className="p-3.5"><div className="h-4 bg-slate-800 rounded w-16"></div></td>
                    <td className="p-3.5"><div className="h-4 bg-slate-800 rounded w-16"></div></td>
                    <td className="p-3.5"><div className="h-4 bg-slate-800 rounded w-16"></div></td>
                    <td className="p-3.5"><div className="h-4 bg-slate-800 rounded w-20"></div></td>
                    <td className="p-3.5"><div className="h-4 bg-slate-800 rounded w-20"></div></td>
                    <td className="p-3.5"><div className="h-4 bg-slate-800 rounded w-12 ml-auto"></div></td>
                  </tr>
                ))
              ) : sortedFunds.length === 0 ? (
                <tr>
                  <td colSpan="10" className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="h-8 w-8 text-slate-500" />
                      <p className="text-sm font-semibold text-slate-300">No matching schemes found</p>
                      <p className="text-xs text-slate-500 max-w-sm">
                        FundPulse strictly tracks the 34 allowlisted mutual funds. Searches outside this list will not return results.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedFunds.map((fund) => (
                  <tr 
                    key={fund.id}
                    onClick={() => onSelectFund(fund)}
                    className="hover:bg-slate-800/50 transition-colors duration-150 cursor-pointer group"
                  >
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
                    <td className="p-3.5 whitespace-nowrap font-mono text-[11px]">
                      <div><span className="text-slate-400 text-[10px]">R:</span> {formatNav(fund.navRegular)}</div>
                      <div className="text-emerald-400"><span className="text-slate-400 text-[10px]">D:</span> {formatNav(fund.navDirect)}</div>
                    </td>

                    {/* 1Y Return */}
                    <td className="p-3.5 whitespace-nowrap font-mono text-[11px]">
                      <div><span className="text-slate-400 text-[10px]">R:</span> {formatPct(fund.return1YearRegular)}</div>
                      <div><span className="text-slate-400 text-[10px]">D:</span> {formatPct(fund.return1YearDirect)}</div>
                    </td>

                    {/* 3Y Return */}
                    <td className="p-3.5 whitespace-nowrap font-mono text-[11px]">
                      <div><span className="text-slate-400 text-[10px]">R:</span> {formatPct(fund.return3YearRegular)}</div>
                      <div><span className="text-slate-400 text-[10px]">D:</span> {formatPct(fund.return3YearDirect)}</div>
                    </td>

                    {/* 5Y Return */}
                    <td className="p-3.5 whitespace-nowrap font-mono text-[11px]">
                      <div><span className="text-slate-400 text-[10px]">R:</span> {formatPct(fund.return5YearRegular)}</div>
                      <div><span className="text-slate-400 text-[10px]">D:</span> {formatPct(fund.return5YearDirect)}</div>
                    </td>

                    {/* 10Y Return */}
                    <td className="p-3.5 whitespace-nowrap font-mono text-[11px]">
                      <div><span className="text-slate-400 text-[10px]">R:</span> {formatPct(fund.return10YearRegular)}</div>
                      <div><span className="text-slate-400 text-[10px]">D:</span> {formatPct(fund.return10YearDirect)}</div>
                    </td>

                    {/* AUM */}
                    <td className="p-3.5 whitespace-nowrap font-semibold text-slate-200">
                      {fund.dailyAUMFormatted}
                    </td>

                    {/* Riskometer */}
                    <td className="p-3.5 whitespace-nowrap">
                      {getRiskometerBadge(fund.riskometerScheme)}
                    </td>

                    {/* Action */}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FundTable;
