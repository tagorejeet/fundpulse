/**
 * Express Controller for FundPulse API
 */

const amfiService = require('../services/amfiService');
const logger = require('../utils/logger');

/**
 * GET /api/funds
 * Returns paginated schemes with optional category, search, and plan selection
 */
const getFunds = async (req, res) => {
  try {
    const { category, search, plan = 'regular', page = 1, limit = 50, customDays = 33, startDate, endDate } = req.query;
    
    const result = await amfiService.getFunds({
      category,
      search,
      plan,
      page,
      limit,
      customDays,
      startDate,
      endDate
    });

    const categories = await amfiService.getCategories();

    res.json({
      success: true,
      data: {
        funds: result.funds,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        categories,
        reportDate: result.reportDate,
        lastUpdated: result.lastUpdated
      }
    });
  } catch (error) {
    logger.error('Error fetching funds in controller:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve mutual fund schemes.',
      message: error.message
    });
  }
};

/**
 * POST /api/funds/batch
 * Resolves full data & calculated returns for Custom Fund List schemes
 */
const getBatchFunds = async (req, res) => {
  try {
    const { ids = [], plan = 'regular', customDays = 33, startDate, endDate } = req.body;

    const result = await amfiService.getBatchFunds({
      ids,
      plan,
      customDays,
      startDate,
      endDate
    });

    res.json({
      success: true,
      data: {
        funds: result.funds,
        total: result.total,
        reportDate: result.reportDate,
        lastUpdated: result.lastUpdated
      }
    });
  } catch (error) {
    logger.error('Error fetching batch funds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve batch fund details.',
      message: error.message
    });
  }
};

/**
 * GET /api/funds/:id
 * Returns single fund details
 */
const getFundById = async (req, res) => {
  try {
    const { id } = req.params;
    const { plan = 'regular', customDays = 33, startDate, endDate } = req.query;

    const scheme = amfiService.schemeMap.get(id);

    if (!scheme) {
      return res.status(404).json({
        success: false,
        error: 'Fund scheme not found.'
      });
    }

    const computed = await amfiService.computeReturnsForScheme(scheme, plan, customDays, startDate, endDate);

    res.json({
      success: true,
      data: {
        fund: {
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
          return15D: computed.return15D,
          return30D: computed.return30D,
          return45D: computed.return45D,
          return60D: computed.return60D,
          return180D: computed.return180D,
          returnCustomD: computed.returnCustomD,
          customDays: computed.customDays
        },
        reportDate: amfiService.reportDate,
        lastUpdated: amfiService.lastUpdated
      }
    });
  } catch (error) {
    logger.error(`Error fetching fund ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve fund details.',
      message: error.message
    });
  }
};

/**
 * GET /api/categories
 * Returns list of all categories and fund counts
 */
const getCategories = async (req, res) => {
  try {
    const categories = await amfiService.getCategories();
    res.json({
      success: true,
      data: {
        categories,
        totalCategories: categories.length,
        totalFunds: amfiService.masterSchemes.length
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
 * Service health check
 */
const getHealth = async (req, res) => {
  try {
    res.json({
      success: true,
      status: 'UP',
      service: 'FundPulse Backend API',
      totalSchemesRegistered: amfiService.masterSchemes.length,
      cachedReportDate: amfiService.reportDate,
      lastCacheUpdate: amfiService.lastUpdated,
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
 * Force manual refresh of AMFI data & clear NAV cache
 */
const refreshData = async (req, res) => {
  try {
    logger.info('Manual AMFI refresh requested');
    amfiService.isInitialized = false;
    amfiService.navHistoryCache.clear();
    await amfiService.initializeMasterRegistry();

    res.json({
      success: true,
      message: 'AMFI data and NAV history successfully refreshed.',
      data: {
        totalSchemes: amfiService.masterSchemes.length,
        reportDate: amfiService.reportDate,
        lastUpdated: amfiService.lastUpdated
      }
    });
  } catch (error) {
    logger.error('Manual refresh failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh AMFI data.',
      message: error.message
    });
  }
};

module.exports = {
  getFunds,
  getBatchFunds,
  getFundById,
  getCategories,
  getHealth,
  refreshData
};
