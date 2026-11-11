/**
 * Visitor statistics API for https://obayrak.github.io/obayrak/statistics/
 * Google Apps Script web app that reads your Google Analytics 4 property and
 * returns AGGREGATED numbers only (no personal data) as JSON.
 *
 * Setup (once):
 *  1. https://script.google.com  ->  New project  ->  paste this whole file into Code.gs.
 *  2. Set PROPERTY_ID below (GA4 Admin -> Property details -> PROPERTY ID, a number).
 *  3. Left bar "Services" (+) -> add "Google Analytics Data API" (identifier AnalyticsData).
 *  4. Project Settings (gear) -> Time zone: the same as your GA4 property (e.g. Europe/Istanbul).
 *  5. Run the function "test" once and allow access.
 *  6. Deploy -> New deployment -> type "Web app" -> Execute as: Me, Who has access: Anyone -> Deploy.
 *  7. Copy the Web app URL (ends with /exec) and paste it in statistics/index.html (API_URL).
 */
var PROPERTY_ID = '548542556';   // GA4 property ID (from the analytics.google.com address: ...p548542556...)
var START_ALL  = '2020-01-01';   // "all time" start (GA4 only has data since the property was created)
var CACHE_SEC  = 300;            // report cache (5 min); real-time is cached 60 s

function doGet(e) {
  var p = (e && e.parameter) || {};
  var period = ({'7d':1,'30d':1,'90d':1,'365d':1,'all':1})[p.period] ? p.period : '30d';
  var out;
  try {
    out = p.part === 'realtime' ? cached('rt', 60, realtime) : cached('st_' + period, CACHE_SEC, function(){ return stats(period); });
  } catch (err) {
    out = JSON.stringify({ error: String(err && err.message || err) });
  }
  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
}

function test() { Logger.log(JSON.stringify(stats('30d')).slice(0, 2000)); Logger.log(JSON.stringify(realtime())); }

/* ── helpers ─────────────────────────────────────────────── */
function prop() { return 'properties/' + PROPERTY_ID; }
function cached(key, sec, fn) {
  var c = CacheService.getScriptCache(), hit = c.get(key);
  if (hit) return hit;
  var s = JSON.stringify(fn());
  try { c.put(key, s, sec); } catch (e) {}
  return s;
}
function run(req) { return AnalyticsData.Properties.runReport(req, prop()); }
function rows(resp) {
  var dims = (resp.dimensionHeaders || []).map(function(h){ return h.name; });
  var mets = (resp.metricHeaders || []).map(function(h){ return h.name; });
  return (resp.rows || []).map(function(r){
    var o = {};
    dims.forEach(function(n, i){ o[n] = r.dimensionValues[i].value; });
    mets.forEach(function(n, i){ o[n] = Number(r.metricValues[i].value); });
    return o;
  });
}
function m(names) { return names.map(function(n){ return { name: n }; }); }
function tz() { return Session.getScriptTimeZone(); }
function fmt(d) { return Utilities.formatDate(d, tz(), 'yyyy-MM-dd'); }
function startOf(kind) {
  var now = new Date();
  if (kind === 'month') return Utilities.formatDate(now, tz(), 'yyyy-MM') + '-01';
  var dow = +Utilities.formatDate(now, tz(), 'u');            // 1 = Monday ... 7 = Sunday
  return fmt(new Date(now.getTime() - (dow - 1) * 86400000));
}
function periodStart(period) {
  return { '7d': '6daysAgo', '30d': '29daysAgo', '90d': '89daysAgo', '365d': '364daysAgo', 'all': START_ALL }[period];
}

var KPI = ['totalUsers', 'newUsers', 'activeUsers', 'sessions', 'screenPageViews',
           'averageSessionDuration', 'screenPageViewsPerSession', 'bounceRate', 'engagementRate'];

