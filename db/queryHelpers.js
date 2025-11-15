'use strict';

/**
 * Helper to parse comma separated strings into integers
 */
function parseListParam(param) {
  if (!param || param.trim() === '') {
    return null;
  }
  
  return param.split(',')
    .map(item => item.trim())
    .filter(item => item !== '')
    .map(item => parseInt(item, 10))
    .filter(item => !isNaN(item));
}

/**
 * Helper to parse input strings into an array of valid/usable metric values
 */
function parseMetrics(param) {
  const validMetrics = ['total', 'avg', 'count'];
  
  if (!param || param.trim() === '') {
    return validMetrics;
  }
  
  const requestedMetrics = param.split(',')
    .map(item => item.trim().toLowerCase())
    .filter(item => item !== '');
  
  const invalidMetrics = requestedMetrics.filter(metric => !validMetrics.includes(metric));
  if (invalidMetrics.length > 0) {
    throw new Error(`Invalid metrics: ${invalidMetrics.join(', ')}. Must be one or more of: ${validMetrics.join(', ')}`);
  }
  
  return requestedMetrics.length > 0 ? requestedMetrics : validMetrics;
}

module.exports = {
  parseListParam,
  parseMetrics
};

