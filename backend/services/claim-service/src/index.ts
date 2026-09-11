import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { claimRoutes } from './routes/claims';
import { connectDB } from './database/connection';
import { metricsMiddleware, setupMetrics } from './metrics';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

app.use(helmet());
app.use(cors());
app.use(express.json());

setupMetrics(app, { serviceName: 'claim-service', serviceVersion: '1.0.0' });
app.use(metricsMiddleware);

app.use('', claimRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Claim Error]:', err.stack);
  res.status(500).json({ error: 'Internal Claim Service Error' });
});

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Claim Service] running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start claim service:', error);
    process.exit(1);
  }
};

startServer();
