const { Pool } = require('pg')
const logger = require('../utils/logger')

// 数据库连接池
let pool = null

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'picture_live',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
  max: parseInt(process.env.DB_POOL_MAX) || 20, // 连接池最大连接数
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
}

// 连接数据库
async function connectDatabase() {
  try {
    pool = new Pool(dbConfig)
    
    // 测试连接
    const client = await pool.connect()
    await client.query('SELECT NOW()')
    client.release()
    
    logger.info('Database connection established successfully')
    
    // 监听连接池事件
    pool.on('connect', () => {
      logger.debug('New database client connected')
    })
    
    pool.on('error', (err) => {
      logger.error('Database pool error:', err)
    })
    
    return pool
  } catch (error) {
    logger.error('Failed to connect to database:', error)
    throw error
  }
}

// 获取数据库连接池
function getPool() {
  if (!pool) {
    throw new Error('Database not connected. Call connectDatabase() first.')
  }
  return pool
}

// 执行查询
async function query(text, params = []) {
  const client = await pool.connect()
  try {
    const start = Date.now()
    const result = await client.query(text, params)
    const duration = Date.now() - start
    
    logger.debug('Executed query', {
      text: text.substring(0, 100),
      duration,
      rows: result.rowCount
    })
    
    return result
  } catch (error) {
    logger.error('Database query error:', {
      text: text.substring(0, 100),
      params,
      error: error.message
    })
    throw error
  } finally {
    client.release()
  }
}

// 执行事务
async function transaction(callback) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    logger.error('Transaction error:', error)
    throw error
  } finally {
    client.release()
  }
}

// 关闭数据库连接
async function closeDatabase() {
  if (pool) {
    await pool.end()
    logger.info('Database connection closed')
  }
}

// 数据库健康检查
async function healthCheck() {
  try {
    const result = await query('SELECT 1 as health')
    return result.rows[0].health === 1
  } catch (error) {
    logger.error('Database health check failed:', error)
    return false
  }
}

module.exports = {
  connectDatabase,
  getPool,
  query,
  transaction,
  closeDatabase,
  healthCheck
}