const redis = require('redis')
const logger = require('../utils/logger')

let client = null

// Redis配置
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000
}

// 连接Redis
async function connectRedis() {
  try {
    // 创建Redis客户端
    client = redis.createClient({
      socket: {
        host: redisConfig.host,
        port: redisConfig.port,
        connectTimeout: redisConfig.connectTimeout,
        commandTimeout: redisConfig.commandTimeout,
        keepAlive: redisConfig.keepAlive
      },
      password: redisConfig.password,
      database: redisConfig.db,
      retryDelayOnFailover: redisConfig.retryDelayOnFailover,
      enableReadyCheck: redisConfig.enableReadyCheck,
      maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
      lazyConnect: redisConfig.lazyConnect
    })

    // 事件监听
    client.on('connect', () => {
      logger.info('Redis client connected')
    })

    client.on('ready', () => {
      logger.info('Redis client ready')
    })

    client.on('error', (err) => {
      logger.error('Redis client error:', err)
    })

    client.on('end', () => {
      logger.info('Redis client disconnected')
    })

    client.on('reconnecting', () => {
      logger.info('Redis client reconnecting')
    })

    // 连接到Redis
    await client.connect()
    
    // 测试连接
    await client.ping()
    logger.info('Redis connection established successfully')
    
    return client
  } catch (error) {
    logger.error('Failed to connect to Redis:', error)
    throw error
  }
}

// 获取Redis客户端
function getRedisClient() {
  if (!client) {
    throw new Error('Redis not connected. Call connectRedis() first.')
  }
  return client
}

// 设置缓存
async function setCache(key, value, expireSeconds = 3600) {
  try {
    const serializedValue = JSON.stringify(value)
    if (expireSeconds > 0) {
      await client.setEx(key, expireSeconds, serializedValue)
    } else {
      await client.set(key, serializedValue)
    }
    logger.debug(`Cache set: ${key}`)
  } catch (error) {
    logger.error('Redis set error:', error)
    throw error
  }
}

// 获取缓存
async function getCache(key) {
  try {
    const value = await client.get(key)
    if (value) {
      logger.debug(`Cache hit: ${key}`)
      return JSON.parse(value)
    }
    logger.debug(`Cache miss: ${key}`)
    return null
  } catch (error) {
    logger.error('Redis get error:', error)
    throw error
  }
}

// 删除缓存
async function deleteCache(key) {
  try {
    const result = await client.del(key)
    logger.debug(`Cache deleted: ${key}`)
    return result
  } catch (error) {
    logger.error('Redis delete error:', error)
    throw error
  }
}

// 批量删除缓存（支持通配符）
async function deleteCachePattern(pattern) {
  try {
    const keys = await client.keys(pattern)
    if (keys.length > 0) {
      const result = await client.del(keys)
      logger.debug(`Cache pattern deleted: ${pattern}, count: ${result}`)
      return result
    }
    return 0
  } catch (error) {
    logger.error('Redis delete pattern error:', error)
    throw error
  }
}

// 检查缓存是否存在
async function existsCache(key) {
  try {
    const result = await client.exists(key)
    return result === 1
  } catch (error) {
    logger.error('Redis exists error:', error)
    throw error
  }
}

// 设置缓存过期时间
async function expireCache(key, seconds) {
  try {
    const result = await client.expire(key, seconds)
    return result === 1
  } catch (error) {
    logger.error('Redis expire error:', error)
    throw error
  }
}

// 获取缓存剩余过期时间
async function ttlCache(key) {
  try {
    const result = await client.ttl(key)
    return result
  } catch (error) {
    logger.error('Redis TTL error:', error)
    throw error
  }
}

// 关闭Redis连接
async function closeRedis() {
  if (client) {
    await client.quit()
    logger.info('Redis connection closed')
  }
}

// Redis健康检查
async function healthCheck() {
  try {
    const result = await client.ping()
    return result === 'PONG'
  } catch (error) {
    logger.error('Redis health check failed:', error)
    return false
  }
}

module.exports = {
  connectRedis,
  getRedisClient,
  setCache,
  getCache,
  deleteCache,
  deleteCachePattern,
  existsCache,
  expireCache,
  ttlCache,
  closeRedis,
  healthCheck
}