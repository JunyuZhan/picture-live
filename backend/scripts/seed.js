#!/usr/bin/env node
/**
 * 数据库种子数据脚本
 * 用于插入测试数据和初始数据
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

async function runSeeds() {
    const migrator = new DatabaseMigrator(dbConfig);
    
    try {
        console.log('🌱 开始执行数据库种子数据...');
        
        // 初始化迁移系统
        await migrator.initialize();
        
        // 执行种子数据
        const result = await migrator.seed();
        
        if (result.executed.length > 0) {
            console.log('✅ 种子数据执行完成！执行的种子:');
            result.executed.forEach(seed => {
                console.log(`   - ${seed.name}`);
            });
        } else {
            console.log('ℹ️  没有需要执行的种子数据');
        }
        
        console.log('🎉 数据库种子数据成功完成！');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ 数据库种子数据失败:', error.message);
        logger.error('Seed failed:', error);
        process.exit(1);
    } finally {
        await migrator.close();
    }
}

// 处理命令行参数
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
    case 'run':
    case undefined:
        runSeeds();
        break;
    case 'status':
        checkSeedStatus();
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

async function checkSeedStatus() {
    const migrator = new DatabaseMigrator(dbConfig);
    
    try {
        await migrator.initialize();
        const status = await migrator.getSeedStatus();
        
        console.log('📊 数据库种子数据状态:');
        console.log(`   待执行种子: ${status.pending.length}`);
        console.log(`   已执行种子: ${status.executed.length}`);
        
        if (status.pending.length > 0) {
            console.log('\n⏳ 待执行的种子:');
            status.pending.forEach(seed => {
                console.log(`   - ${seed.name}`);
            });
        }
        
        if (status.executed.length > 0) {
            console.log('\n✅ 已执行的种子:');
            status.executed.forEach(seed => {
                console.log(`   - ${seed.seed_name} (${seed.executed_at})`);
            });
        }
        
    } catch (error) {
        console.error('❌ 检查种子状态失败:', error.message);
        process.exit(1);
    } finally {
        await migrator.close();
    }
}

function showHelp() {
    console.log(`
数据库种子数据工具

用法:
  node scripts/seed.js [command]

命令:
  run (默认)   执行所有种子数据
  status       显示种子数据状态
  help         显示此帮助信息

示例:
  node scripts/seed.js
  node scripts/seed.js run
  node scripts/seed.js status
`);
}