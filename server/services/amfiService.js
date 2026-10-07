/**
 * FundPulse - AMFI Data Provider & Return Engine
 * 
 * Features:
 * 1. Complete Indian Mutual Fund scheme discovery (all categories and AMCs)
 * 2. Official AMFI Live AUM fetching & matching (sources daily AUM directly from AMFI)
 * 3. Regular / Direct plan pairing by scheme code
 * 4. Independent formula return calculation:
 *    Annualized Return = 4 * ((VT / V0)^(1 / (4 * T)) - 1) * 100
 *    where T = 1, 2, 3, 5, 10 years, V0 = historical NAV, VT = current NAV
 * 5. High-performance server-side caching of NAV time series
 * 6. Batch resolution for user's Custom Fund List
 */

const logger = require('../utils/logger');
const { MASTER_ALLOWLIST, MASTER_CATEGORIES, CATEGORY_DISPLAY_ORDER } = require('../config/masterList');
const { fuzzyFilterSchemes } = require('../utils/fuzzySearch');

const AMFI_CACHE_TTL = parseInt(process.env.AMFI_CACHE_TTL || '3600', 10); // seconds

// Parse DD-MM-YYYY or DD-MMM-YYYY or ISO (YYYY-MM-DD) date strings to Date object
function parseNavDate(dateStr) {
  if (!dateStr) return new Date(0);
  const str = String(dateStr).trim();
  const parts = str.split('-');
  if (parts.length === 3) {
    // Handle ISO YYYY-MM-DD format
    if (parts[0].length === 4) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }

    // Handle DD-MM-YYYY or DD-MMM-YYYY format
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

function formatAmfiDate(dateObj) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  return `${day}-${month}-${year}`;
}

