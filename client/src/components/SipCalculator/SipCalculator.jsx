import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calculator,
  Search,
  Plus,
  Trash2,
  FileSpreadsheet,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Info,
  RefreshCw,
  Layers,
  Check
} from 'lucide-react';
import { calculateSipApi, fetchFunds } from '../../services/api';
import { exportSipToExcel } from '../../services/excelSipExport';
import SipDetailModal from './SipDetailModal';

const SIP_STORAGE_KEY = 'fundpulse_sip_fund_ids';
const SIP_AMOUNT_KEY = 'fundpulse_sip_amount';
const SIP_DAY_KEY = 'fundpulse_sip_day';

const PRESET_POPULAR_FUNDS = [
  { id: 'nippon-india-small-cap-growth', displayName: 'Nippon India Small Cap Fund - Growth', category: 'Small Cap', amcName: 'Nippon India Mutual Fund' },
  { id: 'edelweiss-mid-cap-growth', displayName: 'Edelweiss Mid Cap Fund - Growth', category: 'Mid Cap', amcName: 'Edelweiss Mutual Fund' },
  { id: 'hdfc-mid-cap-growth', displayName: 'HDFC Mid Cap Fund - Growth', category: 'Mid Cap', amcName: 'HDFC Mutual Fund' },
  { id: 'icici-prudential-bluechip-growth', displayName: 'ICICI Prudential Bluechip Fund - Growth', category: 'Large Cap', amcName: 'ICICI Prudential Mutual Fund' }
];

