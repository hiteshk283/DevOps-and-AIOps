import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { memberRoutes } from './routes/members';
import { connectDB } from './database/connection';
import { metricsMiddleware, setupMetrics } from './metrics';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

app.use(helmet());
app.use(cors());
app.use(express.json());

setupMetrics(app, { serviceName: 'member-service', serviceVersion: '1.0.0' });
app.use(metricsMiddleware);

app.use('', memberRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Member Error]:', err.stack);
  res.status(500).json({ error: 'Internal Member Service Error' });
});

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Member Service] running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start member service:', error);
    process.exit(1);
  }
};

startServer();
