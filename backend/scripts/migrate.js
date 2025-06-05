#!/usr/bin/env node
/**
 * 数据库迁移脚本
 * 用于执行数据库架构迁移
 */

const path = require('path');
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

async function runMigrations() {
    const migrator = new DatabaseMigrator(dbConfig);
    
    try {
        console.log('🚀 开始数据库迁移...');
        
        // 初始化迁移系统
        await migrator.initialize();
        
        // 执行所有待执行的迁移
        const result = await migrator.migrate();
        
        if (result.executed.length > 0) {
            console.log('✅ 迁移完成！执行的迁移:');
            result.executed.forEach(migration => {
                console.log(`   - ${migration.name}`);
            });
        } else {
            console.log('ℹ️  没有需要执行的迁移');
        }
        
        console.log('🎉 数据库迁移成功完成！');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ 数据库迁移失败:', error.message);
        logger.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await migrator.close();
    }
}

// 处理命令行参数
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
    case 'up':
    case undefined:
        runMigrations();
        break;
    case 'status':
        checkMigrationStatus();
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

async function checkMigrationStatus() {
    const migrator = new DatabaseMigrator(dbConfig);
    
    try {
        await migrator.initialize();
        const status = await migrator.getStatus();
        
        console.log('📊 数据库迁移状态:');
        console.log(`   待执行迁移: ${status.pending.length}`);
        console.log(`   已执行迁移: ${status.executed.length}`);
        
        if (status.pending.length > 0) {
            console.log('\n⏳ 待执行的迁移:');
            status.pending.forEach(migration => {
                console.log(`   - ${migration.name}`);
            });
        }
        
        if (status.executed.length > 0) {
            console.log('\n✅ 已执行的迁移:');
            status.executed.forEach(migration => {
                console.log(`   - ${migration.migration_name} (${migration.executed_at})`);
            });
        }
        
    } catch (error) {
        console.error('❌ 检查迁移状态失败:', error.message);
        process.exit(1);
    } finally {
        await migrator.close();
    }
}

function showHelp() {
    console.log(`
数据库迁移工具

用法:
  node scripts/migrate.js [command]

命令:
  up (默认)    执行所有待执行的迁移
  status       显示迁移状态
  help         显示此帮助信息

示例:
  node scripts/migrate.js
  node scripts/migrate.js up
  node scripts/migrate.js status
`);
}