export const SipCalculator = ({
  allFunds = [],
  customFundIds = new Set(),
  meta,
  selectedPlan = 'regular',
  onSelectPlan
}) => {
  // Persistent Selected Fund IDs State
  const [selectedFundIds, setSelectedFundIds] = useState(() => {
    try {
      const saved = localStorage.getItem(SIP_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading saved SIP fund selection:', e);
    }
    // If user has custom fund list items, pre-populate with those; otherwise use default popular funds
    if (customFundIds && customFundIds.size > 0) {
      return Array.from(customFundIds).slice(0, 4);
    }
    return ['edelweiss-mid-cap-growth', 'nippon-india-small-cap-growth'];
  });

  const [monthlySip, setMonthlySip] = useState(() => {
    try {
      const saved = localStorage.getItem(SIP_AMOUNT_KEY);
      if (saved && !isNaN(Number(saved)) && Number(saved) >= 100) {
        return Number(saved);
      }
    } catch (e) {}
    return 10000;
  });

  const [calculationDate, setCalculationDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const [sipDay, setSipDay] = useState(() => {
    try {
      const saved = localStorage.getItem(SIP_DAY_KEY);
      if (saved && !isNaN(Number(saved))) {
        return Number(saved);
      }
    } catch (e) {}
    return 25;
  });

  const [plan, setPlan] = useState(selectedPlan || 'regular');

  // Metadata cache for selected funds so display names and categories always show nicely
  const [fundMetaMap, setFundMetaMap] = useState(() => {
    const map = {};
    PRESET_POPULAR_FUNDS.forEach(p => {
      map[p.id] = p;
    });
    return map;
  });

  // Search & Selector State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [apiSearchResults, setApiSearchResults] = useState([]);
  const [isSearchingApi, setIsSearchingApi] = useState(false);

  // Calculation Results State
  const [results, setResults] = useState([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState(null);

  // Detail Modal State
  const [activeDetailFund, setActiveDetailFund] = useState(null);

  // Table Sorting
  const [sortField, setSortField] = useState('return3Yr');
  const [sortOrder, setSortOrder] = useState('desc');

  // Persist selected funds to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SIP_STORAGE_KEY, JSON.stringify(selectedFundIds));
    } catch (e) {
      console.error('Error saving SIP funds to localStorage:', e);
    }
  }, [selectedFundIds]);

  // Persist monthly SIP amount to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SIP_AMOUNT_KEY, String(monthlySip));
    } catch (e) {}
  }, [monthlySip]);

  // Persist SIP day to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SIP_DAY_KEY, String(sipDay));
    } catch (e) {}
  }, [sipDay]);

  // Sync external plan changes
  useEffect(() => {
    if (selectedPlan) {
      setPlan(selectedPlan);
    }
  }, [selectedPlan]);

  // Keep fundMetaMap populated with any incoming allFunds
  useEffect(() => {
    if (allFunds && allFunds.length > 0) {
      setFundMetaMap(prev => {
        const next = { ...prev };
        allFunds.forEach(f => {
          if (f.id) next[f.id] = f;
        });
        return next;
      });
    }
  }, [allFunds]);

  // Debounced API search when query changes
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setApiSearchResults([]);
      setIsSearchingApi(false);
      return;
    }

    setIsSearchingApi(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetchFunds({ search: q, plan, limit: 20 });
        if (res && res.data && res.data.funds) {
          setApiSearchResults(res.data.funds);
          setFundMetaMap(prev => {
            const next = { ...prev };
            res.data.funds.forEach(f => {
              if (f.id) next[f.id] = f;
            });
            return next;
          });
        }
      } catch (err) {
        console.error('Error searching funds via API:', err);
      } finally {
        setIsSearchingApi(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, plan]);

  // Combined fund search suggestions (local allFunds + live server API search)
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    const map = new Map();

    // 1. Check local allFunds
    if (allFunds) {
      allFunds
        .filter(f => 
          (f.displayName && f.displayName.toLowerCase().includes(q)) ||
          (f.amfiSchemeName && f.amfiSchemeName.toLowerCase().includes(q)) ||
          (f.category && f.category.toLowerCase().includes(q)) ||
          (f.amcName && f.amcName.toLowerCase().includes(q))
        )
        .forEach(f => map.set(f.id, f));
    }

    // 2. Check apiSearchResults
    apiSearchResults.forEach(f => {
      if (!map.has(f.id)) {
        map.set(f.id, f);
      }
    });

    return Array.from(map.values()).slice(0, 15);
  }, [searchQuery, allFunds, apiSearchResults]);

  // Execute Calculation
  const handleCalculate = useCallback(async (
    targetIds = selectedFundIds,
    targetSip = monthlySip,
    targetDate = calculationDate,
    targetDay = sipDay,
    targetPlan = plan
  ) => {
    if (!targetIds || targetIds.length === 0) {
      setResults([]);
      return;
    }

    setIsCalculating(true);
    setCalculationError(null);

    try {
      const response = await calculateSipApi({
        ids: targetIds,
        monthlySip: targetSip,
        calculationDate: targetDate,
        sipDay: targetDay,
        plan: targetPlan
      });

      if (response && response.data && response.data.results) {
        setResults(response.data.results);
        setFundMetaMap(prev => {
          const next = { ...prev };
          response.data.results.forEach(r => {
            if (r.fundId) {
              next[r.fundId] = {
                id: r.fundId,
                displayName: r.displayName,
                category: r.category,
                amcName: r.amcName
              };
            }
          });
          return next;
        });
      }
    } catch (err) {
      console.error('SIP Calculation Error:', err);
      setCalculationError(err.message || 'Failed to calculate SIP returns. Please try again.');
    } finally {
      setIsCalculating(false);
    }
  }, [selectedFundIds, monthlySip, calculationDate, sipDay, plan]);

  // Run calculation whenever selected funds or plan change
  useEffect(() => {
    handleCalculate(selectedFundIds, monthlySip, calculationDate, sipDay, plan);
  }, [selectedFundIds, plan, handleCalculate]);

  // Handlers for adding/removing funds
  const handleAddFund = (fundOrId) => {
    const fundId = typeof fundOrId === 'object' ? fundOrId.id : fundOrId;
    if (typeof fundOrId === 'object') {
      setFundMetaMap(prev => ({ ...prev, [fundOrId.id]: fundOrId }));
    }
    if (!selectedFundIds.includes(fundId)) {
      setSelectedFundIds(prev => [...prev, fundId]);
    }
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  const handleRemoveFund = (fundId) => {
    setSelectedFundIds(prev => prev.filter(id => id !== fundId));
  };

  const handleImportCustomFunds = () => {
    if (!customFundIds || customFundIds.size === 0) return;
    const combined = Array.from(new Set([...selectedFundIds, ...Array.from(customFundIds)]));
    setSelectedFundIds(combined);
  };

  const handleClearAllFunds = () => {
    setSelectedFundIds([]);
    setResults([]);
    try {
      localStorage.setItem(SIP_STORAGE_KEY, JSON.stringify([]));
    } catch (e) {}
  };

  const handleExport = () => {
    exportSipToExcel({
      results,
      monthlySip,
      calculationDate,
      sipDay,
      plan,
      reportDate: meta?.reportDate || 'Latest AMFI'
    });
  };

  // Sort logic for results table
  const sortedResults = useMemo(() => {
    if (!results || results.length === 0) return [];
    return [...results].sort((a, b) => {
      let aVal = a.returns?.[sortField] ?? a[sortField];
      let bVal = b.returns?.[sortField] ?? b[sortField];

      if (sortField === 'invested3Y') {
        aVal = a.periods?.['3Y']?.totalInvested;
        bVal = b.periods?.['3Y']?.totalInvested;
      } else if (sortField === 'units3Y') {
        aVal = a.periods?.['3Y']?.totalUnits;
        bVal = b.periods?.['3Y']?.totalUnits;
      } else if (sortField === 'value3Y') {
        aVal = a.periods?.['3Y']?.finalPortfolioValue;
        bVal = b.periods?.['3Y']?.finalPortfolioValue;
      }

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'string') {
        const comp = aVal.localeCompare(bVal);
        return sortOrder === 'asc' ? comp : -comp;
      }
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [results, sortField, sortOrder]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'displayName' ? 'asc' : 'desc');
    }
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 text-slate-500 opacity-60" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-brand-400 font-bold" />
    ) : (
      <ArrowDown className="h-3 w-3 text-brand-400 font-bold" />
    );
  };

  const formatPctCell = (val, periodData) => {
    if (periodData && !periodData.hasSufficientData) {
      return (
        <span 
          className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700 font-sans"
          title={periodData.insufficientReason || 'Insufficient historical NAV depth'}
        >
          Insufficient data
        </span>
      );
    }
    if (val === null || val === undefined || isNaN(val)) {
      return <span className="text-slate-500">N/A</span>;
    }
    const num = Number(val);
    const isPositive = num > 0;
    return (
      <span className={`font-mono font-bold ${num === 0 ? 'text-slate-300' : isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
        {isPositive ? `+${num.toFixed(2)}%` : `${num.toFixed(2)}%`}
      </span>
    );
  };

  return (
    <div className="space-y-6 my-2">
      
      {/* Hero Banner */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 shadow-xl bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-brand-950/30">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white shadow-lg shadow-brand-500/25">
              <Calculator className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Mutual Fund SIP Return Calculator
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  XIRR Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Calculate multi-period SIP returns using historical monthly AMFI NAV data and dated cash-flow XIRR.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto justify-end flex-wrap">
            {customFundIds && customFundIds.size > 0 && (
              <button
                onClick={handleImportCustomFunds}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-brand-300 text-xs font-semibold border border-brand-500/30 transition-all active:scale-95"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Import {customFundIds.size} Custom Funds</span>
              </button>
            )}

            <button
              onClick={handleExport}
              disabled={results.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg border border-emerald-500/40 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export to Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Input Parameters Controls Bar */}
      <div className="glass-card p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
        
        {/* Top Controls: Search Fund & Quick Presets */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>Select Mutual Funds</span>
            <span className="text-[11px] text-slate-400 normal-case font-medium">
              Search by fund name, AMC, or category
            </span>
          </label>

          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  placeholder="Search Mutual Fund to add (e.g. Nippon Small Cap, Axis ELSS, HDFC Top 100)..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-inner"
                />
              </div>

              {selectedFundIds.length > 0 && (
                <button
                  onClick={handleClearAllFunds}
                  className="px-3 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30 transition-all"
                  title="Clear all selected funds"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Backdrop to close search dropdown */}
            {isSearchOpen && (
              <div
                className="fixed inset-0 z-20"
                onClick={() => setIsSearchOpen(false)}
              />
            )}

            {/* Dropdown Suggestions */}
            {isSearchOpen && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-30 glass-card rounded-xl border border-slate-700 shadow-2xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-slate-800">
                {searchResults.map(fund => {
                  const isSelected = selectedFundIds.includes(fund.id);
                  const navValue = fund.currentNav || (plan === 'direct' ? fund.navDirect : fund.navRegular) || fund.navRegular || fund.seedNavReg;
                  return (
                    <div
                      key={fund.id}
                      onClick={() => handleAddFund(fund)}
                      className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected ? 'bg-slate-800/80 text-brand-300' : 'hover:bg-slate-800 text-slate-200'
                      }`}
                    >
                      <div className="min-w-0 pr-3">
                        <div className="font-semibold text-xs text-white truncate">{fund.displayName}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-brand-300 font-medium">{fund.category}</span>
                          <span>•</span>
                          <span>{fund.amcName}</span>
                          {navValue && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-400 font-mono font-medium">
                                NAV: ₹{Number(navValue).toFixed(2)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-[10px] font-semibold whitespace-nowrap shrink-0 ${isSelected ? 'bg-brand-500/20 text-brand-300' : 'bg-slate-700 hover:bg-brand-600 hover:text-white text-slate-300 transition-colors'}`}>
                        {isSelected ? 'Added' : '+ Add'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {isSearchOpen && isSearchingApi && searchResults.length === 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-30 glass-card rounded-xl border border-slate-700 p-4 text-center text-xs text-slate-400 shadow-2xl">
                Searching mutual funds across Indian market...
              </div>
            )}

            {isSearchOpen && !isSearchingApi && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-30 glass-card rounded-xl border border-slate-700 p-4 text-center text-xs text-slate-400 shadow-2xl">
                No mutual funds found matching "{searchQuery}".
              </div>
            )}
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-[11px] text-slate-500 font-semibold">Popular Presets:</span>
            {PRESET_POPULAR_FUNDS.map(preset => {
              const isSelected = selectedFundIds.includes(preset.id);
              return (
                <button
                  key={preset.id}
                  onClick={() => handleAddFund(preset)}
                  disabled={isSelected}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                    isSelected
                      ? 'bg-slate-800/60 text-slate-500 border border-slate-800 cursor-default'
                      : 'bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/80'
                  }`}
                >
                  <Plus className="h-3 w-3" />
                  <span>{preset.displayName.replace(' - Growth', '')}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Custom Funds Tags */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-400">
              Custom Funds for SIP Analysis: <strong className="text-white">{selectedFundIds.length}</strong> Selected
            </span>
          </div>

          {selectedFundIds.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
              No mutual funds selected. Search above or click a popular preset to calculate SIP returns.
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              {selectedFundIds.map(id => {
                const scheme = fundMetaMap[id] || allFunds.find(f => f.id === id) || PRESET_POPULAR_FUNDS.find(p => p.id === id) || { displayName: id };
                return (
                  <div
                    key={id}
                    className="inline-flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 shadow-sm"
                  >
                    <span className="font-semibold text-white">{scheme.displayName}</span>
                    {scheme.category && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-brand-300 font-medium">
                        {scheme.category}
                      </span>
                    )}
                    <button
                      onClick={() => handleRemoveFund(id)}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Remove fund"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Input Controls Row: Monthly SIP, Calculation Date, SIP Day, Plan, Calculate Button */}
        <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          
          {/* Monthly SIP Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-brand-400" /> Monthly SIP
              </span>
              <span className="text-[10px] text-slate-500">Editable</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
              <input
                type="number"
                min="500"
                step="500"
                value={monthlySip}
                onChange={(e) => setMonthlySip(Math.max(100, Number(e.target.value)))}
                className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono shadow-inner"
              />
            </div>
            {/* Quick SIP Chips */}
            <div className="flex items-center gap-1.5 pt-0.5">
              {[5000, 10000, 25000].map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setMonthlySip(amt)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                    monthlySip === amt ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  ₹{(amt / 1000)}k
                </button>
              ))}
            </div>
          </div>

          {/* Calculation Date Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-amber-400" /> Calculation Date
            </label>
            <input
              type="date"
              value={calculationDate}
              onChange={(e) => setCalculationDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-inner"
            />
            <p className="text-[10px] text-slate-500">Valuation end date</p>
          </div>

          {/* Monthly SIP Installment Day */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-indigo-400" /> SIP Day of Month
            </label>
            <select
              value={sipDay}
              onChange={(e) => setSipDay(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-inner"
            >
              <option value="1">1st of each month</option>
              <option value="5">5th of each month</option>
              <option value="10">10th of each month</option>
              <option value="15">15th of each month</option>
              <option value="20">20th of each month</option>
              <option value="25">25th of each month (Default)</option>
              <option value="28">28th of each month</option>
            </select>
            <p className="text-[10px] text-slate-500">Auto-shifts on non-trading days</p>
          </div>

          {/* Plan Selector (Regular / Direct) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
              Plan Option
            </label>
            <div className="flex items-center p-1 bg-slate-900 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setPlan('regular');
                  if (onSelectPlan) onSelectPlan('regular');
                }}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${
                  plan === 'regular' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Regular
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlan('direct');
                  if (onSelectPlan) onSelectPlan('direct');
                }}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${
                  plan === 'direct' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Direct
              </button>
            </div>
            <p className="text-[10px] text-slate-500">Direct has lower expense ratio</p>
          </div>

          {/* Calculate Button */}
          <div>
            <button
              onClick={() => handleCalculate(selectedFundIds, monthlySip, calculationDate, sipDay, plan)}
              disabled={isCalculating || selectedFundIds.length === 0}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-brand-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCalculating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-white" />
                  <span>Computing XIRR...</span>
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4" />
                  <span>Calculate Returns</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>

      {/* Calculation Error Notice */}
      {calculationError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
          <p>{calculationError}</p>
        </div>
      )}

      {/* Main Results Table Section */}
      <div className="glass-card rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        
        {/* Table Top Bar */}
        <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              SIP Performance Results
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-500/20 text-brand-300 border border-brand-500/40">
              {results.length} Schemes Analyzed
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>Showing: <strong className="text-white font-mono">₹{Number(monthlySip).toLocaleString('en-IN')}/mo</strong></span>
            <span>•</span>
            <span>Click any scheme to inspect detailed monthly ledger</span>
          </div>
        </div>

        {/* Results Table */}
        {isCalculating ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <RefreshCw className="h-8 w-8 text-brand-400 animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-200">Retrieving historical NAV time series & computing XIRR cash flows...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Sparkles className="h-10 w-10 text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-300">Ready to Calculate SIP Returns</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Select one or more mutual funds and click <strong className="text-brand-400">Calculate Returns</strong> to compute 1Y, 2Y, 3Y, 5Y, and 10Y SIP annualized returns.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950/70 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th 
                    onClick={() => handleSort('displayName')}
                    className="p-3 pl-4 min-w-[260px] cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Scheme Name</span>
                      {renderSortIcon('displayName')}
                    </div>
                  </th>

                  <th className="p-3 min-w-[100px]">Current NAV</th>

                  <th 
                    onClick={() => handleSort('return1Yr')}
                    className="p-3 min-w-[110px] cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>1Y SIP Return</span>
                      {renderSortIcon('return1Yr')}
                    </div>
                  </th>

                  <th 
                    onClick={() => handleSort('return2Yr')}
                    className="p-3 min-w-[110px] cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>2Y SIP Return</span>
                      {renderSortIcon('return2Yr')}
                    </div>
                  </th>

                  <th 
                    onClick={() => handleSort('return3Yr')}
                    className="p-3 min-w-[110px] cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>3Y SIP Return</span>
                      {renderSortIcon('return3Yr')}
                    </div>
                  </th>

                  <th 
                    onClick={() => handleSort('return5Yr')}
                    className="p-3 min-w-[110px] cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>5Y SIP Return</span>
                      {renderSortIcon('return5Yr')}
                    </div>
                  </th>

                  <th 
                    onClick={() => handleSort('return10Yr')}
                    className="p-3 min-w-[110px] cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>10Y SIP Return</span>
                      {renderSortIcon('return10Yr')}
                    </div>
                  </th>

                  <th 
                    onClick={() => handleSort('invested3Y')}
                    className="p-3 min-w-[125px] cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>3Y Total Invested</span>
                      {renderSortIcon('invested3Y')}
                    </div>
                  </th>

                  <th 
                    onClick={() => handleSort('units3Y')}
                    className="p-3 min-w-[110px] cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Total Units (3Y)</span>
                      {renderSortIcon('units3Y')}
                    </div>
                  </th>

                  <th 
                    onClick={() => handleSort('value3Y')}
                    className="p-3 min-w-[125px] cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>3Y Portfolio Value</span>
                      {renderSortIcon('value3Y')}
                    </div>
                  </th>

                  <th className="p-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60 font-sans">
                {sortedResults.map((fund) => {
                  const p3 = fund.periods?.['3Y'];
                  const p1 = fund.periods?.['1Y'];
                  const valDisplay = p3?.hasSufficientData
                    ? `₹${Math.round(p3.finalPortfolioValue).toLocaleString('en-IN')}`
                    : p1?.hasSufficientData
                      ? `₹${Math.round(p1.finalPortfolioValue).toLocaleString('en-IN')} (1Y)`
                      : 'N/A';

                  const investedDisplay = p3?.hasSufficientData
                    ? `₹${Number(p3.totalInvested).toLocaleString('en-IN')}`
                    : p1?.hasSufficientData
                      ? `₹${Number(p1.totalInvested).toLocaleString('en-IN')} (1Y)`
                      : 'N/A';

                  const unitsDisplay = p3?.hasSufficientData
                    ? Number(p3.totalUnits).toFixed(3)
                    : p1?.hasSufficientData
                      ? Number(p1.totalUnits).toFixed(3)
                      : 'N/A';

                  return (
                    <tr
                      key={fund.fundId}
                      onClick={() => setActiveDetailFund(fund)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      {/* Name */}
                      <td className="p-3 pl-4">
                        <div className="font-bold text-white group-hover:text-brand-300 transition-colors">
                          {fund.displayName}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span className="text-brand-400 font-semibold">{fund.category}</span>
                          <span>•</span>
                          <span>{fund.amcName}</span>
                        </div>
                      </td>

                       {/* Current NAV */}
                      <td className="p-3 font-mono text-[11px] text-slate-200">
                        ₹{fund.currentNav ? Number(fund.currentNav).toFixed(2) : 'N/A'}
                      </td>

                      {/* 1Y Return */}
                      <td className="p-3 text-[11px]">
                        {formatPctCell(fund.returns?.return1Yr, fund.periods?.['1Y'])}
                      </td>

                      {/* 2Y Return */}
                      <td className="p-3 text-[11px]">
                        {formatPctCell(fund.returns?.return2Yr, fund.periods?.['2Y'])}
                      </td>

                      {/* 3Y Return */}
                      <td className="p-3 text-[11px]">
                        {formatPctCell(fund.returns?.return3Yr, fund.periods?.['3Y'])}
                      </td>

                      {/* 5Y Return */}
                      <td className="p-3 text-[11px]">
                        {formatPctCell(fund.returns?.return5Yr, fund.periods?.['5Y'])}
                      </td>

                      {/* 10Y Return */}
                      <td className="p-3 text-[11px]">
                        {formatPctCell(fund.returns?.return10Yr, fund.periods?.['10Y'])}
                      </td>

                      {/* 3Y Total Invested */}
                      <td className="p-3 font-mono text-[11px] text-slate-300">
                        {investedDisplay}
                      </td>

                      {/* 3Y Total Units */}
                      <td className="p-3 font-mono text-[11px] text-indigo-300 font-semibold">
                        {unitsDisplay}
                      </td>

                      {/* 3Y Final Value */}
                      <td className="p-3 font-mono text-[11px] font-bold text-emerald-400">
                        {valDisplay}
                      </td>

                      {/* Actions */}
                      <td className="p-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDetailFund(fund);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-500/10 hover:bg-brand-500 text-brand-300 hover:text-white transition-all text-[11px] font-semibold"
                            title="View detailed monthly cash flows and units"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Details</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFund(fund.fundId);
                            }}
                            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                            title="Remove from analysis"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Info Note */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="h-3.5 w-3.5 text-brand-400 shrink-0" />
            <span>
              SIP returns are calculated via XIRR from monthly debit installments (-SIP) and portfolio valuation (+Value) on the selected date.
            </span>
          </div>
          <span className="text-[10px] text-slate-500 hidden sm:inline">
            High precision floating point unit calculation
          </span>
        </div>

      </div>

      {/* Fund Detailed Ledger Modal */}
      {activeDetailFund && (
        <SipDetailModal
          fundResult={activeDetailFund}
          plan={plan}
          onClose={() => setActiveDetailFund(null)}
        />
      )}

    </div>
  );
};

export default SipCalculator;
