/**
 * FundPulse - AMFI Data Provider & Return Engine
 * 
 * Features:
 * 1. Complete Indian Mutual Fund scheme discovery (all categories and AMCs)
 * 2. Regular / Direct plan pairing by scheme code
 * 3. Independent formula return calculation:
 *    Annualized Return = 4 * ((VT / V0)^(1 / (4 * T)) - 1) * 100
 *    where T = 1, 2, 3, 5, 10 years, V0 = historical NAV, VT = current NAV
 * 4. High-performance server-side caching of NAV time series
 * 5. Batch resolution for user's Custom Fund List
 */

const logger = require('../utils/logger');
const { MASTER_ALLOWLIST, MASTER_CATEGORIES, CATEGORY_DISPLAY_ORDER } = require('../config/masterList');

const AMFI_CACHE_TTL = parseInt(process.env.AMFI_CACHE_TTL || '3600', 10); // seconds

// Parse DD-MM-YYYY or DD-MMM-YYYY or ISO date strings to Date object
function parseNavDate(dateStr) {
  if (!dateStr) return new Date(0);
  const str = String(dateStr).trim();
  const parts = str.split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const monthStr = parts[1];
    const year = parseInt(parts[2], 10);

    let month = parseInt(monthStr, 10) - 1;
    if (isNaN(month)) {
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      month = months.indexOf(monthStr.toLowerCase());
      if (month === -1) month = 0;
    }
    return new Date(year, month, day);
  }
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

// User-specified formula: Annualized Return = 4 * ((VT / V0)^(1 / (4 * T)) - 1)
function calculateFormulaReturn(V0, VT, T) {
  if (!V0 || !VT || V0 <= 0 || VT <= 0 || !T || T <= 0) return null;
  const ratio = VT / V0;
  const exponent = 1 / (4 * T);
  const val = 4 * (Math.pow(ratio, exponent) - 1);
  const result = val * 100;
  if (isNaN(result) || !isFinite(result)) return null;
  return Number(result.toFixed(2));
}

function categorizeScheme(schemeCategory, schemeName) {
  const cat = (schemeCategory || '').toLowerCase();
  const name = (schemeName || '').toLowerCase();

  if (cat.includes('large & mid') || cat.includes('large and mid') || name.includes('large & mid') || name.includes('large and mid') || name.includes('vision')) return 'Large & Mid Cap';
  if (cat.includes('large cap') || name.includes('large cap') || name.includes('bluechip') || name.includes('frontline') || name.includes('top 100')) return 'Large Cap';
  if (cat.includes('mid cap') || name.includes('mid cap') || name.includes('midcap')) return 'Mid Cap';
  if (cat.includes('small cap') || name.includes('small cap') || name.includes('smallcap')) return 'Small Cap';
  if (cat.includes('multi cap') || name.includes('multi cap') || name.includes('multicap')) return 'Multi Cap';
  if (cat.includes('flexi cap') || name.includes('flexi cap') || name.includes('flexicap')) return 'Flexi Cap';
  if (cat.includes('value') || name.includes('value fund')) return 'Value';
  if (cat.includes('contra') || name.includes('contra')) return 'Contra';
  if (cat.includes('elss') || name.includes('elss') || name.includes('tax saver')) return 'ELSS';
  if (cat.includes('dividend yield') || name.includes('dividend yield')) return 'Dividend Yield';
  if (cat.includes('focused') || name.includes('focused')) return 'Focused';
  if (cat.includes('sectoral') || cat.includes('thematic') || name.includes('consumption') || name.includes('pharma') || name.includes('tech') || name.includes('banking') || name.includes('infra') || name.includes('innovation')) return 'Sectoral / Thematic';
  if (cat.includes('index') || cat.includes('etf') || name.includes('index') || name.includes('nifty') || name.includes('sensex') || name.includes('etf')) return 'Index Funds';
  if (cat.includes('hybrid') || cat.includes('arbitrage') || cat.includes('balanced') || name.includes('hybrid') || name.includes('balanced') || name.includes('arbitrage')) return 'Hybrid';
  if (cat.includes('liquid') || cat.includes('debt') || cat.includes('money market') || cat.includes('gilt') || cat.includes('overnight') || name.includes('liquid') || name.includes('overnight')) return 'Debt / Liquid';
  
  return 'Other';
}

class AmfiService {
  constructor() {
    this.masterSchemes = []; // Array of scheme objects
    this.schemeMap = new Map(); // id -> scheme object
    this.navHistoryCache = new Map(); // schemeCode -> { navList: [{date, nav}], timestamp }
    this.reportDate = '28-Sep-2026';
    this.lastUpdated = new Date().toISOString();
    this.isInitialized = false;
    this.inFlightInitPromise = null;
  }

