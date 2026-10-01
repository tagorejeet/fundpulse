/**
 * SIP Controller for FundPulse API
 */

const amfiService = require('../services/amfiService');
const sipEngine = require('../utils/sipEngine');
const logger = require('../utils/logger');
const { MASTER_ALLOWLIST } = require('../config/masterList');

/**
 * POST /api/sip/calculate
 * Calculate SIP returns for one or more funds across 1Y, 2Y, 3Y, 5Y, 10Y
 */
const calculateSip = async (req, res) => {
  try {
    const {
      ids = [],
      monthlySip = 10000,
      calculationDate = null,
      sipDay = 25,
      plan = 'regular'
    } = req.body;

    await amfiService.initializeMasterRegistry();

    const numericSip = Math.max(100, Number(monthlySip) || 10000);
    const numericSipDay = Math.min(28, Math.max(1, parseInt(sipDay, 10) || 25));
    const isDirect = String(plan).toLowerCase() === 'direct';

    // Parse calculation date or default to amfiService.reportDate
    let resolvedCalcDate = calculationDate;
    if (!resolvedCalcDate) {
      resolvedCalcDate = amfiService.reportDate || new Date().toISOString().split('T')[0];
    }

    if (!ids || ids.length === 0) {
      return res.json({
        success: true,
        data: {
          results: [],
          monthlySip: numericSip,
          calculationDate: resolvedCalcDate,
          sipDay: numericSipDay,
          plan: isDirect ? 'direct' : 'regular'
        }
      });
    }

    // Resolve matching schemes with robust fallback
    const matchedSchemes = ids
      .map(id => {
        let scheme = amfiService.schemeMap.get(id);
        if (!scheme) {
          scheme = amfiService.masterSchemes.find(s => 
            s.id === id || 
            s.id.replace(/-fund-/g, '-') === id.replace(/-fund-/g, '-') ||
            (s.displayName && s.displayName.toLowerCase().replace(/[^a-z0-9]/g, '') === String(id).toLowerCase().replace(/[^a-z0-9]/g, ''))
          );
        }
        if (!scheme) {
          const allowMatch = MASTER_ALLOWLIST.find(a => 
            a.id === id || 
            a.id.replace(/-fund-/g, '-') === id.replace(/-fund-/g, '-') ||
            (a.displayName && a.displayName.toLowerCase().replace(/[^a-z0-9]/g, '') === String(id).toLowerCase().replace(/[^a-z0-9]/g, ''))
          );
          if (allowMatch) {
            scheme = {
              id: allowMatch.id,
              displayName: allowMatch.displayName,
              amfiSchemeName: allowMatch.amfiSchemeName,
              category: allowMatch.category,
              amcName: allowMatch.amcName,
              regularSchemeCode: allowMatch.regularSchemeCode,
              directSchemeCode: allowMatch.directSchemeCode
            };
          }
        }
        return scheme;
      })
      .filter(Boolean);

    if (matchedSchemes.length === 0) {
      return res.json({
        success: true,
        data: {
          results: ids.map(id => ({
            fundId: id,
            displayName: id,
            plan: isDirect ? 'Direct' : 'Regular',
            error: 'Scheme not found in registry',
            returns: { return1Yr: null, return2Yr: null, return3Yr: null, return5Yr: null, return10Yr: null }
          })),
          total: ids.length,
          monthlySip: numericSip,
          calculationDate: resolvedCalcDate,
          sipDay: numericSipDay,
          plan: isDirect ? 'direct' : 'regular',
          reportDate: amfiService.reportDate
        }
      });
    }

    // Compute SIP returns for each scheme
    const results = await Promise.all(
      matchedSchemes.map(async (scheme) => {
        try {
          const schemeCode = (isDirect ? scheme.directSchemeCode : scheme.regularSchemeCode) || scheme.regularSchemeCode || scheme.directSchemeCode;
          
          if (!schemeCode) {
            return {
              fundId: scheme.id,
              displayName: scheme.displayName,
              amfiSchemeName: scheme.amfiSchemeName,
              category: scheme.category,
              amcName: scheme.amcName,
              plan: isDirect ? 'Direct' : 'Regular',
              error: 'Scheme code not available for chosen plan',
              returns: { return1Yr: null, return2Yr: null, return3Yr: null, return5Yr: null, return10Yr: null }
            };
          }

          const rawNavList = await amfiService.getNavHistory(schemeCode);

          if (!rawNavList || rawNavList.length === 0) {
            return {
              fundId: scheme.id,
              displayName: scheme.displayName,
              amfiSchemeName: scheme.amfiSchemeName,
              category: scheme.category,
              amcName: scheme.amcName,
              plan: isDirect ? 'Direct' : 'Regular',
              error: 'Historical NAV records temporarily unavailable for calculation',
              returns: { return1Yr: null, return2Yr: null, return3Yr: null, return5Yr: null, return10Yr: null }
            };
          }

          const fundSipResult = sipEngine.calculateFullFundSip({
            fund: scheme,
            rawNavList,
            monthlySipAmount: numericSip,
            calculationDate: resolvedCalcDate,
            preferredSipDay: numericSipDay,
            plan: isDirect ? 'Direct' : 'Regular'
          });

          return fundSipResult;
        } catch (err) {
          logger.error(`Error calculating SIP for scheme ${scheme.id}:`, err);
          return {
            fundId: scheme.id,
            displayName: scheme.displayName,
            amfiSchemeName: scheme.amfiSchemeName,
            category: scheme.category,
            amcName: scheme.amcName,
            plan: isDirect ? 'Direct' : 'Regular',
            error: err.message,
            returns: { return1Yr: null, return2Yr: null, return3Yr: null, return5Yr: null, return10Yr: null }
          };
        }
      })
    );

    res.json({
      success: true,
      data: {
        results,
        total: results.length,
        monthlySip: numericSip,
        calculationDate: resolvedCalcDate,
        sipDay: numericSipDay,
        plan: isDirect ? 'direct' : 'regular',
        reportDate: amfiService.reportDate
      }
    });
  } catch (error) {
    logger.error('Error calculating SIP in controller:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate SIP returns.',
      message: error.message
    });
  }
};

/**
 * GET /api/sip/nav-history/:id
 * Retrieve historical NAV series for client-side calculation caching
 */
const getNavHistoryForFund = async (req, res) => {
  try {
    const { id } = req.params;
    const { plan = 'regular' } = req.query;

    await amfiService.initializeMasterRegistry();
    const scheme = amfiService.schemeMap.get(id);

    if (!scheme) {
      return res.status(404).json({
        success: false,
        error: 'Scheme not found.'
      });
    }

    const isDirect = String(plan).toLowerCase() === 'direct';
    const schemeCode = (isDirect ? scheme.directSchemeCode : scheme.regularSchemeCode) || scheme.regularSchemeCode || scheme.directSchemeCode;

    if (!schemeCode) {
      return res.status(404).json({
        success: false,
        error: 'Scheme code not available for this plan.'
      });
    }

    const navList = await amfiService.getNavHistory(schemeCode);

    res.json({
      success: true,
      data: {
        fundId: scheme.id,
        schemeCode,
        plan: isDirect ? 'Direct' : 'Regular',
        dataCount: navList.length,
        navHistory: navList
      }
    });
  } catch (error) {
    logger.error(`Error fetching NAV history for ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve NAV history.',
      message: error.message
    });
  }
};

module.exports = {
  calculateSip,
  getNavHistoryForFund
};
