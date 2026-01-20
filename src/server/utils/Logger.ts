import winston from 'winston';

/**
 * Centralized logging service
 */
export class Logger {
  private static instance: winston.Logger;

  static getInstance(): winston.Logger {
    if (!Logger.instance) {
      Logger.instance = winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        ),
        defaultMeta: { service: 'corridor-analysis' },
        transports: [
          new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
          new winston.transports.File({ filename: 'logs/combined.log' }),
        ],
      });

      // Add console transport in development
      if (process.env.NODE_ENV !== 'production') {
        Logger.instance.add(new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }));
      }
    }

    return Logger.instance;
  }
}