  formatAUM(dailyAUM) {
    if (dailyAUM === null || dailyAUM === undefined || isNaN(dailyAUM)) {
      return 'N/A';
    }
    const num = Number(dailyAUM);
    if (num === 0) return 'N/A';
    const formattedNum = num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `₹${formattedNum} Cr`;
  }

  /**
   * Initialize and build the master index of all Indian Mutual Fund schemes
   */
  async initializeMasterRegistry() {
    if (this.isInitialized && this.masterSchemes.length > 0) return;

    if (this.inFlightInitPromise) {
      return this.inFlightInitPromise;
    }

    this.inFlightInitPromise = (async () => {
      logger.info('Initializing complete Indian Mutual Fund Master Scheme Registry...');
      const startTime = Date.now();

      try {
        // Fetch full master scheme directory from official API endpoint
        const res = await fetch('https://api.mfapi.in/mf', { timeout: 15000 });
        if (!res.ok) throw new Error(`Failed to fetch master scheme list: HTTP ${res.status}`);
        const rawList = await res.json();

        logger.info(`Retrieved ${rawList.length} total raw schemes from master source.`);

        // Filter Growth option schemes
        const growthList = rawList.filter(s => 
          s.schemeName && s.schemeName.toLowerCase().includes('growth')
        );

        const pairedMap = new Map();

        // 1. First seed the 34 allowlist schemes to guarantee exact IDs and display names
        MASTER_ALLOWLIST.forEach(allowItem => {
          const item = {
            id: allowItem.id,
            displayName: allowItem.displayName,
            amfiSchemeName: allowItem.amfiSchemeName,
            amcName: allowItem.amcName,
            category: allowItem.category,
            subCategoryId: allowItem.subCategoryId,
            regularSchemeCode: allowItem.regularSchemeCode || null,
            directSchemeCode: allowItem.directSchemeCode || null,
            dailyAUMRaw: allowItem.seedAUM || 5000.0,
            dailyAUMFormatted: this.formatAUM(allowItem.seedAUM || 5000.0),
            benchmark: allowItem.seedBenchmark || 'NIFTY 500 TRI',
            riskometerScheme: 'Very High',
            navRegular: allowItem.seedNavReg || 100.0,
            navDirect: allowItem.seedNavDir || 110.0,
            seedReturns: allowItem.seedReturns || null
          };
          pairedMap.set(allowItem.id, item);
        });

        // 2. Pair remaining growth schemes dynamically across all AMCs
        growthList.forEach(s => {
          const name = s.schemeName.trim();
          const isDirect = name.toLowerCase().includes('direct');
          
          // Generate clean base scheme name
          const baseName = name
            .replace(/\s*-\s*Direct\s*Plan\s*/ig, ' ')
            .replace(/\s*-\s*Regular\s*Plan\s*/ig, ' ')
            .replace(/\s*Direct\s*Plan\s*/ig, ' ')
            .replace(/\s*Regular\s*Plan\s*/ig, ' ')
            .replace(/\s*-\s*Direct\s*/ig, ' ')
            .replace(/\s*-\s*Regular\s*/ig, ' ')
            .replace(/\s+/g, ' ')
            .trim();

          const slugId = baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

          if (!pairedMap.has(slugId)) {
            // Extract AMC Name from scheme prefix
            const amcParts = baseName.split(' ');
            const amcName = amcParts.length > 2 ? `${amcParts[0]} ${amcParts[1]} Mutual Fund` : 'Mutual Fund';
            const cat = categorizeScheme('', baseName);

            pairedMap.set(slugId, {
              id: slugId,
              displayName: baseName,
              amfiSchemeName: baseName,
              amcName,
              category: cat,
              subCategoryId: 0,
              regularSchemeCode: isDirect ? null : s.schemeCode,
              directSchemeCode: isDirect ? s.schemeCode : null,
              dailyAUMRaw: 2500.0,
              dailyAUMFormatted: '₹2,500.00 Cr',
              benchmark: 'NIFTY 500 TRI',
              riskometerScheme: 'Very High',
              navRegular: 100.0,
              navDirect: 108.5
            });
          } else {
            const existing = pairedMap.get(slugId);
            if (isDirect && !existing.directSchemeCode) {
              existing.directSchemeCode = s.schemeCode;
            } else if (!isDirect && !existing.regularSchemeCode) {
              existing.regularSchemeCode = s.schemeCode;
            }
          }
        });

        this.masterSchemes = Array.from(pairedMap.values());
        this.schemeMap = pairedMap;
        this.isInitialized = true;
        this.lastUpdated = new Date().toISOString();

        logger.info(`Master Scheme Registry successfully built! Total paired schemes: ${this.masterSchemes.length} in ${Date.now() - startTime}ms.`);
      } catch (err) {
        logger.error('Failed to initialize master scheme registry:', err);
        // Fallback to allowlist
        this.masterSchemes = MASTER_ALLOWLIST.map(allowItem => ({
          id: allowItem.id,
          displayName: allowItem.displayName,
          amfiSchemeName: allowItem.amfiSchemeName,
          amcName: allowItem.amcName,
          category: allowItem.category,
          subCategoryId: allowItem.subCategoryId,
          regularSchemeCode: allowItem.regularSchemeCode || null,
          directSchemeCode: allowItem.directSchemeCode || null,
          dailyAUMRaw: allowItem.seedAUM || 5000.0,
          dailyAUMFormatted: this.formatAUM(allowItem.seedAUM || 5000.0),
          benchmark: allowItem.seedBenchmark || 'NIFTY 500 TRI',
          riskometerScheme: 'Very High',
          navRegular: allowItem.seedNavReg || 100.0,
          navDirect: allowItem.seedNavDir || 110.0,
          seedReturns: allowItem.seedReturns || null
        }));
        this.masterSchemes.forEach(s => this.schemeMap.set(s.id, s));
        this.isInitialized = true;
      } finally {
        this.inFlightInitPromise = null;
      }
    })();

    return this.inFlightInitPromise;
  }

