/**
 * Official NSE Benchmark Indices Service
 * Sourced directly from official NSE Indices Limited (niftyindices.com)
 * 
 * Formula:
 * Annualized Return = 4 * ((VT / V0)^(1 / (4 * T)) - 1) * 100
 * where T = 1, 2, 3, 5, 10 years
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { NSE_INDICES } = require('../config/nseConfig');

const CACHE_DIR = path.join(__dirname, '../cache');
const CACHE_FILE = path.join(CACHE_DIR, 'nse_indices_cache.json');
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// In-memory cache
let memoryCache = {
  data: {}, // indexId -> array of daily records (newest to oldest)
  lastUpdated: null,
  isCached: false
};

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  } catch (err) {
    logger.error('Failed to create cache dir:', err.message);
  }
}

// Load cache from disk if available
function loadDiskCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.data) {
        // Rehydrate date objects
        for (const key of Object.keys(parsed.data)) {
          if (Array.isArray(parsed.data[key])) {
            parsed.data[key].forEach(r => {
              r.date = new Date(r.date);
            });
          }
        }
        memoryCache = parsed;
        memoryCache.isCached = true;
        logger.info(`Loaded NSE index cache from disk. Last updated: ${memoryCache.lastUpdated}`);
      }
    }
  } catch (err) {
    logger.warn('Could not read NSE disk cache:', err.message);
  }
}
loadDiskCache();

function saveDiskCache() {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(memoryCache), 'utf-8');
  } catch (err) {
    logger.warn('Could not save NSE cache to disk:', err.message);
  }
}

// Format Date object to DD-MMM-YYYY (e.g. 15-Jan-2024) for niftyindices endpoint
function formatToNseApiDate(d) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

// Parse date string (e.g. "15 Jan 2024" or "2024-01-15" or "15-01-2024") into Date object
function parseAnyDate(str) {
  if (!str) return null;
  const s = String(str).trim();

  // Format: "15 Jan 2024" or "15-Jan-2024"
  const spaceParts = s.split(/[\s-]+/);
  if (spaceParts.length === 3) {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    // Could be DD MMM YYYY
    const mIdx = months.indexOf(spaceParts[1].toLowerCase());
    if (mIdx !== -1) {
      const day = parseInt(spaceParts[0], 10);
      const year = parseInt(spaceParts[2], 10);
      return new Date(year, mIdx, day);
    }
    // Could be YYYY MM DD
    if (spaceParts[0].length === 4) {
      return new Date(parseInt(spaceParts[0], 10), parseInt(spaceParts[1], 10) - 1, parseInt(spaceParts[2], 10));
    }
    // Could be DD MM YYYY
    if (spaceParts[2].length === 4) {
      return new Date(parseInt(spaceParts[2], 10), parseInt(spaceParts[1], 10) - 1, parseInt(spaceParts[0], 10));
    }
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateStandard(d) {
  if (!d || isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

// Fetch official historical records from niftyindices.com
async function fetchOfficialNseIndexHistory(indexName, fromStr, toStr) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      cinfo: JSON.stringify({
        name: indexName,
        startDate: fromStr,
        endDate: toStr,
        indexName: indexName
      })
    });

    const req = https.request({
      hostname: 'www.niftyindices.com',
      path: '/BackPage/getHistoricaldatatabletoString',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.niftyindices.com/reports/historical-data',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 15000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (Array.isArray(json)) {
            // Normalize records
            const parsedRecords = json.map(r => {
              const d = parseAnyDate(r.HistoricalDate);
              return {
                rawDate: r.HistoricalDate,
                date: d,
                dateStr: formatDateStandard(d),
                open: parseFloat(r.OPEN) || null,
                high: parseFloat(r.HIGH) || null,
                low: parseFloat(r.LOW) || null,
                close: parseFloat(r.CLOSE) || null,
                indexName: r.INDEX_NAME || indexName
              };
            }).filter(r => r.date && r.close !== null && !isNaN(r.close));

            // Sort newest to oldest
            parsedRecords.sort((a, b) => b.date - a.date);
            resolve(parsedRecords);
          } else {
            resolve([]);
          }
        } catch (e) {
          reject(new Error(`Failed to parse NSE JSON response: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('NSE request timed out'));
    });

    req.write(payload);
    req.end();
  });
}

// Prime / Refresh all 4 indices
async function refreshAllNseIndices(force = false) {
  const now = Date.now();
  if (!force && memoryCache.lastUpdated && (now - new Date(memoryCache.lastUpdated).getTime() < CACHE_TTL_MS)) {
    return memoryCache;
  }

  logger.info('Refreshing official NSE indices data from niftyindices.com...');
  const fromDate = '01-Jan-2014';
  const today = new Date();
  const toDate = formatToNseApiDate(today);

  const errors = [];
  for (const item of NSE_INDICES) {
    try {
      const records = await fetchOfficialNseIndexHistory(item.id, fromDate, toDate);
      if (records && records.length > 0) {
        memoryCache.data[item.id] = records;
        logger.info(`Fetched official ${item.id} records: ${records.length} days`);
      }
    } catch (err) {
      logger.error(`Error fetching official data for ${item.id}:`, err.message);
      errors.push({ id: item.id, error: err.message });
    }
  }

  if (Object.keys(memoryCache.data).length > 0) {
    memoryCache.lastUpdated = new Date().toISOString();
    memoryCache.isCached = false;
    saveDiskCache();
  }

  return memoryCache;
}

// User-specified formula: Annualized Return = 4 * ((VT / V0)^(1 / (4 * T)) - 1) * 100
function calculateFormulaReturn(V0, VT, T) {
  if (!V0 || !VT || V0 <= 0 || VT <= 0 || !T || T <= 0) return null;
  const ratio = VT / V0;
  const exponent = 1 / (4 * T);
  const val = 4 * (Math.pow(ratio, exponent) - 1);
  const result = val * 100;
  if (isNaN(result) || !isFinite(result)) return null;
  return Number(result.toFixed(2));
}

// User-specified Day Calculation formula: Annualized Return = 4 * ((VT / V0)^(365 / (4 * D)) - 1) * 100
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
      .split(/[,\s]+/)
      .map(d => parseInt(d.trim(), 10))
      .filter(d => !isNaN(d) && d > 0);
  } else if (typeof customDays === 'number' && customDays > 0) {
    daysList = [customDays];
  }
  return daysList.length > 0 ? Array.from(new Set(daysList)) : [33, 50, 67];
}

// Find latest available trading record ON OR BEFORE targetDate (never future)
function getLatestTradingRecordOnOrBefore(records, targetDate) {
  if (!records || records.length === 0 || !targetDate) return null;
  const targetTime = targetDate.getTime();
  // records are sorted newest to oldest
  for (const r of records) {
    const recordTime = (r.date instanceof Date) ? r.date.getTime() : new Date(r.date).getTime();
    if (recordTime <= targetTime) {
      return r;
    }
  }
  return null;
}

// Compute calendar year target date
function getCalendarYearTargetDate(baseDate, yearsBack) {
  const d = new Date(baseDate.getTime());
  const year = d.getFullYear() - yearsBack;
  const month = d.getMonth();
  const day = d.getDate();
  // Safe leap year clamp (e.g. Feb 29 -> Feb 28 in non-leap years)
  const target = new Date(year, month, day);
  if (target.getMonth() !== month) {
    // Clamped over month boundary
    return new Date(year, month + 1, 0); // last day of that month
  }
  return target;
}

/**
 * Get processed NSE indices data for a given valuation/asOf date
 */
