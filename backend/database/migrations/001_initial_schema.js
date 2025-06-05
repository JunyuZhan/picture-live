/**
 * 数据库迁移脚本 - 初始化架构
 * 创建时间: 2024-01-01
 * 版本: 1.0.0
 * 描述: 创建个人照片直播应用的初始数据库架构
 */

const fs = require('fs');
const path = require('path');

/**
 * 执行向上迁移（创建表结构）
 * @param {Object} db - 数据库连接对象
 */
exports.up = async function(db) {
    console.log('开始执行初始化数据库架构迁移...');
    
    try {
        // 读取并执行创建表的SQL脚本
        const createTablesSQL = fs.readFileSync(
            path.join(__dirname, '../init/01-create-tables.sql'), 
            'utf8'
        );
        
        // 直接执行整个SQL脚本，让PostgreSQL处理语句分割
        await db.query(createTablesSQL);
        
        console.log('✅ 数据库表结构创建完成');
        
        // 验证表是否创建成功
        const tables = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);
        
        console.log('📋 已创建的表:');
        tables.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
        });
        
        // 验证索引是否创建成功
        const indexes = await db.query(`
            SELECT indexname, tablename 
            FROM pg_indexes 
            WHERE schemaname = 'public'
            AND indexname NOT LIKE '%_pkey'
            ORDER BY tablename, indexname
        `);
        
        console.log('🔍 已创建的索引:');
        indexes.rows.forEach(row => {
            console.log(`   - ${row.tablename}.${row.indexname}`);
        });
        
        // 验证触发器是否创建成功
        const triggers = await db.query(`
            SELECT trigger_name, event_object_table 
            FROM information_schema.triggers 
            WHERE trigger_schema = 'public'
            ORDER BY event_object_table, trigger_name
        `);
        
        console.log('⚡ 已创建的触发器:');
        triggers.rows.forEach(row => {
            console.log(`   - ${row.event_object_table}.${row.trigger_name}`);
        });
        
        // 验证函数是否创建成功
        const functions = await db.query(`
            SELECT routine_name, routine_type 
            FROM information_schema.routines 
            WHERE routine_schema = 'public'
            AND routine_type = 'FUNCTION'
            ORDER BY routine_name
        `);
        
        console.log('🔧 已创建的函数:');
        functions.rows.forEach(row => {
            console.log(`   - ${row.routine_name}()`);
        });
        
        // 验证视图是否创建成功
        const views = await db.query(`
            SELECT table_name 
            FROM information_schema.views 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        
        console.log('👁️ 已创建的视图:');
        views.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
        });
        
        console.log('✅ 初始化数据库架构迁移完成');
        
    } catch (error) {
        console.error('❌ 数据库架构迁移失败:', error.message);
        throw error;
    }
};

/**
 * 执行向下迁移（删除表结构）
 * @param {Object} db - 数据库连接对象
 */
exports.down = async function(db) {
    console.log('开始回滚数据库架构迁移...');
    
    try {
        // 删除视图
        await db.query('DROP VIEW IF EXISTS photo_details CASCADE');
        await db.query('DROP VIEW IF EXISTS session_details CASCADE');
        console.log('✅ 视图删除完成');
        
        // 删除函数
        await db.query('DROP FUNCTION IF EXISTS get_session_stats(UUID) CASCADE');
        await db.query('DROP FUNCTION IF EXISTS cleanup_expired_upload_tasks() CASCADE');
        await db.query('DROP FUNCTION IF EXISTS generate_random_views(UUID, INTEGER) CASCADE');
        await db.query('DROP FUNCTION IF EXISTS reset_demo_data() CASCADE');
        await db.query('DROP FUNCTION IF EXISTS update_session_stats() CASCADE');
        await db.query('DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE');
        console.log('✅ 函数删除完成');
        
        // 删除表（按依赖关系逆序删除）
        const tables = [
            'photo_views',
            'session_access_logs',
            'upload_tasks',
            'api_keys',
            'photos',
            'sessions',
            'users',
            'system_configs'
        ];
        
        for (const table of tables) {
            await db.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
            console.log(`   - 删除表: ${table}`);
        }
        
        // 删除扩展
        await db.query('DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE');
        console.log('✅ UUID扩展删除完成');
        
        console.log('✅ 数据库架构回滚完成');
        
    } catch (error) {
        console.error('❌ 数据库架构回滚失败:', error.message);
        throw error;
    }
};

/**
 * 迁移信息
 */
exports.info = {
    name: '001_initial_schema',
    description: '创建个人照片直播应用的初始数据库架构',
    version: '1.0.0',
    author: 'System',
    created_at: '2024-01-01',
    dependencies: [],
    tables_created: [
        'users',
        'sessions', 
        'photos',
        'session_access_logs',
        'photo_views',
        'upload_tasks',
        'system_configs',
        'api_keys'
    ],
    indexes_created: [
        'idx_users_email',
        'idx_users_username',
        'idx_sessions_user_id',
        'idx_sessions_access_code',
        'idx_photos_session_id',
        'idx_photos_status',
        'idx_photos_tags'
    ],
    functions_created: [
        'update_updated_at_column',
        'update_session_stats',
        'cleanup_expired_upload_tasks',
        'get_session_stats'
    ],
    views_created: [
        'session_details',
        'photo_details'
    ]
};