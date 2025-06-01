/**
 * 会话管理路由
 * 处理拍摄会话的创建、管理、查看等功能
 */

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const redis = require('../config/redis');
const logger = require('../utils/logger');
const { asyncHandler, AppError, ValidationError } = require('../middleware/errorHandler');
const { 
    authenticateToken, 
    optionalAuth, 
    requireRole, 
    requireOwnership, 
    requireSessionAccess 
} = require('../middleware/auth');

const router = express.Router();

// 输入验证规则
const createSessionValidation = [
    body('title')
        .isLength({ min: 1, max: 255 })
        .withMessage('会话标题必须在1-255个字符之间'),
    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('会话描述不能超过1000个字符'),
    body('isPublic')
        .optional()
        .isBoolean()
        .withMessage('isPublic必须是布尔值'),
    body('accessCode')
        .optional()
        .isLength({ min: 4, max: 20 })
        .matches(/^[A-Z0-9]+$/)
        .withMessage('访问码必须是4-20位大写字母和数字'),
    body('settings')
        .optional()
        .isObject()
        .withMessage('设置必须是对象'),
    body('watermarkEnabled')
        .optional()
        .isBoolean()
        .withMessage('watermarkEnabled必须是布尔值'),
    body('watermarkText')
        .optional()
        .isLength({ max: 255 })
        .withMessage('水印文字不能超过255个字符'),
    body('reviewMode')
        .optional()
        .isBoolean()
        .withMessage('reviewMode必须是布尔值'),
    body('autoTagEnabled')
        .optional()
        .isBoolean()
        .withMessage('autoTagEnabled必须是布尔值'),
    body('language')
        .optional()
        .isIn(['zh-CN', 'en-US', 'ja-JP'])
        .withMessage('不支持的语言')
];

const updateSessionValidation = [
    body('title')
        .optional()
        .isLength({ min: 1, max: 255 })
        .withMessage('会话标题必须在1-255个字符之间'),
    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('会话描述不能超过1000个字符'),
    body('status')
        .optional()
        .isIn(['active', 'paused', 'ended', 'archived'])
        .withMessage('无效的会话状态'),
    body('settings')
        .optional()
        .isObject()
        .withMessage('设置必须是对象')
];

const listSessionsValidation = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('页码必须是正整数'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('每页数量必须在1-100之间'),
    query('status')
        .optional()
        .isIn(['active', 'paused', 'ended', 'archived'])
        .withMessage('无效的会话状态'),
    query('search')
        .optional()
        .isLength({ max: 100 })
        .withMessage('搜索关键词不能超过100个字符')
];

/**
 * 生成访问码
 */
function generateAccessCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * 创建新会话
 * POST /api/sessions
 */
