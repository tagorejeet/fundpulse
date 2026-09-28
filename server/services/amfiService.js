/**
 * AMFI Data Provider & Proxy Service
 * 
 * Responsible for:
 * 1. Proxying calls to AMFI fund performance endpoint
 * 2. Dynamic resolution of the latest available AMFI report date
 * 3. Categorized fetch across the 8 subcategories
 * 4. Filtering & normalizing strictly against the 34-fund MASTER_ALLOWLIST
 * 5. In-memory caching with configurable TTL and in-flight request deduplication
 */

const http = require('https');
const { MASTER_ALLOWLIST, MASTER_CATEGORIES } = require('../config/masterList');
const logger = require('../utils/logger');

const AMFI_BASE_URL = process.env.AMFI_BASE_URL || 'https://www.amfiindia.com';
const AMFI_CACHE_TTL = parseInt(process.env.AMFI_CACHE_TTL || '3600', 10); // in seconds

class AmfiService {
  constructor() {
    this.cache = null; // { data: [...34 funds], reportDate: string, lastUpdated: ISOString, isCached: boolean }
    this.cacheTimestamp = 0;
    this.inFlightPromise = null;
  }

  /**
   * Format Date to DD-MMM-YYYY (e.g. 23-Sep-2026)
   */
  formatAmfiDate(dateObj) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = months[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    return `${day}-${month}-${year}`;
  }

