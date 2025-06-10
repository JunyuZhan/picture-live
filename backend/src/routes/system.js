/**
 * 系统配置管理路由
 * 处理系统级配置的查看和修改（仅限管理员）
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const redis = require('../config/redis');
const logger = require('../utils/logger');
const { asyncHandler, AppError, ValidationError } = require('../middleware/errorHandler');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// 输入验证规则
const updateConfigValidation = [
    body('config_key')
        .isLength({ min: 1, max: 100 })
        .withMessage('配置键必须在1-100个字符之间'),
    body('config_value')
        .notEmpty()
        .withMessage('配置值不能为空'),
    body('description')
        .optional()
        .isLength({ max: 500 })
        .withMessage('描述不能超过500个字符'),
    body('is_public')
        .optional()
        .isBoolean()
        .withMessage('是否公开必须是布尔值')
];

/**
 * 获取系统配置列表
 * GET /api/system/configs
 */
router.get('/configs', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, search, is_public } = req.query;
    const offset = (page - 1) * limit;
    
    // 构建查询条件
    let whereClause = 'WHERE 1=1';
    let params = [];
    let paramIndex = 1;
    
    if (search) {
        whereClause += ` AND (config_key ILIKE $${paramIndex++} OR description ILIKE $${paramIndex++})`;
        params.push(`%${search}%`, `%${search}%`);
    }
    
    if (is_public !== undefined) {
        whereClause += ` AND is_public = $${paramIndex++}`;
        params.push(is_public === 'true');
    }
    
    // 查询配置列表
    const result = await db.query(
        `SELECT id, config_key, config_value, description, is_public, 
                created_at, updated_at,
                COUNT(*) OVER() as total_count
         FROM system_configs
         ${whereClause}
         ORDER BY config_key ASC
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        [...params, limit, offset]
    );
    
    const configs = result.rows;
    const totalCount = configs.length > 0 ? parseInt(configs[0].total_count) : 0;
    
    res.json({
        success: true,
        data: {
            configs: configs.map(config => ({
                id: config.id,
                configKey: config.config_key,
                configValue: config.config_value,
                description: config.description,
                isPublic: config.is_public,
                createdAt: config.created_at,
                updatedAt: config.updated_at
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalCount,
                pages: Math.ceil(totalCount / limit)
            }
        }
    });
}));

/**
 * 获取单个系统配置
 * GET /api/system/configs/:key
 */
router.get('/configs/:key', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    const configKey = req.params.key;
    
    const result = await db.query(
        'SELECT * FROM system_configs WHERE config_key = $1',
        [configKey]
    );
    
    if (result.rows.length === 0) {
        throw new AppError('配置不存在', 404);
    }
    
    const config = result.rows[0];
    
    res.json({
        success: true,
        data: {
            config: {
                id: config.id,
                configKey: config.config_key,
                configValue: config.config_value,
                description: config.description,
                isPublic: config.is_public,
                createdAt: config.created_at,
                updatedAt: config.updated_at
            }
        }
    });
}));

/**
 * 创建系统配置
 * POST /api/system/configs
 */
router.post('/configs', authenticateToken, requireRole('admin'), updateConfigValidation, asyncHandler(async (req, res) => {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ValidationError('输入验证失败', errors.array());
    }
    
    const { config_key, config_value, description, is_public = false } = req.body;
    
    // 检查配置键是否已存在
    const existingResult = await db.query(
        'SELECT id FROM system_configs WHERE config_key = $1',
        [config_key]
    );
    
    if (existingResult.rows.length > 0) {
        throw new AppError('配置键已存在', 400);
    }
    
    // 创建配置
    const result = await db.query(
        `INSERT INTO system_configs (config_key, config_value, description, is_public)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [config_key, JSON.stringify(config_value), description, is_public]
    );
    
    const newConfig = result.rows[0];
    
    // 清除相关缓存
    await redis.deleteCache('system_configs:*');
    
    // 记录操作日志
    logger.info('系统配置创建成功', {
        adminUserId: req.user.userId,
        configKey: config_key,
        ip: req.ip
    });
    
    res.status(201).json({
        success: true,
        message: '配置创建成功',
        data: {
            config: {
                id: newConfig.id,
                configKey: newConfig.config_key,
                configValue: newConfig.config_value,
                description: newConfig.description,
                isPublic: newConfig.is_public,
                createdAt: newConfig.created_at,
                updatedAt: newConfig.updated_at
            }
        }
    });
}));

/**
 * 更新系统配置
 * PUT /api/system/configs/:key
 */
