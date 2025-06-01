/**
 * 用户管理路由
 * 处理用户个人资料、设置、统计等功能
 */

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const redis = require('../config/redis');
const logger = require('../utils/logger');
const { asyncHandler, AppError, ValidationError } = require('../middleware/errorHandler');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// 输入验证规则
const updateProfileValidation = [
    body('displayName')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('显示名称必须在1-100个字符之间'),
    body('email')
        .optional()
        .isEmail()
        .withMessage('邮箱格式不正确'),
    body('bio')
        .optional()
        .isLength({ max: 500 })
        .withMessage('个人简介不能超过500个字符'),
    body('website')
        .optional()
        .isURL()
        .withMessage('网站URL格式不正确'),
    body('location')
        .optional()
        .isLength({ max: 100 })
        .withMessage('位置信息不能超过100个字符'),
    body('language')
        .optional()
        .isIn(['zh-CN', 'en-US', 'ja-JP'])
        .withMessage('不支持的语言'),
    body('timezone')
        .optional()
        .isLength({ max: 50 })
        .withMessage('时区信息不能超过50个字符')
];

const changePasswordValidation = [
    body('currentPassword')
        .notEmpty()
        .withMessage('当前密码不能为空'),
    body('newPassword')
        .isLength({ min: 8, max: 128 })
        .withMessage('新密码必须在8-128个字符之间')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 'i')
        .withMessage('新密码必须包含大小写字母、数字和特殊字符'),
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('确认密码与新密码不匹配');
            }
            return true;
        })
];

const updateSettingsValidation = [
    body('notifications')
        .optional()
        .isObject()
        .withMessage('通知设置必须是对象'),
    body('privacy')
        .optional()
        .isObject()
        .withMessage('隐私设置必须是对象'),
    body('preferences')
        .optional()
        .isObject()
        .withMessage('偏好设置必须是对象')
];

/**
 * 获取当前用户信息
 * GET /api/users/me
 */
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    
    // 尝试从缓存获取
    const cached = await redis.getCache(`user:${userId}`);
    if (cached) {
        const user = JSON.parse(cached);
        return res.json({
            success: true,
            data: { user }
        });
    }
    
    // 从数据库查询
    const result = await db.query(
        `SELECT id, username, email, display_name, bio, website, location, 
                avatar_url, role, language, timezone, email_verified, 
                created_at, updated_at, last_login_at
         FROM users 
         WHERE id = $1`,
        [userId]
    );
    
    if (result.rows.length === 0) {
        throw new AppError('用户不存在', 404);
    }
    
    const user = {
        id: result.rows[0].id,
        username: result.rows[0].username,
        email: result.rows[0].email,
        displayName: result.rows[0].display_name,
        bio: result.rows[0].bio,
        website: result.rows[0].website,
        location: result.rows[0].location,
        avatarUrl: result.rows[0].avatar_url,
        role: result.rows[0].role,
        language: result.rows[0].language,
        timezone: result.rows[0].timezone,
        emailVerified: result.rows[0].email_verified,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at,
        lastLoginAt: result.rows[0].last_login_at
    };
    
    // 缓存用户信息
    await redis.setCache(`user:${userId}`, JSON.stringify(user), 1800); // 30分钟
    
    res.json({
        success: true,
        data: { user }
    });
}));

/**
 * 更新用户个人资料
 * PUT /api/users/me
 */
