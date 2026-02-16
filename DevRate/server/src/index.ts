import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { validateEnvironment, config } from './config/env';
import routes from './routes';
import { logger } from './utils/logger';


try {
    validateEnvironment();
} catch (error) {
    logger.error('Failed to start server due to missing environment variables');
    process.exit(1);
}

const app = express();
const PORT = config.port;

// CORS configuration
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001','http://localhost:5173'],
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, 
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(express.json());


app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
});


app.use('/api', limiter, routes);


app.get('/', (req, res) => {
    res.json({ message: 'DevRate API is running 🚀' });
});


app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);

});