router.put('/configs/:key', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    const configKey = req.params.key;
    const { config_value, description, is_public } = req.body;
    
    // 检查配置是否存在
    const existingResult = await db.query(
        'SELECT * FROM system_configs WHERE config_key = $1',
        [configKey]
    );
    
    if (existingResult.rows.length === 0) {
        throw new AppError('配置不存在', 404);
    }
    
    const currentConfig = existingResult.rows[0];
    
    // 更新配置
    const result = await db.query(
        `UPDATE system_configs 
         SET config_value = $1, 
             description = $2, 
             is_public = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE config_key = $4
         RETURNING *`,
        [
            config_value !== undefined ? JSON.stringify(config_value) : currentConfig.config_value,
            description !== undefined ? description : currentConfig.description,
            is_public !== undefined ? is_public : currentConfig.is_public,
            configKey
        ]
    );
    
    const updatedConfig = result.rows[0];
    
    // 清除相关缓存
    await redis.deleteCache('system_configs:*');
    
    // 记录操作日志
    logger.info('系统配置更新成功', {
        adminUserId: req.user.userId,
        configKey,
        changes: req.body,
        ip: req.ip
    });
    
    res.json({
        success: true,
        message: '配置更新成功',
        data: {
            config: {
                id: updatedConfig.id,
                configKey: updatedConfig.config_key,
                configValue: updatedConfig.config_value,
                description: updatedConfig.description,
                isPublic: updatedConfig.is_public,
                createdAt: updatedConfig.created_at,
                updatedAt: updatedConfig.updated_at
            }
        }
    });
}));

/**
 * 删除系统配置
 * DELETE /api/system/configs/:key
 */
router.delete('/configs/:key', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    const configKey = req.params.key;
    
    // 检查配置是否存在
    const existingResult = await db.query(
        'SELECT * FROM system_configs WHERE config_key = $1',
        [configKey]
    );
    
    if (existingResult.rows.length === 0) {
        throw new AppError('配置不存在', 404);
    }
    
    // 删除配置
    await db.query(
        'DELETE FROM system_configs WHERE config_key = $1',
        [configKey]
    );
    
    // 清除相关缓存
    await redis.deleteCache('system_configs:*');
    
    // 记录操作日志
    logger.info('系统配置删除成功', {
        adminUserId: req.user.userId,
        configKey,
        ip: req.ip
    });
    
    res.json({
        success: true,
        message: '配置删除成功'
    });
}));

/**
 * 获取公开系统配置（无需管理员权限）
 * GET /api/system/public-configs
 */
router.get('/public-configs', asyncHandler(async (req, res) => {
    // 尝试从缓存获取
    const cached = await redis.getCache('system_configs:public');
    if (cached) {
        return res.json({
            success: true,
            data: { configs: JSON.parse(cached) }
        });
    }
    
    // 查询公开配置
    const result = await db.query(
        'SELECT config_key, config_value FROM system_configs WHERE is_public = true ORDER BY config_key'
    );
    
    const configs = {};
    result.rows.forEach(row => {
        configs[row.config_key] = row.config_value;
    });
    
    // 缓存公开配置
    await redis.setCache('system_configs:public', JSON.stringify(configs), 3600); // 1小时
    
    res.json({
        success: true,
        data: { configs }
    });
}));

/**
 * 获取系统统计信息
 * GET /api/system/stats
 */
router.get('/stats', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    // 获取各种统计数据
    const [
        userStats,
        sessionStats,
        photoStats,
        systemStats
    ] = await Promise.all([
        // 用户统计
        db.query(`
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users,
                COUNT(CASE WHEN role = 'photographer' THEN 1 END) as photographer_users,
                COUNT(CASE WHEN role = 'client' THEN 1 END) as client_users,
                COUNT(CASE WHEN email_verified = true THEN 1 END) as verified_users,
                COUNT(CASE WHEN is_active = true THEN 1 END) as active_users
            FROM users
        `),
        
        // 相册统计
        db.query(`
            SELECT 
                COUNT(*) as total_sessions,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_sessions,
                COUNT(CASE WHEN status = 'ended' THEN 1 END) as ended_sessions,
                COUNT(CASE WHEN is_public = true THEN 1 END) as public_sessions,
                COUNT(CASE WHEN is_public = false THEN 1 END) as private_sessions
            FROM sessions
        `),
        
        // 照片统计
        db.query(`
            SELECT 
                COUNT(*) as total_photos,
                COUNT(CASE WHEN status = 'published' THEN 1 END) as published_photos,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_photos,
                COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_photos,
                SUM(file_size) as total_storage_used
            FROM photos
        `),
        
        // 系统统计
        db.query(`
            SELECT 
                COUNT(*) as total_configs
            FROM system_configs
        `)
    ]);
    
    res.json({
        success: true,
        data: {
            users: userStats.rows[0],
            sessions: sessionStats.rows[0],
            photos: photoStats.rows[0],
            system: systemStats.rows[0],
            generatedAt: new Date().toISOString()
        }
    });
}));

module.exports = router; 