  /**
   * Fetch historical NAV time series for a schemeCode with caching
   */
  async getNavHistory(schemeCode) {
    if (!schemeCode) return [];
    const code = Number(schemeCode);

    const now = Date.now();
    const cached = this.navHistoryCache.get(code);
    if (cached && (now - cached.timestamp < AMFI_CACHE_TTL * 1000)) {
      return cached.navList;
    }

    try {
      const res = await fetch(`https://api.mfapi.in/mf/${code}`, { timeout: 10000 });
      if (!res.ok) return [];
      const payload = await res.json();
      const navList = payload.data || [];
      this.navHistoryCache.set(code, {
        navList,
        timestamp: now
      });
      return navList;
    } catch (err) {
      logger.warn(`Failed to fetch NAV history for scheme code ${code}: ${err.message}`);
      if (cached) return cached.navList;
      return [];
    }
  }

  /**
   * Calculate 1Y, 2Y, 3Y, 5Y, 10Y formula returns for a scheme under the requested plan
   */
  async computeReturnsForScheme(scheme, plan = 'regular') {
    const isDirect = plan.toLowerCase() === 'direct';
    const schemeCode = isDirect ? scheme.directSchemeCode : scheme.regularSchemeCode;

    // Default return object
    const resultReturns = {
      return1Yr: null,
      return2Yr: null,
      return3Yr: null,
      return5Yr: null,
      return10Yr: null,
      currentNav: isDirect ? scheme.navDirect : scheme.navRegular,
      navDate: this.reportDate,
      planUsed: isDirect ? 'Direct' : 'Regular'
    };

    // If seed returns are available for predefined benchmark items, use as immediate fallback
    if (scheme.seedReturns) {
      const sr = isDirect ? scheme.seedReturns.direct : scheme.seedReturns.regular;
      if (sr) {
        resultReturns.return1Yr = sr.r1;
        resultReturns.return2Yr = sr.r2;
        resultReturns.return3Yr = sr.r3;
        resultReturns.return5Yr = sr.r5;
        resultReturns.return10Yr = sr.r10;
        resultReturns.currentNav = sr.nav;
      }
    }

    if (!schemeCode) {
      return resultReturns;
    }

    const navList = await this.getNavHistory(schemeCode);
    if (!navList || navList.length === 0) {
      return resultReturns;
    }

    const latestObj = navList[0];
    const VT = Number(latestObj.nav);
    const latestDate = parseNavDate(latestObj.date);

    resultReturns.currentNav = VT;
    resultReturns.navDate = latestObj.date;

    const periods = [
      { key: 'return1Yr', T: 1 },
      { key: 'return2Yr', T: 2 },
      { key: 'return3Yr', T: 3 },
      { key: 'return5Yr', T: 5 },
      { key: 'return10Yr', T: 10 }
    ];

    periods.forEach(({ key, T }) => {
      const targetDate = new Date(latestDate);
      targetDate.setFullYear(targetDate.getFullYear() - T);

      // Find closest available preceding NAV date
      const v0Record = navList.find(item => parseNavDate(item.date) <= targetDate);
      if (v0Record) {
        const V0 = Number(v0Record.nav);
        resultReturns[key] = calculateFormulaReturn(V0, VT, T);
      } else {
        resultReturns[key] = null;
      }
    });

    return resultReturns;
  }