/* ── main report ─────────────────────────────────────────── */
function stats(period) {
  var ps = periodStart(period);
  var range = [{ startDate: ps, endDate: 'today' }];
  var res = { period: period, generated: new Date().toISOString(), timeZone: tz() };

  // headline numbers for fixed ranges (one request, 4 named date ranges)
  var fixed = rows(run({
    dateRanges: [
      { startDate: START_ALL,        endDate: 'today', name: 'all' },
      { startDate: 'today',          endDate: 'today', name: 'today' },
      { startDate: startOf('week'),  endDate: 'today', name: 'week' },
      { startDate: startOf('month'), endDate: 'today', name: 'month' }
    ],
    metrics: m(['totalUsers', 'sessions', 'screenPageViews'])
  }));
  res.ranges = {};
  fixed.forEach(function(r){ res.ranges[r.dateRange] = r; });

  // all KPIs for the selected period
  res.kpi = rows(run({ dateRanges: range, metrics: m(KPI) }))[0] || {};

  // new vs returning visitors
  res.newVsReturning = rows(run({
    dateRanges: range, dimensions: [{ name: 'newVsReturning' }], metrics: m(['activeUsers', 'sessions'])
  }));

  // last 24 hours (hourly; sessions and views add up, users do not)
  var hours = rows(run({
    dateRanges: [{ startDate: 'yesterday', endDate: 'today' }],
    dimensions: [{ name: 'dateHour' }], metrics: m(['sessions', 'screenPageViews', 'activeUsers']),
    orderBys: [{ dimension: { dimensionName: 'dateHour' } }]
  }));
  var cut = Utilities.formatDate(new Date(Date.now() - 24 * 3600000), tz(), 'yyyyMMddHH');
  res.last24 = hours.filter(function(h){ return h.dateHour > cut; });

  // daily trend
  res.daily = rows(run({
    dateRanges: range, dimensions: [{ name: 'date' }], metrics: m(['totalUsers', 'newUsers', 'sessions', 'screenPageViews']),
    orderBys: [{ dimension: { dimensionName: 'date' } }], limit: 4000
  }));

  // geography
  res.countries = rows(run({
    dateRanges: range, dimensions: [{ name: 'country' }, { name: 'countryId' }], metrics: m(['totalUsers', 'sessions', 'screenPageViews']),
    orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }], limit: 250
  }));
  res.cities = rows(run({
    dateRanges: range, dimensions: [{ name: 'city' }, { name: 'region' }, { name: 'country' }], metrics: m(['totalUsers', 'sessions']),
    orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }], limit: 50
  }));

  // pages, traffic sources, devices, interactions
  res.pages = rows(run({
    dateRanges: range, dimensions: [{ name: 'pageTitle' }, { name: 'pagePath' }], metrics: m(['screenPageViews', 'totalUsers', 'userEngagementDuration']),
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 30
  }));
  res.sources = rows(run({
    dateRanges: range, dimensions: [{ name: 'sessionDefaultChannelGroup' }], metrics: m(['sessions']),
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 12
  }));
  res.referrers = rows(run({
    dateRanges: range, dimensions: [{ name: 'sessionSource' }], metrics: m(['sessions']),
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 15
  }));
  res.devices = rows(run({ dateRanges: range, dimensions: [{ name: 'deviceCategory' }], metrics: m(['totalUsers']) }));
  res.events = rows(run({
    dateRanges: range, dimensions: [{ name: 'eventName' }], metrics: m(['eventCount', 'totalUsers']),
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }], limit: 25
  }));
  return res;
}

/* ── real-time (last 30 minutes) ─────────────────────────── */
function realtime() {
  var rt = function(dims){
    var req = { metrics: [{ name: 'activeUsers' }], limit: 50 };
    if (dims.length) req.dimensions = dims.map(function(n){ return { name: n }; });
    return rows(AnalyticsData.Properties.runRealtimeReport(req, prop()));
  };
  return {
    generated: new Date().toISOString(),
    active: (rt([])[0] || { activeUsers: 0 }).activeUsers,
    countries: rt(['country']),
    pages: rt(['unifiedScreenName'])
  };
}
