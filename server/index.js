/**
 * FundPulse - Backend Server Entry Point
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/apiRoutes');
const logger = require('./utils/logger');
const amfiService = require('./services/amfiService');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl} - Client: ${req.ip}`);
  next();
});

// API Routes
app.use('/api', apiRoutes);

// Serve static frontend files in production
const path = require('path');
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

// SPA fallback to index.html for non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err && !res.headersSent) {
      res.json({
        name: 'FundPulse API',
        description: 'Indian Mutual Fund Dashboard Proxy API',
        trackedFunds: 34,
        healthEndpoint: '/api/health',
        fundsEndpoint: '/api/funds'
      });
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// Start listening & prime initial cache
const nseService = require('./services/nseService');

app.listen(PORT, async () => {
  logger.info(`FundPulse Backend Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info('Priming initial AMFI data cache...');
  try {
    const data = await amfiService.getFunds(false);
    logger.info(`Initial AMFI Cache Primed successfully! Date: ${data.reportDate}, Matched: ${data.matchedCount}/34 funds.`);
  } catch (err) {
    logger.error('Initial AMFI Cache Priming failed:', err.message);
  }

  logger.info('Priming initial official NSE Indices cache...');
  try {
    const nseData = await nseService.getNSEIndexData();
    logger.info(`Initial NSE Indices Cache Primed successfully! Indices: ${nseData.indices?.length || 0}`);
  } catch (err) {
    logger.error('Initial NSE Cache Priming failed:', err.message);
  }
});
