const express = require('express')
const http = require('http')
const socketIo = require('socket.io')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const path = require('path')
require('dotenv').config()

const logger = require('./utils/logger')
const requestLogger = require('./middleware/requestLogger')
const { errorHandler } = require('./middleware/errorHandler')
const { connectDatabase } = require('./config/database')
const { connectRedis } = require('./config/redis')
const socketHandler = require('./socket/socketHandler')

// 导入路由
const sessionRoutes = require('./routes/sessions')
const photoRoutes = require('./routes/photos')
const authRoutes = require('./routes/auth')
const usersRoutes = require('./routes/users')
const systemRoutes = require('./routes/system')
const healthRoutes = require('./routes/health')

const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST']
  }
})

// 全局中间件
app.use(helmet())
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}))

// 请求限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 1000, // 限制每个IP 15分钟内最多1000个请求
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
})
app.use(limiter)

// 解析请求体
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// 请求日志
app.use(requestLogger)

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// API路由
app.use('/api/auth', authRoutes)
app.use('/api/sessions', sessionRoutes)
app.use('/api/photos', photoRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/system', systemRoutes)
app.use('/health', healthRoutes)

// Socket.IO处理
socketHandler(io)

// 错误处理中间件
app.use(errorHandler)

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  })
})

const PORT = process.env.PORT || 3001

// 启动服务器
async function startServer() {
  let dbConnected = false
  let redisConnected = false

  // 尝试连接数据库
  try {
    await connectDatabase()
    logger.info('Database connected successfully')
    dbConnected = true
  } catch (error) {
    logger.warn('Failed to connect to database:', error.message)
    logger.warn('Server will start without database connection')
  }

  // 尝试连接Redis
  try {
    await connectRedis()
    logger.info('Redis connected successfully')
    redisConnected = true
  } catch (error) {
    logger.warn('Failed to connect to Redis:', error.message)
    logger.warn('Server will start without Redis connection')
  }

  // 启动HTTP服务器
  server.listen(PORT, () => {
    logger.info(`🚀 Picture Live API Server is running!`)
    logger.info(`📍 Local: http://localhost:${PORT}`)
    logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
    logger.info(`⏰ Started at: ${new Date().toLocaleString('zh-CN')}`)
    
    if (!dbConnected) {
      logger.warn('⚠️  Database not connected - some features may not work')
    }
    if (!redisConnected) {
      logger.warn('⚠️  Redis not connected - caching disabled')
    }
  })

  // 优雅关闭
  process.on('SIGTERM', gracefulShutdown)
  process.on('SIGINT', gracefulShutdown)
}

// 优雅关闭函数
function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Graceful shutdown...`)
  
  server.close(() => {
    logger.info('HTTP server closed')
    
    // 关闭数据库连接
    // 这里可以添加数据库连接关闭逻辑
    
    process.exit(0)
  })

  // 强制关闭超时
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down')
    process.exit(1)
  }, 10000)
}

// 未捕获的异常处理
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

startServer()

module.exports = { app, server, io }