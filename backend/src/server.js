/**
 * Picture Live Backend 服务器启动文件
 * 应用程序入口点
 */

require('dotenv').config();

const { app, server, io, socketHandler } = require('./app');
const logger = require('./utils/logger');
const { connectDatabase } = require('./config/database');
const { connectRedis } = require('./config/redis');
const migrator = require('./database/migrator');
const fileHandler = require('./utils/fileHandler');

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * 初始化数据库
 */
async function initializeDatabase() {
    try {
        logger.info('正在连接数据库...');
        await connectDatabase();
        logger.info('数据库连接成功');
        
        // 运行数据库迁移
        if (process.env.AUTO_MIGRATE === 'true') {
            logger.info('正在运行数据库迁移...');
            await migrator.migrate();
            logger.info('数据库迁移完成');
            
            // 在开发环境下加载种子数据
            if (NODE_ENV === 'development' && process.env.LOAD_SEED_DATA === 'true') {
                logger.info('正在加载种子数据...');
                await migrator.seed();
                logger.info('种子数据加载完成');
            }
        }
        
    } catch (error) {
        logger.error('数据库初始化失败', error);
        throw error;
    }
}

/**
 * 初始化Redis
 */
async function initializeRedis() {
    try {
        logger.info('正在连接Redis...');
        await connectRedis();
        logger.info('Redis连接成功');
    } catch (error) {
        logger.error('Redis连接失败', error);
        throw error;
    }
}

/**
 * 初始化文件系统
 */
async function initializeFileSystem() {
    try {
        logger.info('正在初始化文件系统...');
        await fileHandler.initializeDirectories();
        logger.info('文件系统初始化完成');
    } catch (error) {
        logger.error('文件系统初始化失败', error);
        throw error;
    }
}

/**
 * 启动服务器
 */
async function startServer() {
    try {
        // 记录启动信息
        logger.info('正在启动Picture Live Backend服务器...', {
            version: process.env.APP_VERSION || '1.0.0',
            environment: NODE_ENV,
            port: PORT,
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch
        });
        
        // 初始化各个组件
        await initializeDatabase();
        await initializeRedis();
        await initializeFileSystem();
        
        // 启动HTTP服务器
        server.listen(PORT, () => {
            logger.info(`服务器启动成功`, {
                port: PORT,
                environment: NODE_ENV,
                processId: process.pid,
                memoryUsage: process.memoryUsage(),
                uptime: process.uptime()
            });
            
            // 输出服务信息
            console.log(`\n🚀 Picture Live Backend 服务器已启动`);
            console.log(`📍 端口: ${PORT}`);
            console.log(`🌍 环境: ${NODE_ENV}`);
            console.log(`🔗 API地址: http://localhost:${PORT}/api`);
            console.log(`📊 健康检查: http://localhost:${PORT}/health`);
            console.log(`🔌 WebSocket: ws://localhost:${PORT}/socket.io`);
            console.log(`📝 进程ID: ${process.pid}`);
            console.log(`⏰ 启动时间: ${new Date().toISOString()}`);
            
            if (NODE_ENV === 'development') {
                console.log(`\n🛠️  开发模式功能:`);
                console.log(`   - 详细错误信息`);
                console.log(`   - 请求日志记录`);
                console.log(`   - 热重载支持`);
                if (process.env.LOAD_SEED_DATA === 'true') {
                    console.log(`   - 种子数据已加载`);
                }
            }
            
            console.log(`\n📚 API文档: http://localhost:${PORT}/api`);
            console.log(`\n✅ 服务器就绪，等待请求...\n`);
        });
        
        // WebSocket连接统计
        setInterval(() => {
            const stats = socketHandler.getOnlineStats();
            if (stats.totalConnections > 0) {
                logger.info('WebSocket连接统计', stats);
            }
        }, 60000); // 每分钟记录一次
        
    } catch (error) {
        logger.error('服务器启动失败', error);
        process.exit(1);
    }
}

/**
 * 优雅关闭处理
 */
function gracefulShutdown(signal) {
    logger.info(`收到${signal}信号，开始优雅关闭服务器...`);
    
    // 停止接受新连接
    server.close(async (err) => {
        if (err) {
            logger.error('HTTP服务器关闭时发生错误', err);
        } else {
            logger.info('HTTP服务器已关闭');
        }
        
        try {
            // 关闭WebSocket连接
            logger.info('正在关闭WebSocket连接...');
            io.close();
            logger.info('WebSocket连接已关闭');
            
            // 关闭数据库连接
            logger.info('正在关闭数据库连接...');
            const { pool } = require('./config/database');
            if (pool) {
                await pool.end();
                logger.info('数据库连接已关闭');
            }
            
            // 关闭Redis连接
            logger.info('正在关闭Redis连接...');
            const { redis } = require('./config/redis');
            if (redis) {
                redis.disconnect();
                logger.info('Redis连接已关闭');
            }
            
            // 清理临时文件
            logger.info('正在清理临时文件...');
            await fileHandler.cleanupTempFiles();
            logger.info('临时文件清理完成');
            
            logger.info('服务器优雅关闭完成');
            process.exit(0);
            
        } catch (cleanupError) {
            logger.error('清理资源时发生错误', cleanupError);
            process.exit(1);
        }
    });
    
    // 强制关闭超时（30秒）
    setTimeout(() => {
        logger.error('优雅关闭超时，强制退出');
        process.exit(1);
    }, 30000);
}

/**
 * 进程信号处理
 */
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/**
 * 未捕获异常处理
 */
process.on('uncaughtException', (error) => {
    logger.error('未捕获的异常', {
        error: {
            message: error.message,
            stack: error.stack,
            name: error.name
        },
        process: {
            pid: process.pid,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage()
        }
    });
    
    // 优雅关闭
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

/**
 * 未处理的Promise拒绝
 */
process.on('unhandledRejection', (reason, promise) => {
    logger.error('未处理的Promise拒绝', {
        reason: reason instanceof Error ? {
            message: reason.message,
            stack: reason.stack,
            name: reason.name
        } : reason,
        promise: promise.toString(),
        process: {
            pid: process.pid,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage()
        }
    });
    
    // 优雅关闭
    gracefulShutdown('UNHANDLED_REJECTION');
});

/**
 * 内存使用监控
 */
if (NODE_ENV === 'production') {
    setInterval(() => {
        const memUsage = process.memoryUsage();
        const memUsageMB = {
            rss: Math.round(memUsage.rss / 1024 / 1024),
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
            external: Math.round(memUsage.external / 1024 / 1024)
        };
        
        // 内存使用超过阈值时记录警告
        if (memUsageMB.heapUsed > 500) { // 500MB
            logger.warn('内存使用量较高', {
                memoryUsage: memUsageMB,
                uptime: process.uptime()
            });
        }
        
        // 定期记录内存使用情况
        logger.info('内存使用情况', {
            memoryUsage: memUsageMB,
            uptime: process.uptime()
        });
        
    }, 300000); // 每5分钟检查一次
}

/**
 * CPU使用监控
 */
if (NODE_ENV === 'production') {
    setInterval(() => {
        const cpuUsage = process.cpuUsage();
        logger.info('CPU使用情况', {
            user: cpuUsage.user,
            system: cpuUsage.system,
            uptime: process.uptime()
        });
    }, 300000); // 每5分钟记录一次
}

// 启动服务器
startServer();

// 导出服务器实例（用于测试）
module.exports = {
    app,
    server,
    io,
    socketHandler
};