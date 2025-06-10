const logger = require('../utils/logger')

// 错误处理中间件
function errorHandler(err, req, res, next) {
  // 记录错误日志
  const logData = {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    params: req.params,
    query: req.query
  };
  
  // 只在开发环境记录请求体，避免生产环境泄露敏感信息
  if (process.env.NODE_ENV === 'development') {
    logData.body = req.body;
  }
  
  logger.error('Unhandled error:', logData);

  // 默认错误响应
  let statusCode = 500
  let message = 'Internal Server Error'
  let details = null

  // 根据错误类型设置响应
  if (err.name === 'ValidationError') {
    // 验证错误
    statusCode = 400
    message = 'Validation Error'
    details = err.details || err.message
  } else if (err.name === 'UnauthorizedError' || err.message.includes('unauthorized')) {
    // 认证错误
    statusCode = 401
    message = 'Unauthorized'
  } else if (err.name === 'ForbiddenError' || err.message.includes('forbidden')) {
    // 权限错误
    statusCode = 403
    message = 'Forbidden'
  } else if (err.name === 'NotFoundError' || err.message.includes('not found')) {
    // 资源不存在
    statusCode = 404
    message = 'Not Found'
  } else if (err.name === 'ConflictError' || err.message.includes('conflict')) {
    // 冲突错误
    statusCode = 409
    message = 'Conflict'
  } else if (err.name === 'TooManyRequestsError') {
    // 请求过多
    statusCode = 429
    message = 'Too Many Requests'
  } else if (err.statusCode) {
    // 自定义状态码
    statusCode = err.statusCode
    message = err.message
  }

  // 构建错误响应
  const errorResponse = {
    success: false,
    error: {
      message,
      code: err.code || 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    }
  }

  // 开发环境包含更多错误信息
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack
    errorResponse.error.details = details
  } else if (details && statusCode < 500) {
    // 生产环境只在客户端错误时包含详情
    errorResponse.error.details = details
  }

  // 发送错误响应
  res.status(statusCode).json(errorResponse)
}

// 自定义错误类
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR')
    this.details = details
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN')
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND')
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT')
  }
}

class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'TOO_MANY_REQUESTS')
  }
}

// 异步错误处理包装器
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

module.exports = {
  errorHandler,
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
  asyncHandler
}