function cleanSchemeName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/\s*-\s*direct\s*plan\s*/g, ' ')
    .replace(/\s*-\s*regular\s*plan\s*/g, ' ')
    .replace(/\s*direct\s*plan\s*/g, ' ')
    .replace(/\s*regular\s*plan\s*/g, ' ')
    .replace(/\s*-\s*direct\s*/g, ' ')
    .replace(/\s*-\s*regular\s*/g, ' ')
    .replace(/\s*-\s*growth\s*option\s*/g, ' ')
    .replace(/\s*-\s*growth\s*plan\s*/g, ' ')
    .replace(/\s*-\s*growth\s*/g, ' ')
    .replace(/\s*growth\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

// Day Calculation formula: Annualized Return = 4 * ((VT / V0)^(365 / (4 * D)) - 1)
function calculateDayFormulaReturn(V0, VT, D) {
  if (!V0 || !VT || V0 <= 0 || VT <= 0 || !D || D <= 0) return null;
  const ratio = VT / V0;
  const exponent = 365 / (4 * D);
  const val = 4 * (Math.pow(ratio, exponent) - 1);
  const result = val * 100;
  if (isNaN(result) || !isFinite(result)) return null;
  return Number(result.toFixed(2));
}

function parseDaysList(customDays) {
  let daysList = [];
  if (Array.isArray(customDays)) {
    daysList = customDays.map(d => parseInt(d, 10)).filter(d => !isNaN(d) && d > 0);
  } else if (typeof customDays === 'string') {
    daysList = customDays
      .split(/[\s,]+/)
      .map(d => parseInt(d.trim(), 10))
      .filter(d => !isNaN(d) && d > 0);
  } else if (typeof customDays === 'number' && customDays > 0) {
    daysList = [customDays];
  }
  daysList = Array.from(new Set(daysList));
  if (daysList.length === 0) {
    daysList = [33, 50, 67];
  }
  return daysList;
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
    this.computedCache = new Map(); // cacheKey -> { data, timestamp }
    // Initialize to yesterday's date dynamically
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    this.reportDate = formatAmfiDate(yesterday);
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
   * Resolves the latest available mutual fund NAV date across India from authoritative feeds
   */
  async resolveLatestNavDate() {
    const candidateCodes = [120152, 106235, 118834, 120503];
    for (const code of candidateCodes) {
      try {
        const res = await fetch(`https://api.mfapi.in/mf/${code}`, {
          signal: AbortSignal.timeout(3500)
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.data?.[0]?.date) {
            const [d, m, y] = json.data[0].date.split('-');
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthName = months[parseInt(m, 10) - 1] || m;
            return `${d}-${monthName}-${y}`;
          }
        }
      } catch (err) {
        // Continue to next candidate
      }
    }
    return null;
  }

  /**
   * Fetch Live AUM, Benchmarks, and Riskometers directly from official AMFI Fund Performance endpoint
   */
  async fetchAmfiLiveAumData() {
    const amfiEntries = [];
    let resolvedDate = null;
    const today = new Date();
    const subCats = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15];

    // AMFI updates performance data around 7-9 PM evening. Check candidate dates from today backwards.
    for (let dayOffset = 0; dayOffset <= 5; dayOffset++) {
      const candidateDate = new Date(today);
      candidateDate.setDate(today.getDate() - dayOffset);
      const dateStr = formatAmfiDate(candidateDate);

      let successCount = 0;

      for (const subCat of subCats) {
        try {
          const res = await fetch('https://www.amfiindia.com/gateway/pollingsebi/api/amfi/fundperformance', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            body: JSON.stringify({
              maturityType: 1,
              category: 1,
              subCategory: subCat,
              mfid: 0,
              reportDate: dateStr
            }),
            signal: AbortSignal.timeout(2500)
          });

          if (res.ok) {
            const json = await res.json();
            const list = json.data || [];
            if (list.length > 0) {
              successCount += list.length;
              list.forEach(item => {
                if (item.schemeName) {
                  amfiEntries.push({
                    rawName: item.schemeName,
                    cleanName: cleanSchemeName(item.schemeName),
                    dailyAUM: item.dailyAUM ? Number(item.dailyAUM) : null,
                    benchmark: item.benchmark ? String(item.benchmark).trim() : 'N/A',
                    riskometerScheme: item.riskometerScheme ? String(item.riskometerScheme).trim() : 'N/A',
                    navRegular: item.navRegular ? Number(item.navRegular) : null,
                    navDirect: item.navDirect ? Number(item.navDirect) : null
                  });
                }
              });
            }
          }
        } catch (err) {
          // Timeout or connection error for subcategory fetch
        }
      }

      if (successCount > 0) {
        resolvedDate = dateStr;
        logger.info(`Successfully fetched ${amfiEntries.length} live AMFI AUM entries for report date ${dateStr}!`);
        break;
      }
    }

    // Resolve latest published NAV date across Indian mutual funds
    const latestNavDate = await this.resolveLatestNavDate();
    if (latestNavDate) {
      this.reportDate = latestNavDate;
    } else if (resolvedDate) {
      this.reportDate = resolvedDate;
    }

    return amfiEntries;
  }

  /**
   * Initialize and build the master index of all Indian Mutual Fund schemes with real AMFI AUM
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
        // 1. Fetch live AMFI AUM dataset
        const amfiList = await this.fetchAmfiLiveAumData();

        // 2. Fetch full master scheme directory from official API endpoint
        const res = await fetch('https://api.mfapi.in/mf', { signal: AbortSignal.timeout(15000) });
        if (!res.ok) throw new Error(`Failed to fetch master scheme list: HTTP ${res.status}`);
        const rawList = await res.json();

        logger.info(`Retrieved ${rawList.length} total raw schemes from master source.`);

        // Helper to determine scheme option type (Growth / Bonus / IDCW)
        const determineSchemeOption = (name) => {
          if (!name) return 'growth';
          const lower = name.toLowerCase();
          if (lower.includes('bonus')) return 'bonus';
          if (lower.includes('idcw') || lower.includes('dividend') || lower.includes('div')) return 'idcw';
          return 'growth';
        };

        const pairedMap = new Map();

        // Helper to match AMFI AUM entry for a scheme
        const findAmfiMatch = (displayName) => {
          const sClean = cleanSchemeName(displayName);
          return amfiList.find(a => 
            a.cleanName === sClean || 
            (a.cleanName.length > 5 && sClean.includes(a.cleanName)) ||
            (sClean.length > 5 && a.cleanName.includes(sClean))
          );
        };

        // 1. Seed the 34 allowlist schemes to guarantee exact IDs, display names, and AMFI AUM
        MASTER_ALLOWLIST.forEach(allowItem => {
          const match = findAmfiMatch(allowItem.displayName) || findAmfiMatch(allowItem.amfiSchemeName);
          const aumVal = match && match.dailyAUM ? match.dailyAUM : (allowItem.seedAUM || null);

          const item = {
            id: allowItem.id,
            displayName: allowItem.displayName,
            amfiSchemeName: allowItem.amfiSchemeName,
            amcName: allowItem.amcName,
            category: allowItem.category,
            schemeOption: determineSchemeOption(allowItem.displayName),
            subCategoryId: allowItem.subCategoryId,
            regularSchemeCode: allowItem.regularSchemeCode || null,
            directSchemeCode: allowItem.directSchemeCode || null,
            dailyAUMRaw: aumVal,
            dailyAUMFormatted: this.formatAUM(aumVal),
            benchmark: (match && match.benchmark !== 'N/A') ? match.benchmark : (allowItem.seedBenchmark || 'NIFTY 500 TRI'),
            riskometerScheme: (match && match.riskometerScheme !== 'N/A') ? match.riskometerScheme : 'Very High',
            navRegular: (match && match.navRegular) ? match.navRegular : (allowItem.seedNavReg || 100.0),
            navDirect: (match && match.navDirect) ? match.navDirect : (allowItem.seedNavDir || 110.0),
            seedReturns: allowItem.seedReturns || null
          };
          pairedMap.set(allowItem.id, item);
        });

        // Build code-to-item and cleanName-to-item maps for O(1) fast lookup
        const codeToItemMap = new Map();
        const cleanNameToItemMap = new Map();

        pairedMap.forEach(item => {
          if (item.regularSchemeCode) codeToItemMap.set(Number(item.regularSchemeCode), item);
          if (item.directSchemeCode) codeToItemMap.set(Number(item.directSchemeCode), item);
          if (item.displayName) cleanNameToItemMap.set(cleanSchemeName(item.displayName), item);
          if (item.amfiSchemeName) cleanNameToItemMap.set(cleanSchemeName(item.amfiSchemeName), item);
        });

        // 2. Pair schemes dynamically across all AMCs and option types (Growth, Bonus, IDCW)
        rawList.forEach(s => {
          if (!s.schemeName || !s.schemeCode) return;
          const name = s.schemeName.trim();
          const isDirect = name.toLowerCase().includes('direct');
          const code = Number(s.schemeCode);

          // Check if this scheme code already belongs to an existing item (e.g. from allowlist)
          if (codeToItemMap.has(code)) {
            const existing = codeToItemMap.get(code);
            if (isDirect && !existing.directSchemeCode) {
              existing.directSchemeCode = code;
            } else if (!isDirect && !existing.regularSchemeCode) {
              existing.regularSchemeCode = code;
            }
            return;
          }
          
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
          const sClean = cleanSchemeName(baseName);

          // Check if slugId or clean name matches an existing allowlist item in O(1)
          let existing = pairedMap.get(slugId) || cleanNameToItemMap.get(sClean);
          if (existing && !pairedMap.has(slugId)) {
            pairedMap.set(slugId, existing);
          }

          if (!existing) {
            // Extract AMC Name from scheme prefix
            const amcParts = baseName.split(' ');
            const amcName = amcParts.length > 2 ? `${amcParts[0]} ${amcParts[1]} Mutual Fund` : 'Mutual Fund';
            const cat = categorizeScheme('', baseName);
            const schemeOption = determineSchemeOption(baseName);

            const match = findAmfiMatch(baseName);
            const aumVal = match ? match.dailyAUM : null;

            const newItem = {
              id: slugId,
              displayName: baseName,
              amfiSchemeName: baseName,
              amcName,
              category: cat,
              schemeOption,
              subCategoryId: 0,
              regularSchemeCode: isDirect ? null : code,
              directSchemeCode: isDirect ? code : null,
              dailyAUMRaw: aumVal,
              dailyAUMFormatted: this.formatAUM(aumVal),
              benchmark: match ? match.benchmark : 'N/A',
              riskometerScheme: match ? match.riskometerScheme : 'N/A',
              navRegular: null,
              navDirect: null
            };

            pairedMap.set(slugId, newItem);
            codeToItemMap.set(code, newItem);
            cleanNameToItemMap.set(sClean, newItem);
          } else {
            if (isDirect && !existing.directSchemeCode) {
              existing.directSchemeCode = code;
              codeToItemMap.set(code, existing);
            } else if (!isDirect && !existing.regularSchemeCode) {
              existing.regularSchemeCode = code;
              codeToItemMap.set(code, existing);
            }
          }
        });

        this.masterSchemes = Array.from(new Set(pairedMap.values()));
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
          dailyAUMRaw: allowItem.seedAUM || null,
          dailyAUMFormatted: this.formatAUM(allowItem.seedAUM || null),
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
      const res = await fetch(`https://api.mfapi.in/mf/${code}`, { signal: AbortSignal.timeout(8000) });
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
   * Calculate returns for a single plan (Regular or Direct)
   */
  async computeSinglePlanReturns(scheme, plan = 'regular', customDays = '33,50,67', startDate = null, endDate = null, asOfDate = null) {
    const isDirect = plan.toLowerCase() === 'direct';
    const schemeCode = (isDirect ? scheme.directSchemeCode : scheme.regularSchemeCode) || scheme.regularSchemeCode || scheme.directSchemeCode;
    const daysList = parseDaysList(customDays);

    if (schemeCode) {
      const cacheKey = `${schemeCode}_${isDirect ? 'dir' : 'reg'}_${daysList.join(',')}_${startDate || ''}_${endDate || ''}_${asOfDate || ''}`;
      const cached = this.computedCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < AMFI_CACHE_TTL * 1000)) {
        return cached.data;
      }
    }

    // Default return object
    const resultReturns = {
      return1Yr: null,
      return2Yr: null,
      return3Yr: null,
      return5Yr: null,
      return10Yr: null,
      dayReturns: {},
      customDaysList: daysList,
      customDays: daysList[0] || 33,
      currentNav: isDirect ? scheme.navDirect : scheme.navRegular,
      navDate: this.reportDate,
      planUsed: isDirect ? 'Direct' : 'Regular'
    };

    // Initialize all custom day returns
    daysList.forEach(d => {
      resultReturns[`return_${d}d`] = null;
      resultReturns.dayReturns[d] = null;
    });

    // If seed returns are available for predefined benchmark items and no asOfDate, use as immediate fallback
    if (scheme.seedReturns && !asOfDate) {
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

    // Determine anchor valuation NAV (latest or as-of-date)
    let latestObj = navList[0];
    if (asOfDate) {
      const targetValDate = parseNavDate(asOfDate);
      if (!isNaN(targetValDate.getTime()) && targetValDate.getTime() > 0) {
        const found = navList.find(item => parseNavDate(item.date).getTime() <= targetValDate.getTime());
        if (found) {
          latestObj = found;
        }
      }
    }

    const VT = Number(latestObj.nav);
    const latestDate = parseNavDate(latestObj.date);

    resultReturns.currentNav = VT;
    resultReturns.navDate = latestObj.date;

    // Yearly formula returns calculated backwards from valuation date
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

    // Custom Days formula returns calculated backwards from valuation date
    daysList.forEach((D) => {
      const targetDate = new Date(latestDate);
      targetDate.setDate(targetDate.getDate() - D);
      const v0Record = navList.find(item => parseNavDate(item.date) <= targetDate);
      if (v0Record) {
        const V0 = Number(v0Record.nav);
        const retVal = calculateDayFormulaReturn(V0, VT, D);
        resultReturns[`return_${D}d`] = retVal;
        resultReturns.dayReturns[D] = retVal;
      } else {
        resultReturns[`return_${D}d`] = null;
        resultReturns.dayReturns[D] = null;
      }
    });

    // Backward-compatibility aliases
    resultReturns.return15D = resultReturns.dayReturns[15] ?? null;
    resultReturns.return30D = resultReturns.dayReturns[30] ?? null;
    resultReturns.return45D = resultReturns.dayReturns[45] ?? null;
    resultReturns.return60D = resultReturns.dayReturns[60] ?? null;
    resultReturns.return180D = resultReturns.dayReturns[180] ?? null;
    resultReturns.returnCustomD = resultReturns.dayReturns[daysList[0]] ?? null;

    if (startDate && endDate) {
      const sDate = parseNavDate(startDate);
      const eDate = parseNavDate(endDate);
      if (!isNaN(sDate.getTime()) && !isNaN(eDate.getTime()) && eDate > sDate) {
        const diffMs = eDate.getTime() - sDate.getTime();
        const cDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));

        const vtRecord = navList.find(item => parseNavDate(item.date) <= eDate) || latestObj;
        const v0Record = navList.find(item => parseNavDate(item.date) <= sDate);

        if (vtRecord && v0Record) {
          const VT_custom = Number(vtRecord.nav);
          const V0_custom = Number(v0Record.nav);
          resultReturns.rangeReturn = calculateDayFormulaReturn(V0_custom, VT_custom, cDays);
          resultReturns.rangeDays = cDays;
        }
      }
    }

    if (schemeCode) {
      const cacheKey = `${schemeCode}_${isDirect ? 'dir' : 'reg'}_${daysList.join(',')}_${startDate || ''}_${endDate || ''}_${asOfDate || ''}`;
      this.computedCache.set(cacheKey, { data: resultReturns, timestamp: Date.now() });
    }

    return resultReturns;
  }

  /**
   * Calculate 1Y, 2Y, 3Y, 5Y, 10Y and custom days formula returns for a scheme under the requested plan ('regular', 'direct', or 'both')
   */
  async computeReturnsForScheme(scheme, plan = 'regular', customDays = '33,50,67', startDate = null, endDate = null, asOfDate = null) {
    if (plan && plan.toLowerCase() === 'both') {
      const reg = await this.computeSinglePlanReturns(scheme, 'regular', customDays, startDate, endDate, asOfDate);
      const dir = await this.computeSinglePlanReturns(scheme, 'direct', customDays, startDate, endDate, asOfDate);
      const daysList = parseDaysList(customDays);

      const combined = {
        ...reg,
        planUsed: 'Both',
        currentNav: reg.currentNav || dir.currentNav,
        navDate: reg.navDate || dir.navDate,
        // Regular Plan values
        regNav: reg.currentNav,
        regNavDate: reg.navDate,
        regReturn1Yr: reg.return1Yr,
        regReturn2Yr: reg.return2Yr,
        regReturn3Yr: reg.return3Yr,
        regReturn5Yr: reg.return5Yr,
        regReturn10Yr: reg.return10Yr,
        regDayReturns: reg.dayReturns,
        // Direct Plan values
        dirNav: dir.currentNav,
        dirNavDate: dir.navDate,
        dirReturn1Yr: dir.return1Yr,
        dirReturn2Yr: dir.return2Yr,
        dirReturn3Yr: dir.return3Yr,
        dirReturn5Yr: dir.return5Yr,
        dirReturn10Yr: dir.return10Yr,
        dirDayReturns: dir.dayReturns,
        returnsRegular: reg,
        returnsDirect: dir
      };

      daysList.forEach(d => {
        combined[`reg_return_${d}d`] = reg[`return_${d}d`];
        combined[`dir_return_${d}d`] = dir[`return_${d}d`];
      });

      return combined;
    }

    return this.computeSinglePlanReturns(scheme, plan, customDays, startDate, endDate, asOfDate);
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
  async getFunds({ category = 'all', search = '', plan = 'regular', option = 'all', page = 1, limit = 50, days, customDays = '33,50,67', startDate = null, endDate = null, asOfDate = null }) {
    await this.initializeMasterRegistry();

    const daysParam = days || customDays;
    const daysList = parseDaysList(daysParam);

    let filtered = [...this.masterSchemes];

    // Category Filter
    if (category && category.trim().toLowerCase() !== 'all') {
      const catLower = category.trim().toLowerCase();
      filtered = filtered.filter(s => 
        s.category.toLowerCase() === catLower ||
        s.category.toLowerCase().replace(/[^a-z0-9]+/g, '-') === catLower
      );
    }

    // Scheme Option Filter (all | growth | bonus | idcw)
    if (option && option.trim().toLowerCase() !== 'all') {
      const optLower = option.trim().toLowerCase();
      filtered = filtered.filter(s => {
        const sOpt = s.schemeOption || (s.displayName && /bonus/i.test(s.displayName) ? 'bonus' : /(idcw|dividend|div)/i.test(s.displayName) ? 'idcw' : 'growth');
        if (optLower === 'bonus') {
          return sOpt === 'bonus' || (s.displayName && /bonus/i.test(s.displayName));
        }
        if (optLower === 'idcw') {
          return sOpt === 'idcw' || (s.displayName && /(idcw|dividend|div)/i.test(s.displayName));
        }
        if (optLower === 'growth') {
          return sOpt === 'growth' || (s.displayName && /growth/i.test(s.displayName));
        }
        return true;
      });
    }

    // Fuzzy / Typo-tolerant Search Filter
    if (search && search.trim() !== '') {
      filtered = fuzzyFilterSchemes(filtered, search.trim());
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
        const computed = await this.computeReturnsForScheme(scheme, plan, daysList, startDate, endDate, asOfDate);
        return {
          id: scheme.id,
          displayName: scheme.displayName,
          amfiSchemeName: scheme.amfiSchemeName,
          category: scheme.category,
          schemeOption: scheme.schemeOption,
          subCategoryId: scheme.subCategoryId,
          amcName: scheme.amcName,
          benchmark: scheme.benchmark,
          riskometerScheme: scheme.riskometerScheme,
          dailyAUMRaw: scheme.dailyAUMRaw,
          dailyAUMFormatted: scheme.dailyAUMFormatted,
          regularSchemeCode: scheme.regularSchemeCode,
          directSchemeCode: scheme.directSchemeCode,
          ...computed
        };
      })
    );

    return {
      funds: fundsWithReturns,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      customDaysList: daysList,
      reportDate: this.reportDate,
      lastUpdated: this.lastUpdated
    };
  }

  /**
   * Get Batch Funds for Custom Fund List (grouped category-wise and sorted alphabetically)
   */
  async getBatchFunds({ ids = [], plan = 'regular', days, customDays = '33,50,67', startDate = null, endDate = null, asOfDate = null }) {
    await this.initializeMasterRegistry();

    const daysParam = days || customDays;
    const daysList = parseDaysList(daysParam);

    if (!ids || ids.length === 0) {
      return { funds: [], total: 0, customDaysList: daysList };
    }

    const matchedSchemes = ids
      .map(id => this.schemeMap.get(id))
      .filter(Boolean);

    // Compute returns for selected funds
    const fundsWithReturns = await Promise.all(
      matchedSchemes.map(async (scheme) => {
        const computed = await this.computeReturnsForScheme(scheme, plan, daysList, startDate, endDate, asOfDate);
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
          regularSchemeCode: scheme.regularSchemeCode,
          directSchemeCode: scheme.directSchemeCode,
          ...computed
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
      customDaysList: daysList,
      reportDate: this.reportDate,
      lastUpdated: this.lastUpdated
    };
  }
}

module.exports = new AmfiService();
