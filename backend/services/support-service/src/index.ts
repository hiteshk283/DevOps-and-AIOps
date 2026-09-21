import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { supportRoutes } from './routes/support';
import { connectDB } from './database/connection';
import { metricsMiddleware, setupMetrics } from './metrics';

dotenv.config();

const app = express();
const PORT: number = Number(process.env.PORT) || 3010;

app.use(helmet());
app.use(cors());
app.use(express.json());

setupMetrics(app);
app.use(metricsMiddleware);

app.use('', supportRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Support Error]:', err.stack);
  res.status(500).json({ error: 'Internal Support Service Error' });
});

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Support Service] running on port ${PORT}`);
      console.log(`[Support Service] Jira Integration: ${process.env.JIRA_BASE_URL ? 'Connected to ' + process.env.JIRA_BASE_URL : 'Sandbox / Mock Mode'}`);
      console.log(`[Support Service] Splunk HEC: ${process.env.SPLUNK_HEC_URL ? 'Connected' : 'Stdout JSON Mode'}`);
    });
  } catch (error) {
    console.error('Failed to start support service:', error);
    process.exit(1);
  }
};

startServer();
