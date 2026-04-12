const path = require('path');
const winston = require('winston');
require('winston-daily-rotate-file');

const isDev = process.env.NODE_ENV !== 'production';
const logsDir = path.join(__dirname, '..', 'logs');

// ─── Dosya transport (günlük rotate) ────────────────────────────────────────
const fileTransport = new winston.transports.DailyRotateFile({
  dirname:      logsDir,
  filename:     'app-%DATE%.log',
  datePattern:  'YYYY-MM-DD',
  maxFiles:     '14d',
  format:       winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
});

// ─── Konsol transport (dev: renkli, prod: JSON) ─────────────────────────────
const consoleTransport = new winston.transports.Console({
  format: isDev
    ? winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const extra = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
          return `${timestamp} ${level}: ${message}${extra}`;
        }),
      )
    : winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
});

const logger = winston.createLogger({
  level: 'info',
  levels: winston.config.npm.levels,
  transports: [fileTransport, consoleTransport],
});

module.exports = logger;
