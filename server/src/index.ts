import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import twitchConfigRoutes from './routes/twitchConfigRoutes';
import tokenRoutes from './routes/tokenRoutes';
import apiLogRoutes from './routes/apiLogRoutes';
import webhookRoutes from './routes/webhookRoutes';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Twitch Tools API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.get('/api', (req, res) => {
  res.json({
    message: 'Twitch Tools API v1.0',
    endpoints: {
      auth: '/api/auth',
      twitchConfigs: '/api/twitch-configs',
      tokens: '/api/tokens',
      logs: '/api/logs',
      webhooks: '/api/webhooks'
    }
  });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Twitch Config routes
app.use('/api/twitch-configs', twitchConfigRoutes);

// Token routes
app.use('/api/tokens', tokenRoutes);

// API Log routes
app.use('/api/logs', apiLogRoutes);

// Webhook routes
app.use('/api/webhooks', webhookRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app;
