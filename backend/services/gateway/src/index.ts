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

setupMetrics(app, { serviceName: 'gateway-service', serviceVersion: '2.0.0' });
app.use(metricsMiddleware);

const services = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3002',
  policies: process.env.POLICIES_SERVICE_URL || 'http://localhost:3003',
  claims: process.env.CLAIMS_SERVICE_URL || 'http://localhost:3004',
  members: process.env.MEMBERS_SERVICE_URL || 'http://localhost:3005',
  billing: process.env.BILLING_SERVICE_URL || 'http://localhost:3006',
  hospitals: process.env.HOSPITALS_SERVICE_URL || 'http://localhost:3008',
  documents: process.env.DOCUMENTS_SERVICE_URL || 'http://localhost:3009',
  support: process.env.SUPPORT_SERVICE_URL || 'http://localhost:3010',
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

app.use('/api/billing', createProxyMiddleware({
  target: services.billing,
  changeOrigin: true,
  pathRewrite: { '^/api/billing': '' },
}));

app.use('/api/hospitals', createProxyMiddleware({
  target: services.hospitals,
  changeOrigin: true,
  pathRewrite: { '^/api/hospitals': '' },
}));

app.use('/api/documents', createProxyMiddleware({
  target: services.documents,
  changeOrigin: true,
  pathRewrite: { '^/api/documents': '' },
}));

app.use('/api/support', createProxyMiddleware({
  target: services.support,
  changeOrigin: true,
  pathRewrite: { '^/api/support': '' },
}));

app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    app: 'HealthShield Health + Insurance Enterprise Gateway',
    version: '2.0.0',
    platform: 'Red Hat OpenShift (OCP) + AWS S3/IAM',
    integrations: {
      kafkaS3Sink: 'Enabled (payment.events, claim.events -> S3 Lakehouse)',
      jiraServiceManagement: process.env.JIRA_BASE_URL ? 'Connected' : 'Sandbox Mode',
      splunkLogging: process.env.SPLUNK_HEC_URL ? 'Connected' : 'Stdout JSON Mode',
      irdaiConsentEngine: 'Active (DPDP Compliant)'
    },
    services,
    timestamp: new Date().toISOString()
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found on HealthShield API Gateway' });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Gateway Error]:', err.stack);
  res.status(500).json({ error: 'Internal gateway error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[HealthShield Gateway] running on port ${PORT}`);
  console.log(`[HealthShield Gateway] Reverse proxying to:`, services);
});
