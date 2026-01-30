import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

const logsDir = path.join(__dirname, '../../logs');

// Ensure log directory exists
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const { combine, timestamp, printf, colorize } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, ...meta }) => {
    let logMsg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
        logMsg += ` | ${JSON.stringify(meta)}`;
    }
    return logMsg;
});

const fileRotateTransport = new DailyRotateFile({
    filename: path.join(logsDir, 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    level: 'debug', // Explicitly allow debug for files
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
    ),
});

const consoleTransport = new winston.transports.Console({
    level: 'info', // Keep console clean, only show info and above
    format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
    ),
});

export const logger = winston.createLogger({
    level: 'debug', // Allow debug logs to flow through
    transports: [
        fileRotateTransport,
        consoleTransport,
    ],
});

// Wrapper class to maintain backward compatibility if needed, but direct export is cleaner.
// We'll keep the direct export and ensure usage matches.
// Winston's logger has .info, .error, .warn, .debug methods just like the old class.
