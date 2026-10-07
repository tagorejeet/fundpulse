import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Header from './components/Header';
import SummaryCards from './components/SummaryCards';
import CategoryFilter from './components/CategoryFilter';
import FundTable from './components/FundTable';
import CustomFundList from './components/CustomFundList';
import DayDatePicker from './components/DayDatePicker';
import FundDetailModal from './components/FundDetailModal';
import DisclaimerFooter from './components/DisclaimerFooter';
import SipCalculator from './components/SipCalculator/SipCalculator';
import NseIndicesTable from './components/NseSection/NseIndicesTable';
import { fetchFunds, fetchBatchFunds, triggerRefresh, fetchNSEIndices, triggerNSERefresh } from './services/api';
import { exportNseListToExcel } from './services/excelExport';
import { AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'fundpulse_custom_fund_ids';
const LOCAL_STORAGE_SUGGESTION_KEY = 'fundpulse_suggestion_funds';
const LOCAL_STORAGE_NSE_KEY = 'fundpulse_selected_nse_indices';

const DEFAULT_SUGGESTION_IDS = [
  'nippon-india-large-cap-growth',
  'aditya-birla-large-cap-growth',
  'icici-prudential-bluechip-growth',
  'kotak-large-cap-growth',
  'hdfc-mid-cap-growth',
  'edelweiss-mid-cap-growth',
  'nippon-india-growth-mid-cap-growth',
  'whiteoak-capital-mid-cap-growth',
  'icici-prudential-large-mid-cap-growth',
  'bandhan-large-mid-cap-growth',
  'mirae-asset-large-midcap-growth',
  'bandhan-small-cap-growth',
  'pgim-small-cap-growth',
  'nippon-india-small-cap-growth',
  'sundaram-small-cap-growth',
  'nippon-india-multicap-growth',
  'kotak-multicap-regular-growth',
  'whiteoak-capital-multi-cap-growth',
  'axis-multicap-regular-growth',
  'mahindra-manulife-multi-cap-regular-growth',
  'bandhan-value-growth',
  'templeton-india-value-growth',
  'hsbc-value-growth',
  'nippon-india-value-growth',
  'icici-value-growth',
  'jm-flexi-cap-growth',
  'aditya-birla-flexi-cap-growth',
  'edelweiss-flexi-cap-growth',
  'hdfc-flexi-cap-growth',
  'parag-parikh-flexi-cap-growth',
  'nippon-india-consumption-growth',
  'sundaram-consumption-growth',
  'bajaj-finserv-consumption-growth',
  'union-innovation-opportunity-growth'
];

export function App() {
  // Top-Level Application Mode: 'analysis' (Fund Analysis) | 'sip' (SIP Calculator)
  const [appMode, setAppMode] = useState('analysis');

  // Navigation & View State (for Fund Analysis mode)
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'custom' | 'suggestion'
  const [sipActiveTab, setSipActiveTab] = useState('calculator'); // 'calculator' | 'custom'
  const [mode, setMode] = useState('yearly'); // 'yearly' | 'days'
  const [selectedPlan, setSelectedPlan] = useState('regular'); // 'regular' | 'direct'
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const activeRequestIdRef = useRef(0);

  // Debounce search query to eliminate network race conditions and input lag
  useEffect(() => {
    if (!searchQuery) {
      setDebouncedSearchQuery('');
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // When debounced search changes, reset page to 1
  useEffect(() => {
    setPage(1);
  }, [debouncedSearchQuery]);

  // Custom Day Period State (defaults to 33 days as requested by user)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const getDefaultStartDate = useCallback((days) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  }, []);

  const [customDaysList, setCustomDaysList] = useState([33, 50, 67]);
  const [customDays, setCustomDays] = useState(33);
  const [calculationDate, setCalculationDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 33);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Data State
  const [funds, setFunds] = useState([]);
  const [customFunds, setCustomFunds] = useState([]);
  const [suggestionFunds, setSuggestionFunds] = useState([]);
  const [totalFunds, setTotalFunds] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [categoriesList, setCategoriesList] = useState([]);
  const [meta, setMeta] = useState(null);

  // Status State
  const [isLoading, setIsLoading] = useState(true);
  const [isCustomLoading, setIsCustomLoading] = useState(false);
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedOption, setSelectedOption] = useState('all');

  // Selected Fund Modal State
  const [selectedFundModal, setSelectedFundModal] = useState(null);

  // Persistent Selected Custom Fund IDs (Set stored in localStorage, with 34 default funds removed)
  const [selectedFundIds, setSelectedFundIds] = useState(() => {
    try {
      const migrated = localStorage.getItem('fundpulse_custom_migrated_v4');
      if (!migrated) {
        localStorage.setItem('fundpulse_custom_migrated_v4', 'true');
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter(id => !DEFAULT_SUGGESTION_IDS.includes(id));
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleaned));
            return new Set(cleaned);
          }
        }
        return new Set();
      }
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch (e) {
      console.error('Error loading saved custom fund selection:', e);
    }
    return new Set();
  });

  // Save selectedFundIds to localStorage on change
  useEffect(() => {
    try {
      const arr = Array.from(selectedFundIds);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(arr));
    } catch (e) {
      console.error('Error saving custom fund selection:', e);
    }
  }, [selectedFundIds]);

  // Persistent Selected Suggestion Sheet Fund IDs (Default to all 34 predefined funds)
  const [suggestionFundIds, setSuggestionFundIds] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_SUGGESTION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return new Set(parsed);
      }
    } catch (e) {
      console.error('Error loading saved suggestion fund selection:', e);
    }
    return new Set(DEFAULT_SUGGESTION_IDS);
  });

  // Save suggestionFundIds to localStorage on change
  useEffect(() => {
    try {
      const arr = Array.from(suggestionFundIds);
      localStorage.setItem(LOCAL_STORAGE_SUGGESTION_KEY, JSON.stringify(arr));
    } catch (e) {
      console.error('Error saving suggestion fund selection:', e);
    }
  }, [suggestionFundIds]);

  // Persistent Selected NSE Index IDs (Default to all 4 indices pre-selected)
  const [selectedNseIndexIds, setSelectedNseIndexIds] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_NSE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch (e) {
      console.error('Error loading saved NSE selection:', e);
    }
    return new Set(['NIFTY 50', 'NIFTY 500', 'NIFTY MIDCAP 150', 'NIFTY SMALLCAP 250']);
  });

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_NSE_KEY, JSON.stringify(Array.from(selectedNseIndexIds)));
    } catch (e) {
      console.error('Error saving NSE selection:', e);
    }
  }, [selectedNseIndexIds]);

  // Official NSE Indices Data State
  const [nseIndices, setNseIndices] = useState([]);
  const [nseMeta, setNseMeta] = useState(null);
  const [isLoadingNse, setIsLoadingNse] = useState(true);
  const [refreshStatusMessage, setRefreshStatusMessage] = useState(null);

  // Load Official NSE Benchmark Indices for the selected valuation date & day intervals
  const loadNseIndices = useCallback(async (dateToUse, daysList = customDaysList, sDate = startDate, eDate = endDate) => {
    setIsLoadingNse(true);
    try {
      const res = await fetchNSEIndices(dateToUse, {
        days: daysList,
        startDate: sDate,
        endDate: eDate
      });
      if (res?.success) {
        setNseIndices(res.indices || []);
        setNseMeta({
          source: res.source,
          selectedDate: res.selectedDate,
          lastUpdated: res.lastUpdated,
          isCached: res.isCached,
          customDaysList: res.customDaysList
        });
      }
    } catch (err) {
      console.error('Failed to load official NSE indices:', err);
    } finally {
      setIsLoadingNse(false);
    }
  }, [customDaysList, startDate, endDate]);

  useEffect(() => {
    loadNseIndices(calculationDate, customDaysList, startDate, endDate);
  }, [calculationDate, customDaysList, startDate, endDate, loadNseIndices]);

  // Handlers for NSE Index selection & export
  const handleToggleSelectNseIndex = (id) => {
    setSelectedNseIndexIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAllNse = (filteredIndices) => {
    if (!filteredIndices || filteredIndices.length === 0) return;
    const allSelected = filteredIndices.every(i => selectedNseIndexIds.has(i.id));
    setSelectedNseIndexIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        filteredIndices.forEach(i => next.delete(i.id));
      } else {
        filteredIndices.forEach(i => next.add(i.id));
      }
      return next;
    });
  };

  const handleRemoveNseIndex = (id) => {
    setSelectedNseIndexIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleExportNseExcel = (selectedIds) => {
    const toExport = nseIndices.filter(i => selectedIds.has(i.id));
    exportNseListToExcel(toExport, calculationDate);
  };

  // Load Main Paginated Schemes
  const loadFunds = useCallback(async (
    cat = activeCategory,
    query = debouncedSearchQuery,
    plan = selectedPlan,
    p = page,
    daysList = customDaysList,
    sDate = startDate,
    eDate = endDate,
    calcDate = calculationDate,
    opt = selectedOption
  ) => {
    const requestId = ++activeRequestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const formattedDays = Array.isArray(daysList) ? daysList.join(',') : String(daysList);
      const res = await fetchFunds({
        category: cat,
        search: query,
        plan,
        option: opt,
        page: p,
        limit: 50,
        days: formattedDays,
        startDate: sDate,
        endDate: eDate,
        asOfDate: calcDate
      });

      // Ignore response if a newer search/pagination request was triggered
      if (requestId !== activeRequestIdRef.current) return;

      setFunds(res.data.funds || []);
      setTotalFunds(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
      if (res.data.categories) setCategoriesList(res.data.categories);

      setMeta({
        reportDate: res.data.reportDate,
        lastUpdated: res.data.lastUpdated,
        isCached: res.data.isCached
      });
    } catch (err) {
      if (requestId === activeRequestIdRef.current) {
        setError(err.message || 'AMFI data is temporarily unavailable.');
      }
    } finally {
      if (requestId === activeRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [activeCategory, debouncedSearchQuery, selectedPlan, selectedOption, page, customDaysList, startDate, endDate, calculationDate]);

  // Load Batch Schemes for Custom Fund List
  const loadCustomFunds = useCallback(async (
    idsSet = selectedFundIds,
    plan = selectedPlan,
    daysList = customDaysList,
    sDate = startDate,
    eDate = endDate,
    calcDate = calculationDate
  ) => {
    if (!idsSet || idsSet.size === 0) {
      setCustomFunds([]);
      return;
    }

    setIsCustomLoading(true);
    try {
      const formattedDays = Array.isArray(daysList) ? daysList.join(',') : String(daysList);
      const res = await fetchBatchFunds({
        ids: Array.from(idsSet),
        plan,
        days: formattedDays,
        startDate: sDate,
        endDate: eDate,
        asOfDate: calcDate
      });
      setCustomFunds(res.data.funds || []);
    } catch (err) {
      console.error('Failed to load custom fund list details:', err);
    } finally {
      setIsCustomLoading(false);
    }
  }, [selectedFundIds, selectedPlan, customDaysList, startDate, endDate, calculationDate]);

  // Load Batch Schemes for Suggestion Sheet
  const loadSuggestionFunds = useCallback(async (
    idsSet = suggestionFundIds,
    plan = selectedPlan,
    daysList = customDaysList,
    sDate = startDate,
    eDate = endDate,
    calcDate = calculationDate
  ) => {
    if (!idsSet || idsSet.size === 0) {
      setSuggestionFunds([]);
      return;
    }

    setIsSuggestionLoading(true);
    try {
      const formattedDays = Array.isArray(daysList) ? daysList.join(',') : String(daysList);
      const res = await fetchBatchFunds({
        ids: Array.from(idsSet),
        plan,
        days: formattedDays,
        startDate: sDate,
        endDate: eDate,
        asOfDate: calcDate
      });
      setSuggestionFunds(res.data.funds || []);
    } catch (err) {
      console.error('Failed to load suggestion fund list details:', err);
    } finally {
      setIsSuggestionLoading(false);
    }
  }, [suggestionFundIds, selectedPlan, customDaysList, startDate, endDate, calculationDate]);

  // Initial Load & Effect triggers
  useEffect(() => {
    loadFunds(activeCategory, debouncedSearchQuery, selectedPlan, page, customDaysList, startDate, endDate, calculationDate, selectedOption);
  }, [activeCategory, debouncedSearchQuery, selectedPlan, selectedOption, page, customDaysList, startDate, endDate, calculationDate, loadFunds]);

  useEffect(() => {
    if (activeTab === 'custom') {
      loadCustomFunds(selectedFundIds, selectedPlan, customDaysList, startDate, endDate, calculationDate);
    } else if (activeTab === 'suggestion') {
      loadSuggestionFunds(suggestionFundIds, selectedPlan, customDaysList, startDate, endDate, calculationDate);
    }
  }, [activeTab, selectedFundIds, suggestionFundIds, selectedPlan, customDaysList, startDate, endDate, calculationDate, loadCustomFunds, loadSuggestionFunds]);

  const handleApplyCustomDays = ({ customDaysList: newDaysList, startDate: newStart, endDate: newEnd }) => {
    const validList = (newDaysList && newDaysList.length > 0) ? newDaysList : [33, 50, 67];
    setCustomDaysList(validList);
    setCustomDays(validList[0] || 33);
    if (newStart) setStartDate(newStart);
    if (newEnd) {
      setEndDate(newEnd);
      setCalculationDate(newEnd);
    }
    setPage(1);
    loadFunds(activeCategory, searchQuery, selectedPlan, 1, validList, newStart, newEnd, newEnd || calculationDate);
    if (selectedFundIds.size > 0) {
      loadCustomFunds(selectedFundIds, selectedPlan, validList, newStart, newEnd, newEnd || calculationDate);
    }
    if (suggestionFundIds.size > 0) {
      loadSuggestionFunds(suggestionFundIds, selectedPlan, validList, newStart, newEnd, newEnd || calculationDate);
    }
  };

  const handleSelectCalculationDate = (newDate) => {
    setCalculationDate(newDate);
    setEndDate(newDate);
    setPage(1);
    loadFunds(activeCategory, searchQuery, selectedPlan, 1, customDaysList, startDate, newDate, newDate);
    if (selectedFundIds.size > 0) {
      loadCustomFunds(selectedFundIds, selectedPlan, customDaysList, startDate, newDate, newDate);
    }
    if (suggestionFundIds.size > 0) {
      loadSuggestionFunds(suggestionFundIds, selectedPlan, customDaysList, startDate, newDate, newDate);
    }
  };

  // Custom List Checkbox Handlers (Blue Checkbox)
  const handleToggleSelectFund = (id) => {
    setSelectedFundIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAllPage = (pageFunds) => {
    if (!pageFunds || pageFunds.length === 0) return;
    const allSelected = pageFunds.every(f => selectedFundIds.has(f.id));

    setSelectedFundIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        pageFunds.forEach(f => next.delete(f.id));
      } else {
        pageFunds.forEach(f => next.add(f.id));
      }
      return next;
    });
  };

  const handleRemoveFund = (id) => {
    setSelectedFundIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleClearAll = () => {
    setSelectedFundIds(new Set());
    setSelectedNseIndexIds(new Set());
    setCustomFunds([]);
  };

  // Suggestion Sheet Checkbox Handlers (Orange Checkbox)
  const handleToggleSuggestionFund = (id) => {
    setSuggestionFundIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAllSuggestionPage = (pageFunds) => {
    if (!pageFunds || pageFunds.length === 0) return;
    const allSelected = pageFunds.every(f => suggestionFundIds.has(f.id));

    setSuggestionFundIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        pageFunds.forEach(f => next.delete(f.id));
      } else {
        pageFunds.forEach(f => next.add(f.id));
      }
      return next;
    });
  };

  const handleRemoveSuggestionFund = (id) => {
    setSuggestionFundIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleClearSuggestionAll = () => {
    setSuggestionFundIds(new Set());
    setSuggestionFunds([]);
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    setRefreshStatusMessage('Refreshing AMFI data...');
    let amfiSuccess = false;
    let nseSuccess = false;

    // Reset date to today on refresh so current/today's live values are shown
    const today = new Date().toISOString().split('T')[0];
    setCalculationDate(today);
    setEndDate(today);
    setPage(1);

    try {
      const refreshRes = await triggerRefresh();
      if (refreshRes?.data?.reportDate) {
        setMeta(prev => ({
          ...prev,
          reportDate: refreshRes.data.reportDate,
          lastUpdated: refreshRes.data.lastUpdated || new Date().toISOString()
        }));
      }
      amfiSuccess = true;
    } catch (err) {
      console.error('AMFI refresh error:', err);
    }

    setRefreshStatusMessage('Refreshing NSE data...');
    try {
      await triggerNSERefresh();
      await loadNseIndices(today, customDaysList, startDate, today);
      nseSuccess = true;
    } catch (err) {
      console.error('NSE refresh error:', err);
    }

    try {
      await loadFunds(activeCategory, searchQuery, selectedPlan, 1, customDaysList, startDate, today, today);
      if (selectedFundIds.size > 0) {
        await loadCustomFunds(selectedFundIds, selectedPlan, customDaysList, startDate, today, today);
      }
      if (suggestionFundIds.size > 0) {
        await loadSuggestionFunds(suggestionFundIds, selectedPlan, customDaysList, startDate, today, today);
      }
    } catch (err) {
      console.error('Reload error:', err);
    } finally {
      setIsRefreshing(false);
      if (amfiSuccess && nseSuccess) {
        setRefreshStatusMessage('Data refreshed successfully. Showing today\'s values.');
      } else if (amfiSuccess && !nseSuccess) {
        setRefreshStatusMessage('AMFI refreshed successfully. NSE data could not be refreshed.');
      } else if (!amfiSuccess && nseSuccess) {
        setRefreshStatusMessage('NSE refreshed successfully. AMFI data could not be refreshed.');
      } else {
        setRefreshStatusMessage('Failed to refresh data. Showing cached records.');
      }
      setTimeout(() => setRefreshStatusMessage(null), 5000);
    }
  };

  const handleRefreshNse = async () => {
    setIsLoadingNse(true);
    const today = new Date().toISOString().split('T')[0];
    setCalculationDate(today);
    setEndDate(today);
    try {
      await triggerNSERefresh();
    } catch (err) {
      console.error('NSE refresh error:', err);
    }
    await loadNseIndices(today, customDaysList, startDate, today);
  };

  const categoryCountsMap = useMemo(() => {
    const map = {};
    if (categoriesList) {
      categoriesList.forEach(c => {
        map[c.name] = c.count;
      });
    }
    return map;
  }, [categoriesList]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans antialiased">
      
      {/* Header Bar with Top-Level Mode Toggle */}
      <Header 
        onRefresh={handleManualRefresh} 
        isRefreshing={isRefreshing} 
        meta={meta}
        appMode={appMode}
        onSelectAppMode={(m) => setAppMode(m)}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        mode={mode}
        onSelectMode={(m) => setMode(m)}
        selectedPlan={selectedPlan}
        onSelectPlan={(plan) => setSelectedPlan(plan)}
        selectedCount={selectedFundIds.size}
        suggestionCount={suggestionFundIds.size}
        nseSelectedCount={selectedNseIndexIds.size}
        calculationDate={calculationDate}
        onSelectCalculationDate={handleSelectCalculationDate}
        sipActiveTab={sipActiveTab}
        onSelectSipTab={(tab) => setSipActiveTab(tab)}
        sipCustomCount={selectedFundIds.size}
      />

      {/* Manual Refresh Status Toast Banner */}
      {refreshStatusMessage && (
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-3">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-900 border border-brand-500/30 text-white text-xs shadow-lg animate-fade-in">
            {isRefreshing ? (
              <RefreshCw className="w-4 h-4 text-brand-400 animate-spin shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span className="font-medium">{refreshStatusMessage}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {error && (
          <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-center space-y-3 my-4">
            <AlertTriangle className="h-10 w-10 text-rose-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">AMFI Data Unavailable</h3>
            <p className="text-xs text-rose-200/80 max-w-md mx-auto">{error}</p>
            <button
              onClick={() => loadFunds(activeCategory, searchQuery, selectedPlan, page, customDays, startDate, endDate, calculationDate)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry Fetching AMFI Data
            </button>
          </div>
        )}

        {/* MODE 1: SIP CALCULATOR */}
        {appMode === 'sip' && (
          <SipCalculator
            allFunds={funds}
            customFundIds={selectedFundIds}
            meta={meta}
            selectedPlan={selectedPlan}
            onSelectPlan={(plan) => setSelectedPlan(plan)}
            initialCalculationDate={calculationDate}
            activeSipTab={sipActiveTab}
            onSelectSipTab={(tab) => setSipActiveTab(tab)}
          />
        )}

        {/* MODE 2: FUND ANALYSIS (Yearly Performance / Day Calculation) */}
        {appMode === 'analysis' && (
          <>
            {/* Summary Dashboard Cards (Only in Yearly mode) */}
            {mode === 'yearly' && (
              <SummaryCards meta={meta} totalFundsCount={totalFunds || 10195} />
            )}

            {/* Day Calculation Calendar Range Bar (Visible at top when mode === 'days') */}
            {mode === 'days' && (
              <DayDatePicker
                customDaysList={customDaysList}
                startDate={startDate}
                endDate={endDate}
                calculationDate={calculationDate}
                onSelectCalculationDate={handleSelectCalculationDate}
                onApplyCustomDays={handleApplyCustomDays}
                meta={meta}
              />
            )}

            {/* Tab 1: All Schemes View */}
            {activeTab === 'all' && (
              <div className="space-y-4">
                {/* Category Navigation Tabs */}
                <CategoryFilter
                  activeCategory={activeCategory}
                  onSelectCategory={(cat) => {
                    setActiveCategory(cat);
                    setPage(1);
                  }}
                  categoriesList={categoriesList}
                  categoryCounts={categoryCountsMap}
                  totalSchemesCount={totalFunds}
                />

                {/* Main Master Fund Performance Table */}
                <FundTable
                  funds={funds}
                  totalFunds={totalFunds}
                  page={page}
                  totalPages={totalPages}
                  onPageChange={(p) => setPage(p)}
                  isLoading={isLoading}
                  mode={mode}
                  customDays={customDays}
                  customDaysList={customDaysList}
                  startDate={startDate}
                  endDate={endDate}
                  calculationDate={calculationDate}
                  selectedPlan={selectedPlan}
                  selectedFundIds={selectedFundIds}
                  onToggleSelectFund={handleToggleSelectFund}
                  onToggleSelectAllPage={handleToggleSelectAllPage}
                  suggestionFundIds={suggestionFundIds}
                  onToggleSuggestionFund={handleToggleSuggestionFund}
                  onToggleSelectAllSuggestionPage={handleToggleSelectAllSuggestionPage}
                  onSelectFund={(fund) => setSelectedFundModal(fund)}
                  searchQuery={searchQuery}
                  setSearchQuery={(q) => {
                    setSearchQuery(q);
                    setPage(1);
                  }}
                  selectedSchemeOption={selectedOption}
                  onSelectSchemeOption={(opt) => {
                    setSelectedOption(opt);
                    setPage(1);
                  }}
                  meta={meta}
                />
              </div>
            )}

            {/* Tab 2: Custom Fund List View */}
            {activeTab === 'custom' && (
              <CustomFundList
                type="custom"
                title="Custom Portfolio Selection"
                funds={customFunds}
                nseIndices={nseIndices}
                selectedNseIndexIds={selectedNseIndexIds}
                onToggleSelectNseIndex={handleToggleSelectNseIndex}
                onRemoveNseIndex={handleRemoveNseIndex}
                isLoading={isCustomLoading}
                mode={mode}
                customDays={customDays}
                customDaysList={customDaysList}
                startDate={startDate}
                endDate={endDate}
                calculationDate={calculationDate}
                selectedPlan={selectedPlan}
                onRemoveFund={handleRemoveFund}
                onClearAll={handleClearAll}
                meta={meta}
                onSelectFund={(fund) => setSelectedFundModal(fund)}
              />
            )}

            {/* Tab 3: Suggestion Sheet View */}
            {activeTab === 'suggestion' && (
              <CustomFundList
                type="suggestion"
                title="Suggestion Sheet"
                funds={suggestionFunds}
                nseIndices={nseIndices}
                selectedNseIndexIds={selectedNseIndexIds}
                onToggleSelectNseIndex={handleToggleSelectNseIndex}
                onRemoveNseIndex={handleRemoveNseIndex}
                isLoading={isSuggestionLoading}
                mode={mode}
                customDays={customDays}
                customDaysList={customDaysList}
                startDate={startDate}
                endDate={endDate}
                calculationDate={calculationDate}
                selectedPlan={selectedPlan}
                onRemoveFund={handleRemoveSuggestionFund}
                onClearAll={handleClearSuggestionAll}
                meta={meta}
                onSelectFund={(fund) => setSelectedFundModal(fund)}
              />
            )}

            {/* SEPARATE NSE BENCHMARK INDICES SECTION (Bottom of Main Dashboard) */}
            <NseIndicesTable
              indices={nseIndices}
              isLoading={isLoadingNse}
              selectedDate={calculationDate}
              onSelectDate={handleSelectCalculationDate}
              mode={mode}
              customDaysList={customDaysList}
              source={nseMeta?.source || 'NSE India / NSE Indices'}
              lastUpdated={nseMeta?.lastUpdated}
              isCached={nseMeta?.isCached}
              selectedNseIndexIds={selectedNseIndexIds}
              onToggleSelectIndex={handleToggleSelectNseIndex}
              onToggleSelectAll={handleToggleSelectAllNse}
              onExportNseExcel={handleExportNseExcel}
              onRefreshNse={handleRefreshNse}
            />
          </>
        )}

      </main>

      {/* Fund Details Modal */}
      {selectedFundModal && (
        <FundDetailModal
          fund={selectedFundModal}
          onClose={() => setSelectedFundModal(null)}
        />
      )}

      {/* Regulatory & Disclaimer Footer */}
      <DisclaimerFooter reportDate={meta?.reportDate} />

    </div>
  );
}

export default App;
