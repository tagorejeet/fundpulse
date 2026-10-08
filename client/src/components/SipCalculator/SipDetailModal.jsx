import React, { useState, useMemo } from 'react';
import { X, TrendingUp, DollarSign, Calendar, PieChart, Layers, Download, CheckCircle, AlertCircle, ArrowUpRight } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { exportSipToExcel } from '../../services/excelSipExport';

export const SipDetailModal = ({
  fundResult,
  plan = 'regular',
  onClose
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState('1Y');

  if (!fundResult) return null;

  const periods = ['1Y', '2Y', '3Y', '5Y', '10Y'];
  const activePeriodData = fundResult.periods?.[selectedPeriod];

  const formatCurrency = (val) => {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    return `₹${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const formatPct = (val) => {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    const num = Number(val);
    const isPositive = num > 0;
    return (
      <span className={num === 0 ? 'text-slate-300' : isPositive ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
        {isPositive ? `+${num.toFixed(2)}%` : `${num.toFixed(2)}%`}
      </span>
    );
  };

  // Chart data: Invested vs Portfolio Value over installments
  const chartData = useMemo(() => {
    if (!activePeriodData || !activePeriodData.hasSufficientData || !activePeriodData.installments) return [];
    const currentNav = activePeriodData.currentNav;

    return activePeriodData.installments.map(inst => ({
      date: inst.allotmentDate,
      invested: inst.cumulativeInvested,
      value: Math.round(inst.cumulativeUnits * currentNav),
      nav: inst.nav
    }));
  }, [activePeriodData]);

  const handleExportThisFund = () => {
    exportSipToExcel({
      results: [fundResult],
      monthlySip: fundResult.monthlySipAmount,
      calculationDate: fundResult.calculationDate,
      sipDay: fundResult.preferredSipDay,
      plan: fundResult.plan || plan,
      reportDate: fundResult.valuationDate
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-5xl glass-card rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/90 flex items-start justify-between gap-4 sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30">
                {fundResult.category || 'Mutual Fund'}
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                {fundResult.amcName}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {(fundResult.plan || plan).toUpperCase()} PLAN
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>{fundResult.displayName}</span>
            </h2>

            <div className="flex items-center gap-4 text-xs text-slate-400 mt-1 flex-wrap">
              <span>Monthly SIP: <strong className="text-white font-mono">₹{Number(fundResult.monthlySipAmount).toLocaleString('en-IN')}</strong></span>
              <span>Calculation Date: <strong className="text-white">{fundResult.calculationDate}</strong></span>
              <span>Valuation NAV: <strong className="text-white font-mono">₹{fundResult.currentNav ? Number(fundResult.currentNav).toFixed(2) : 'N/A'}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportThisFund}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95"
              title="Export this fund calculation to Excel"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="px-5 py-3 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between gap-3 overflow-x-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">SIP Period:</span>
            <div className="flex items-center p-1 bg-slate-900 rounded-xl border border-slate-800">
              {periods.map(yr => {
                const pData = fundResult.periods?.[yr];
                const hasData = pData?.hasSufficientData;
                return (
                  <button
                    key={yr}
                    onClick={() => setSelectedPeriod(yr)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      selectedPeriod === yr
                        ? 'bg-brand-600 text-white shadow-md'
                        : hasData
                          ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                          : 'text-slate-500 hover:text-slate-400'
                    }`}
                  >
                    <span>{yr}</span>
                    {!hasData && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300">
                        N/A
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {activePeriodData?.hasSufficientData && (
            <div className="text-xs text-slate-400 hidden sm:flex items-center gap-2">
              <span>Installments: <strong className="text-white">{activePeriodData.installmentsCount} months</strong></span>
              <span>•</span>
              <span>{activePeriodData.firstInstallmentDate} → {activePeriodData.valuationDate}</span>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 custom-scrollbar text-slate-200">
          
          {/* If insufficient data */}
          {!activePeriodData?.hasSufficientData ? (
            <div className="p-8 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-center space-y-3">
              <AlertCircle className="h-10 w-10 text-amber-400 mx-auto" />
              <h3 className="text-base font-bold text-white">Insufficient Historical NAV Data for {selectedPeriod} Horizon</h3>
              <p className="text-xs text-amber-200/80 max-w-md mx-auto">
                {activePeriodData?.insufficientReason || `This mutual fund scheme does not have complete historical NAV data covering the requested ${selectedPeriod} duration.`}
              </p>
            </div>
          ) : (
            <>
              {/* Summary Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5 text-brand-400" /> Total Invested
                  </p>
                  <p className="text-base font-bold text-white mt-1 font-mono">
                    {formatCurrency(activePeriodData.totalInvested)}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{activePeriodData.installmentsCount} × ₹{Number(fundResult.monthlySipAmount).toLocaleString('en-IN')}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5 text-indigo-400" /> Total Units
                  </p>
                  <p className="text-base font-bold text-white mt-1 font-mono">
                    {activePeriodData.totalUnits != null ? Number(activePeriodData.totalUnits).toFixed(4) : '0.0000'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Accumulated</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-amber-400" /> Latest NAV
                  </p>
                  <p className="text-base font-bold text-white mt-1 font-mono">
                    ₹{activePeriodData.currentNav != null ? Number(activePeriodData.currentNav).toFixed(2) : '-'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{activePeriodData.valuationDate}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                    <PieChart className="h-3.5 w-3.5 text-emerald-400" /> Final Value
                  </p>
                  <p className="text-base font-bold text-emerald-400 mt-1 font-mono">
                    {formatCurrency(activePeriodData.finalPortfolioValue)}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Units × Latest NAV</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                    <ArrowUpRight className="h-3.5 w-3.5 text-purple-400" /> Absolute Gain
                  </p>
                  <p className={`text-base font-bold mt-1 font-mono ${activePeriodData.absoluteGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {activePeriodData.absoluteGain >= 0 ? `+${formatCurrency(activePeriodData.absoluteGain)}` : formatCurrency(activePeriodData.absoluteGain)}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{activePeriodData.absoluteReturnPct}% total</p>
                </div>

                <div className="p-3.5 rounded-xl bg-gradient-to-br from-brand-950 to-indigo-950 border border-brand-500/40 shadow-lg">
                  <p className="text-[11px] text-brand-300 font-bold flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5 text-brand-400" /> Annualized XIRR
                  </p>
                  <p className="text-lg font-extrabold text-white mt-1 font-mono">
                    {formatPct(activePeriodData.sipXirr)}
                  </p>
                  <p className="text-[10px] text-brand-300/70 mt-0.5">Cash-Flow XIRR</p>
                </div>
              </div>

              {/* Interactive Wealth Chart */}
              {chartData.length > 1 && (
                <div className="glass-card p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-brand-400" /> Cumulative Wealth Accumulation
                    </h4>
                    <div className="flex items-center gap-4 text-[11px]">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span> Total Invested
                      </span>
                      <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Portfolio Value
                      </span>
                    </div>
                  </div>

                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="valueGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                          </linearGradient>
                          <linearGradient id="investedGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#64748b" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#64748b" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-xl text-xs space-y-1">
                                  <p className="font-bold text-white">{label}</p>
                                  <p className="text-slate-400">NAV on SIP Date: <span className="font-mono text-white">₹{d.nav}</span></p>
                                  <p className="text-slate-400">Invested: <span className="font-mono text-white">₹{d.invested.toLocaleString('en-IN')}</span></p>
                                  <p className="text-emerald-400 font-semibold">Portfolio Value: <span className="font-mono">₹{d.value.toLocaleString('en-IN')}</span></p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Area type="monotone" dataKey="invested" stroke="#94a3b8" strokeWidth={2} fillOpacity={1} fill="url(#investedGrad)" />
                        <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#valueGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Detailed Monthly Cash Flows Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Layers className="h-4 w-4 text-indigo-400" /> Monthly Installment Cash Flow Ledger
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    High-Precision Unit Calculation: Units = SIP Amount ÷ Applicable NAV
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800 shadow-xl max-h-[350px]">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-900/95 sticky top-0 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800 z-10 backdrop-blur-sm">
                      <tr>
                        <th className="p-3 pl-4">#</th>
                        <th className="p-3">Scheduled Date</th>
                        <th className="p-3">Allotment Date</th>
                        <th className="p-3">Applicable NAV</th>
                        <th className="p-3">Monthly SIP</th>
                        <th className="p-3">Units Purchased</th>
                        <th className="p-3">Cumulative Units</th>
                        <th className="p-3">Cumulative Invested</th>
                        <th className="p-3 pr-4 text-right">Value @ Latest NAV</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {activePeriodData.installments.map((inst) => {
                        const valAtLatest = inst.cumulativeUnits * activePeriodData.currentNav;
                        return (
                          <tr key={inst.installmentNumber} className="hover:bg-slate-800/40 transition-colors">
                            <td className="p-2.5 pl-4 text-slate-500 font-sans">{inst.installmentNumber}</td>
                            <td className="p-2.5 text-slate-300 font-sans">{inst.scheduledDate}</td>
                            <td className="p-2.5 text-slate-300 font-sans">
                              <span>{inst.allotmentDate}</span>
                              {inst.isAdjustedForHoliday && (
                                <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-amber-400 border border-amber-500/30" title="Shifted to next available trading day">
                                  Adj
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-white font-semibold">₹{Number(inst.nav).toFixed(4)}</td>
                            <td className="p-2.5 text-slate-200">₹{Number(inst.sipAmount).toLocaleString('en-IN')}</td>
                            <td className="p-2.5 text-indigo-300 font-semibold">{Number(inst.unitsPurchased).toFixed(4)}</td>
                            <td className="p-2.5 text-brand-300 font-semibold">{Number(inst.cumulativeUnits).toFixed(4)}</td>
                            <td className="p-2.5 text-slate-300">₹{Number(inst.cumulativeInvested).toLocaleString('en-IN')}</td>
                            <td className="p-2.5 pr-4 text-right text-emerald-400 font-semibold">₹{Math.round(valAtLatest).toLocaleString('en-IN')}</td>
                          </tr>
                        );
                      })}
                      {/* Final Row */}
                      <tr className="bg-slate-900/90 font-bold border-t-2 border-slate-700">
                        <td className="p-3 pl-4 text-brand-400 font-sans">VALUATION</td>
                        <td className="p-3 font-sans text-white">{activePeriodData.valuationDate}</td>
                        <td className="p-3 font-sans text-slate-400">Calculation Date</td>
                        <td className="p-3 text-emerald-400 font-semibold">₹{activePeriodData.currentNav != null ? Number(activePeriodData.currentNav).toFixed(4) : '-'}</td>
                        <td className="p-3 text-slate-400">Final Portfolio</td>
                        <td className="p-3 text-slate-500">-</td>
                        <td className="p-3 text-brand-400">{activePeriodData.totalUnits != null ? Number(activePeriodData.totalUnits).toFixed(4) : '0.0000'}</td>
                        <td className="p-3 text-white">₹{activePeriodData.totalInvested.toLocaleString('en-IN')}</td>
                        <td className="p-3 pr-4 text-right text-emerald-400 text-sm">
                          ₹{Math.round(activePeriodData.finalPortfolioValue).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="text-xs text-slate-400 hidden sm:block">
            Calculated using dated negative cash flows (-SIP) and final positive cash flow (+Value) via XIRR.
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-all active:scale-95 ml-auto"
          >
            Close Ledger
          </button>
        </div>

      </div>
    </div>
  );
};

export default SipDetailModal;