router.put('/me', authenticateToken, updateProfileValidation, asyncHandler(async (req, res) => {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ValidationError('输入验证失败', errors.array());
    }
    
    const userId = req.user.userId;
    const {
        displayName,
        email,
        bio,
        website,
        location,
        language,
        timezone
    } = req.body;
    
    // 如果更新邮箱，检查是否已被使用
    if (email) {
        const emailCheck = await db.query(
            'SELECT id FROM users WHERE email = $1 AND id != $2',
            [email, userId]
        );
        
        if (emailCheck.rows.length > 0) {
            throw new AppError('邮箱已被使用', 400);
        }
    }
    
    // 构建更新字段
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (displayName !== undefined) {
        updates.push(`display_name = $${paramIndex++}`);
        values.push(displayName);
    }
    
    if (email !== undefined) {
        updates.push(`email = $${paramIndex++}`);
        values.push(email);
        // 如果更新邮箱，重置验证状态
        updates.push(`email_verified = false`);
    }
    
    if (bio !== undefined) {
        updates.push(`bio = $${paramIndex++}`);
        values.push(bio);
    }
    
    if (website !== undefined) {
        updates.push(`website = $${paramIndex++}`);
        values.push(website);
    }
    
    if (location !== undefined) {
        updates.push(`location = $${paramIndex++}`);
        values.push(location);
    }
    
    if (language !== undefined) {
        updates.push(`language = $${paramIndex++}`);
        values.push(language);
    }
    
    if (timezone !== undefined) {
        updates.push(`timezone = $${paramIndex++}`);
        values.push(timezone);
    }
    
    if (updates.length === 0) {
        throw new AppError('没有要更新的字段', 400);
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);
    
    // 更新用户信息
    const result = await db.query(
        `UPDATE users SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING id, username, email, display_name, bio, website, location, 
                   avatar_url, role, language, timezone, email_verified, 
                   created_at, updated_at, last_login_at`,
        values
    );
    
    const user = {
        id: result.rows[0].id,
        username: result.rows[0].username,
        email: result.rows[0].email,
        displayName: result.rows[0].display_name,
        bio: result.rows[0].bio,
        website: result.rows[0].website,
        location: result.rows[0].location,
        avatarUrl: result.rows[0].avatar_url,
        role: result.rows[0].role,
        language: result.rows[0].language,
        timezone: result.rows[0].timezone,
        emailVerified: result.rows[0].email_verified,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at,
        lastLoginAt: result.rows[0].last_login_at
    };
    
    // 更新缓存
    await redis.setCache(`user:${userId}`, JSON.stringify(user), 1800);
    
    // 记录更新日志
    logger.info('用户资料更新成功', {
        userId,
        updates: req.body,
        ip: req.ip
    });
    
    res.json({
        success: true,
        message: '个人资料更新成功',
        data: { user }
    });
}));

/**
 * 修改密码
 * POST /api/users/me/change-password
 */
router.post('/me/change-password', authenticateToken, changePasswordValidation, asyncHandler(async (req, res) => {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ValidationError('输入验证失败', errors.array());
    }
    
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;
    
    // 获取当前密码哈希
    const result = await db.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
    );
    
    if (result.rows.length === 0) {
        throw new AppError('用户不存在', 404);
    }
    
    const user = result.rows[0];
    
    // 验证当前密码
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
        throw new AppError('当前密码错误', 400);
    }
    
    // 生成新密码哈希
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    
    // 更新密码
    await db.query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newPasswordHash, userId]
    );
    
    // 清除用户的所有刷新令牌（强制重新登录）
    await redis.deletePattern(`refresh_token:${userId}:*`);
    
    // 记录密码修改日志
    logger.info('用户密码修改成功', {
        userId,
        ip: req.ip
    });
    
    res.json({
        success: true,
        message: '密码修改成功，请重新登录'
    });
}));

/**
 * 获取用户设置
 * GET /api/users/me/settings
 */
router.get('/me/settings', authenticateToken, asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    
    // 尝试从缓存获取
    const cached = await redis.getCache(`user_settings:${userId}`);
    if (cached) {
        return res.json({
            success: true,
            data: { settings: JSON.parse(cached) }
        });
    }
    
    // 从数据库查询
    const result = await db.query(
        'SELECT settings FROM users WHERE id = $1',
        [userId]
    );
    
    if (result.rows.length === 0) {
        throw new AppError('用户不存在', 404);
    }
    
    const settings = result.rows[0].settings || {
        notifications: {
            email: {
                newPhotos: true,
                sessionUpdates: true,
                systemUpdates: false
            },
            push: {
                newPhotos: true,
                sessionUpdates: true,
                systemUpdates: false
            }
        },
        privacy: {
            showEmail: false,
            showLocation: false,
            allowSearch: true
        },
        preferences: {
            defaultLanguage: 'zh-CN',
            defaultTimezone: 'Asia/Shanghai',
            autoUpload: true,
            imageQuality: 'high',
            watermarkEnabled: false,
            reviewMode: false
        }
    };
    
    // 缓存设置
    await redis.setCache(`user_settings:${userId}`, JSON.stringify(settings), 3600); // 1小时
    
    res.json({
        success: true,
        data: { settings }
    });
}));

