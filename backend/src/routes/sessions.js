/**
 * 相册管理路由
 * 处理拍摄相册的创建、管理、查看等功能
 */

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const redis = require('../config/redis');
const logger = require('../utils/logger');
const { asyncHandler, AppError, ValidationError, NotFoundError } = require('../middleware/errorHandler');
const { 
    authenticateToken, 
    optionalAuth, 
    requireRole, 
    requireOwnership, 
    requireSessionAccess,
    requireSessionOwnership
} = require('../middleware/auth');

const router = express.Router();

// 加入相册验证规则
const joinSessionValidation = [
    body('accessCode')
        .isLength({ min: 4, max: 20 })
        .matches(/^[A-Z0-9]+$/)
        .withMessage('访问码必须是4-20位大写字母和数字'),
    body('displayName')
        .optional()
        .isLength({ max: 50 })
        .withMessage('显示名称不能超过50个字符')
];

// 输入验证规则
const createSessionValidation = [
    body('title')
        .isLength({ min: 1, max: 255 })
        .withMessage('相册标题必须在1-255个字符之间'),
    body('description')
        .optional()
        .isLength({ max: 500 })
        .withMessage('相册描述不能超过500个字符'),
    body('detailedDescription')
        .optional()
        .isLength({ max: 2000 })
        .withMessage('详细描述不能超过2000个字符'),
    body('coverImage')
        .optional()
        .isURL()
        .withMessage('封面图片必须是有效的URL'),
    body('location')
        .optional()
        .isLength({ max: 200 })
        .withMessage('地点不能超过200个字符'),
    body('eventStartDate')
        .optional()
        .isISO8601()
        .withMessage('活动开始日期必须是有效的日期格式'),
    body('eventEndDate')
        .optional()
        .isISO8601()
        .withMessage('活动结束日期必须是有效的日期格式'),
    body('type')
        .optional()
        .isIn(['wedding', 'event', 'portrait', 'commercial', 'travel', 'other'])
        .withMessage('相册类型必须是wedding、event、portrait、commercial、travel或other'),
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
    body('settings.watermark')
        .optional()
        .isObject()
        .withMessage('水印设置必须是对象'),
    body('settings.watermark.enabled')
        .optional()
        .isBoolean()
        .withMessage('水印启用状态必须是布尔值'),
    body('settings.watermark.type')
        .optional()
        .isIn(['text', 'image'])
        .withMessage('水印类型必须是text或image'),
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
        .withMessage('相册标题必须在1-255个字符之间'),
    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('相册描述不能超过1000个字符'),
    body('status')
        .optional()
        .isIn(['active', 'paused', 'ended', 'archived'])
        .withMessage('无效的相册状态'),
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
        .withMessage('无效的相册状态'),
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
 * 创建新相册
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
        detailedDescription,
        coverImage,
        location,
        eventStartDate,
        eventEndDate,
        type = 'other',
        isPublic = false,
        accessCode,
        settings = {},
        reviewMode = false,
        autoTagEnabled = false,
        language = 'zh-CN'
    } = req.body;

    // 处理水印设置
    const watermarkSettings = settings.watermark || {
        enabled: false,
        type: 'text',
        text: {
            content: '© 摄影师作品',
            fontSize: 16,
            fontFamily: 'Arial',
            color: '#ffffff',
            opacity: 80,
            position: 'bottom-right',
            offsetX: 20,
            offsetY: 20
        },
        image: {
            url: '',
            opacity: 80,
            position: 'bottom-right',
            size: 'medium',
            offsetX: 20,
            offsetY: 20
        }
    };
    
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
    
    // 创建相册
    const result = await db.query(
        `INSERT INTO sessions (
            user_id, title, description, detailed_description, cover_image, location,
            event_start_date, event_end_date, type, access_code, is_public, status,
            settings, watermark_enabled, watermark_text, review_mode,
            auto_tag_enabled, language
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *`,
        [
            userId, title, description, detailedDescription, coverImage, location,
            eventStartDate, eventEndDate, type, finalAccessCode, isPublic, 'active',
            JSON.stringify({
                ...settings,
                watermark: watermarkSettings
            }), 
            watermarkSettings.enabled, 
            watermarkSettings.type === 'text' ? watermarkSettings.text.content : '', 
            reviewMode,
            autoTagEnabled, language
        ]
    );
    
    const session = result.rows[0];
    
    // 缓存相册信息
    await redis.setCache(`session:${session.id}`, JSON.stringify(session), 3600); // 1小时
    
    // 记录创建日志
    logger.info('相册创建成功', {
        sessionId: session.id,
        userId,
        title,
        isPublic,
        ip: req.ip
    });
    
    res.status(201).json({
        success: true,
        message: '相册创建成功',
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
 * 通过访问码加入相册
 * POST /api/sessions/join
 */
router.post('/join', joinSessionValidation, asyncHandler(async (req, res) => {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ValidationError('输入验证失败', errors.array());
    }

    const { accessCode, displayName = '访客' } = req.body;

    // 查找相册
    const sessionResult = await db.query(
        `SELECT id, title, status, is_public, access_code 
         FROM sessions 
         WHERE access_code = $1 AND status IN ('active', 'paused')`,
        [accessCode.toUpperCase()]
    );

    if (sessionResult.rows.length === 0) {
        throw new AppError('访问码无效或相册不存在', 404);
    }

    const session = sessionResult.rows[0];

    // 记录访问日志
    await db.query(
        `INSERT INTO session_access_logs 
         (session_id, ip_address, user_agent, access_code_used, access_granted, client_type)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
            session.id,
            req.ip,
            req.get('User-Agent') || '',
            accessCode.toUpperCase(),
            true,
            'viewer'
        ]
    );

    logger.info('观众成功加入相册', {
        sessionId: session.id,
        accessCode: accessCode.toUpperCase(),
        displayName,
        ip: req.ip
    });

    res.json({
        success: true,
        message: '成功加入相册',
        data: {
            sessionId: session.id,
            sessionTitle: session.title,
            accessCode: accessCode.toUpperCase()
        }
    });
}));

/**
 * 获取相册列表
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
    
    // 查询相册列表
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
 * 获取当前用户的相册列表
 * GET /api/sessions/my
 */
router.get('/my', authenticateToken, listSessionsValidation, asyncHandler(async (req, res) => {
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
    
    // 查询相册列表
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
 * 获取单个相册详情
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
        throw new AppError('相册不存在', 404);
    }
    
    const session = result.rows[0];
    
    // 缓存相册信息
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
 * 更新相册信息
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
    
    // 更新相册
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
    logger.info('相册更新成功', {
        sessionId,
        userId: req.user.userId,
        updates: req.body,
        ip: req.ip
    });
    
    res.json({
        success: true,
        message: '相册更新成功',
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
 * 删除相册
 * DELETE /api/sessions/:id
 */
router.delete('/:id', authenticateToken, requireOwnership('session'), asyncHandler(async (req, res) => {
    const sessionId = req.params.id;
    
    // 检查相册是否有照片
    const photosResult = await db.query(
        'SELECT COUNT(*) as photo_count FROM photos WHERE session_id = $1',
        [sessionId]
    );
    
    const photoCount = parseInt(photosResult.rows[0].photo_count);
    
    if (photoCount > 0) {
        throw new AppError('无法删除包含照片的相册，请先删除所有照片', 400);
    }
    
    // 删除相册
    await db.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
    
    // 清除缓存
    await redis.deleteCache(`session:${sessionId}`);
    
    // 记录删除日志
    logger.info('相册删除成功', {
        sessionId,
        userId: req.user.userId,
        ip: req.ip
    });
    
    res.json({
        success: true,
        message: '相册删除成功'
    });
}));

/**
 * 获取相册统计信息
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
        throw new AppError('相册不存在', 404);
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
    
    // 查询相册
    const result = await db.query(
        'SELECT id, access_code, is_public, status FROM sessions WHERE id = $1',
        [sessionId]
    );
    
    if (result.rows.length === 0) {
        throw new AppError('相册不存在', 404);
    }
    
    const session = result.rows[0];
    
    // 公开相册不需要访问码
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

/**
 * 设置相册封面
 * PUT /api/sessions/:id/cover
 */
router.put('/:id/cover', authenticateToken, asyncHandler(async (req, res) => {
    const sessionId = req.params.id;
    const userId = req.user.userId;
    const { type, photoId, imageUrl } = req.body;

    // 验证输入
    if (!type || !['photo', 'url'].includes(type)) {
        throw new ValidationError('封面类型必须是photo或url');
    }

    if (type === 'photo' && !photoId) {
        throw new ValidationError('选择相册照片时必须提供photoId');
    }

    if (type === 'url' && !imageUrl) {
        throw new ValidationError('选择网络图片时必须提供imageUrl');
    }

    // 验证相册所有权
    const sessionResult = await db.query(
        'SELECT * FROM sessions WHERE id = $1 AND user_id = $2',
        [sessionId, userId]
    );

    if (sessionResult.rows.length === 0) {
        throw new NotFoundError('相册不存在或您没有权限访问');
    }

    const session = sessionResult.rows[0];
    let coverImageUrl = '';

    if (type === 'photo') {
        // 验证照片属于该相册
        const photoResult = await db.query(
            'SELECT * FROM photos WHERE id = $1 AND session_id = $2',
            [photoId, sessionId]
        );

        if (photoResult.rows.length === 0) {
            throw new NotFoundError('照片不存在或不属于该相册');
        }

        const photo = photoResult.rows[0];
        // 使用照片的versions字段中的medium版本作为封面
        const versions = typeof photo.versions === 'string' 
            ? JSON.parse(photo.versions) 
            : photo.versions;
        
        coverImageUrl = versions?.medium || versions?.original || photo.file_path;

        // 更新照片的is_cover标识，先清除其他照片的封面标识
        await db.query(
            'UPDATE photos SET is_cover = false WHERE session_id = $1',
            [sessionId]
        );

        await db.query(
            'UPDATE photos SET is_cover = true WHERE id = $1',
            [photoId]
        );

        logger.info('相册封面设置为照片', {
            sessionId,
            photoId,
            userId,
            ip: req.ip
        });
    } else {
        // 使用网络图片URL
        coverImageUrl = imageUrl;

        // 清除所有照片的封面标识
        await db.query(
            'UPDATE photos SET is_cover = false WHERE session_id = $1',
            [sessionId]
        );

        logger.info('相册封面设置为网络图片', {
            sessionId,
            imageUrl,
            userId,
            ip: req.ip
        });
    }

    // 更新相册封面
    const updateResult = await db.query(
        'UPDATE sessions SET cover_image = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [coverImageUrl, sessionId]
    );

    const updatedSession = updateResult.rows[0];

    // 更新缓存
    await redis.deleteCache(`session:${sessionId}`);
    await redis.setCache(`session:${sessionId}`, JSON.stringify(updatedSession), 3600);

    res.json({
        success: true,
        message: '相册封面设置成功',
        data: {
            session: {
                id: updatedSession.id,
                title: updatedSession.title,
                coverImage: updatedSession.cover_image,
                updatedAt: updatedSession.updated_at
            }
        }
    });
}));

/**
 * 获取相册照片列表（用于封面选择）
 * GET /api/sessions/:id/photos/for-cover
 */
router.get('/:id/photos/for-cover', authenticateToken, asyncHandler(async (req, res) => {
    const sessionId = req.params.id;
    const userId = req.user.userId;

    // 验证相册所有权
    const sessionResult = await db.query(
        'SELECT * FROM sessions WHERE id = $1 AND user_id = $2',
        [sessionId, userId]
    );

    if (sessionResult.rows.length === 0) {
        throw new NotFoundError('相册不存在或您没有权限访问');
    }

    // 获取相册中的照片（仅包含已发布的）
    const photosResult = await db.query(`
        SELECT 
            id,
            filename,
            original_filename,
            versions,
            width,
            height,
            is_cover,
            created_at
        FROM photos 
        WHERE session_id = $1 AND status = 'published'
        ORDER BY created_at DESC
        LIMIT 50
    `, [sessionId]);

    const photos = photosResult.rows.map(photo => {
        const versions = typeof photo.versions === 'string' 
            ? JSON.parse(photo.versions) 
            : photo.versions;

        return {
            id: photo.id,
            filename: photo.original_filename || photo.filename,
            thumbnailUrl: versions?.thumbnail || versions?.small || photo.file_path,
            originalUrl: versions?.medium || versions?.original || photo.file_path,
            isCover: photo.is_cover,
            dimensions: photo.width && photo.height ? `${photo.width}×${photo.height}` : null,
            createdAt: photo.created_at
        };
    });

    res.json({
        success: true,
        message: '照片列表获取成功',
        data: {
            photos,
            total: photos.length
        }
    });
}));

/**
 * 获取相册管理信息（仅限所有者）
 * GET /api/sessions/:id/manage
 */
router.get('/:id/manage', authenticateToken, requireSessionOwnership, asyncHandler(async (req, res) => {
    const sessionId = req.params.id;
    
    // 从数据库查询完整的相册信息
    const result = await db.query(
        'SELECT * FROM session_details WHERE id = $1',
        [sessionId]
    );
    
    if (result.rows.length === 0) {
        throw new AppError('相册不存在', 404);
    }
    
    const session = result.rows[0];
    
    // 获取相册统计信息
    const statsResult = await db.query(
        'SELECT * FROM get_session_stats($1)',
        [sessionId]
    );
    
    const stats = statsResult.rows[0] || {};
    
    res.json({
        success: true,
        data: {
            session: {
                id: session.id,
                title: session.title,
                description: session.description,
                detailedDescription: session.detailed_description,
                coverImage: session.cover_image,
                location: session.location,
                eventStartDate: session.event_start_date,
                eventEndDate: session.event_end_date,
                type: session.type,
                isPublic: session.is_public,
                accessCode: session.access_code,
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
                rejectedPhotos: session.rejected_photos,
                totalViews: session.total_views,
                uniqueViewers: session.unique_viewers,
                duration: session.duration,
                startedAt: session.started_at,
                endedAt: session.ended_at,
                createdAt: session.created_at,
                updatedAt: session.updated_at,
                creatorUsername: session.creator_username,
                creatorRole: session.creator_role
            },
            stats: {
                totalPhotos: stats.total_photos || 0,
                publishedPhotos: stats.published_photos || 0,
                pendingPhotos: stats.pending_photos || 0,
                rejectedPhotos: stats.rejected_photos || 0,
                totalViews: stats.total_views || 0,
                uniqueViewers: stats.unique_viewers || 0,
                avgViewDuration: parseFloat(stats.avg_view_duration || 0)
            }
        }
    });
}));

module.exports = router;