/**
 * Get processed NSE indices data for a given valuation/asOf date and optional custom days
 */
async function getNSEIndexData({ asOfDate = null, forceRefresh = false, days = null, customDays = null, startDate = null, endDate = null } = {}) {
  // Ensure data is primed
  if (Object.keys(memoryCache.data).length === 0 || forceRefresh) {
    await refreshAllNseIndices(forceRefresh);
  }

  // Parse user's selected date (defaulting to today)
  let selectedDate = asOfDate ? parseAnyDate(asOfDate) : new Date();
  if (!selectedDate || isNaN(selectedDate.getTime())) {
    selectedDate = new Date();
  }
  // Normalise time to end of day so current day trading date is captured
  selectedDate.setHours(23, 59, 59, 999);

  const daysList = parseDaysList(days || customDays);
  const results = [];

  for (const config of NSE_INDICES) {
    const records = memoryCache.data[config.id] || [];
    if (records.length === 0) {
      results.push({
        ...config,
        status: 'UNAVAILABLE',
        currentValue: null,
        dataDate: null,
        selectedDate: formatDateStandard(selectedDate),
        return1Yr: null,
        return2Yr: null,
        return3Yr: null,
        return5Yr: null,
        return10Yr: null,
        dayReturns: {},
        customDaysList: daysList,
        auditDetails: null
      });
      continue;
    }

    // 1. Current VT: Latest available trading record <= selectedDate
    const currentRecord = getLatestTradingRecordOnOrBefore(records, selectedDate);
    if (!currentRecord) {
      results.push({
        ...config,
        status: 'NO_DATA_BEFORE_SELECTED_DATE',
        currentValue: null,
        dataDate: null,
        selectedDate: formatDateStandard(selectedDate),
        return1Yr: null,
        return2Yr: null,
        return3Yr: null,
        return5Yr: null,
        return10Yr: null,
        dayReturns: {},
        customDaysList: daysList,
        auditDetails: null
      });
      continue;
    }

    const VT = currentRecord.close;
    const actualDataDate = currentRecord.dateStr;

    // Previous day record for calculating daily change
    const currentIndex = records.indexOf(currentRecord);
    const prevDayRecord = (currentIndex + 1 < records.length) ? records[currentIndex + 1] : null;
    let dayChange = null;
    let dayChangePct = null;
    if (prevDayRecord && prevDayRecord.close) {
      dayChange = Number((VT - prevDayRecord.close).toFixed(2));
      dayChangePct = Number(((dayChange / prevDayRecord.close) * 100).toFixed(2));
    }

    // Calculate returns for 1Y, 2Y, 3Y, 5Y, 10Y
    const periods = [
      { key: 'return1Yr', T: 1, label: '1Y' },
      { key: 'return2Yr', T: 2, label: '2Y' },
      { key: 'return3Yr', T: 3, label: '3Y' },
      { key: 'return5Yr', T: 5, label: '5Y' },
      { key: 'return10Yr', T: 10, label: '10Y' }
    ];

    const returns = {};
    const auditDetails = {};

    for (const p of periods) {
      const targetHistoricalDate = getCalendarYearTargetDate(selectedDate, p.T);
      const historicalRecord = getLatestTradingRecordOnOrBefore(records, targetHistoricalDate);

      if (historicalRecord && historicalRecord.close) {
        const V0 = historicalRecord.close;
        const returnPct = calculateFormulaReturn(V0, VT, p.T);
        returns[p.key] = returnPct;
        auditDetails[p.label] = {
          T: p.T,
          targetDate: formatDateStandard(targetHistoricalDate),
          actualDate: historicalRecord.dateStr,
          V0: V0,
          VT: VT,
          formula: `4 * ((${VT} / ${V0})^(1 / (4 * ${p.T})) - 1)`,
          returnPct: returnPct
        };
      } else {
        returns[p.key] = null;
        auditDetails[p.label] = {
          T: p.T,
          targetDate: formatDateStandard(targetHistoricalDate),
          actualDate: null,
          V0: null,
          VT: VT,
          formula: 'N/A',
          returnPct: null,
          note: 'Historical data not available for this period'
        };
      }
    }

    // Calculate Day Returns for each D in customDaysList
    const dayReturns = {};
    for (const D of daysList) {
      const targetDayDate = new Date(selectedDate.getTime() - D * 24 * 3600 * 1000);
      const dayRecord = getLatestTradingRecordOnOrBefore(records, targetDayDate);

      if (dayRecord && dayRecord.close) {
        const V0 = dayRecord.close;
        const dayReturn = calculateDayFormulaReturn(V0, VT, D);
        dayReturns[D] = dayReturn;
        dayReturns[`${D}`] = dayReturn;
        returns[`return${D}d`] = dayReturn;
        returns[`return_${D}d`] = dayReturn;
        returns[`dayReturn${D}d`] = dayReturn;
        auditDetails[`${D}D`] = {
          D,
          targetDate: formatDateStandard(targetDayDate),
          actualDate: dayRecord.dateStr,
          V0,
          VT,
          formula: `4 * ((${VT} / ${V0})^(365 / (4 * ${D})) - 1)`,
          returnPct: dayReturn
        };
      } else {
        dayReturns[D] = null;
        dayReturns[`${D}`] = null;
        returns[`return${D}d`] = null;
        returns[`return_${D}d`] = null;
        returns[`dayReturn${D}d`] = null;
      }
    }

    results.push({
      ...config,
      status: 'AVAILABLE',
      currentValue: VT,
      open: currentRecord.open,
      high: currentRecord.high,
      low: currentRecord.low,
      previousClose: prevDayRecord ? prevDayRecord.close : null,
      dayChange: dayChange,
      dayChangePct: dayChangePct,
      dataDate: actualDataDate,
      selectedDate: formatDateStandard(selectedDate),
      ...returns,
      dayReturns,
      customDaysList: daysList,
      auditDetails: auditDetails
    });
  }

  return {
    success: true,
    source: 'NSE India / NSE Indices',
    selectedDate: formatDateStandard(selectedDate),
    customDaysList: daysList,
    lastUpdated: memoryCache.lastUpdated,
    isCached: memoryCache.isCached,
    indices: results
  };
}

/**
 * Returns historical daily records for an NSE index formatted for SIP & NAV charts
 */
function getHistoricalRecordsForIndex(indexId) {
  if (!indexId) return null;
  const cleanId = String(indexId).toLowerCase().trim().replace(/[^a-z0-9]/g, '');

  const matched = NSE_INDICES.find(i => {
    const rawId = i.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    const disp = i.displayName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const off = i.officialName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return rawId === cleanId || disp === cleanId || off === cleanId ||
      cleanId.includes(rawId) || rawId.includes(cleanId);
  });

  if (!matched) return null;

  const records = memoryCache.data[matched.id] || [];
  return {
    index: matched,
    records: records.map(r => ({
      date: r.dateStr,
      dateObj: r.date,
      nav: r.close
    }))
  };
}

module.exports = {
  getNSEIndexData,
  refreshAllNseIndices,
  calculateFormulaReturn,
  calculateDayFormulaReturn,
  getLatestTradingRecordOnOrBefore,
  formatDateStandard,
  parseAnyDate,
  getHistoricalRecordsForIndex,
  parseDaysList
};