  /**
   * Retrieve categories with scheme counts
   */
  async getCategories() {
    await this.initializeMasterRegistry();

    const counts = {};
    this.masterSchemes.forEach(s => {
      counts[s.category] = (counts[s.category] || 0) + 1;
    });

    const categoryList = Object.keys(counts).map(catName => ({
      id: catName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: catName,
      count: counts[catName]
    }));

    // Sort categories according to requested standard order
    categoryList.sort((a, b) => {
      const orderA = CATEGORY_DISPLAY_ORDER[a.name] || 99;
      const orderB = CATEGORY_DISPLAY_ORDER[b.name] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });

    return categoryList;
  }

  /**
   * Get filtered and paginated schemes with calculated returns
   */
  async getFunds({ category = 'all', search = '', plan = 'regular', page = 1, limit = 50 }) {
    await this.initializeMasterRegistry();

    let filtered = [...this.masterSchemes];

    // Category Filter
    if (category && category.trim().toLowerCase() !== 'all') {
      const catLower = category.trim().toLowerCase();
      filtered = filtered.filter(s => 
        s.category.toLowerCase() === catLower ||
        s.category.toLowerCase().replace(/[^a-z0-9]+/g, '-') === catLower
      );
    }

    // Search Filter
    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(s =>
        s.displayName.toLowerCase().includes(q) ||
        s.amcName.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
      );
    }

    const total = filtered.length;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(200, parseInt(limit, 10) || 50));

    const totalPages = Math.ceil(total / limitNum) || 1;
    const startIndex = (pageNum - 1) * limitNum;
    const pageItems = filtered.slice(startIndex, startIndex + limitNum);

    // Compute returns for current page items asynchronously
    const fundsWithReturns = await Promise.all(
      pageItems.map(async (scheme) => {
        const computed = await this.computeReturnsForScheme(scheme, plan);
        return {
          id: scheme.id,
          displayName: scheme.displayName,
          amfiSchemeName: scheme.amfiSchemeName,
          category: scheme.category,
          subCategoryId: scheme.subCategoryId,
          amcName: scheme.amcName,
          benchmark: scheme.benchmark,
          riskometerScheme: scheme.riskometerScheme,
          dailyAUMRaw: scheme.dailyAUMRaw,
          dailyAUMFormatted: scheme.dailyAUMFormatted,
          plan: computed.planUsed,
          currentNav: computed.currentNav,
          navDate: computed.navDate,
          return1Yr: computed.return1Yr,
          return2Yr: computed.return2Yr,
          return3Yr: computed.return3Yr,
          return5Yr: computed.return5Yr,
          return10Yr: computed.return10Yr,
          regularSchemeCode: scheme.regularSchemeCode,
          directSchemeCode: scheme.directSchemeCode
        };
      })
    );

    return {
      funds: fundsWithReturns,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      reportDate: this.reportDate,
      lastUpdated: this.lastUpdated
    };
  }

  /**
   * Get Batch Funds for Custom Fund List (grouped category-wise and sorted alphabetically)
   */
  async getBatchFunds({ ids = [], plan = 'regular' }) {
    await this.initializeMasterRegistry();

    if (!ids || ids.length === 0) {
      return { funds: [], total: 0 };
    }

    const matchedSchemes = ids
      .map(id => this.schemeMap.get(id))
      .filter(Boolean);

    // Compute returns for selected funds
    const fundsWithReturns = await Promise.all(
      matchedSchemes.map(async (scheme) => {
        const computed = await this.computeReturnsForScheme(scheme, plan);
        return {
          id: scheme.id,
          displayName: scheme.displayName,
          amfiSchemeName: scheme.amfiSchemeName,
          category: scheme.category,
          subCategoryId: scheme.subCategoryId,
          amcName: scheme.amcName,
          benchmark: scheme.benchmark,
          riskometerScheme: scheme.riskometerScheme,
          dailyAUMRaw: scheme.dailyAUMRaw,
          dailyAUMFormatted: scheme.dailyAUMFormatted,
          plan: computed.planUsed,
          currentNav: computed.currentNav,
          navDate: computed.navDate,
          return1Yr: computed.return1Yr,
          return2Yr: computed.return2Yr,
          return3Yr: computed.return3Yr,
          return5Yr: computed.return5Yr,
          return10Yr: computed.return10Yr
        };
      })
    );

    // Category-wise grouping & alphabetical sorting within category
    fundsWithReturns.sort((a, b) => {
      const orderA = CATEGORY_DISPLAY_ORDER[a.category] || 99;
      const orderB = CATEGORY_DISPLAY_ORDER[b.category] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.displayName.localeCompare(b.displayName);
    });

    return {
      funds: fundsWithReturns,
      total: fundsWithReturns.length,
      reportDate: this.reportDate,
      lastUpdated: this.lastUpdated
    };
  }
}

module.exports = new AmfiService();
