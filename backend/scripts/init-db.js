#!/usr/bin/env node
/**
 * 数据库一键初始化脚本
 * 用于快速设置开发环境数据库
 */

const path = require('path');
const { Pool } = require('pg');
const DatabaseMigrator = require('../src/database/migrator');
const logger = require('../src/utils/logger');

// 加载环境变量
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// 数据库配置
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'picture_live',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// 用于连接postgres数据库（不指定具体数据库）
const adminConfig = {
    ...dbConfig,
    database: 'postgres' // 连接到默认的postgres数据库
};

async function createDatabaseIfNotExists() {
    const adminPool = new Pool(adminConfig);
    
    try {
        console.log('🔍 检查数据库是否存在...');
        
        // 检查数据库是否存在
        const result = await adminPool.query(
            'SELECT 1 FROM pg_database WHERE datname = $1',
            [dbConfig.database]
        );
        
        if (result.rows.length === 0) {
            console.log(`📦 创建数据库: ${dbConfig.database}`);
            await adminPool.query(`CREATE DATABASE "${dbConfig.database}"`);
            console.log('✅ 数据库创建成功！');
        } else {
            console.log('ℹ️  数据库已存在');
        }
        
    } catch (error) {
        console.error('❌ 数据库创建失败:', error.message);
        throw error;
    } finally {
        await adminPool.end();
    }
}

async function testConnection() {
    const pool = new Pool(dbConfig);
    
    try {
        console.log('🔗 测试数据库连接...');
        await pool.query('SELECT 1');
        console.log('✅ 数据库连接成功！');
    } catch (error) {
        console.error('❌ 数据库连接失败:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

async function initializeDatabase() {
    const migrator = new DatabaseMigrator(dbConfig);
    
    try {
        console.log('🚀 开始初始化数据库...');
        
        // 1. 创建数据库（如果不存在）
        await createDatabaseIfNotExists();
        
        // 2. 测试连接
        await testConnection();
        
        // 3. 初始化迁移系统
        console.log('⚙️  初始化迁移系统...');
        await migrator.initialize();
        
        // 4. 执行迁移
        console.log('📋 执行数据库迁移...');
        const migrateResult = await migrator.migrate();
        
        if (migrateResult.executed.length > 0) {
            console.log('✅ 迁移完成！执行的迁移:');
            migrateResult.executed.forEach(migration => {
                console.log(`   - ${migration.name}`);
            });
        } else {
            console.log('ℹ️  没有需要执行的迁移');
        }
        
        // 5. 执行种子数据
        console.log('🌱 插入种子数据...');
        const seedResult = await migrator.seed();
        
        if (seedResult.executed.length > 0) {
            console.log('✅ 种子数据完成！执行的种子:');
            seedResult.executed.forEach(seed => {
                console.log(`   - ${seed.name}`);
            });
        } else {
            console.log('ℹ️  没有种子数据需要执行');
        }
        
        // 6. 验证数据
        console.log('🔍 验证数据...');
        await verifyData(migrator);
        
        console.log('\n🎉 数据库初始化完成！');
        console.log('\n📝 测试账号信息:');
        console.log('   邮箱: testuser@example.com');
        console.log('   密码: password123');
        console.log('\n🚀 现在可以启动应用并测试登录功能了！');
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ 数据库初始化失败:', error.message);
        logger.error('Database initialization failed:', error);
        process.exit(1);
    } finally {
        await migrator.close();
    }
}

async function verifyData(migrator) {
    try {
        // 检查用户表
        const userResult = await migrator.pool.query('SELECT COUNT(*) FROM users');
        const userCount = parseInt(userResult.rows[0].count);
        console.log(`   👥 用户数量: ${userCount}`);
        
        if (userCount > 0) {
            const testUser = await migrator.pool.query(
                'SELECT email, username FROM users WHERE email = $1',
                ['testuser@example.com']
            );
            
            if (testUser.rows.length > 0) {
                console.log(`   ✅ 测试用户已创建: ${testUser.rows[0].email}`);
            } else {
                console.log('   ⚠️  未找到测试用户');
            }
        }
        
        // 检查其他表
        const tables = ['photos', 'sessions', 'live_streams'];
        for (const table of tables) {
            try {
                const result = await migrator.pool.query(`SELECT COUNT(*) FROM ${table}`);
                const count = parseInt(result.rows[0].count);
                console.log(`   📊 ${table} 表记录数: ${count}`);
            } catch (error) {
                console.log(`   ⚠️  表 ${table} 可能不存在`);
            }
        }
        
    } catch (error) {
        console.log('   ⚠️  数据验证时出现问题:', error.message);
    }
}

// 处理命令行参数
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
    case 'init':
    case undefined:
        initializeDatabase();
        break;
    case 'create-db':
        createDatabaseIfNotExists().then(() => {
            console.log('✅ 数据库创建完成！');
            process.exit(0);
        }).catch(error => {
            console.error('❌ 数据库创建失败:', error.message);
            process.exit(1);
        });
        break;
    case 'test':
        testConnection().then(() => {
            console.log('✅ 数据库连接测试成功！');
            process.exit(0);
        }).catch(error => {
            console.error('❌ 数据库连接测试失败:', error.message);
            process.exit(1);
        });
        break;
    case 'help':
    case '--help':
    case '-h':
        showHelp();
        break;
    default:
        console.error(`未知命令: ${command}`);
        showHelp();
        process.exit(1);
}

function showHelp() {
    console.log(`
数据库初始化工具

用法:
  node scripts/init-db.js [command]

命令:
  init (默认)  完整初始化数据库（创建数据库、迁移、种子数据）
  create-db    仅创建数据库
  test         测试数据库连接
  help         显示此帮助信息

示例:
  node scripts/init-db.js
  node scripts/init-db.js init
  node scripts/init-db.js create-db
  node scripts/init-db.js test
`);
}