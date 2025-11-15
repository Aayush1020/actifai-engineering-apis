'use strict';

const { Pool } = require('pg');

// database connection pool
const db = new Pool({
  host: 'db',
  port: '5432',
  user: 'user',
  password: 'pass',
  database: 'actifai'
});

/**
 * Map granularity string to PostgreSQL "DATE_TRUNC" parameter
 */
function getDateTruncParam(granularity) {
  const mapping = {
    'daily': 'day',
    'weekly': 'week',
    'monthly': 'month'
  };
  return mapping[granularity];
}

/**
 * Build select clause based on the metrics and granularity
 */
function buildSelectClause(granularity, metrics, aggregateBy) {
  const selectParts = [
    `DATE_TRUNC('${getDateTruncParam(granularity)}', s.date) as period`
  ];

  if (aggregateBy === 'group') {
    selectParts.push('g.id as group_id');
  } else {
    selectParts.push('s.user_id');
  }

  if (metrics.includes('total')) {
    selectParts.push('SUM(s.amount) as total_revenue');
  }
  if (metrics.includes('avg')) {
    selectParts.push('AVG(s.amount) as avg_revenue');
  }
  if (metrics.includes('count')) {
    selectParts.push('COUNT(*) as sale_count');
  }

  return selectParts.join(', ');
}

/**
 * Build where clause to filter the data based on the parameters
 */
function buildWhereClause(params) {
  const conditions = [];
  const queryParams = [];
  let paramIndex = 1;

  conditions.push(`s.date >= $${paramIndex}`);
  queryParams.push(params.start);
  paramIndex++;

  conditions.push(`s.date <= $${paramIndex}`);
  queryParams.push(params.end);
  paramIndex++;

  if (params.users && params.users.length > 0) {
    const placeholders = params.users.map((_, i) => `$${paramIndex + i}`).join(', ');
    conditions.push(`s.user_id IN (${placeholders})`);
    queryParams.push(...params.users);
    paramIndex += params.users.length;
  }

  if (params.groups && params.groups.length > 0) {
    const placeholders = params.groups.map((_, i) => `$${paramIndex + i}`).join(', ');
    conditions.push(`g.id IN (${placeholders})`);
    queryParams.push(...params.groups);
    paramIndex += params.groups.length;
  }

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params: queryParams
  };
}

/**
 * Builds a from clause to join tables if there is a group filter
 */
function buildFromClause(hasGroupFilter, aggregateBy) {
  if (hasGroupFilter || aggregateBy === 'group') {
    return `FROM sales s
      INNER JOIN user_groups ug ON s.user_id = ug.user_id
      INNER JOIN groups g ON ug.group_id = g.id`;
  }
  return 'FROM sales s';
}

/**
 * Build full query to get time series data
 */
async function getTimeSeriesData(params) {
  const {
    granularity,
    start,
    end,
    users,
    groups,
    metrics,
    aggregateBy = 'user'
  } = params;

  const selectClause = buildSelectClause(granularity, metrics, aggregateBy);
  const hasGroupFilter = groups && groups.length > 0;
  const fromClause = buildFromClause(hasGroupFilter, aggregateBy);
  const { clause: whereClause, params: queryParams } = buildWhereClause({
    start,
    end,
    users,
    groups
  });

  const groupByEntity = aggregateBy === 'group' ? 'g.id' : 's.user_id';
  const orderByEntity = aggregateBy === 'group' ? 'g.id' : 's.user_id';

  const query = `
    SELECT ${selectClause}
    ${fromClause}
    ${whereClause}
    GROUP BY DATE_TRUNC('${getDateTruncParam(granularity)}', s.date), ${groupByEntity}
    ORDER BY period ASC, ${orderByEntity} ASC
  `;

  const result = await db.query(query, queryParams);

  return result.rows.map(row => {
    const formattedRow = {
      period: row.period.toISOString().split('T')[0] // Format date as YYYY-MM-DD
    };

    if (aggregateBy === 'group') {
      if (row.group_id !== null && row.group_id !== undefined) {
        formattedRow.group_id = row.group_id;
      }
    } else {
      if (row.user_id !== null && row.user_id !== undefined) {
        formattedRow.user_id = row.user_id;
      }
    }

    if (metrics.includes('total') && row.total_revenue !== null) {
      formattedRow.total_revenue = parseFloat(row.total_revenue);
    }
    if (metrics.includes('avg') && row.avg_revenue !== null) {
      formattedRow.avg_revenue = parseFloat(row.avg_revenue);
    }
    if (metrics.includes('count') && row.sale_count !== null) {
      formattedRow.sale_count = parseInt(row.sale_count, 10);
    }

    return formattedRow;
  });
}

/**
 * Get summary statistics
 */