  /**
   * Format AUM to Indian currency format (e.g., ₹28,876.61 Cr)
   */
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
   * Single AMFI API Call via HTTP POST
   */
  async postAmfiEndpoint(payload) {
    const startTime = Date.now();
    const url = `${AMFI_BASE_URL}/gateway/pollingsebi/api/amfi/fundperformance`;
    const postData = JSON.stringify(payload);

    return new Promise((resolve, reject) => {
      const req = http.request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 10000
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          const responseTimeMs = Date.now() - startTime;
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = JSON.parse(body);
              resolve({
                status: res.statusCode,
                data: parsed.data || [],
                responseTimeMs
              });
            } catch (err) {
              reject(new Error(`Invalid JSON response from AMFI: ${err.message}`));
            }
          } else {
            reject(new Error(`AMFI request failed with HTTP ${res.statusCode}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('AMFI request timed out after 10s'));
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Determine the latest valid report date from AMFI by testing candidate dates
   */
  async discoverLatestReportDate(subCategoryId = 1) {
    const today = new Date();
    // Test up to 10 days back
    for (let i = 0; i < 10; i++) {
      const candidateDate = new Date(today);
      candidateDate.setDate(today.getDate() - i);
      const formattedDate = this.formatAmfiDate(candidateDate);

      try {
        const payload = {
          maturityType: 1,
          category: 1,
          subCategory: subCategoryId,
          mfid: 0,
          reportDate: formattedDate
        };
        const res = await this.postAmfiEndpoint(payload);
        if (res.data && res.data.length > 0) {
          logger.info(`Discovered valid AMFI report date: ${formattedDate} (${res.data.length} records found)`);
          return formattedDate;
        }
      } catch (err) {
        logger.warn(`Failed reportDate test for ${formattedDate}: ${err.message}`);
      }
    }
    // Fallback date if none found
    return this.formatAmfiDate(new Date());
  }

  /**
   * Fetch performance data for all required subcategories
   */
  async fetchAllCategoriesFromAmfi(reportDate) {
    const categoryResults = {}; // subCategoryId -> Array of AMFI items

    for (const cat of MASTER_CATEGORIES) {
      const startTime = Date.now();
      const payload = {
        maturityType: 1,
        category: 1,
        subCategory: cat.subCategoryId,
        mfid: 0,
        reportDate
      };

      try {
        const res = await this.postAmfiEndpoint(payload);
        const amfiItems = res.data || [];
        categoryResults[cat.subCategoryId] = amfiItems;

        // Count matched vs missing for logging
        const catAllowlist = MASTER_ALLOWLIST.filter(f => f.subCategoryId === cat.subCategoryId);
        const matchedCount = catAllowlist.filter(target =>
          amfiItems.some(item => item.schemeName.trim().toLowerCase() === target.amfiSchemeName.trim().toLowerCase())
        ).length;

        logger.amfiRequestLog({
          category: cat.name,
          subCategoryId: cat.subCategoryId,
          reportDate,
          status: res.status,
          totalRecords: amfiItems.length,
          matchedCount,
          missingCount: catAllowlist.length - matchedCount,
          responseTimeMs: res.responseTimeMs
        });
      } catch (err) {
        logger.amfiRequestLog({
          category: cat.name,
          subCategoryId: cat.subCategoryId,
          reportDate,
          status: 500,
          totalRecords: 0,
          matchedCount: 0,
          missingCount: MASTER_ALLOWLIST.filter(f => f.subCategoryId === cat.subCategoryId).length,
          responseTimeMs: Date.now() - startTime,
          error: err
        });
        categoryResults[cat.subCategoryId] = [];
      }
    }

    return categoryResults;
  }

  /**
   * Map and Normalize AMFI raw records strictly against the 34 MASTER_ALLOWLIST funds
   */
  processAndMapFunds(categoryResults, reportDate) {
    const lastUpdated = new Date().toISOString();

    const normalizedFunds = MASTER_ALLOWLIST.map(masterItem => {
      const amfiItems = categoryResults[masterItem.subCategoryId] || [];
      // Exact case-insensitive matching on official AMFI scheme name
      const matchedRecord = amfiItems.find(
        item => item.schemeName && item.schemeName.trim().toLowerCase() === masterItem.amfiSchemeName.trim().toLowerCase()
      );

      if (!matchedRecord) {
        logger.warn(`Master Fund UNMATCHED: "${masterItem.displayName}" (Expected AMFI Name: "${masterItem.amfiSchemeName}")`);
        return {
          id: masterItem.id,
          displayName: masterItem.displayName,
          amfiSchemeName: masterItem.amfiSchemeName,
          category: masterItem.category,
          subCategoryId: masterItem.subCategoryId,
          amcName: masterItem.amcName,
          status: 'UNAVAILABLE',
          errorMessage: 'Data unavailable',
          lastUpdated
        };
      }

      // Safe field extractor (preserves null, doesn't force 0)
      const parseVal = (val) => (val === null || val === undefined || val === '' || val === 'N/A' || isNaN(val) ? null : Number(val));
      const parseStr = (val) => (val === null || val === undefined || val === '' || val === 'N/A' ? 'N/A' : String(val).trim());

      return {
        id: masterItem.id,
        displayName: masterItem.displayName,
        amfiSchemeName: masterItem.amfiSchemeName,
        category: masterItem.category,
        subCategoryId: masterItem.subCategoryId,
        amcName: masterItem.amcName,
        benchmark: parseStr(matchedRecord.benchmark),
        riskometerScheme: parseStr(matchedRecord.riskometerScheme),
        riskometerBenchmark: parseStr(matchedRecord.riskometerBenchmark),

        navDate: parseStr(matchedRecord.navDate),
        navRegular: parseVal(matchedRecord.navRegular),
        navDirect: parseVal(matchedRecord.navDirect),

        preNavDate: parseStr(matchedRecord.preNavDate),
        preNavRegular: parseVal(matchedRecord.preNavRegular),
        preNavDirect: parseVal(matchedRecord.preNavDirect),

        // Short-term returns
        return7DaysRegular: parseVal(matchedRecord.return7DaysRegular),
        return7DaysDirect: parseVal(matchedRecord.return7DaysDirect),
        return7DaysBenchmark: parseVal(matchedRecord.return7DaysBenchmark),

        return15DaysRegular: parseVal(matchedRecord.return15DaysRegular),
        return15DaysDirect: parseVal(matchedRecord.return15DaysDirect),
        return15DaysBenchmark: parseVal(matchedRecord.return15DaysBenchmark),

        return1MonthRegular: parseVal(matchedRecord.return1MonthRegular),
        return1MonthDirect: parseVal(matchedRecord.return1MonthDirect),
        return1MonthBenchmark: parseVal(matchedRecord.return1MonthBenchmark),

        return3MonthRegular: parseVal(matchedRecord.return3MonthRegular),
        return3MonthDirect: parseVal(matchedRecord.return3MonthDirect),
        return3MonthBenchmark: parseVal(matchedRecord.return3MonthBenchmark),

        return6MonthRegular: parseVal(matchedRecord.return6MonthRegular),
        return6MonthDirect: parseVal(matchedRecord.return6MonthDirect),
        return6MonthBenchmark: parseVal(matchedRecord.return6MonthBenchmark),

        // Core Annualized / CAGR returns
        return1YearRegular: parseVal(matchedRecord.return1YearRegular),
        return1YearDirect: parseVal(matchedRecord.return1YearDirect),
        return1YearBenchmark: parseVal(matchedRecord.return1YearBenchmark),

        return3YearRegular: parseVal(matchedRecord.return3YearRegular),
        return3YearDirect: parseVal(matchedRecord.return3YearDirect),
        return3YearBenchmark: parseVal(matchedRecord.return3YearBenchmark),

        return5YearRegular: parseVal(matchedRecord.return5YearRegular),
        return5YearDirect: parseVal(matchedRecord.return5YearDirect),
        return5YearBenchmark: parseVal(matchedRecord.return5YearBenchmark),

        return10YearRegular: parseVal(matchedRecord.return10YearRegular),
        return10YearDirect: parseVal(matchedRecord.return10YearDirect),
        return10YearBenchmark: parseVal(matchedRecord.return10YearBenchmark),

        returnSinceLaunchRegular: parseVal(matchedRecord.returnSinceLaunchRegular),
        returnSinceLaunchDirect: parseVal(matchedRecord.returnSinceLaunchDirect),
        returnSinceLaunchBenchmarkRegular: parseVal(matchedRecord.returnSinceLaunchBenchmarkRegular),
        returnSinceLaunchBenchmarkDirect: parseVal(matchedRecord.returnSinceLaunchBenchmarkDirect),

        // AUM
        dailyAUMRaw: parseVal(matchedRecord.dailyAUM),
        dailyAUMFormatted: this.formatAUM(matchedRecord.dailyAUM),

        // Information Ratios
        ir1YrRegular: parseVal(matchedRecord.ir1YrRegular),
        ir1YrDirect: parseVal(matchedRecord.ir1YrDirect),
        ir3YrRegular: parseVal(matchedRecord.ir3YrRegular),
        ir3YrDirect: parseVal(matchedRecord.ir3YrDirect),
        ir5YrRegular: parseVal(matchedRecord.ir5YrRegular),
        ir5YrDirect: parseVal(matchedRecord.ir5YrDirect),
        ir10YrRegular: parseVal(matchedRecord.ir10YrRegular),
        ir10YrDirect: parseVal(matchedRecord.ir10YrDirect),

        status: 'MATCHED',
        reportDate,
        lastUpdated
      };
    });

    return normalizedFunds;
  }

  /**
   * Internal worker function to execute fresh AMFI fetch
   */
  async _executeFreshFetch() {
    logger.info('Initiating fresh AMFI data fetch...');
    const reportDate = await this.discoverLatestReportDate();
    const categoryResults = await this.fetchAllCategoriesFromAmfi(reportDate);
    const funds = this.processAndMapFunds(categoryResults, reportDate);

    const matchedCount = funds.filter(f => f.status === 'MATCHED').length;
    const unavailableCount = funds.filter(f => f.status === 'UNAVAILABLE').length;

    this.cache = {
      funds,
      reportDate,
      lastUpdated: new Date().toISOString(),
      matchedCount,
      unavailableCount,
      totalCount: funds.length
    };
    this.cacheTimestamp = Date.now();

    logger.info(`AMFI Data Fetch completed successfully. Matched: ${matchedCount}/34, Unavailable: ${unavailableCount}/34.`);
    return this.cache;
  }

  /**
   * Get Funds Data (Cached or Fresh) with Request Deduplication
   */
  async getFunds(forceRefresh = false) {
    const now = Date.now();
    const isCacheValid = this.cache && (now - this.cacheTimestamp < AMFI_CACHE_TTL * 1000);

    if (!forceRefresh && isCacheValid) {
      return {
        ...this.cache,
        isCached: true
      };
    }

    // In-flight request deduplication
    if (this.inFlightPromise) {
      logger.info('Re-using existing in-flight AMFI request promise...');
      const cacheResult = await this.inFlightPromise;
      return {
        ...cacheResult,
        isCached: false
      };
    }

    this.inFlightPromise = (async () => {
      try {
        const result = await this._executeFreshFetch();
        return result;
      } catch (err) {
        logger.error(`Error during fresh AMFI fetch: ${err.message}`);
        // Fallback to old cache if available
        if (this.cache) {
          logger.warn('Serving stale cached AMFI data due to fetch error');
          return {
            ...this.cache,
            isCached: true,
            warning: 'AMFI data is temporarily unavailable. Showing most recent cached data.'
          };
        }
        throw new Error('AMFI data is temporarily unavailable.');
      } finally {
        this.inFlightPromise = null;
      }
    })();

    const result = await this.inFlightPromise;
    return {
      ...result,
      isCached: false
    };
  }
}

module.exports = new AmfiService();
