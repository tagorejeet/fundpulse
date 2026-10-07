import React from 'react';
import { Activity, RefreshCw, Sun, Moon, CheckSquare, Layers, Calendar, TrendingUp, Calculator, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import StatusBadge from './StatusBadge';

const Header = ({
  onRefresh,
  isRefreshing,
  meta,
  appMode = 'analysis', // 'analysis' | 'sip'
  onSelectAppMode,
  activeTab = 'all',
  onSelectTab,
  mode = 'yearly',
  onSelectMode,
  selectedPlan = 'regular',
  onSelectPlan,
  selectedCount = 0,
  suggestionCount = 0,
  nseSelectedCount = 0,
  calculationDate = '',
  onSelectCalculationDate,
  sipActiveTab = 'calculator',
  onSelectSipTab,
  sipCustomCount = 0
}) => {
  const { theme, toggleTheme } = useTheme();
  const todayStr = React.useMemo(() => new Date().toISOString().split('T')[0], []);

  return (
    <header className="sticky top-0 z-40 w-full glass-card border-b border-slate-800/80 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-3">
        
        {/* Top Row: Brand, Primary App Switch & System Actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo & Brand Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-md shadow-brand-500/20 ring-1 ring-white/20">
              <Activity className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">
                  FundPulse
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-md bg-brand-500/20 text-brand-400 border border-brand-500/30">
                  AMFI Live
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Mutual Fund Intelligence & Return Engine
              </p>
            </div>
          </div>

          {/* Top-Level Mode Switch: [ Fund Analysis ] [ SIP Calculator ] */}
          <div className="flex items-center justify-center">
            <div className="flex items-center p-1 bg-slate-900/95 rounded-xl border border-slate-800 shadow-inner">
              <button
                onClick={() => onSelectAppMode('analysis')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  appMode === 'analysis'
                    ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-500/25 ring-1 ring-white/10'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                <span>Fund Analysis</span>
              </button>

              <button
                onClick={() => onSelectAppMode('sip')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  appMode === 'sip'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25 ring-1 ring-white/10'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Calculator className="h-4 w-4" />
                <span>SIP Calculator</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-400/20 text-emerald-300 font-extrabold border border-emerald-400/30">
                  XIRR
                </span>
              </button>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            {meta && (
              <StatusBadge 
                isCached={meta.isCached}
                lastUpdated={meta.lastUpdated}
                reportDate={meta.reportDate}
              />
            )}

            <div className="flex items-center gap-2 ml-auto md:ml-0">
              {/* Refresh Button */}
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                title="Force refresh AMFI data"
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-brand-400' : 'text-slate-400'}`} />
                <span>{isRefreshing ? 'Updating...' : 'Refresh'}</span>
              </button>

              {/* Light / Dark Mode Toggle */}
              <button
                onClick={toggleTheme}
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition-all duration-200 active:scale-95 shadow-sm"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4 text-amber-400" />
                ) : (
                  <Moon className="h-4 w-4 text-indigo-600" />
                )}
              </button>
            </div>
          </div>

        </div>

        {/* Bottom Navigation & Controls Row (Only active during Fund Analysis) */}
        {appMode === 'analysis' && (
          <div className="flex flex-col lg:flex-row items-center justify-between gap-3 pt-1 border-t border-slate-800/40">
            {/* Main Mode Toggle: Yearly Returns vs Day Calculation */}
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">Analysis:</span>
              <div className="flex items-center p-1 bg-slate-900/90 rounded-xl border border-slate-800 w-full sm:w-auto">
                <button
                  onClick={() => onSelectMode('yearly')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    mode === 'yearly'
                      ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>Yearly Performance</span>
                </button>

                <button
                  onClick={() => onSelectMode('days')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    mode === 'days'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Day Calculation</span>
                </button>
              </div>
            </div>

            {/* View Tabs (All Schemes vs Custom Fund List) */}
            <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end flex-wrap">
              <div className="flex items-center p-1 bg-slate-900/90 rounded-xl border border-slate-800 w-full sm:w-auto">
                <button
                  onClick={() => onSelectTab('all')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'all'
                      ? 'bg-brand-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>All Schemes</span>
                </button>

                <button
                  onClick={() => onSelectTab('custom')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'custom'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <CheckSquare className="h-3.5 w-3.5 text-blue-400" />
                  <span>Custom Fund List</span>
                  <span className={`ml-1 px-2 py-0.2 rounded-full text-[10px] font-extrabold ${
                    activeTab === 'custom' ? 'bg-white/20 text-white' : 'bg-slate-800 text-blue-400 border border-blue-500/30'
                  }`}>
                    {selectedCount}
                  </span>
                </button>

                <button
                  onClick={() => onSelectTab('suggestion')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'suggestion'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800/50'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>Suggestion Sheet</span>
                  <span className={`ml-1 px-2 py-0.2 rounded-full text-[10px] font-extrabold ${
                    activeTab === 'suggestion' ? 'bg-white/20 text-white' : 'bg-slate-800 text-amber-400 border border-amber-500/30'
                  }`}>
                    {suggestionCount}
                  </span>
                </button>
              </div>

              {/* Calculation / Valuation Date Tab */}
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-amber-400" />
                  <span>Date:</span>
                </span>
                <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-xl border border-slate-800">
                  <input
                    type="date"
                    value={calculationDate || todayStr}
                    onChange={(e) => onSelectCalculationDate && onSelectCalculationDate(e.target.value)}
                    className="px-2 py-1 rounded-lg text-xs font-semibold bg-slate-950 text-white border border-slate-700/80 focus:outline-none focus:border-brand-500"
                    title="Valuation / Anchor NAV Date"
                  />
                  {calculationDate && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-brand-300 border border-slate-700/60" title={new Date(calculationDate).toLocaleDateString('en-US', { weekday: 'long' })}>
                      {new Date(calculationDate).toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                  )}
                  {calculationDate && calculationDate !== todayStr && (
                    <button
                      type="button"
                      onClick={() => onSelectCalculationDate && onSelectCalculationDate(todayStr)}
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-brand-300 border border-slate-700 transition-all"
                      title="Reset date to Today"
                    >
                      Today
                    </button>
                  )}
                </div>
              </div>

              {/* Regular / Direct / Both Plan Segmented Switch */}
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-xs font-semibold text-slate-400">Plan:</span>
                <div className="flex items-center p-1 bg-slate-900/90 rounded-xl border border-slate-800">
                  <button
                    onClick={() => onSelectPlan('regular')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedPlan === 'regular'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Regular
                  </button>

                  <button
                    onClick={() => onSelectPlan('direct')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedPlan === 'direct'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Direct
                  </button>

                  <button
                    onClick={() => onSelectPlan('both')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedPlan === 'both'
                        ? 'bg-gradient-to-r from-indigo-600 to-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Both
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Navigation & Controls Row (Only active during SIP Calculator) */}
        {appMode === 'sip' && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-slate-800/40">
            {/* View Tabs: SIP Calculator vs Custom Fund List */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-400">View:</span>
              <div className="flex items-center p-1 bg-slate-900/90 rounded-xl border border-slate-800 w-full sm:w-auto">
                <button
                  onClick={() => onSelectSipTab && onSelectSipTab('calculator')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    sipActiveTab === 'calculator'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Calculator className="h-3.5 w-3.5" />
                  <span>SIP Calculator</span>
                </button>

                <button
                  onClick={() => onSelectSipTab && onSelectSipTab('custom')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    sipActiveTab === 'custom'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  <span>Custom Fund List</span>
                  <span className={`ml-1 px-2 py-0.2 rounded-full text-[10px] font-extrabold ${
                    sipActiveTab === 'custom' ? 'bg-white/20 text-white' : 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {sipCustomCount}
                  </span>
                </button>
              </div>
            </div>

            {/* Quick Summary Info */}
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span>Plan: <strong className="text-white capitalize">{selectedPlan}</strong></span>
              <span>•</span>
              <span>Valuation Date: <strong className="text-emerald-400 font-mono">{calculationDate || todayStr}</strong></span>
            </div>
          </div>
        )}

      </div>
    </header>
  );
};

export default Header;
