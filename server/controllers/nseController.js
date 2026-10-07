/**
 * Official NSE Benchmark Indices Controller
 */

const nseService = require('../services/nseService');
const logger = require('../utils/logger');
const { NSE_INDICES } = require('../config/nseConfig');

/**
 * GET /api/nse/indices
 * Returns official benchmark indices data with formula returns for a given date
 */
async function getIndices(req, res) {
  try {
    const asOfDate = req.query.date || req.query.asOfDate || null;
    const forceRefresh = req.query.refresh === 'true';
    const days = req.query.days || req.query.customDays || null;
    const startDate = req.query.startDate || null;
    const endDate = req.query.endDate || null;

    const data = await nseService.getNSEIndexData({ asOfDate, forceRefresh, days, startDate, endDate });
    return res.json({
      success: true,
      ...data
    });
  } catch (err) {
    logger.error('Error fetching NSE index data:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch official NSE index data',
      message: err.message
    });
  }
}

/**
 * GET /api/nse/indices/:id
 * Returns single index details including full audit breakdown
 */
async function getIndexById(req, res) {
  try {
    const { id } = req.params;
    const asOfDate = req.query.date || req.query.asOfDate || null;

    const data = await nseService.getNSEIndexData({ asOfDate });
    const match = data.indices.find(i => 
      i.id.toLowerCase() === id.toLowerCase() || 
      i.displayName.toLowerCase() === id.toLowerCase() ||
      i.officialName.toLowerCase() === id.toLowerCase()
    );

    if (!match) {
      return res.status(404).json({
        success: false,
        error: `NSE Index '${id}' not found`
      });
    }

    return res.json({
      success: true,
      source: data.source,
      selectedDate: data.selectedDate,
      index: match
    });
  } catch (err) {
    logger.error(`Error fetching NSE index ${req.params.id}:`, err);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch official NSE index',
      message: err.message
    });
  }
}

/**
 * POST /api/nse/refresh
 * Forces fresh fetch of historical data directly from official NSE
 */
async function refreshData(req, res) {
  try {
    logger.info('Manual refresh triggered for official NSE index data');
    const refreshResult = await nseService.refreshAllNseIndices(true);
    return res.json({
      success: true,
      message: 'Official NSE index data refreshed successfully',
      lastUpdated: refreshResult.lastUpdated,
      indicesCount: Object.keys(refreshResult.data).length
    });
  } catch (err) {
    logger.error('Error refreshing NSE index data:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to refresh official NSE data',
      message: err.message
    });
  }
}

module.exports = {
  getIndices,
  getIndexById,
  refreshData
};
