import React from 'react';
import { X, TrendingUp, ShieldAlert, Award, Calendar, DollarSign, BarChart3, Info } from 'lucide-react';
import PerformanceChart from './PerformanceChart';

const FundDetailModal = ({ fund, onClose }) => {
  if (!fund) return null;

  const formatPct = (val) => {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
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

  const getRiskometerColor = (risk) => {
    if (!risk || risk === 'N/A') return 'bg-slate-800 text-slate-400 border-slate-700';
    const lower = risk.toLowerCase();
    if (lower.includes('very high')) return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    if (lower.includes('high')) return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
    if (lower.includes('moderate')) return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    if (lower.includes('low')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-4xl glass-card rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/90 flex items-start justify-between gap-4 sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30">
                {fund.category}
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                {fund.amcName}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {fund.displayName}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
              <span>Official AMFI Scheme Name:</span>
              <span className="text-slate-300 font-mono">{fund.amfiSchemeName}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 custom-scrollbar text-slate-200">
          
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-brand-400" /> NAV (Regular)
              </p>
              <p className="text-lg font-bold text-white mt-1 font-mono">{formatNav(fund.navRegular)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Prev: {formatNav(fund.preNavRegular)}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-emerald-400" /> NAV (Direct)
              </p>
              <p className="text-lg font-bold text-white mt-1 font-mono">{formatNav(fund.navDirect)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Prev: {formatNav(fund.preNavDirect)}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <BarChart3 className="h-3.5 w-3.5 text-purple-400" /> Total AUM
              </p>
              <p className="text-lg font-bold text-white mt-1">{fund.dailyAUMFormatted}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Daily AUM Snapshot</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-amber-400" /> NAV Date
              </p>
              <p className="text-sm font-bold text-white mt-1">{fund.navDate || 'N/A'}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Source: AMFI</p>
            </div>
          </div>

          {/* Scheme & Benchmark Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-brand-400" />
                <span className="text-xs font-semibold text-slate-400 uppercase">Benchmark Index</span>
              </div>
              <p className="text-sm font-bold text-white">{fund.benchmark}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-semibold text-slate-400 uppercase">Riskometer Classification</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className={`px-2.5 py-1 rounded-lg border font-semibold ${getRiskometerColor(fund.riskometerScheme)}`}>
                  Scheme: {fund.riskometerScheme}
                </span>
                <span className={`px-2.5 py-1 rounded-lg border font-semibold ${getRiskometerColor(fund.riskometerBenchmark)}`}>
                  Benchmark: {fund.riskometerBenchmark}
                </span>
              </div>
            </div>
          </div>

          {/* Performance Comparison Chart */}
          <PerformanceChart fund={fund} />

          {/* Detailed Performance Table (Regular vs Direct vs Benchmark) */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" /> Historical Performance Breakdown
            </h4>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3">Period</th>
                    <th className="p-3">Regular Plan</th>
                    <th className="p-3">Direct Plan</th>
                    <th className="p-3">Benchmark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono">
                  <tr>
                    <td className="p-3 font-sans font-semibold text-slate-300">1 Year CAGR</td>
                    <td className="p-3">{formatPct(fund.return1YearRegular)}</td>
                    <td className="p-3">{formatPct(fund.return1YearDirect)}</td>
                    <td className="p-3">{formatPct(fund.return1YearBenchmark)}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-sans font-semibold text-slate-300">3 Year CAGR</td>
                    <td className="p-3">{formatPct(fund.return3YearRegular)}</td>
                    <td className="p-3">{formatPct(fund.return3YearDirect)}</td>
                    <td className="p-3">{formatPct(fund.return3YearBenchmark)}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-sans font-semibold text-slate-300">5 Year CAGR</td>
                    <td className="p-3">{formatPct(fund.return5YearRegular)}</td>
                    <td className="p-3">{formatPct(fund.return5YearDirect)}</td>
                    <td className="p-3">{formatPct(fund.return5YearBenchmark)}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-sans font-semibold text-slate-300">10 Year CAGR</td>
                    <td className="p-3">{formatPct(fund.return10YearRegular)}</td>
                    <td className="p-3">{formatPct(fund.return10YearDirect)}</td>
                    <td className="p-3">{formatPct(fund.return10YearBenchmark)}</td>
                  </tr>
                  <tr className="bg-slate-900/30">
                    <td className="p-3 font-sans font-semibold text-slate-200">Since Launch</td>
                    <td className="p-3">{formatPct(fund.returnSinceLaunchRegular)}</td>
                    <td className="p-3">{formatPct(fund.returnSinceLaunchDirect)}</td>
                    <td className="p-3">{formatPct(fund.returnSinceLaunchBenchmarkRegular)}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-sans font-semibold text-slate-400">6 Month Return</td>
                    <td className="p-3">{formatPct(fund.return6MonthRegular)}</td>
                    <td className="p-3">{formatPct(fund.return6MonthDirect)}</td>
                    <td className="p-3">{formatPct(fund.return6MonthBenchmark)}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-sans font-semibold text-slate-400">3 Month Return</td>
                    <td className="p-3">{formatPct(fund.return3MonthRegular)}</td>
                    <td className="p-3">{formatPct(fund.return3MonthDirect)}</td>
                    <td className="p-3">{formatPct(fund.return3MonthBenchmark)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Regulatory Analytical Note */}
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-start gap-2.5 text-[11px] text-slate-400">
            <Info className="h-4 w-4 text-brand-400 shrink-0 mt-0.5" />
            <p>
              Performance metrics shown above are annualized (CAGR) for periods greater than 1 year, and simple absolute returns for periods less than 1 year as reported by AMFI. Past performance is no indicator of future returns.
            </p>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-all active:scale-95"
          >
            Close Window
          </button>
        </div>

      </div>
    </div>
  );
};

export default FundDetailModal;
