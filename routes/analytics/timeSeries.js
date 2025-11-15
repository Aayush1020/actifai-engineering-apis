'use strict';

const express = require('express');
const router = express.Router();
const analyticsService = require('../../services/analyticsService');
const { parseListParam, parseMetrics } = require('../../db/queryHelpers');

/**
 * GET /analytics/sales/time-series
 * Returns time series data with flexible filtering and metric selection
 */
router.get('/sales/time-series', async (req, res) => {
  try {
    const { granularity, start, end } = req.query;

    if (!granularity) {
      return res.status(400).json({ error: 'time series granularity is required' });
    }

    const validGranularities = ['daily', 'weekly', 'monthly'];
    if (!validGranularities.includes(granularity)) {
      return res.status(400).json({
        error: `granularity must be one of: ${validGranularities.join(', ')}`
      });
    }

    if (!start) {
      return res.status(400).json({ error: 'start date is required' });
    }

    if (!end) {
      return res.status(400).json({ error: 'end date is required' });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start)) {
      return res.status(400).json({
        error: 'start date must be in ISO format (YYYY-MM-DD)'
      });
    }

    if (!dateRegex.test(end)) {
      return res.status(400).json({
        error: 'end date must be in ISO format (YYYY-MM-DD)'
      });
    }

    let users = null;
    let groups = null;
    let metrics = null;
    let aggregateBy = 'user';

    try {
      users = parseListParam(req.query.users);
      groups = parseListParam(req.query.groups);
      metrics = parseMetrics(req.query.metrics);
      
      if (req.query.aggregate_by) {
        const validAggregations = ['user', 'group'];
        if (!validAggregations.includes(req.query.aggregate_by)) {
          return res.status(400).json({
            error: `aggregate_by must be one of: ${validAggregations.join(', ')}`
          });
        }
        aggregateBy = req.query.aggregate_by;
      }
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    const results = await analyticsService.getTimeSeriesData({
      granularity,
      start,
      end,
      users,
      groups,
      metrics,
      aggregateBy
    });

    res.json(results);

  } catch (error) {
    console.error('Error in time-series endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

