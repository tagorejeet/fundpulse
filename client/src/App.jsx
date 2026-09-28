import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Header from './components/Header';
import SummaryCards from './components/SummaryCards';
import CategoryFilter from './components/CategoryFilter';
import FundTable from './components/FundTable';
import CustomFundList from './components/CustomFundList';
import DayDatePicker from './components/DayDatePicker';
import FundDetailModal from './components/FundDetailModal';
import DisclaimerFooter from './components/DisclaimerFooter';
import { fetchFunds, fetchBatchFunds, triggerRefresh } from './services/api';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'fundpulse_custom_fund_ids';

export function App() {
  // Navigation & View State
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'custom'
  const [mode, setMode] = useState('yearly'); // 'yearly' | 'days'
  const [selectedPlan, setSelectedPlan] = useState('regular'); // 'regular' | 'direct'
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Custom Day Period State (defaults to 33 days as requested by user)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const getDefaultStartDate = useCallback((days) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  }, []);

  const [customDays, setCustomDays] = useState(33);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 33);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Data State
  const [funds, setFunds] = useState([]);
  const [customFunds, setCustomFunds] = useState([]);
  const [totalFunds, setTotalFunds] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [categoriesList, setCategoriesList] = useState([]);
  const [meta, setMeta] = useState(null);

  // Status State
  const [isLoading, setIsLoading] = useState(true);
  const [isCustomLoading, setIsCustomLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Selected Fund Modal State
  const [selectedFundModal, setSelectedFundModal] = useState(null);

  // Persistent Selected Custom Fund IDs (Set stored in localStorage)
  const [selectedFundIds, setSelectedFundIds] = useState(() => {
    try {
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

  // Load Main Paginated Schemes
  const loadFunds = useCallback(async (
    cat = activeCategory,
    query = searchQuery,
    plan = selectedPlan,
    p = page,
    cDays = customDays,
    sDate = startDate,
    eDate = endDate
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchFunds({
        category: cat,
        search: query,
        plan,
        page: p,
        limit: 50,
        customDays: cDays,
        startDate: sDate,
        endDate: eDate
      });

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
      setError(err.message || 'AMFI data is temporarily unavailable.');
    } finally {
      setIsLoading(false);
    }
  }, [activeCategory, searchQuery, selectedPlan, page, customDays, startDate, endDate]);

  // Load Batch Schemes for Custom Fund List
  const loadCustomFunds = useCallback(async (
    idsSet = selectedFundIds,
    plan = selectedPlan,
    cDays = customDays,
    sDate = startDate,
    eDate = endDate
  ) => {
    if (!idsSet || idsSet.size === 0) {
      setCustomFunds([]);
      return;
    }

    setIsCustomLoading(true);
    try {
      const res = await fetchBatchFunds({
        ids: Array.from(idsSet),
        plan,
        customDays: cDays,
        startDate: sDate,
        endDate: eDate
      });
      setCustomFunds(res.data.funds || []);
    } catch (err) {
      console.error('Failed to load custom fund list details:', err);
    } finally {
      setIsCustomLoading(false);
    }
  }, [selectedFundIds, selectedPlan, customDays, startDate, endDate]);

  // Initial Load & Effect triggers
  useEffect(() => {
    loadFunds(activeCategory, searchQuery, selectedPlan, page, customDays, startDate, endDate);
  }, [activeCategory, searchQuery, selectedPlan, page, customDays, startDate, endDate, loadFunds]);

  useEffect(() => {
    if (activeTab === 'custom') {
      loadCustomFunds(selectedFundIds, selectedPlan, customDays, startDate, endDate);
    }
  }, [activeTab, selectedFundIds, selectedPlan, customDays, startDate, endDate, loadCustomFunds]);

  const handleApplyCustomPeriod = ({ customDays: d, startDate: s, endDate: e }) => {
    setCustomDays(d);
    setStartDate(s);
    setEndDate(e);
    loadFunds(activeCategory, searchQuery, selectedPlan, page, d, s, e);
    if (selectedFundIds.size > 0) {
      loadCustomFunds(selectedFundIds, selectedPlan, d, s, e);
    }
  };

  // Checkbox Handlers
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
    setCustomFunds([]);
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await triggerRefresh();
      await loadFunds(activeCategory, searchQuery, selectedPlan, page, customDays, startDate, endDate);
      if (selectedFundIds.size > 0) {
        await loadCustomFunds(selectedFundIds, selectedPlan, customDays, startDate, endDate);
      }
    } catch (err) {
      setError(err.message || 'Failed to refresh AMFI data.');
    } finally {
      setIsRefreshing(false);
    }
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
      
      {/* Header Bar with Mode Toggle */}
      <Header 
        onRefresh={handleManualRefresh} 
        isRefreshing={isRefreshing} 
        meta={meta}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        mode={mode}
        onSelectMode={(m) => setMode(m)}
        selectedPlan={selectedPlan}
        onSelectPlan={(plan) => setSelectedPlan(plan)}
        selectedCount={selectedFundIds.size}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {error && (
          <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-center space-y-3 my-4">
            <AlertTriangle className="h-10 w-10 text-rose-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">AMFI Data Unavailable</h3>
            <p className="text-xs text-rose-200/80 max-w-md mx-auto">{error}</p>
            <button
              onClick={() => loadFunds(activeCategory, searchQuery, selectedPlan, page, customDays, startDate, endDate)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry Fetching AMFI Data
            </button>
          </div>
        )}

        {/* Summary Dashboard Cards (Only in Yearly mode) */}
        {mode === 'yearly' && (
          <SummaryCards meta={meta} totalFundsCount={totalFunds || 10195} />
        )}

        {/* Day Calculation Calendar Range Bar (Visible at top when mode === 'days') */}
        {mode === 'days' && (
          <DayDatePicker
            customDays={customDays}
            startDate={startDate}
            endDate={endDate}
            onApplyCustomPeriod={handleApplyCustomPeriod}
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
              startDate={startDate}
              endDate={endDate}
              selectedPlan={selectedPlan}
              selectedFundIds={selectedFundIds}
              onToggleSelectFund={handleToggleSelectFund}
              onToggleSelectAllPage={handleToggleSelectAllPage}
              onSelectFund={(fund) => setSelectedFundModal(fund)}
              searchQuery={searchQuery}
              setSearchQuery={(q) => {
                setSearchQuery(q);
                setPage(1);
              }}
              meta={meta}
            />
          </div>
        )}

        {/* Tab 2: Custom Fund List View */}
        {activeTab === 'custom' && (
          <CustomFundList
            funds={customFunds}
            isLoading={isCustomLoading}
            mode={mode}
            customDays={customDays}
            startDate={startDate}
            endDate={endDate}
            selectedPlan={selectedPlan}
            onRemoveFund={handleRemoveFund}
            onClearAll={handleClearAll}
            meta={meta}
            onSelectFund={(fund) => setSelectedFundModal(fund)}
          />
        )}

      </main>

      {/* Fund Details Modal */}
      {selectedFundModal && (
        <FundDetailModal
          fund={selectedFundModal}
          onClose={() => setSelectedFundModal(null)}
        />
      )}

    </div>
  );
}

export default App;