/**
 * 更新用户设置
 * PUT /api/users/me/settings
 */
router.put('/me/settings', authenticateToken, updateSettingsValidation, asyncHandler(async (req, res) => {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ValidationError('输入验证失败', errors.array());
    }
    
    const userId = req.user.userId;
    const { notifications, privacy, preferences } = req.body;
    
    // 获取当前设置
    const currentResult = await db.query(
        'SELECT settings FROM users WHERE id = $1',
        [userId]
    );
    
    if (currentResult.rows.length === 0) {
        throw new AppError('用户不存在', 404);
    }
    
    const currentSettings = currentResult.rows[0].settings || {};
    
    // 合并设置
    const newSettings = {
        ...currentSettings,
        ...(notifications && { notifications: { ...currentSettings.notifications, ...notifications } }),
        ...(privacy && { privacy: { ...currentSettings.privacy, ...privacy } }),
        ...(preferences && { preferences: { ...currentSettings.preferences, ...preferences } })
    };
    
    // 更新设置
    await db.query(
        'UPDATE users SET settings = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [JSON.stringify(newSettings), userId]
    );
    
    // 更新缓存
    await redis.setCache(`user_settings:${userId}`, JSON.stringify(newSettings), 3600);
    
    // 记录设置更新日志
    logger.info('用户设置更新成功', {
        userId,
        updates: req.body,
        ip: req.ip
    });
    
    res.json({
        success: true,
        message: '设置更新成功',
        data: { settings: newSettings }
    });
}));

/**
 * 获取用户统计信息
 * GET /api/users/me/stats
 */
router.get('/me/stats', authenticateToken, asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    
    // 尝试从缓存获取
    const cached = await redis.getCache(`user_stats:${userId}`);
    if (cached) {
        return res.json({
            success: true,
            data: { stats: JSON.parse(cached) }
        });
    }
    
    // 查询统计信息
    const statsQueries = await Promise.all([
        // 会话统计
        db.query(
            `SELECT 
                COUNT(*) as total_sessions,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_sessions,
                COUNT(CASE WHEN status = 'ended' THEN 1 END) as ended_sessions
             FROM sessions WHERE user_id = $1`,
            [userId]
        ),
        
        // 照片统计
        db.query(
            `SELECT 
                COUNT(*) as total_photos,
                COUNT(CASE WHEN status = 'published' THEN 1 END) as published_photos,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_photos,
                SUM(file_size) as total_size,
                SUM(view_count) as total_views,
                SUM(download_count) as total_downloads
             FROM photos p
             JOIN sessions s ON p.session_id = s.id
             WHERE s.user_id = $1`,
            [userId]
        ),
        
        // 最近活动
        db.query(
            `SELECT 
                'session' as type,
                s.id,
                s.title as name,
                s.created_at as activity_time
             FROM sessions s
             WHERE s.user_id = $1
             UNION ALL
             SELECT 
                'photo' as type,
                p.id,
                p.filename as name,
                p.created_at as activity_time
             FROM photos p
             JOIN sessions s ON p.session_id = s.id
             WHERE s.user_id = $1
             ORDER BY activity_time DESC
             LIMIT 10`,
            [userId]
        )
    ]);
    
    const sessionStats = statsQueries[0].rows[0];
    const photoStats = statsQueries[1].rows[0];
    const recentActivity = statsQueries[2].rows;
    
    const stats = {
        sessions: {
            total: parseInt(sessionStats.total_sessions),
            active: parseInt(sessionStats.active_sessions),
            ended: parseInt(sessionStats.ended_sessions)
        },
        photos: {
            total: parseInt(photoStats.total_photos || 0),
            published: parseInt(photoStats.published_photos || 0),
            pending: parseInt(photoStats.pending_photos || 0),
            totalSize: parseInt(photoStats.total_size || 0),
            totalViews: parseInt(photoStats.total_views || 0),
            totalDownloads: parseInt(photoStats.total_downloads || 0)
        },
        recentActivity: recentActivity.map(activity => ({
            type: activity.type,
            id: activity.id,
            name: activity.name,
            activityTime: activity.activity_time
        }))
    };
    
    // 缓存统计信息
    await redis.setCache(`user_stats:${userId}`, JSON.stringify(stats), 300); // 5分钟
    
    res.json({
        success: true,
        data: { stats }
    });
}));

