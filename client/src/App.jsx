import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import SummaryCards from './components/SummaryCards';
import CategoryFilter from './components/CategoryFilter';
import FundTable from './components/FundTable';
import FundDetailModal from './components/FundDetailModal';
import DisclaimerFooter from './components/DisclaimerFooter';
import { fetchFunds, triggerRefresh } from './services/api';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export function App() {
  const [funds, setFunds] = useState([]);
  const [meta, setMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFund, setSelectedFund] = useState(null);

  const loadFunds = useCallback(async (cat = activeCategory, query = searchQuery) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchFunds(cat, query);
      setFunds(res.data.funds || []);
      setMeta({
        reportDate: res.data.reportDate,
        lastUpdated: res.data.lastUpdated,
        isCached: res.data.isCached,
        matchedCount: res.data.matchedCount,
        unavailableCount: res.data.unavailableCount,
        warning: res.data.warning
      });
    } catch (err) {
      setError(err.message || 'AMFI data is temporarily unavailable.');
    } finally {
      setIsLoading(false);
    }
  }, [activeCategory, searchQuery]);

  useEffect(() => {
    loadFunds(activeCategory, searchQuery);
  }, [activeCategory, searchQuery, loadFunds]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await triggerRefresh();
      await loadFunds(activeCategory, searchQuery);
    } catch (err) {
      setError(err.message || 'Failed to refresh AMFI data.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Compute category counts for pills from currently loaded master list
  const categoryCounts = React.useMemo(() => {
    if (!funds) return {};
    const counts = { 'all': 34 };
    funds.forEach(f => {
      counts[f.category] = (counts[f.category] || 0) + 1;
    });
    return counts;
  }, [funds]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans antialiased">
      
      {/* Header Bar */}
      <Header 
        onRefresh={handleManualRefresh} 
        isRefreshing={isRefreshing} 
        meta={meta} 
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Banner Warning if served from stale cache or error */}
        {meta?.warning && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
              <span>{meta.warning}</span>
            </div>
            <button
              onClick={handleManualRefresh}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold transition-all"
            >
              Retry AMFI
            </button>
          </div>
        )}

        {error && (
          <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-center space-y-3 my-8">
            <AlertTriangle className="h-10 w-10 text-rose-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">AMFI Data Unavailable</h3>
            <p className="text-xs text-rose-200/80 max-w-md mx-auto">{error}</p>
            <button
              onClick={() => loadFunds(activeCategory, searchQuery)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry Fetching AMFI Data
            </button>
          </div>
        )}

        {/* Summary Dashboard Cards */}
        <SummaryCards meta={meta} totalFundsCount={funds.length} />

        {/* Category Navigation Tabs */}
        <CategoryFilter
          activeCategory={activeCategory}
          onSelectCategory={(cat) => setActiveCategory(cat)}
          categoryCounts={categoryCounts}
        />

        {/* Master Fund Performance Table */}
        <FundTable
          funds={funds}
          isLoading={isLoading}
          onSelectFund={(fund) => setSelectedFund(fund)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          meta={meta}
        />

      </main>

      {/* Fund Details Modal */}
      {selectedFund && (
        <FundDetailModal
          fund={selectedFund}
          onClose={() => setSelectedFund(null)}
        />
      )}

      {/* Footer Disclaimer */}
      <DisclaimerFooter />

    </div>
  );
}

export default App;
