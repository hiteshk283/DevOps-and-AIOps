import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import { metricsMiddleware, setupMetrics } from './metrics';

dotenv.config();

const app = express();
const PORT: number = Number(process.env.GATEWAY_PORT) || 3001;

app.use(helmet());
app.use(cors());

setupMetrics(app, { serviceName: 'gateway-service', serviceVersion: '1.0.0' });
app.use(metricsMiddleware);

const services = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3002',
  policies: process.env.POLICIES_SERVICE_URL || 'http://localhost:3003',
  claims: process.env.CLAIMS_SERVICE_URL || 'http://localhost:3004',
  members: process.env.MEMBERS_SERVICE_URL || 'http://localhost:3005',
};

// Route Proxies
app.use('/api/auth', createProxyMiddleware({
  target: services.auth,
  changeOrigin: true,
  pathRewrite: { '^/api/auth': '' },
}));

app.use('/api/policies', createProxyMiddleware({
  target: services.policies,
  changeOrigin: true,
  pathRewrite: { '^/api/policies': '' },
}));

app.use('/api/claims', createProxyMiddleware({
  target: services.claims,
  changeOrigin: true,
  pathRewrite: { '^/api/claims': '' },
}));

app.use('/api/members', createProxyMiddleware({
  target: services.members,
  changeOrigin: true,
  pathRewrite: { '^/api/members': '' },
}));

app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    app: 'Health Insurance Gateway',
    services: {
      auth: services.auth,
      policies: services.policies,
      claims: services.claims,
      members: services.members
    },
    timestamp: new Date().toISOString()
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found on Health Insurance Gateway' });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Gateway Error]:', err.stack);
  res.status(500).json({ error: 'Internal gateway error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Health Insurance Gateway] running on port ${PORT}`);
  console.log(`[Health Insurance Gateway] Proxying to:`, services);
});
