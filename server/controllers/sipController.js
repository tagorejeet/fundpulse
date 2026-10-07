/**
 * SIP Controller for FundPulse API
 */

const amfiService = require('../services/amfiService');
const nseService = require('../services/nseService');
const { NSE_INDICES } = require('../config/nseConfig');
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
      monthlySip = 100000,
      calculationDate = null,
      sipDay = 25,
      plan = 'regular'
    } = req.body;

    await amfiService.initializeMasterRegistry();

    const numericSip = Math.max(100, Number(monthlySip) || 100000);
    const numericSipDay = Math.min(31, Math.max(1, parseInt(sipDay, 10) || 25));
    const isBoth = String(plan).toLowerCase() === 'both';
    const isDirect = String(plan).toLowerCase() === 'direct';
    const planModes = isBoth ? ['regular', 'direct'] : [isDirect ? 'direct' : 'regular'];

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
          plan: isBoth ? 'both' : isDirect ? 'direct' : 'regular'
        }
      });
    }

    // Resolve matching schemes (including official NSE Benchmark Indices)
    const matchedSchemes = ids
      .map(id => {
        const cleanId = String(id).replace(/-reg$/, '').replace(/-dir$/, '');
        
        // 1. Check if it's an official NSE benchmark index
        const nseMatch = NSE_INDICES.find(i => 
          i.id.toLowerCase() === String(cleanId).toLowerCase() ||
          i.id.toLowerCase().replace(/[^a-z0-9]/g, '-') === String(cleanId).toLowerCase().replace(/[^a-z0-9]/g, '-') ||
          i.displayName.toLowerCase() === String(cleanId).toLowerCase() ||
          i.officialName.toLowerCase() === String(cleanId).toLowerCase()
        );
        if (nseMatch) {
          return {
            id: nseMatch.id,
            displayName: nseMatch.displayName,
            amfiSchemeName: nseMatch.officialName,
            category: nseMatch.category || 'NSE Benchmark',
            amcName: 'NSE Indices Limited',
            isNseIndex: true
          };
        }

        // 2. Check AMFI schemes
        let scheme = amfiService.schemeMap.get(cleanId);
        if (!scheme) {
          scheme = amfiService.masterSchemes.find(s => 
            s.id === cleanId || 
            s.id.replace(/-fund-/g, '-') === cleanId.replace(/-fund-/g, '-') ||
            (s.displayName && s.displayName.toLowerCase().replace(/[^a-z0-9]/g, '') === String(cleanId).toLowerCase().replace(/[^a-z0-9]/g, ''))
          );
        }
        if (!scheme) {
          const allowMatch = MASTER_ALLOWLIST.find(a => 
            a.id === cleanId || 
            a.id.replace(/-fund-/g, '-') === cleanId.replace(/-fund-/g, '-') ||
            (a.displayName && a.displayName.toLowerCase().replace(/[^a-z0-9]/g, '') === String(cleanId).toLowerCase().replace(/[^a-z0-9]/g, ''))
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

    // Deduplicate matched schemes by scheme.id
    const uniqueSchemes = Array.from(new Map(matchedSchemes.map(s => [s.id, s])).values());

    if (uniqueSchemes.length === 0) {
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
          plan: isBoth ? 'both' : isDirect ? 'direct' : 'regular',
          reportDate: amfiService.reportDate
        }
      });
    }

    // Compute SIP returns for each scheme and plan mode
    const nestedResults = await Promise.all(
      uniqueSchemes.map(async (scheme) => {
        // Handle NSE Indices (Benchmark - not split into Regular/Direct)
        if (scheme.isNseIndex) {
          try {
            const nseData = nseService.getHistoricalRecordsForIndex(scheme.id);
            if (!nseData || !nseData.records || nseData.records.length === 0) {
              return [{
                fundId: scheme.id,
                displayName: `${scheme.displayName} (NSE Index)`,
                category: scheme.category || 'NSE Benchmark',
                amcName: scheme.amcName || 'NSE Indices Limited',
                plan: 'Benchmark',
                error: 'NSE historical index values temporarily unavailable',
                returns: { return1Yr: null, return2Yr: null, return3Yr: null, return5Yr: null, return10Yr: null }
              }];
            }

            const fundSipResult = sipEngine.calculateFullFundSip({
              fund: scheme,
              rawNavList: nseData.records,
              monthlySipAmount: numericSip,
              calculationDate: resolvedCalcDate,
              preferredSipDay: numericSipDay,
              plan: 'Benchmark'
            });

            fundSipResult.fundId = scheme.id;
            fundSipResult.displayName = `${scheme.displayName} (NSE Benchmark)`;
            fundSipResult.isNseIndex = true;
            return [fundSipResult];
          } catch (err) {
            logger.error(`Error calculating SIP for NSE index ${scheme.id}:`, err);
            return [{
              fundId: scheme.id,
              displayName: `${scheme.displayName} (NSE Benchmark)`,
              category: scheme.category || 'NSE Benchmark',
              amcName: scheme.amcName || 'NSE Indices Limited',
              plan: 'Benchmark',
              error: err.message,
              returns: { return1Yr: null, return2Yr: null, return3Yr: null, return5Yr: null, return10Yr: null }
            }];
          }
        }

        return Promise.all(
          planModes.map(async (pMode) => {
            const isDir = pMode === 'direct';
            try {
              const schemeCode = (isDir ? scheme.directSchemeCode : scheme.regularSchemeCode) || scheme.regularSchemeCode || scheme.directSchemeCode;
              
              if (!schemeCode) {
                return {
                  fundId: isBoth ? `${scheme.id}-${isDir ? 'dir' : 'reg'}` : scheme.id,
                  displayName: isBoth ? `${scheme.displayName} (${isDir ? 'Direct' : 'Regular'})` : scheme.displayName,
                  amfiSchemeName: scheme.amfiSchemeName,
                  category: scheme.category,
                  amcName: scheme.amcName,
                  plan: isDir ? 'Direct' : 'Regular',
                  error: 'Scheme code not available for chosen plan',
                  returns: { return1Yr: null, return2Yr: null, return3Yr: null, return5Yr: null, return10Yr: null }
                };
              }

              const rawNavList = await amfiService.getNavHistory(schemeCode);

              if (!rawNavList || rawNavList.length === 0) {
                return {
                  fundId: isBoth ? `${scheme.id}-${isDir ? 'dir' : 'reg'}` : scheme.id,
                  displayName: isBoth ? `${scheme.displayName} (${isDir ? 'Direct' : 'Regular'})` : scheme.displayName,
                  amfiSchemeName: scheme.amfiSchemeName,
                  category: scheme.category,
                  amcName: scheme.amcName,
                  plan: isDir ? 'Direct' : 'Regular',
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
                plan: isDir ? 'Direct' : 'Regular'
              });

              if (isBoth) {
                fundSipResult.fundId = `${scheme.id}-${isDir ? 'dir' : 'reg'}`;
                fundSipResult.displayName = `${scheme.displayName} (${isDir ? 'Direct' : 'Regular'})`;
              }

              return fundSipResult;
            } catch (err) {
              logger.error(`Error calculating SIP for scheme ${scheme.id}:`, err);
              return {
                fundId: isBoth ? `${scheme.id}-${isDir ? 'dir' : 'reg'}` : scheme.id,
                displayName: isBoth ? `${scheme.displayName} (${isDir ? 'Direct' : 'Regular'})` : scheme.displayName,
                amfiSchemeName: scheme.amfiSchemeName,
                category: scheme.category,
                amcName: scheme.amcName,
                plan: isDir ? 'Direct' : 'Regular',
                error: err.message,
                returns: { return1Yr: null, return2Yr: null, return3Yr: null, return5Yr: null, return10Yr: null }
              };
            }
          })
        );
      })
    );

    const results = nestedResults.flat();

    res.json({
      success: true,
      data: {
        results,
        total: results.length,
        monthlySip: numericSip,
        calculationDate: resolvedCalcDate,
        sipDay: numericSipDay,
        plan: isBoth ? 'both' : isDirect ? 'direct' : 'regular',
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

    // Check if it's an NSE Index
    const nseData = nseService.getHistoricalRecordsForIndex(id);
    if (nseData) {
      return res.json({
        success: true,
        data: {
          fundId: nseData.index.id,
          schemeCode: nseData.index.id,
          plan: 'Benchmark',
          isNseIndex: true,
          dataCount: nseData.records.length,
          navHistory: nseData.records
        }
      });
    }

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