/**
 * 获取用户列表（管理员功能）
 * GET /api/users
 */
router.get('/', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        search,
        role,
        status
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    // 构建查询条件
    let whereClause = 'WHERE 1=1';
    let params = [];
    let paramIndex = 1;
    
    if (search) {
        whereClause += ` AND (username ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR display_name ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
    }
    
    if (role) {
        whereClause += ` AND role = $${paramIndex++}`;
        params.push(role);
    }
    
    if (status) {
        if (status === 'verified') {
            whereClause += ` AND email_verified = true`;
        } else if (status === 'unverified') {
            whereClause += ` AND email_verified = false`;
        }
    }
    
    // 查询用户列表
    const usersResult = await db.query(
        `SELECT id, username, email, display_name, role, email_verified, 
                created_at, updated_at, last_login_at,
                COUNT(*) OVER() as total_count
         FROM users
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        [...params, limit, offset]
    );
    
    const users = usersResult.rows;
    const totalCount = users.length > 0 ? parseInt(users[0].total_count) : 0;
    
    res.json({
        success: true,
        data: {
            users: users.map(user => ({
                id: user.id,
                username: user.username,
                email: user.email,
                displayName: user.display_name,
                role: user.role,
                emailVerified: user.email_verified,
                createdAt: user.created_at,
                updatedAt: user.updated_at,
                lastLoginAt: user.last_login_at
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
 * 更新用户角色（管理员功能）
 * PUT /api/users/:id/role
 */
router.put('/:id/role', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    const targetUserId = req.params.id;
    const { role } = req.body;
    
    if (!role || !['user', 'admin'].includes(role)) {
        throw new AppError('无效的角色', 400);
    }
    
    // 不能修改自己的角色
    if (targetUserId === req.user.userId) {
        throw new AppError('不能修改自己的角色', 400);
    }
    
    // 更新用户角色
    const result = await db.query(
        'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING username, role',
        [role, targetUserId]
    );
    
    if (result.rows.length === 0) {
        throw new AppError('用户不存在', 404);
    }
    
    const user = result.rows[0];
    
    // 清除用户缓存
    await redis.deleteCache(`user:${targetUserId}`);
    
    // 记录角色修改日志
    logger.info('用户角色修改成功', {
        adminUserId: req.user.userId,
        targetUserId,
        newRole: role,
        ip: req.ip
    });
    
    res.json({
        success: true,
        message: '用户角色更新成功',
        data: {
            username: user.username,
            role: user.role
        }
    });
}));

/**
 * 删除用户账户
 * DELETE /api/users/me
 */
router.delete('/me', authenticateToken, asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { password } = req.body;
    
    if (!password) {
        throw new AppError('请提供密码以确认删除', 400);
    }
    
    // 验证密码
    const result = await db.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
    );
    
    if (result.rows.length === 0) {
        throw new AppError('用户不存在', 404);
    }
    
    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
        throw new AppError('密码错误', 400);
    }
    
    // 检查是否有活跃的会话
    const activeSessionsResult = await db.query(
        'SELECT COUNT(*) as count FROM sessions WHERE user_id = $1 AND status = \'active\'',
        [userId]
    );
    
    const activeSessionsCount = parseInt(activeSessionsResult.rows[0].count);
    
    if (activeSessionsCount > 0) {
        throw new AppError('请先结束所有活跃的会话再删除账户', 400);
    }
    
    // 开始事务删除用户数据
    await db.query('BEGIN');
    
    try {
        // 删除用户的照片文件（这里应该实现文件清理逻辑）
        // TODO: 实现文件清理
        
        // 删除用户的所有数据
        await db.query('DELETE FROM photos WHERE session_id IN (SELECT id FROM sessions WHERE user_id = $1)', [userId]);
        await db.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
        await db.query('DELETE FROM users WHERE id = $1', [userId]);
        
        await db.query('COMMIT');
        
        // 清除所有相关缓存
        await redis.deletePattern(`user:${userId}*`);
        await redis.deletePattern(`refresh_token:${userId}:*`);
        
        // 记录账户删除日志
        logger.info('用户账户删除成功', {
            userId,
            ip: req.ip
        });
        
        res.json({
            success: true,
            message: '账户删除成功'
        });
        
    } catch (error) {
        await db.query('ROLLBACK');
        throw error;
    }
}));

module.exports = router;