router.post('/', authenticateToken, createSessionValidation, asyncHandler(async (req, res) => {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ValidationError('输入验证失败', errors.array());
    }
    
    const {
        title,
        description,
        isPublic = false,
        accessCode,
        settings = {},
        watermarkEnabled = false,
        watermarkText,
        reviewMode = false,
        autoTagEnabled = false,
        language = 'zh-CN'
    } = req.body;
    
    const userId = req.user.userId;
    
    // 生成访问码（如果需要且未提供）
    let finalAccessCode = accessCode;
    if (!isPublic && !finalAccessCode) {
        finalAccessCode = generateAccessCode();
        
        // 确保访问码唯一
        let attempts = 0;
        while (attempts < 10) {
            const existing = await db.query(
                'SELECT id FROM sessions WHERE access_code = $1',
                [finalAccessCode]
            );
            
            if (existing.rows.length === 0) {
                break;
            }
            
            finalAccessCode = generateAccessCode();
            attempts++;
        }
        
        if (attempts >= 10) {
            throw new AppError('无法生成唯一访问码，请稍后重试', 500);
        }
    }
    
    // 创建会话
    const result = await db.query(
        `INSERT INTO sessions (
            user_id, title, description, access_code, is_public, status,
            settings, watermark_enabled, watermark_text, review_mode,
            auto_tag_enabled, language
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
            userId, title, description, finalAccessCode, isPublic, 'active',
            JSON.stringify(settings), watermarkEnabled, watermarkText, reviewMode,
            autoTagEnabled, language
        ]
    );
    
    const session = result.rows[0];
    
    // 缓存会话信息
    await redis.setCache(`session:${session.id}`, JSON.stringify(session), 3600); // 1小时
    
    // 记录创建日志
    logger.info('会话创建成功', {
        sessionId: session.id,
        userId,
        title,
        isPublic,
        ip: req.ip
    });
    
    res.status(201).json({
        success: true,
        message: '会话创建成功',
        data: {
            session: {
                id: session.id,
                title: session.title,
                description: session.description,
                accessCode: session.access_code,
                isPublic: session.is_public,
                status: session.status,
                settings: session.settings,
                watermarkEnabled: session.watermark_enabled,
                watermarkText: session.watermark_text,
                reviewMode: session.review_mode,
                autoTagEnabled: session.auto_tag_enabled,
                language: session.language,
                totalPhotos: session.total_photos,
                publishedPhotos: session.published_photos,
                pendingPhotos: session.pending_photos,
                startedAt: session.started_at,
                createdAt: session.created_at
            }
        }
    });
}));

/**
 * 获取会话列表
 * GET /api/sessions
 */
router.get('/', authenticateToken, listSessionsValidation, asyncHandler(async (req, res) => {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ValidationError('输入验证失败', errors.array());
    }
    
    const {
        page = 1,
        limit = 20,
        status,
        search
    } = req.query;
    
    const userId = req.user.userId;
    const offset = (page - 1) * limit;
    
    // 构建查询条件
    let whereClause = 'WHERE s.user_id = $1';
    let params = [userId];
    let paramIndex = 2;
    
    if (status) {
        whereClause += ` AND s.status = $${paramIndex++}`;
        params.push(status);
    }
    
    if (search) {
        whereClause += ` AND (s.title ILIKE $${paramIndex++} OR s.description ILIKE $${paramIndex++})`;
        params.push(`%${search}%`, `%${search}%`);
    }
    
    // 查询会话列表
    const sessionsResult = await db.query(
        `SELECT s.*, 
                COUNT(*) OVER() as total_count
         FROM session_details s
         ${whereClause}
         ORDER BY s.created_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        [...params, limit, offset]
    );
    
    const sessions = sessionsResult.rows;
    const totalCount = sessions.length > 0 ? parseInt(sessions[0].total_count) : 0;
    
    res.json({
        success: true,
        data: {
            sessions: sessions.map(session => ({
                id: session.id,
                title: session.title,
                description: session.description,
                isPublic: session.is_public,
                status: session.status,
                totalPhotos: session.total_photos,
                publishedPhotos: session.published_photos,
                pendingPhotos: session.pending_photos,
                totalViews: session.total_views,
                uniqueViewers: session.unique_viewers,
                duration: session.duration,
                startedAt: session.started_at,
                endedAt: session.ended_at,
                createdAt: session.created_at,
                updatedAt: session.updated_at
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
 * 获取单个会话详情
 * GET /api/sessions/:id
 */
router.get('/:id', optionalAuth, requireSessionAccess, asyncHandler(async (req, res) => {
    const sessionId = req.params.id;
    
    // 尝试从缓存获取
    const cached = await redis.getCache(`session:${sessionId}`);
    if (cached) {
        const session = JSON.parse(cached);
        
        // 检查用户权限决定返回的信息
        const isOwner = req.user && req.user.userId === session.user_id;
        const isAdmin = req.user && req.user.role === 'admin';
        
        return res.json({
            success: true,
            data: {
                session: {
                    id: session.id,
                    title: session.title,
                    description: session.description,
                    isPublic: session.is_public,
                    status: session.status,
                    settings: isOwner || isAdmin ? session.settings : undefined,
                    watermarkEnabled: session.watermark_enabled,
                    watermarkText: session.watermark_text,
                    reviewMode: session.review_mode,
                    autoTagEnabled: session.auto_tag_enabled,
                    language: session.language,
                    totalPhotos: session.total_photos,
                    publishedPhotos: session.published_photos,
                    pendingPhotos: isOwner || isAdmin ? session.pending_photos : undefined,
                    rejectedPhotos: isOwner || isAdmin ? session.rejected_photos : undefined,
                    totalViews: session.total_views,
                    uniqueViewers: session.unique_viewers,
                    startedAt: session.started_at,
                    endedAt: session.ended_at,
                    createdAt: session.created_at,
                    updatedAt: session.updated_at,
                    accessCode: isOwner || isAdmin ? session.access_code : undefined
                }
            }
        });
    }
    
    // 从数据库查询
    const result = await db.query(
        'SELECT * FROM session_details WHERE id = $1',
        [sessionId]
    );
    
    if (result.rows.length === 0) {
        throw new AppError('会话不存在', 404);
    }
    
    const session = result.rows[0];
    
    // 缓存会话信息
    await redis.setCache(`session:${sessionId}`, JSON.stringify(session), 3600);
    
    // 检查用户权限决定返回的信息
    const isOwner = req.user && req.user.userId === session.user_id;
    const isAdmin = req.user && req.user.role === 'admin';
    
    res.json({
        success: true,
        data: {
            session: {
                id: session.id,
                title: session.title,
                description: session.description,
                isPublic: session.is_public,
                status: session.status,
                settings: isOwner || isAdmin ? session.settings : undefined,
                watermarkEnabled: session.watermark_enabled,
                watermarkText: session.watermark_text,
                reviewMode: session.review_mode,
                autoTagEnabled: session.auto_tag_enabled,
                language: session.language,
                totalPhotos: session.total_photos,
                publishedPhotos: session.published_photos,
                pendingPhotos: isOwner || isAdmin ? session.pending_photos : undefined,
                rejectedPhotos: isOwner || isAdmin ? session.rejected_photos : undefined,
                totalViews: session.total_views,
                uniqueViewers: session.unique_viewers,
                duration: session.duration,
                startedAt: session.started_at,
                endedAt: session.ended_at,
                createdAt: session.created_at,
                updatedAt: session.updated_at,
                accessCode: isOwner || isAdmin ? session.access_code : undefined,
                creatorUsername: session.creator_username,
                creatorDisplayName: session.creator_display_name
            }
        }
    });
}));

/**
 * 更新会话信息
 * PUT /api/sessions/:id
 */
router.put('/:id', authenticateToken, requireOwnership('session'), updateSessionValidation, asyncHandler(async (req, res) => {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ValidationError('输入验证失败', errors.array());
    }
    
    const sessionId = req.params.id;
    const {
        title,
        description,
        status,
        settings,
        watermarkEnabled,
        watermarkText,
        reviewMode,
        autoTagEnabled
    } = req.body;
    
    // 构建更新字段
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (title !== undefined) {
        updates.push(`title = $${paramIndex++}`);
        values.push(title);
    }
    
    if (description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(description);
    }
    
    if (status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(status);
        
        // 如果状态改为ended，设置结束时间
        if (status === 'ended') {
            updates.push(`ended_at = CURRENT_TIMESTAMP`);
        }
    }
    
    if (settings !== undefined) {
        updates.push(`settings = $${paramIndex++}`);
        values.push(JSON.stringify(settings));
    }
    
    if (watermarkEnabled !== undefined) {
        updates.push(`watermark_enabled = $${paramIndex++}`);
        values.push(watermarkEnabled);
    }
    
    if (watermarkText !== undefined) {
        updates.push(`watermark_text = $${paramIndex++}`);
        values.push(watermarkText);
    }
    
    if (reviewMode !== undefined) {
        updates.push(`review_mode = $${paramIndex++}`);
        values.push(reviewMode);
    }
    
    if (autoTagEnabled !== undefined) {
        updates.push(`auto_tag_enabled = $${paramIndex++}`);
        values.push(autoTagEnabled);
    }
    
    if (updates.length === 0) {
        throw new AppError('没有要更新的字段', 400);
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(sessionId);
    
    // 更新会话
    const result = await db.query(
        `UPDATE sessions SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`,
        values
    );
    
    const session = result.rows[0];
    
    // 更新缓存
    await redis.setCache(`session:${sessionId}`, JSON.stringify(session), 3600);
    
    // 记录更新日志
    logger.info('会话更新成功', {
        sessionId,
        userId: req.user.userId,
        updates: req.body,
        ip: req.ip
    });
    
    res.json({
        success: true,
        message: '会话更新成功',
        data: {
            session: {
                id: session.id,
                title: session.title,
                description: session.description,
                status: session.status,
                settings: session.settings,
                watermarkEnabled: session.watermark_enabled,
                watermarkText: session.watermark_text,
                reviewMode: session.review_mode,
                autoTagEnabled: session.auto_tag_enabled,
                endedAt: session.ended_at,
                updatedAt: session.updated_at
            }
        }
    });
}));

/**
 * 删除会话
 * DELETE /api/sessions/:id
 */
router.delete('/:id', authenticateToken, requireOwnership('session'), asyncHandler(async (req, res) => {
    const sessionId = req.params.id;
    
    // 检查会话是否有照片
    const photosResult = await db.query(
        'SELECT COUNT(*) as photo_count FROM photos WHERE session_id = $1',
        [sessionId]
    );
    
    const photoCount = parseInt(photosResult.rows[0].photo_count);
    
    if (photoCount > 0) {
        throw new AppError('无法删除包含照片的会话，请先删除所有照片', 400);
    }
    
    // 删除会话
    await db.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
    
    // 清除缓存
    await redis.deleteCache(`session:${sessionId}`);
    
    // 记录删除日志
    logger.info('会话删除成功', {
        sessionId,
        userId: req.user.userId,
        ip: req.ip
    });
    
    res.json({
        success: true,
        message: '会话删除成功'
    });
}));

/**
 * 获取会话统计信息
 * GET /api/sessions/:id/stats
 */
router.get('/:id/stats', authenticateToken, requireOwnership('session'), asyncHandler(async (req, res) => {
    const sessionId = req.params.id;
    
    // 获取统计信息
    const statsResult = await db.query(
        'SELECT * FROM get_session_stats($1)',
        [sessionId]
    );
    
    if (statsResult.rows.length === 0) {
        throw new AppError('会话不存在', 404);
    }
    
    const stats = statsResult.rows[0];
    
    // 获取最近访问记录
    const recentAccessResult = await db.query(
        `SELECT ip_address, user_agent, access_granted, client_type, created_at
         FROM session_access_logs
         WHERE session_id = $1
         ORDER BY created_at DESC
         LIMIT 10`,
        [sessionId]
    );
    
    res.json({
        success: true,
        data: {
            stats: {
                totalPhotos: stats.total_photos,
                publishedPhotos: stats.published_photos,
                pendingPhotos: stats.pending_photos,
                rejectedPhotos: stats.rejected_photos,
                totalViews: stats.total_views,
                uniqueViewers: stats.unique_viewers,
                avgViewDuration: parseFloat(stats.avg_view_duration)
            },
            recentAccess: recentAccessResult.rows.map(access => ({
                ipAddress: access.ip_address,
                userAgent: access.user_agent,
                accessGranted: access.access_granted,
                clientType: access.client_type,
                accessedAt: access.created_at
            }))
        }
    });
}));

/**
 * 验证访问码
 * POST /api/sessions/:id/verify-access
 */
router.post('/:id/verify-access', asyncHandler(async (req, res) => {
    const sessionId = req.params.id;
    const { accessCode } = req.body;
    
    if (!accessCode) {
        throw new AppError('访问码不能为空', 400);
    }
    
    // 查询会话
    const result = await db.query(
        'SELECT id, access_code, is_public, status FROM sessions WHERE id = $1',
        [sessionId]
    );
    
    if (result.rows.length === 0) {
        throw new AppError('会话不存在', 404);
    }
    
    const session = result.rows[0];
    
    // 公开会话不需要访问码
    if (session.is_public) {
        return res.json({
            success: true,
            message: '访问验证成功',
            data: { valid: true }
        });
    }
    
    // 验证访问码
    const isValid = session.access_code === accessCode;
    
    // 记录访问尝试
    await db.query(
        `INSERT INTO session_access_logs 
         (session_id, ip_address, user_agent, access_code_used, access_granted, client_type)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
            sessionId,
            req.ip,
            req.get('User-Agent') || '',
            accessCode,
            isValid,
            'viewer'
        ]
    );
    
    if (!isValid) {
        throw new AppError('访问码错误', 401);
    }
    
    res.json({
        success: true,
        message: '访问验证成功',
        data: { valid: true }
    });
}));

module.exports = router;