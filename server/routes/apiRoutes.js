/**
 * API Routes Definition
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const fundController = require('../controllers/fundController');
const sipController = require('../controllers/sipController');

// Rate limiter for manual refresh (max 10 requests per 15 minutes)
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: 'Too many manual refresh requests. Please try again later.'
  }
});

// General API rate limiter (max 200 requests per 15 minutes)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
});

router.use(apiLimiter);

router.get('/funds', fundController.getFunds);
router.post('/funds/batch', fundController.getBatchFunds);
router.get('/funds/:id', fundController.getFundById);
router.get('/categories', fundController.getCategories);
router.get('/health', fundController.getHealth);
router.post('/refresh', refreshLimiter, fundController.refreshData);

// SIP Calculator Routes
router.post('/sip/calculate', sipController.calculateSip);
router.get('/sip/nav-history/:id', sipController.getNavHistoryForFund);

module.exports = router;
