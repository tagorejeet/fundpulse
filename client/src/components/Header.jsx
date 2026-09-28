import React from 'react';
import { Activity, RefreshCw, Sun, Moon, Database } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import StatusBadge from './StatusBadge';

const Header = ({ onRefresh, isRefreshing, meta }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full glass-card border-b border-slate-800/80 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo & Brand Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-md shadow-brand-500/20 ring-1 ring-white/20">
              <Activity className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white dark:text-white light:text-slate-900">
                  FundPulse
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-md bg-brand-500/20 text-brand-400 border border-brand-500/30">
                  AMFI Tracker
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-600 font-medium">
                Indian Mutual Fund Performance Dashboard
              </p>
            </div>
          </div>

          {/* Right Action Bar */}
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
      </div>
    </header>
  );
};

export default Header;
