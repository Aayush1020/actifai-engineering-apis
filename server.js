'use strict';

const express = require('express');
const seeder = require('./seed');

// Constants
const PORT = 3000;
const HOST = '0.0.0.0';

async function start() {
  // Seed the database
  await seeder.seedDatabase();

  // App
  const app = express();

  // Health check
  app.get('/health', (req, res) => {
    res.send('Hello World');
  });

  // Write your endpoints here
  const timeSeriesRouter = require('./routes/analytics/timeSeries');
  const summaryRouter = require('./routes/analytics/summary');
  const topPerformersRouter = require('./routes/analytics/topPerformers');
  
  app.use('/analytics', timeSeriesRouter);
  app.use('/analytics', summaryRouter);
  app.use('/analytics', topPerformersRouter);

  app.listen(PORT, HOST);
  console.log(`Server is running on http://${HOST}:${PORT}`);
}

start();