async function getSummaryData(params) {
  const { start, end, users, groups } = params;

  const hasGroupFilter = groups && groups.length > 0;
  const fromClause = buildFromClause(hasGroupFilter, 'user');
  const { clause: whereClause, params: queryParams } = buildWhereClause({
    start,
    end,
    users,
    groups
  });

  const summaryQuery = `
    SELECT 
      SUM(s.amount) as total_revenue,
      AVG(s.amount) as avg_revenue,
      COUNT(*) as total_sales,
      COUNT(DISTINCT s.user_id) as active_users
    ${fromClause}
    ${whereClause}
  `;

  const summaryResult = await db.query(summaryQuery, queryParams);
  const summary = summaryResult.rows[0];

  let activeGroups = 0;
  if (hasGroupFilter) {
    const groupsQuery = `
      SELECT COUNT(DISTINCT g.id) as active_groups
      ${fromClause}
      ${whereClause}
    `;
    const groupsResult = await db.query(groupsQuery, queryParams);
    activeGroups = parseInt(groupsResult.rows[0].active_groups, 10);
  } else {
    const allGroupsQuery = `
      SELECT COUNT(DISTINCT g.id) as active_groups
      FROM sales s
      INNER JOIN user_groups ug ON s.user_id = ug.user_id
      INNER JOIN groups g ON ug.group_id = g.id
      ${whereClause}
    `;
    const allGroupsResult = await db.query(allGroupsQuery, queryParams);
    activeGroups = parseInt(allGroupsResult.rows[0].active_groups, 10);
  }

  const groupBreakdownQuery = `
    SELECT 
      g.id as group_id,
      g.name as group_name,
      SUM(s.amount) as total_revenue,
      COUNT(*) as sale_count
    FROM sales s
    INNER JOIN user_groups ug ON s.user_id = ug.user_id
    INNER JOIN groups g ON ug.group_id = g.id
    ${whereClause}
    GROUP BY g.id, g.name
    ORDER BY total_revenue DESC
  `;

  const groupBreakdownResult = await db.query(groupBreakdownQuery, queryParams);

  return {
    total_revenue: summary.total_revenue ? parseFloat(summary.total_revenue) : 0,
    avg_revenue: summary.avg_revenue ? parseFloat(summary.avg_revenue) : 0,
    total_sales: parseInt(summary.total_sales, 10),
    active_users: parseInt(summary.active_users, 10),
    active_groups: activeGroups,
    revenue_by_group: groupBreakdownResult.rows.map(row => ({
      group_id: row.group_id,
      group_name: row.group_name,
      total_revenue: parseFloat(row.total_revenue),
      sale_count: parseInt(row.sale_count, 10)
    }))
  };
}

/**
 * Get top performers ranked by a given metric
 */
async function getTopPerformers(params) {
  const {
    type,
    metric,
    limit = 10,
    start,
    end,
    users,
    groups
  } = params;

  const hasGroupFilter = groups && groups.length > 0;
  const fromClause = buildFromClause(hasGroupFilter, type);
  const { clause: whereClause, params: queryParams } = buildWhereClause({
    start,
    end,
    users,
    groups
  });

  let metricColumn = '';
  let orderByColumn = '';
  switch (metric) {
    case 'total':
      metricColumn = 'SUM(s.amount) as metric_value';
      orderByColumn = 'metric_value';
      break;
    case 'avg':
      metricColumn = 'AVG(s.amount) as metric_value';
      orderByColumn = 'metric_value';
      break;
    case 'count':
      metricColumn = 'COUNT(*) as metric_value';
      orderByColumn = 'metric_value';
      break;
    default:
      metricColumn = 'SUM(s.amount) as metric_value';
      orderByColumn = 'metric_value';
  }

  let selectClause = '';
  let groupByClause = '';
  let entityName = '';
  let finalFromClause = fromClause;

  if (type === 'group') {
    selectClause = `
      g.id as entity_id,
      g.name as entity_name,
      ${metricColumn}
    `;
    groupByClause = 'GROUP BY g.id, g.name';
    entityName = 'group';
  } else {
    selectClause = `
      s.user_id as entity_id,
      u.name as entity_name,
      ${metricColumn}
    `;
    groupByClause = 'GROUP BY s.user_id, u.name';
    entityName = 'user';
    
    if (finalFromClause.includes('INNER JOIN')) {
      finalFromClause = `${finalFromClause} INNER JOIN users u ON s.user_id = u.id`;
    } else {
      finalFromClause = `FROM sales s INNER JOIN users u ON s.user_id = u.id`;
    }
  }

  const query = `
    SELECT ${selectClause}
    ${finalFromClause}
    ${whereClause}
    ${groupByClause}
    ORDER BY ${orderByColumn} DESC
    LIMIT $${queryParams.length + 1}
  `;

  const result = await db.query(query, [...queryParams, limit]);

  return result.rows.map((row, index) => ({
    rank: index + 1,
    [entityName + '_id']: row.entity_id,
    [entityName + '_name']: row.entity_name,
    [metric + '_revenue']: metric === 'count' 
      ? parseInt(row.metric_value, 10)
      : parseFloat(row.metric_value)
  }));
}

module.exports = {
  getTimeSeriesData,
  getSummaryData,
  getTopPerformers
};

