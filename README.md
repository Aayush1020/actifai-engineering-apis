# Actifai Engineering Takehome

## Introduction

You are an Actifai backend engineer managing a database of our users - who are call center agents - and the sales that
the users place using our application.

The database has 4 tables:

- `users`: who are the users (name, role)
- `groups`: groups of users
- `user_groups`: which users belong to which groups
- `sales`: who made a sale, for how much, and when was it made

The front-end team has decided to build an analytics and reporting dashboard to display information about performance
to our users. They are interested in tracking which users and groups are performing well (in terms of their sales). The
primary metric they have specified as a requirement is average revenue and total revenue by user and group, for a given
month.

Your job is to build the API that will deliver data to this dashboard. In addition to the stated requirements above, we
would like to see you think about what additional data/metrics would be useful to add.

At a minimum, write one endpoint that returns time series data for user sales i.e. a list of rows, where each row
corresponds to a time window and information about sales. When you design the endpoint, think  about what query
parameters and options you want to support, to allow flexibility for the front-end team.

## Codebase

This repository contains a bare-bones Node/Express server, which is defined in `server.js`. This file is where you will
define your endpoints.

## Getting started

1. Install Docker (if you don't already have it)
2. Run `npm i` to install dependencies
3. Run `docker-compose up` to compile and run the images.
4. You now have a database and server running on your machine. You can test it by navigating to `http://localhost:3000/health` in
your browser. You should see a "Hello World" message.


## Help

If you have any questions, feel free to reach out to your interview scheduler for clarification!

---

## Implementation

### Overview

This implementation provides three analytics endpoints for sales data analysis:
1. **Time-Series Endpoint**: Returns aggregated sales data per time bucket with an ability to filter on various different options
2. **Summary Endpoint**: Returns high-level summary statistics (great for a high level dashboard)
3. **Top Performers Endpoint**: Returns ranked list of top-performing users or groups

### Endpoints (Deep dive)

#### 1. Time-Series Endpoint

**GET** `/analytics/sales/time-series`

Returns aggregated sales data per time bucket with flexible filtering and metric selection.

**Required Parameters:**
- `granularity`: `"daily"`, `"weekly"` or `"monthly"`
- `start`: Start date (ISO format (common default format): `YYYY-MM-DD`)
- `end`: End date (ISO format)

**Optional Parameters:**
- `users`: user IDs (ie: `"1,2,3"`)
- `groups`: group IDs (ie: `"1,2"`)
- `metrics`: the metric(s) to show (e.g: `"total"`, `"avg"` or `"count"` (default: all))
- `aggregate_by`: `"user"` (default) or `"group"`

**Response:**
Returns a JSON array where each object represents aggregated sales data for a time period. Each object contains:
- A JSON list where each object is aggregated sales data for the granularity time period selected
- Each object will contain the user_id or group_id depending on what you chose to aggregate by in the query
- Each object will contain the "metric" requested in the query as well

**Example:**
```
http://localhost:3000/analytics/sales/time-series?granularity=daily&start=2021-01-01&end=2021-01-31&users=12,15
```

#### 2. Summary Endpoint

**GET** `/analytics/sales/summary`

Returns high-level summary statistics for a date range with a few optional filters.

**Required Parameters:**
- `start`: Start date (ISO format)
- `end`: End date (ISO format)

**Optional Parameters:**
- `users`: user IDs (ie: `"1,2,3"`)
- `groups`: group IDs (ie: `"1,2"`)

**Response:**
- Total revenue, average revenue, total sales
- Active users and groups counts
- Revenue breakdown by group

**Example:**
```
http://localhost:3000/analytics/sales/summary?start=2021-01-01&end=2021-12-31
```

#### 3. Top Performers Endpoint

**GET** `/analytics/sales/top-performers`

Returns a ranked list of top-performing users or groups.

**Required Parameters:**
- `type`: `"user"` or `"group"`
- `metric`: `"total"`, `"avg"` or `"count"`
- `start`: Start date (ISO format)
- `end`: End date (ISO format)

**Optional Parameters:**
- `limit`: Cut-off for number of high performers to return
- `users`: user IDs (ie: `"1,2,3"`)
- `groups`: group IDs (ie: `"1,2"`)

**Example:**
```
http://localhost:3000/analytics/sales/top-performers?type=user&metric=total&start=2021-01-01&end=2021-12-31&limit=10
```

---

## Future Improvements / Out of Scope

This implementation focused on delivering working endpoints that met the core requirements. 

In a production environment, there are a variety of extra things that I would consider that for this project, I felt were "out-of-scope". I have listed some of them below.

**Integration Tests**: Integration tests would allow us to deliver end to end testing on the endpoint while utilizing real data at each stage (ie. alpha data, production data, etc). 

**Throttling**: For an application like this, we would need to be careful from a load perspective. Running a canary in the background to load test and then setting up throttling rules for all of our consumes (even if it is was just the frontend dashboard tool) would be key.

**Logging**: Depending on where this was hosted, we'd want to set up logging that accurately depicts the step by step process of hitting each endpoint. This would be incredibly useful when debugging and working through issues.

**Authentication**: We would want to use some sort of authentication/authorization set up to make sure we only allow known requesters to call this API. Assuming the data is private information, we would need strict authentication on all callers.

**Metrics**: We'd want metrics to pool as calls are made and results are returned for each of these endpoints. These would be valuable if we were to scale usage and to determine common error patterns by consumers.