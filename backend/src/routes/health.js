const express = require('express')
const { healthCheck: dbHealthCheck } = require('../config/database')
const { healthCheck: redisHealthCheck } = require('../config/redis')
const logger = require('../utils/logger')
const { asyncHandler } = require('../middleware/errorHandler')

const router = express.Router()

// 基础健康检查
router.get('/', asyncHandler(async (req, res) => {
  const startTime = Date.now()
  
  try {
    // 检查数据库连接
    const dbStatus = await dbHealthCheck()
    
    // 检查Redis连接
    const redisStatus = await redisHealthCheck()
    
    // 检查系统资源
    const memoryUsage = process.memoryUsage()
    const uptime = process.uptime()
    const responseTime = Date.now() - startTime
    
    const healthStatus = {
      status: dbStatus && redisStatus ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime)}s`,
      responseTime: `${responseTime}ms`,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: {
          status: dbStatus ? 'connected' : 'disconnected',
          type: 'PostgreSQL'
        },
        redis: {
          status: redisStatus ? 'connected' : 'disconnected',
          type: 'Redis'
        }
      },
      system: {
        memory: {
          used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
        },
        cpu: {
          usage: process.cpuUsage()
        }
      }
    }
    
    // 根据健康状态设置HTTP状态码
    const statusCode = healthStatus.status === 'healthy' ? 200 : 503
    
    res.status(statusCode).json({
      success: healthStatus.status === 'healthy',
      data: healthStatus
    })
    
  } catch (error) {
    logger.error('Health check failed:', error)
    
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: {
        message: 'Health check failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    })
  }
}))

// 详细健康检查
router.get('/detailed', asyncHandler(async (req, res) => {
  const startTime = Date.now()
  
  try {
    // 数据库详细检查
    const dbStart = Date.now()
    const dbStatus = await dbHealthCheck()
    const dbResponseTime = Date.now() - dbStart
    
    // Redis详细检查
    const redisStart = Date.now()
    const redisStatus = await redisHealthCheck()
    const redisResponseTime = Date.now() - redisStart
    
    // 系统信息
    const memoryUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()
    const uptime = process.uptime()
    const totalResponseTime = Date.now() - startTime
    
    const detailedHealth = {
      status: dbStatus && redisStatus ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: `${totalResponseTime}ms`,
      application: {
        name: 'picture-live-backend',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: `${Math.floor(uptime)}s`,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      },
      services: {
        database: {
          status: dbStatus ? 'healthy' : 'unhealthy',
          type: 'PostgreSQL',
          responseTime: `${dbResponseTime}ms`,
          host: process.env.DB_HOST || 'localhost',
          port: process.env.DB_PORT || 5432,
          database: process.env.DB_NAME || 'picture_live'
        },
        redis: {
          status: redisStatus ? 'healthy' : 'unhealthy',
          type: 'Redis',
          responseTime: `${redisResponseTime}ms`,
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379
        }
      },
      system: {
        memory: {
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        process: {
          pid: process.pid,
          ppid: process.ppid,
          uptime: `${Math.floor(uptime)}s`
        }
      }
    }
    
    const statusCode = detailedHealth.status === 'healthy' ? 200 : 503
    
    res.status(statusCode).json({
      success: detailedHealth.status === 'healthy',
      data: detailedHealth
    })
    
  } catch (error) {
    logger.error('Detailed health check failed:', error)
    
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: {
        message: 'Detailed health check failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    })
  }
}))

// 就绪检查（用于Kubernetes等容器编排）
router.get('/ready', asyncHandler(async (req, res) => {
  try {
    const dbStatus = await dbHealthCheck()
    const redisStatus = await redisHealthCheck()
    
    if (dbStatus && redisStatus) {
      res.status(200).json({
        success: true,
        status: 'ready',
        timestamp: new Date().toISOString()
      })
    } else {
      res.status(503).json({
        success: false,
        status: 'not ready',
        timestamp: new Date().toISOString()
      })
    }
  } catch (error) {
    logger.error('Readiness check failed:', error)
    res.status(503).json({
      success: false,
      status: 'not ready',
      timestamp: new Date().toISOString()
    })
  }
}))

// 存活检查（用于Kubernetes等容器编排）
router.get('/live', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'alive',
    timestamp: new Date().toISOString()
  })
})

module.exports = router