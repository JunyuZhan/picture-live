const logger = require('../utils/logger')

// 请求日志中间件
function requestLogger(req, res, next) {
  const start = Date.now()
  
  // 记录请求开始
  logger.debug(`Incoming request: ${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  })
  
  // 监听响应结束事件
  res.on('finish', () => {
    const duration = Date.now() - start
    const statusCode = res.statusCode
    
    // 根据状态码选择日志级别
    let logLevel = 'info'
    if (statusCode >= 400 && statusCode < 500) {
      logLevel = 'warn'
    } else if (statusCode >= 500) {
      logLevel = 'error'
    }
    
    // 记录请求完成
    logger[logLevel](`Request completed: ${req.method} ${req.originalUrl}`, {
      method: req.method,
      url: req.originalUrl,
      statusCode,
      responseTime: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      contentLength: res.get('Content-Length') || 0
    })
  })
  
  // 监听响应错误事件
  res.on('error', (error) => {
    const duration = Date.now() - start
    
    logger.error(`Request error: ${req.method} ${req.originalUrl}`, {
      method: req.method,
      url: req.originalUrl,
      error: error.message,
      stack: error.stack,
      responseTime: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    })
  })
  
  next()
}

module.exports = requestLogger