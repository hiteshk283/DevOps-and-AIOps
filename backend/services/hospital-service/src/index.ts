import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { hospitalRoutes } from './routes/hospitals';
import { connectDB } from './database/connection';
import { metricsMiddleware, setupMetrics } from './metrics';

dotenv.config();

const app = express();
const PORT: number = Number(process.env.PORT) || 3008;

app.use(helmet());
app.use(cors());
app.use(express.json());

setupMetrics(app);
app.use(metricsMiddleware);

app.use('', hospitalRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Hospital Error]:', err.stack);
  res.status(500).json({ error: 'Internal Hospital Network Service Error' });
});

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Hospital Service] running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start hospital service:', error);
    process.exit(1);
  }
};

startServer();
