/**
 * Server Logger Utility for FundPulse
 */

const logger = {
  info: (message, meta = {}) => {
    console.log(`[INFO] [${new Date().toISOString()}] ${message}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
  },
  warn: (message, meta = {}) => {
    console.warn(`[WARN] [${new Date().toISOString()}] ${message}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
  },
  error: (message, meta = {}) => {
    console.error(`[ERROR] [${new Date().toISOString()}] ${message}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
  },
  amfiRequestLog: ({ category, subCategoryId, reportDate, status, totalRecords, matchedCount, missingCount, responseTimeMs, error }) => {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      category,
      subCategoryId,
      reportDate,
      httpStatus: status,
      totalRecords,
      matchedCount,
      missingCount,
      responseTimeMs: `${responseTimeMs}ms`,
      error: error ? error.message || error : null
    };
    console.log(`[AMFI FETCH] [${timestamp}] SubCat ${subCategoryId} (${category}) -> Status: ${status}, Recs: ${totalRecords}, Matched: ${matchedCount}, Missing: ${missingCount}, Time: ${responseTimeMs}ms`);
  }
};

module.exports = logger;
