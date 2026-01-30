import fs from 'fs';
import path from 'path';

class Logger {
    private logFile: string;

    constructor() {
        const logsDir = path.join(__dirname, '../../logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        this.logFile = path.join(logsDir, 'app.log');
    }

    private timestamp(): string {
        const now = new Date();
        // Format: YYYY-MM-DD HH:mm:ss
        return now.toISOString().replace('T', ' ').split('.')[0];
    }

    private formatMessage(level: string, message: string, meta?: any): string {
        let logMsg = `${this.timestamp()} [${level}] ${message}`;
        if (meta) {
            let metaStr = '';
            if (typeof meta === 'object' && meta !== null) {
                // Convert { key: "value" } to "key="value"" or just value if simple
                metaStr = Object.entries(meta)
                    .map(([k, v]) => `${k}="${v}"`)
                    .join(' ');
            } else {
                metaStr = String(meta);
            }
            logMsg += ` | ${metaStr}`;
        }
        return logMsg;
    }

    private write(level: string, message: string, meta?: any) {
        const logMsg = this.formatMessage(level, message, meta);
        
        // Console Output
        console.log(logMsg);

        // File Output
        fs.appendFileSync(this.logFile, logMsg + '\n');
    }

    public info(message: string, meta?: any) {
        this.write('INFO', message, meta);
    }

    public warn(message: string, meta?: any) {
        this.write('WARN', message, meta);
    }

    public error(message: string, meta?: any) {
        this.write('ERROR', message, meta);
    }

    public debug(message: string, meta?: any) {
        this.write('DEBUG', message, meta);
    }
}

export const logger = new Logger();
