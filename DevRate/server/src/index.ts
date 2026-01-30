import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

import routes from './routes';
import { logger } from './utils/logger';

// Request Logger Middleware
app.use((req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    logger.info(`Incoming Request: ${req.method} ${req.url}`, { ip });
    next();
});

app.use('/api', routes);

app.get('/', (req, res) => {
  res.json({ message: 'DevRate API is running 🚀' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
