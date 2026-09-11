import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { policyRoutes } from './routes/policies';
import { connectDB } from './database/connection';
import { metricsMiddleware, setupMetrics } from './metrics';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

app.use(helmet());
app.use(cors());
app.use(express.json());

setupMetrics(app, { serviceName: 'policy-service', serviceVersion: '1.0.0' });
app.use(metricsMiddleware);

app.use('', policyRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Policy Error]:', err.stack);
  res.status(500).json({ error: 'Internal Policy Service Error' });
});

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Policy Service] running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start policy service:', error);
    process.exit(1);
  }
};

startServer();
