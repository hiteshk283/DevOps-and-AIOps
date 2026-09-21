import { Counter, Histogram, Gauge, Registry, collectDefaultMetrics } from 'prom-client';
import express from 'express';

export const register = new Registry();
collectDefaultMetrics({ register });

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'service_name'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'service_name'],
  registers: [register],
});

export function metricsMiddleware(req: any, res: any, next: any) {
  const start = Date.now();
  const route = req.route?.path || req.path || 'unknown';
  const serviceName = 'hospital-service';

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration.observe(
      { method: req.method, route, status_code: res.statusCode.toString(), service_name: serviceName },
      duration
    );
    httpRequestTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode.toString(),
      service_name: serviceName,
    });
  });

  next();
}

export function setupMetrics(app: express.Application) {
  app.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (err) {
      res.status(500).end(err);
    }
  });
}
