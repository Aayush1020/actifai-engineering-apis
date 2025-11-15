'use strict';

const express = require('express');
const router = express.Router();
const analyticsService = require('../../services/analyticsService');
const { parseListParam } = require('../../db/queryHelpers');

/**
 * GET /analytics/sales/top-performers
 * Returns top performers ranked by a specific metric
 */
router.get('/sales/top-performers', async (req, res) => {
  try {
    const { type, metric, start, end } = req.query;

    if (!type) {
      return res.status(400).json({ error: 'type is required' });
    }

    const validTypes = ['user', 'group'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: `type must be one of: ${validTypes.join(', ')}`
      });
    }

    if (!metric) {
      return res.status(400).json({ error: 'metric is required' });
    }

    const validMetrics = ['total', 'avg', 'count'];
    if (!validMetrics.includes(metric)) {
      return res.status(400).json({
        error: `metric must be one of: ${validMetrics.join(', ')}`
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
    let limit = 10;

    try {
      users = parseListParam(req.query.users);
      groups = parseListParam(req.query.groups);
      
      if (req.query.limit) {
        limit = parseInt(req.query.limit, 10);
        if (isNaN(limit) || limit < 1 || limit > 100) {
          return res.status(400).json({
            error: 'limit must be a number between 1 and 100'
          });
        }
      }
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    const results = await analyticsService.getTopPerformers({
      type,
      metric,
      limit,
      start,
      end,
      users,
      groups
    });

    res.json(results);

  } catch (error) {
    console.error('Error in top-performers endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

