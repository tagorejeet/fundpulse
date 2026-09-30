import React from 'react';
import { Activity, RefreshCw, Sun, Moon, CheckSquare, Layers, Calendar, TrendingUp, Calculator } from 'lucide-react';
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
  selectedCount = 0
}) => {
  const { theme, toggleTheme } = useTheme();

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

        {/* Bottom Navigation & Controls Row */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3 pt-1 border-t border-slate-800/40">
          
          {appMode === 'analysis' ? (
            <>
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
              <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
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
                        ? 'bg-brand-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                    <span>Custom Fund List</span>
                    <span className={`ml-1 px-2 py-0.2 rounded-full text-[10px] font-extrabold ${
                      activeTab === 'custom' ? 'bg-white/20 text-white' : 'bg-slate-800 text-brand-400 border border-brand-500/30'
                    }`}>
                      {selectedCount}
                    </span>
                  </button>
                </div>

                {/* Regular / Direct Plan Segmented Switch */}
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
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* SIP Mode Info Breadcrumb */}
              <div className="flex items-center gap-2.5 w-full lg:w-auto">
                <span className="flex items-center justify-center w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-bold text-white">SIP Calculator Mode</span>
                <span className="text-slate-500 text-xs">•</span>
                <span className="text-xs text-slate-400">
                  Historical NAV Cash-Flow Engine (1Y, 2Y, 3Y, 5Y, 10Y Returns)
                </span>
              </div>

              {/* Plan Switch for SIP */}
              <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span className="text-xs font-semibold text-slate-400">Default Plan:</span>
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
                  </div>
                </div>
              </div>
            </>
          )}

        </div>

      </div>
    </header>
  );
};

export default Header;
