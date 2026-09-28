/**
 * Express Controller for FundPulse API
 */

const amfiService = require('../services/amfiService');
const { MASTER_CATEGORIES, MASTER_ALLOWLIST } = require('../config/masterList');
const logger = require('../utils/logger');

/**
 * GET /api/funds
 * Returns all 34 tracked funds, with optional category and search filters.
 */
const getFunds = async (req, res) => {
  try {
    const { category, search } = req.query;
    const data = await amfiService.getFunds(false);

    let funds = [...data.funds];

    // Filter by Category
    if (category && category.trim().toLowerCase() !== 'all') {
      const targetCat = category.trim().toLowerCase();
      funds = funds.filter(f => f.category.toLowerCase() === targetCat);
    }

    // Filter by Search Query (Strictly within the 34 funds)
    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      funds = funds.filter(f => 
        f.displayName.toLowerCase().includes(q) ||
        f.amcName.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q) ||
        (f.benchmark && f.benchmark.toLowerCase().includes(q))
      );
    }

    res.json({
      success: true,
      data: {
        funds,
        total: funds.length,
        masterTotal: MASTER_ALLOWLIST.length,
        reportDate: data.reportDate,
        lastUpdated: data.lastUpdated,
        isCached: data.isCached,
        matchedCount: data.matchedCount,
        unavailableCount: data.unavailableCount,
        warning: data.warning || null
      }
    });
  } catch (error) {
    logger.error('Error fetching funds in controller:', error);
    res.status(503).json({
      success: false,
      error: 'AMFI data is temporarily unavailable.',
      message: error.message
    });
  }
};

/**
 * GET /api/funds/:id
 * Returns single fund by stable internal ID
 */
const getFundById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await amfiService.getFunds(false);
    const fund = data.funds.find(f => f.id === id);

    if (!fund) {
      return res.status(404).json({
        success: false,
        error: 'Fund not found in the master 34-fund allowlist.'
      });
    }

    res.json({
      success: true,
      data: {
        fund,
        reportDate: data.reportDate,
        lastUpdated: data.lastUpdated,
        isCached: data.isCached
      }
    });
  } catch (error) {
    logger.error(`Error fetching fund ${req.params.id}:`, error);
    res.status(503).json({
      success: false,
      error: 'AMFI data is temporarily unavailable.',
      message: error.message
    });
  }
};

/**
 * GET /api/categories
 * Returns list of 8 tracked categories and counts
 */
const getCategories = async (req, res) => {
  try {
    const data = await amfiService.getFunds(false);

    const categories = MASTER_CATEGORIES.map(cat => {
      const count = data.funds.filter(f => f.category.toLowerCase() === cat.name.toLowerCase()).length;
      return {
        id: cat.id,
        name: cat.name,
        subCategoryId: cat.subCategoryId,
        count
      };
    });

    res.json({
      success: true,
      data: {
        categories,
        totalCategories: categories.length,
        totalFunds: data.funds.length
      }
    });
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve categories.'
    });
  }
};

/**
 * GET /api/health
 * Service health & AMFI connectivity check
 */
const getHealth = async (req, res) => {
  try {
    const cacheInfo = amfiService.cache;
    res.json({
      success: true,
      status: 'UP',
      service: 'FundPulse Backend API',
      amfiProvider: 'AMFI India Gateway',
      masterAllowlistCount: MASTER_ALLOWLIST.length,
      cachedReportDate: cacheInfo ? cacheInfo.reportDate : null,
      lastCacheUpdate: cacheInfo ? cacheInfo.lastUpdated : null,
      matchedCount: cacheInfo ? cacheInfo.matchedCount : 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'DOWN',
      error: error.message
    });
  }
};

/**
 * POST /api/refresh
 * Force manual refresh of AMFI data
 */
const refreshData = async (req, res) => {
  try {
    logger.info('Manual AMFI cache refresh requested');
    const data = await amfiService.getFunds(true);

    res.json({
      success: true,
      message: 'AMFI data successfully refreshed from source.',
      data: {
        reportDate: data.reportDate,
        lastUpdated: data.lastUpdated,
        matchedCount: data.matchedCount,
        unavailableCount: data.unavailableCount,
        totalCount: data.totalCount,
        isCached: data.isCached
      }
    });
  } catch (error) {
    logger.error('Manual refresh failed:', error);
    res.status(503).json({
      success: false,
      error: 'AMFI data is temporarily unavailable.',
      message: error.message
    });
  }
};

module.exports = {
  getFunds,
  getFundById,
  getCategories,
  getHealth,
  refreshData
};
