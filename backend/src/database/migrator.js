/**
 * 数据库迁移管理器
 * 负责管理数据库架构的版本控制和迁移
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const logger = require('../utils/logger');

class DatabaseMigrator {
    constructor(config) {
        this.config = config;
        this.pool = new Pool(config);
        this.migrationsPath = path.join(__dirname, '../../database/migrations');
        this.seedsPath = path.join(__dirname, '../../database/seeds');
    }

    /**
     * 初始化迁移系统
     */
    async initialize() {
        try {
            // 创建迁移记录表
            await this.createMigrationsTable();
            logger.info('数据库迁移系统初始化完成');
        } catch (error) {
            logger.error('数据库迁移系统初始化失败:', error);
            throw error;
        }
    }

    /**
     * 创建迁移记录表
     */
    async createMigrationsTable() {
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id SERIAL PRIMARY KEY,
                migration_name VARCHAR(255) UNIQUE NOT NULL,
                version VARCHAR(50) NOT NULL,
                description TEXT,
                executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                execution_time_ms INTEGER,
                checksum VARCHAR(64),
                status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'rolled_back'))
            );
            
            CREATE INDEX IF NOT EXISTS idx_schema_migrations_name ON schema_migrations(migration_name);
            CREATE INDEX IF NOT EXISTS idx_schema_migrations_executed_at ON schema_migrations(executed_at);
        `;
        
        await this.pool.query(createTableSQL);
    }

    /**
     * 获取所有可用的迁移文件
     */
    async getAvailableMigrations() {
        try {
            const files = fs.readdirSync(this.migrationsPath)
                .filter(file => file.endsWith('.js'))
                .sort();
            
            const migrations = [];
            
            for (const file of files) {
                const migrationPath = path.join(this.migrationsPath, file);
                const migration = require(migrationPath);
                
                migrations.push({
                    name: path.basename(file, '.js'),
                    file: file,
                    path: migrationPath,
                    info: migration.info || {},
                    up: migration.up,
                    down: migration.down
                });
            }
            
            return migrations;
        } catch (error) {
            logger.error('获取迁移文件失败:', error);
            throw error;
        }
    }

    /**
     * 获取已执行的迁移记录
     */
    async getExecutedMigrations() {
        try {
            const result = await this.pool.query(
                'SELECT * FROM schema_migrations ORDER BY executed_at ASC'
            );
            return result.rows;
        } catch (error) {
            logger.error('获取已执行迁移记录失败:', error);
            throw error;
        }
    }

    /**
     * 获取待执行的迁移
     */
    async getPendingMigrations() {
        const available = await this.getAvailableMigrations();
        const executed = await this.getExecutedMigrations();
        
        const executedNames = new Set(executed.map(m => m.migration_name));
        
        return available.filter(migration => !executedNames.has(migration.name));
    }

    /**
     * 执行单个迁移
     */
    async executeMigration(migration, direction = 'up') {
        const client = await this.pool.connect();
        const startTime = Date.now();
        
        try {
            await client.query('BEGIN');
            
            logger.info(`开始执行迁移: ${migration.name} (${direction})`);
            
            // 执行迁移
            if (direction === 'up') {
                await migration.up(client);
            } else {
                await migration.down(client);
            }
            
            const executionTime = Date.now() - startTime;
            
            // 记录迁移执行
            if (direction === 'up') {
                await client.query(
                    `INSERT INTO schema_migrations 
                     (migration_name, version, description, execution_time_ms, status) 
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (migration_name) DO UPDATE SET
                     executed_at = CURRENT_TIMESTAMP,
                     execution_time_ms = $4,
                     status = $5`,
                    [
                        migration.name,
                        migration.info.version || '1.0.0',
                        migration.info.description || '',
                        executionTime,
                        'completed'
                    ]
                );
            } else {
                await client.query(
                    'UPDATE schema_migrations SET status = $1 WHERE migration_name = $2',
                    ['rolled_back', migration.name]
                );
            }
            
            await client.query('COMMIT');
            
            logger.info(`迁移执行完成: ${migration.name} (${executionTime}ms)`);
            
        } catch (error) {
            await client.query('ROLLBACK');
            
            // 记录失败状态
            try {
                await client.query(
                    `INSERT INTO schema_migrations 
                     (migration_name, version, description, execution_time_ms, status) 
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (migration_name) DO UPDATE SET
                     executed_at = CURRENT_TIMESTAMP,
                     execution_time_ms = $4,
                     status = $5`,
                    [
                        migration.name,
                        migration.info.version || '1.0.0',
                        migration.info.description || '',
                        Date.now() - startTime,
                        'failed'
                    ]
                );
            } catch (recordError) {
                logger.error('记录迁移失败状态时出错:', recordError);
            }
            
            logger.error(`迁移执行失败: ${migration.name}`, error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * 执行所有待执行的迁移
     */
    async migrate() {
        try {
            const pending = await this.getPendingMigrations();
            
            if (pending.length === 0) {
                logger.info('没有待执行的迁移');
                return { executed: [] };
            }
            
            logger.info(`发现 ${pending.length} 个待执行的迁移`);
            
            const executed = [];
            
            for (const migration of pending) {
                await this.executeMigration(migration, 'up');
                executed.push({ name: migration.name });
            }
            
            logger.info(`成功执行 ${executed.length} 个迁移`);
            
            return { executed };
            
        } catch (error) {
            logger.error('迁移执行失败:', error);
            throw error;
        }
    }

    /**
     * 回滚指定的迁移
     */
    async rollback(migrationName) {
        try {
            const available = await this.getAvailableMigrations();
            const migration = available.find(m => m.name === migrationName);
            
            if (!migration) {
                throw new Error(`迁移不存在: ${migrationName}`);
            }
            
            if (!migration.down) {
                throw new Error(`迁移 ${migrationName} 没有定义回滚方法`);
            }
            
            await this.executeMigration(migration, 'down');
            
            logger.info(`迁移回滚完成: ${migrationName}`);
            
        } catch (error) {
            logger.error(`迁移回滚失败: ${migrationName}`, error);
            throw error;
        }
    }

    /**
     * 获取迁移状态
     */
    async getStatus() {
        try {
            const available = await this.getAvailableMigrations();
            const executed = await this.getExecutedMigrations();
            const pending = await this.getPendingMigrations();
            
            return {
                total: available.length,
                executed: executed,
                pending: pending,
                failed: executed.filter(m => m.status === 'failed').length,
                migrations: {
                    available: available.map(m => m.name),
                    executed: executed.map(m => m.migration_name),
                    pending: pending.map(m => m.name),
                    failed: executed.filter(m => m.status === 'failed').map(m => m.migration_name)
                }
            };
        } catch (error) {
            logger.error('获取迁移状态失败:', error);
            throw error;
        }
    }

    /**
     * 执行种子数据
     */
    async seed(seedName = null) {
        try {
            const files = fs.readdirSync(this.seedsPath)
                .filter(file => file.endsWith('.sql'))
                .sort();
            
            const executed = [];
            
            if (seedName) {
                const seedFile = files.find(file => file.includes(seedName));
                if (!seedFile) {
                    throw new Error(`种子文件不存在: ${seedName}`);
                }
                await this.executeSeedFile(seedFile);
                executed.push({ name: seedFile });
            } else {
                for (const file of files) {
                    await this.executeSeedFile(file);
                    executed.push({ name: file });
                }
            }
            
            logger.info('种子数据执行完成');
            
            return { executed };
            
        } catch (error) {
            logger.error('种子数据执行失败:', error);
            throw error;
        }
    }

    /**
     * 执行单个种子文件
     */
    async executeSeedFile(filename) {
        const client = await this.pool.connect();
        
        try {
            const seedPath = path.join(this.seedsPath, filename);
            const seedSQL = fs.readFileSync(seedPath, 'utf8');
            
            logger.info(`执行种子文件: ${filename}`);
            
            await client.query('BEGIN');
            
            // 直接执行整个SQL脚本，让PostgreSQL处理语句分割
            await client.query(seedSQL);
            
            await client.query('COMMIT');
            
            logger.info(`种子文件执行完成: ${filename}`);
            
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error(`种子文件执行失败: ${filename}`, error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * 获取种子数据状态
     */
    async getSeedStatus() {
        try {
            const files = fs.readdirSync(this.seedsPath)
                .filter(file => file.endsWith('.sql'))
                .sort();
            
            return {
                pending: files.map(file => ({ name: file })),
                executed: [] // 简化实现，种子数据通常可以重复执行
            };
        } catch (error) {
            logger.error('获取种子状态失败:', error);
            throw error;
        }
    }

    /**
     * 删除所有表
     */
    async dropAllTables() {
        const client = await this.pool.connect();
        
        try {
            logger.warn('开始删除所有表...');
            
            await client.query('BEGIN');
            
            // 获取所有表名
            const result = await client.query(`
                SELECT tablename 
                FROM pg_tables 
                WHERE schemaname = 'public'
            `);
            
            // 删除所有表
            for (const row of result.rows) {
                await client.query(`DROP TABLE IF EXISTS "${row.tablename}" CASCADE`);
                logger.info(`删除表: ${row.tablename}`);
            }
            
            await client.query('COMMIT');
            
            logger.warn('所有表删除完成');
            
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('删除表失败:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * 重置数据库（危险操作）
     */
    async reset() {
        try {
            logger.warn('开始重置数据库...');
            
            // 直接删除所有表
            await this.dropAllTables();
            
            logger.warn('数据库重置完成');
            
        } catch (error) {
            logger.error('数据库重置失败:', error);
            throw error;
        }
    }

    /**
     * 关闭数据库连接
     */
    async close() {
        await this.pool.end();
    }
}

module.exports = DatabaseMigrator;