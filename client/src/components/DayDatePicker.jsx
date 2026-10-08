import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, X, RotateCcw, Calculator, ArrowRight, Sparkles, Check } from 'lucide-react';

const POPULAR_DAY_PRESETS = [15, 30, 45, 60, 90, 180, 365];

const DayDatePicker = ({
  customDaysList = [33, 50, 67],
  startDate = '',
  endDate = '',
  calculationDate = '',
  onSelectCalculationDate,
  onApplyCustomDays,
  meta
}) => {
  // Format today's date YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  // Local draft of custom days list
  const [days, setDays] = useState(customDaysList || [33, 50, 67]);
  const [dayInput, setDayInput] = useState('');
  
  // Date range calculator tool state: V_T End Date defaults to calculationDate or endDate
  const [rangeStart, setRangeStart] = useState(startDate || '');
  const [rangeEnd, setRangeEnd] = useState(calculationDate || endDate || todayStr);
  const [rangeCalculatedDays, setRangeCalculatedDays] = useState(null);

  // Sync rangeEnd with external calculationDate prop
  useEffect(() => {
    if (calculationDate) {
      setRangeEnd(calculationDate);
    }
  }, [calculationDate]);

  // Sync with prop updates
  useEffect(() => {
    if (customDaysList && customDaysList.length > 0) {
      setDays(customDaysList);
    }
  }, [customDaysList]);

  // Recalculate difference in days when range start/end changes
  useEffect(() => {
    if (rangeStart && rangeEnd) {
      const s = new Date(rangeStart);
      const e = new Date(rangeEnd);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e > s) {
        const diff = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
        setRangeCalculatedDays(diff);
      } else {
        setRangeCalculatedDays(null);
      }
    }
  }, [rangeStart, rangeEnd]);

  // Helper to add day(s) from input string (can be comma-separated or space-separated)
  const handleAddDaysFromInput = (e) => {
    if (e) e.preventDefault();
    if (!dayInput.trim()) return;

    // Parse all numbers entered (e.g. "33, 50, 67" or "33 50 67")
    const newItems = dayInput
      .split(/[\s,]+/)
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n > 0 && n <= 3650);

    if (newItems.length > 0) {
      const combined = Array.from(new Set([...days, ...newItems])).sort((a, b) => a - b);
      setDays(combined);
      setDayInput('');
    }
  };

  // Quick preset click
  const handleAddPreset = (d) => {
    if (!days.includes(d)) {
      const combined = [...days, d].sort((a, b) => a - b);
      setDays(combined);
    }
  };

  // Remove a day column tag
  const handleRemoveDay = (d) => {
    if (days.length <= 1) {
      alert('You need at least one day column in the table.');
      return;
    }
    setDays(days.filter(item => item !== d));
  };

  // Reset to default [33, 50, 67]
  const handleResetDefaults = () => {
    setDays([33, 50, 67]);
    setDayInput('');
  };

  // Add the date-range calculated days to active days
  const handleAddRangeDays = () => {
    if (rangeCalculatedDays && !days.includes(rangeCalculatedDays)) {
      const combined = [...days, rangeCalculatedDays].sort((a, b) => a - b);
      setDays(combined);
    }
  };

  // Apply and trigger re-calculation
  const handleApply = () => {
    if (days.length === 0) {
      alert('Please add at least one day to calculate.');
      return;
    }
    if (onApplyCustomDays) {
      onApplyCustomDays({
        customDaysList: days,
        startDate: rangeStart,
        endDate: rangeEnd
      });
    }
  };

  return (
    <div className="glass-card p-4 sm:p-5 rounded-2xl border border-brand-500/30 shadow-2xl bg-slate-900/90 space-y-4">
      
      {/* Top Banner: Formula & Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30 shadow-inner">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Custom Day Calculation Table
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                SEBI Standard Returns
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              <span className="text-slate-300 font-medium">&lt; 1Y (D &lt; 365):</span> <code className="text-brand-300 font-mono font-semibold">((V_T - V_0) / V_0) × 100</code> (Absolute Return) &nbsp;|&nbsp; 
              <span className="text-slate-300 font-medium"> ≥ 1Y (D ≥ 365):</span> <code className="text-brand-300 font-mono font-semibold">4 × ((V_T / V_0)^(365 / (4 × D)) - 1) × 100</code> (Annualized)
            </p>
          </div>
        </div>

        {/* Quick Add Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-400 font-medium mr-1">Quick Add:</span>
          {POPULAR_DAY_PRESETS.map((d) => {
            const isAdded = days.includes(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => handleAddPreset(d)}
                disabled={isAdded}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all ${
                  isAdded
                    ? 'bg-slate-800/50 text-slate-500 border border-slate-800 cursor-default'
                    : 'bg-slate-800 hover:bg-brand-600 hover:text-white text-slate-300 border border-slate-700/80 active:scale-95'
                }`}
                title={isAdded ? `Already in table` : `Add ${d} Days column`}
              >
                +{d}D
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Days Configuration Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* Left Column: Active Day Chips + Input Box (Span 8) */}
        <div className="lg:col-span-8 space-y-3">
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-brand-400" />
              <span>Active Table Day Columns ({days.length}):</span>
            </span>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-[11px] text-slate-400 hover:text-brand-300 transition-colors flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset to (33, 50, 67)</span>
            </button>
          </div>

          {/* Active Chips List */}
          <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 min-h-[46px]">
            {days.length === 0 ? (
              <span className="text-xs text-slate-500 italic pl-1">
                No days configured. Add days below to generate columns.
              </span>
            ) : (
              days.map((d) => (
                <div
                  key={d}
                  className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-brand-500/15 text-brand-300 border border-brand-500/30 hover:border-brand-400 shadow-sm transition-all"
                >
                  <span>{d} Days</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveDay(d)}
                    className="p-0.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors"
                    title={`Remove ${d} Days column`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Input field to add single or multiple days */}
          <form onSubmit={handleAddDaysFromInput} className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={dayInput}
                onChange={(e) => setDayInput(e.target.value)}
                placeholder="Enter day numbers e.g. 33, 50, 67 or 120..."
                className="w-full px-3.5 py-2 text-xs font-medium rounded-xl bg-slate-950 text-white placeholder-slate-500 border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
              />
            </div>
            
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-all active:scale-95 whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5 text-brand-400" />
              <span>Add Day(s)</span>
            </button>
          </form>

        </div>

        {/* Right Column: Calendar Date Range Calculator & Apply Button (Span 4) */}
        <div className="lg:col-span-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
          
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-emerald-400" />
              <span>Calendar Range to Days</span>
            </span>
            {rangeCalculatedDays && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {rangeCalculatedDays} Days
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-[10px] text-slate-400 block mb-1">V₀ Start Date</span>
              <input
                type="date"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                className="w-full px-2 py-1 text-xs rounded-lg bg-slate-900 text-white border border-slate-700 focus:outline-none focus:border-emerald-500"
              />
              {rangeStart && (
                <span className="text-[9px] font-bold text-brand-300 block mt-0.5">
                  {new Date(rangeStart).toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
              )}
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block mb-1">VT End Date</span>
              <input
                type="date"
                value={rangeEnd}
                onChange={(e) => {
                  setRangeEnd(e.target.value);
                  if (onSelectCalculationDate) onSelectCalculationDate(e.target.value);
                }}
                className="w-full px-2 py-1 text-xs rounded-lg bg-slate-900 text-white border border-slate-700 focus:outline-none focus:border-emerald-500"
              />
              {rangeEnd && (
                <span className="text-[9px] font-bold text-emerald-400 block mt-0.5">
                  {new Date(rangeEnd).toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
              )}
            </div>
          </div>

          {rangeCalculatedDays && (
            <button
              type="button"
              onClick={handleAddRangeDays}
              disabled={days.includes(rangeCalculatedDays)}
              className="w-full py-1 text-[11px] font-semibold rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-default"
            >
              <Plus className="h-3 w-3" />
              <span>{days.includes(rangeCalculatedDays) ? `${rangeCalculatedDays}D already in table` : `Add ${rangeCalculatedDays} Days to Table`}</span>
            </button>
          )}

          {/* Primary Calculate / Apply Action Button */}
          <button
            type="button"
            onClick={handleApply}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-brand-600 via-indigo-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white shadow-lg border border-brand-400/40 transition-all active:scale-95"
          >
            <Check className="h-4 w-4" />
            <span>Calculate Table ({days.length} Day Columns)</span>
          </button>

        </div>

      </div>

    </div>
  );
};

export default DayDatePicker;
