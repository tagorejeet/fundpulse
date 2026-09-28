import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Check, Calculator, Info } from 'lucide-react';

const DayDatePicker = ({
  customDays = 33,
  startDate = '',
  endDate = '',
  onApplyCustomPeriod,
  meta
}) => {
  // Format today's date YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Default start date = today - customDays
  const getDefaultStartDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  };

  const [inputStartDate, setInputStartDate] = useState(startDate || getDefaultStartDate(customDays));
  const [inputEndDate, setInputEndDate] = useState(endDate || todayStr);
  const [inputDays, setInputDays] = useState(customDays || 33);
  const [activePreset, setActivePreset] = useState(customDays || 33);

  // Sync when props change
  useEffect(() => {
    if (customDays) {
      setInputDays(customDays);
      setActivePreset(customDays);
    }
  }, [customDays]);

  // Recalculate days when start date or end date is manually changed in calendar
  const handleStartDateChange = (val) => {
    setInputStartDate(val);
    setActivePreset(null);
    if (val && inputEndDate) {
      const s = new Date(val);
      const e = new Date(inputEndDate);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e > s) {
        const diffDays = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
        setInputDays(diffDays);
      }
    }
  };

  const handleEndDateChange = (val) => {
    setInputEndDate(val);
    setActivePreset(null);
    if (inputStartDate && val) {
      const s = new Date(inputStartDate);
      const e = new Date(val);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e > s) {
        const diffDays = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
        setInputDays(diffDays);
      }
    }
  };

  const handlePresetSelect = (days) => {
    setActivePreset(days);
    setInputDays(days);
    const end = todayStr;
    const start = getDefaultStartDate(days);
    setInputEndDate(end);
    setInputStartDate(start);
    onApplyCustomPeriod({ customDays: days, startDate: start, endDate: end });
  };

  const handleApply = (e) => {
    e.preventDefault();
    const days = Math.max(1, parseInt(inputDays, 10) || 33);
    onApplyCustomPeriod({
      customDays: days,
      startDate: inputStartDate,
      endDate: inputEndDate
    });
  };

  return (
    <div className="glass-card p-4 sm:p-5 rounded-2xl border border-brand-500/30 shadow-xl bg-slate-900/90 space-y-4">
      
      {/* Title & Formula Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Day Calculation & Calendar Range Selector</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Quarterly Compounded Annualized Formula
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Formula: <code className="text-brand-300 font-mono">Return = 4 × ((V_T / V_0)^(365 / (4 × D)) - 1) × 100</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Quick Days:</span>
          {[15, 30, 33, 45, 60, 180].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handlePresetSelect(d)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                activePreset === d
                  ? 'bg-brand-600 text-white shadow-md ring-1 ring-brand-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              {d}D
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Range Picker Form */}
      <form onSubmit={handleApply} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
          
          {/* Start Date Calendar Input */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-brand-400" />
              <span>Start Date (V0)</span>
            </label>
            <input
              type="date"
              value={inputStartDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-950 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
            />
          </div>

          {/* End Date Calendar Input */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-emerald-400" />
              <span>End Date (VT)</span>
            </label>
            <input
              type="date"
              value={inputEndDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-950 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
            />
          </div>

          {/* Days Count input */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              <span>Holding Period (Days)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="3650"
                value={inputDays}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 1;
                  setInputDays(val);
                  setActivePreset(val);
                  setInputStartDate(getDefaultStartDate(val));
                }}
                className="w-full px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-950 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">
                Days
              </span>
            </div>
          </div>

        </div>

        {/* Apply / Calculate Button */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-lg border border-brand-400/30 transition-all active:scale-95"
          >
            <Check className="h-4 w-4" />
            <span>Calculate Rate ({inputDays} Days)</span>
          </button>
        </div>

      </form>

    </div>
  );
};

export default DayDatePicker;
