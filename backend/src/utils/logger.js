const winston = require('winston')
const path = require('path')

// 日志级别
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
}

// 日志颜色
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
}

// 添加颜色
winston.addColors(colors)

// 自定义格式
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    if (info.stack) {
      return `${info.timestamp} ${info.level}: ${info.message}\n${info.stack}`
    }
    return `${info.timestamp} ${info.level}: ${info.message}`
  })
)

// 文件格式（不包含颜色）
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
)

// 传输器配置
const transports = [
  // 控制台输出
  new winston.transports.Console({
    format: format,
    level: process.env.LOG_LEVEL || 'debug'
  })
]

// 生产环境添加文件日志
if (process.env.NODE_ENV === 'production') {
  // 确保日志目录存在
  const logDir = path.join(__dirname, '../../logs')
  
  transports.push(
    // 错误日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // 综合日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  )
}

// 创建logger实例
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  levels,
  format: fileFormat,
  transports,
  exitOnError: false
})

// 开发环境特殊处理
if (process.env.NODE_ENV !== 'production') {
  logger.debug('Logger initialized in development mode')
}

// 流接口（用于Morgan等中间件）
logger.stream = {
  write: (message) => {
    logger.http(message.trim())
  }
}

// 辅助方法
logger.logError = (error, context = {}) => {
  logger.error(error.message, {
    stack: error.stack,
    ...context
  })
}

logger.logRequest = (req, res, responseTime) => {
  logger.http(`${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  })
}

logger.logPerformance = (operation, duration, metadata = {}) => {
  logger.info(`Performance: ${operation} completed in ${duration}ms`, {
    operation,
    duration,
    ...metadata
  })
}

module.exports = logger