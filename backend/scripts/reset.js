#!/usr/bin/env node
/**
 * 数据库重置脚本
 * 用于重置数据库到初始状态
 */

const path = require('path');
const DatabaseMigrator = require('../src/database/migrator');
const logger = require('../src/utils/logger');
const readline = require('readline');

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

// 创建readline接口用于用户确认
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

async function resetDatabase(force = false) {
    const migrator = new DatabaseMigrator(dbConfig);
    
    try {
        if (!force) {
            console.log('⚠️  警告: 此操作将删除所有数据库表和数据！');
            const answer = await askQuestion('确定要继续吗？(yes/no): ');
            
            if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
                console.log('❌ 操作已取消');
                process.exit(0);
            }
        }
        
        console.log('🔄 开始重置数据库...');
        
        // 重置数据库
        await migrator.reset();
        
        console.log('✅ 数据库重置完成！');
        console.log('🚀 开始重新执行迁移...');
        
        // 重新执行迁移
        await migrator.initialize();
        const migrateResult = await migrator.migrate();
        
        if (migrateResult.executed.length > 0) {
            console.log('✅ 迁移完成！执行的迁移:');
            migrateResult.executed.forEach(migration => {
                console.log(`   - ${migration.name}`);
            });
        }
        
        console.log('🌱 开始执行种子数据...');
        
        // 执行种子数据
        const seedResult = await migrator.seed();
        
        if (seedResult.executed.length > 0) {
            console.log('✅ 种子数据完成！执行的种子:');
            seedResult.executed.forEach(seed => {
                console.log(`   - ${seed.name}`);
            });
        }
        
        console.log('🎉 数据库重置并初始化成功完成！');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ 数据库重置失败:', error.message);
        logger.error('Reset failed:', error);
        process.exit(1);
    } finally {
        rl.close();
        await migrator.close();
    }
}

async function dropAllTables() {
    const migrator = new DatabaseMigrator(dbConfig);
    
    try {
        console.log('🗑️  开始删除所有表...');
        
        await migrator.dropAllTables();
        
        console.log('✅ 所有表已删除！');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ 删除表失败:', error.message);
        logger.error('Drop tables failed:', error);
        process.exit(1);
    } finally {
        rl.close();
        await migrator.close();
    }
}

// 处理命令行参数
const args = process.argv.slice(2);
const command = args[0];
const force = args.includes('--force') || args.includes('-f');

switch (command) {
    case 'full':
    case undefined:
        resetDatabase(force);
        break;
    case 'drop':
        dropAllTables();
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
数据库重置工具

用法:
  node scripts/reset.js [command] [options]

命令:
  full (默认)  完全重置数据库（删除所有表，重新迁移，执行种子数据）
  drop         仅删除所有表
  help         显示此帮助信息

选项:
  --force, -f  跳过确认提示

示例:
  node scripts/reset.js
  node scripts/reset.js full
  node scripts/reset.js drop
  node scripts/reset.js --force
`);
}