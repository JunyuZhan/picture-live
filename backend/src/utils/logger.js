/**
 * 日志工具
 * 提供结构化日志记录功能
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// 确保日志目录存在
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// 自定义日志格式
const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
        
        // 添加元数据
        if (Object.keys(meta).length > 0) {
            logMessage += ` | ${JSON.stringify(meta)}`;
        }
        
        return logMessage;
    })
);

// 创建logger实例
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: {
        service: 'picture-live-backend',
        version: process.env.APP_VERSION || '1.0.0'
    },
    transports: [
        // 错误日志文件
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        }),
        
        // 组合日志文件
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        }),
        
        // 访问日志文件
        new winston.transports.File({
            filename: path.join(logDir, 'access.log'),
            level: 'http',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        })
    ],
    
    // 异常处理
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(logDir, 'exceptions.log')
        })
    ],
    
    // 拒绝处理
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(logDir, 'rejections.log')
        })
    ]
});

// 开发环境添加控制台输出
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
                let logMessage = `${timestamp} [${level}]: ${message}`;
                
                // 在开发环境中美化元数据输出
                if (Object.keys(meta).length > 0) {
                    logMessage += `\n${JSON.stringify(meta, null, 2)}`;
                }
                
                return logMessage;
            })
        )
    }));
}

// 扩展logger功能
class Logger {
    constructor(winstonLogger) {
        this.winston = winstonLogger;
    }
    
    /**
     * 记录信息日志
     */
    info(message, meta = {}) {
        this.winston.info(message, this.sanitizeMeta(meta));
    }
    
    /**
     * 记录警告日志
     */
    warn(message, meta = {}) {
        this.winston.warn(message, this.sanitizeMeta(meta));
    }
    
    /**
     * 记录错误日志
     */
    error(message, meta = {}) {
        // 如果meta是Error对象，提取错误信息
        if (meta instanceof Error) {
            meta = {
                error: {
                    message: meta.message,
                    stack: meta.stack,
                    name: meta.name
                }
            };
        }
        
        this.winston.error(message, this.sanitizeMeta(meta));
    }
    
    /**
     * 记录调试日志
     */
    debug(message, meta = {}) {
        this.winston.debug(message, this.sanitizeMeta(meta));
    }
    
    /**
     * 记录HTTP访问日志
     */
    http(message, meta = {}) {
        this.winston.http(message, this.sanitizeMeta(meta));
    }
    
    /**
     * 记录详细日志
     */
    verbose(message, meta = {}) {
        this.winston.verbose(message, this.sanitizeMeta(meta));
    }
    
    /**
     * 记录愚蠢级别日志
     */
    silly(message, meta = {}) {
        this.winston.silly(message, this.sanitizeMeta(meta));
    }
    
    /**
     * 记录API请求日志
     */
    apiRequest(req, res, responseTime) {
        const meta = {
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            statusCode: res.statusCode,
            responseTime: `${responseTime}ms`,
            userId: req.user?.userId,
            sessionId: req.headers['x-session-id']
        };
        
        // 记录请求体（排除敏感信息）
        if (req.body && Object.keys(req.body).length > 0) {
            meta.requestBody = this.sanitizeRequestBody(req.body);
        }
        
        // 记录查询参数
        if (req.query && Object.keys(req.query).length > 0) {
            meta.queryParams = req.query;
        }
        
        const level = res.statusCode >= 400 ? 'error' : 'http';
        const message = `${req.method} ${req.originalUrl} ${res.statusCode} - ${responseTime}ms`;
        
        this.winston.log(level, message, meta);
    }
    
    /**
     * 记录数据库操作日志
     */
    database(operation, table, meta = {}) {
        this.info(`数据库操作: ${operation} on ${table}`, {
            operation,
            table,
            ...meta
        });
    }
    
    /**
     * 记录缓存操作日志
     */
    cache(operation, key, meta = {}) {
        this.debug(`缓存操作: ${operation} key: ${key}`, {
            operation,
            key,
            ...meta
        });
    }
    
    /**
     * 记录文件操作日志
     */
    file(operation, filePath, meta = {}) {
        this.info(`文件操作: ${operation} file: ${filePath}`, {
            operation,
            filePath,
            ...meta
        });
    }
    
    /**
     * 记录WebSocket事件日志
     */
    websocket(event, socketId, meta = {}) {
        this.info(`WebSocket事件: ${event}`, {
            event,
            socketId,
            ...meta
        });
    }
    
    /**
     * 记录安全相关日志
     */
    security(event, meta = {}) {
        this.warn(`安全事件: ${event}`, {
            event,
            timestamp: new Date().toISOString(),
            ...meta
        });
    }
    
    /**
     * 记录性能日志
     */
    performance(operation, duration, meta = {}) {
        const level = duration > 1000 ? 'warn' : 'info';
        this.winston.log(level, `性能监控: ${operation} 耗时 ${duration}ms`, {
            operation,
            duration,
            ...meta
        });
    }
    
    /**
     * 记录业务日志
     */
    business(event, meta = {}) {
        this.info(`业务事件: ${event}`, {
            event,
            timestamp: new Date().toISOString(),
            ...meta
        });
    }
    
    /**
     * 清理敏感信息
     */
    sanitizeMeta(meta) {
        if (!meta || typeof meta !== 'object') {
            return meta;
        }
        
        const sensitiveFields = [
            'password',
            'token',
            'secret',
            'key',
            'authorization',
            'cookie',
            'session'
        ];
        
        const sanitized = { ...meta };
        
        const sanitizeObject = (obj) => {
            for (const [key, value] of Object.entries(obj)) {
                const lowerKey = key.toLowerCase();
                
                if (sensitiveFields.some(field => lowerKey.includes(field))) {
                    obj[key] = '[REDACTED]';
                } else if (typeof value === 'object' && value !== null) {
                    sanitizeObject(value);
                }
            }
        };
        
        sanitizeObject(sanitized);
        return sanitized;
    }
    
    /**
     * 清理请求体中的敏感信息
     */
    sanitizeRequestBody(body) {
        const sensitiveFields = [
            'password',
            'currentPassword',
            'newPassword',
            'confirmPassword',
            'token',
            'refreshToken',
            'accessToken'
        ];
        
        const sanitized = { ...body };
        
        for (const field of sensitiveFields) {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        }
        
        return sanitized;
    }
    
    /**
     * 创建子logger
     */
    child(defaultMeta) {
        const childLogger = this.winston.child(defaultMeta);
        return new Logger(childLogger);
    }
    
    /**
     * 设置日志级别
     */
    setLevel(level) {
        this.winston.level = level;
    }
    
    /**
     * 获取当前日志级别
     */
    getLevel() {
        return this.winston.level;
    }
    
    /**
     * 添加传输器
     */
    addTransport(transport) {
        this.winston.add(transport);
    }
    
    /**
     * 移除传输器
     */
    removeTransport(transport) {
        this.winston.remove(transport);
    }
    
    /**
     * 清理旧日志文件
     */
    async cleanupOldLogs(daysToKeep = 30) {
        const fs = require('fs').promises;
        const path = require('path');
        
        try {
            const files = await fs.readdir(logDir);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            
            let deletedCount = 0;
            
            for (const file of files) {
                const filePath = path.join(logDir, file);
                const stats = await fs.stat(filePath);
                
                if (stats.mtime < cutoffDate) {
                    await fs.unlink(filePath);
                    deletedCount++;
                    this.info('删除旧日志文件', { file, mtime: stats.mtime });
                }
            }
            
            this.info('日志清理完成', {
                deletedCount,
                daysToKeep,
                cutoffDate
            });
            
            return deletedCount;
            
        } catch (error) {
            this.error('清理旧日志文件失败', { error: error.message });
            throw error;
        }
    }
    
    /**
     * 获取日志统计信息
     */
    async getLogStats() {
        const fs = require('fs').promises;
        const path = require('path');
        
        try {
            const files = await fs.readdir(logDir);
            const stats = {
                totalFiles: 0,
                totalSize: 0,
                files: []
            };
            
            for (const file of files) {
                const filePath = path.join(logDir, file);
                const fileStats = await fs.stat(filePath);
                
                stats.totalFiles++;
                stats.totalSize += fileStats.size;
                stats.files.push({
                    name: file,
                    size: fileStats.size,
                    created: fileStats.birthtime,
                    modified: fileStats.mtime
                });
            }
            
            return stats;
            
        } catch (error) {
            this.error('获取日志统计信息失败', { error: error.message });
            throw error;
        }
    }
}

// 创建并导出logger实例
const loggerInstance = new Logger(logger);

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
    loggerInstance.error('未捕获的异常', {
        error: {
            message: error.message,
            stack: error.stack,
            name: error.name
        }
    });
    process.exit(1);
});

// 处理未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
    loggerInstance.error('未处理的Promise拒绝', {
        reason: reason instanceof Error ? {
            message: reason.message,
            stack: reason.stack,
            name: reason.name
        } : reason,
        promise: promise.toString()
    });
});

// 优雅关闭时的日志记录
process.on('SIGTERM', () => {
    loggerInstance.info('收到SIGTERM信号，准备关闭应用');
});

process.on('SIGINT', () => {
    loggerInstance.info('收到SIGINT信号，准备关闭应用');
});

module.exports = loggerInstance;