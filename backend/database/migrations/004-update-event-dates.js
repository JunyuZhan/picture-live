/**
 * 数据库迁移脚本 - 更新活动时间字段
 * 创建时间: 2024-01-10  
 * 版本: 1.0.0
 * 描述: 将活动时间从单一日期+时间改为开始日期到结束日期
 */

const fs = require('fs');
const path = require('path');

/**
 * 执行向上迁移（修改表结构）
 * @param {Object} db - 数据库连接对象
 */
exports.up = async function(db) {
    console.log('开始执行活动时间字段迁移...');
    
    try {
        // 备份现有数据（如果有event_date字段的话）
        const backupResult = await db.query(`
            SELECT COUNT(*) as count FROM information_schema.columns 
            WHERE table_name = 'sessions' AND column_name = 'event_date'
        `);
        
        const hasEventDate = backupResult.rows[0].count > 0;
        
        if (hasEventDate) {
            console.log('📋 备份现有event_date数据...');
            await db.query(`
                CREATE TABLE IF NOT EXISTS sessions_backup_004 AS 
                SELECT * FROM sessions WHERE event_date IS NOT NULL
            `);
        }
        
        // 添加新字段
        console.log('📝 添加新的日期字段...');
        await db.query(`
            ALTER TABLE sessions 
            ADD COLUMN IF NOT EXISTS event_start_date DATE,
            ADD COLUMN IF NOT EXISTS event_end_date DATE
        `);
        
        // 迁移现有数据（如果有的话）
        if (hasEventDate) {
            console.log('🔄 迁移现有数据...');
            await db.query(`
                UPDATE sessions 
                SET event_start_date = event_date,
                    event_end_date = event_date
                WHERE event_date IS NOT NULL AND event_start_date IS NULL
            `);
        }
        
        // 删除旧字段（如果存在）
        console.log('🗑️ 删除旧字段...');
        await db.query(`
            ALTER TABLE sessions 
            DROP COLUMN IF EXISTS event_date,
            DROP COLUMN IF EXISTS event_start_time, 
            DROP COLUMN IF EXISTS event_end_time
        `);
        
        // 创建索引
        console.log('🔍 创建索引...');
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_sessions_event_start_date ON sessions(event_start_date);
            CREATE INDEX IF NOT EXISTS idx_sessions_event_end_date ON sessions(event_end_date);
        `);
        
        // 添加注释
        await db.query(`
            COMMENT ON COLUMN sessions.event_start_date IS '活动开始日期';
            COMMENT ON COLUMN sessions.event_end_date IS '活动结束日期';
        `);
        
        console.log('✅ 活动时间字段迁移完成');
        
    } catch (error) {
        console.error('❌ 活动时间字段迁移失败:', error.message);
        throw error;
    }
};

/**
 * 执行向下迁移（回滚表结构）
 * @param {Object} db - 数据库连接对象
 */
exports.down = async function(db) {
    console.log('开始回滚活动时间字段迁移...');
    
    try {
        // 删除索引
        await db.query(`
            DROP INDEX IF EXISTS idx_sessions_event_start_date;
            DROP INDEX IF EXISTS idx_sessions_event_end_date;
        `);
        
        // 删除新字段
        await db.query(`
            ALTER TABLE sessions 
            DROP COLUMN IF EXISTS event_start_date,
            DROP COLUMN IF EXISTS event_end_date
        `);
        
        // 恢复旧字段（如果有备份数据）
        const backupExists = await db.query(`
            SELECT COUNT(*) as count FROM information_schema.tables 
            WHERE table_name = 'sessions_backup_004'
        `);
        
        if (backupExists.rows[0].count > 0) {
            await db.query(`
                ALTER TABLE sessions 
                ADD COLUMN event_date DATE,
                ADD COLUMN event_start_time TIME,
                ADD COLUMN event_end_time TIME
            `);
            
            // 从备份恢复数据
            await db.query(`
                UPDATE sessions 
                SET event_date = b.event_date,
                    event_start_time = b.event_start_time,
                    event_end_time = b.event_end_time
                FROM sessions_backup_004 b
                WHERE sessions.id = b.id
            `);
        }
        
        console.log('✅ 活动时间字段迁移回滚完成');
        
    } catch (error) {
        console.error('❌ 活动时间字段迁移回滚失败:', error.message);
        throw error;
    }
};

/**
 * 迁移信息
 */
exports.info = {
    name: '004_update_event_dates',
    description: '将活动时间从单一日期+时间改为开始日期到结束日期',
    version: '1.0.0',
    author: 'System',
    created_at: '2024-01-10',
    dependencies: ['001_initial_schema'],
    changes: [
        'ADD COLUMN event_start_date DATE',
        'ADD COLUMN event_end_date DATE', 
        'DROP COLUMN event_date',
        'DROP COLUMN event_start_time',
        'DROP COLUMN event_end_time'
    ]
}; 