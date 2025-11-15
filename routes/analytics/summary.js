'use strict';

const express = require('express');
const router = express.Router();
const analyticsService = require('../../services/analyticsService');
const { parseListParam } = require('../../db/queryHelpers');

/**
 * GET /analytics/sales/summary
 * Returns summary statistics for a date range
 */
router.get('/sales/summary', async (req, res) => {
  try {
    const { start, end } = req.query;

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

    try {
      users = parseListParam(req.query.users);
      groups = parseListParam(req.query.groups);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    const results = await analyticsService.getSummaryData({
      start,
      end,
      users,
      groups
    });

    res.json(results);

  } catch (error) {
    console.error('Error in summary endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

