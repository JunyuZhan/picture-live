/**
 * 认证路由
 * 处理用户注册、登录、登出等认证相关功能
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const redis = require('../config/redis');
const logger = require('../utils/logger');
const { asyncHandler, AppError, ValidationError } = require('../middleware/errorHandler');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// 认证相关的速率限制
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 5, // 最多5次尝试
    message: {
        error: 'Too many authentication attempts, please try again later',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1小时
    max: 3, // 最多3次注册尝试
    message: {
        error: 'Too many registration attempts, please try again later',
        code: 'REGISTRATION_LIMIT_EXCEEDED'
    }
});

// 输入验证规则
const registerValidation = [
    body('username')
        .isLength({ min: 3, max: 50 })
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('用户名必须是3-50个字符，只能包含字母、数字和下划线'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('请输入有效的邮箱地址'),
    body('password')
        .isLength({ min: 8 })
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('密码必须至少8位，包含大小写字母、数字和特殊字符'),
    body('displayName')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('显示名称不能超过100个字符')
];

const loginValidation = [
    body('username')
        .notEmpty()
        .withMessage('用户名不能为空'),
    body('password')
        .notEmpty()
        .withMessage('密码不能为空')
];

const changePasswordValidation = [
    body('currentPassword')
        .notEmpty()
        .withMessage('当前密码不能为空'),
    body('newPassword')
        .isLength({ min: 8 })
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('新密码必须至少8位，包含大小写字母、数字和特殊字符')
];

/**
 * 生成JWT令牌
 */
function generateTokens(user) {
    const payload = {
        userId: user.id,
        username: user.username,
        role: user.role
    };
    
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '1h'
    });
    
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    });
    
    return { accessToken, refreshToken };
}

/**
 * 用户注册
 * POST /api/auth/register
 */
router.post('/register', registerLimiter, registerValidation, asyncHandler(async (req, res) => {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ValidationError('输入验证失败', errors.array());
    }
    
    const { username, email, password, displayName } = req.body;
    
    // 检查用户名和邮箱是否已存在
    const existingUser = await db.query(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        [username, email]
    );
    
    if (existingUser.rows.length > 0) {
        throw new AppError('用户名或邮箱已存在', 409);
    }
    
    // 加密密码
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // 创建用户
    const result = await db.query(
        `INSERT INTO users (username, email, password_hash, display_name, role, is_active, email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, username, email, display_name, role, is_active, created_at`,
        [username, email, passwordHash, displayName || username, 'photographer', true, false]
    );
    
    const user = result.rows[0];
    
    // 生成令牌
    const { accessToken, refreshToken } = generateTokens(user);
    
    // 存储刷新令牌到Redis
    await redis.setCache(`refresh_token:${user.id}`, refreshToken, 7 * 24 * 60 * 60); // 7天
    
    // 记录注册日志
    logger.info('用户注册成功', {
        userId: user.id,
        username: user.username,
        email: user.email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    
    res.status(201).json({
        success: true,
        message: '注册成功',
        data: {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                displayName: user.display_name,
                role: user.role,
                isActive: user.is_active,
                createdAt: user.created_at
            },
            tokens: {
                accessToken,
                refreshToken,
                expiresIn: process.env.JWT_EXPIRES_IN || '1h'
            }
        }
    });
}));

/**
 * 用户登录
 * POST /api/auth/login
 */
router.post('/login', authLimiter, loginValidation, asyncHandler(async (req, res) => {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ValidationError('输入验证失败', errors.array());
    }
    
    const { username, password } = req.body;
    
    // 查找用户（支持用户名或邮箱登录）
    const result = await db.query(
        `SELECT id, username, email, password_hash, display_name, role, is_active, email_verified
         FROM users 
         WHERE (username = $1 OR email = $1) AND is_active = true`,
        [username]
    );
    
    if (result.rows.length === 0) {
        throw new AppError('用户名或密码错误', 401);
    }
    
    const user = result.rows[0];
    
    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
        throw new AppError('用户名或密码错误', 401);
    }
    
    // 生成令牌
    const { accessToken, refreshToken } = generateTokens(user);
    
    // 存储刷新令牌到Redis
    await redis.setCache(`refresh_token:${user.id}`, refreshToken, 7 * 24 * 60 * 60); // 7天
    
    // 更新最后登录时间
    await db.query(
        'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
    );
    
    // 记录登录日志
    logger.info('用户登录成功', {
        userId: user.id,
        username: user.username,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    
    res.json({
        success: true,
        message: '登录成功',
        data: {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                displayName: user.display_name,
                role: user.role,
                isActive: user.is_active,
                emailVerified: user.email_verified
            },
            tokens: {
                accessToken,
                refreshToken,
                expiresIn: process.env.JWT_EXPIRES_IN || '1h'
            }
        }
    });
}));

/**
 * 刷新令牌
 * POST /api/auth/refresh
 */
router.post('/refresh', asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
        throw new AppError('刷新令牌不能为空', 400);
    }
    
    try {
        // 验证刷新令牌
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        
        // 检查Redis中的令牌
        const storedToken = await redis.getCache(`refresh_token:${decoded.userId}`);
        if (storedToken !== refreshToken) {
            throw new AppError('无效的刷新令牌', 401);
        }
        
        // 获取用户信息
        const result = await db.query(
            'SELECT id, username, email, display_name, role, is_active FROM users WHERE id = $1 AND is_active = true',
            [decoded.userId]
        );
        
        if (result.rows.length === 0) {
            throw new AppError('用户不存在或已被禁用', 401);
        }
        
        const user = result.rows[0];
        
        // 生成新的令牌
        const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
        
        // 更新Redis中的刷新令牌
        await redis.setCache(`refresh_token:${user.id}`, newRefreshToken, 7 * 24 * 60 * 60);
        
        res.json({
            success: true,
            message: '令牌刷新成功',
            data: {
                tokens: {
                    accessToken,
                    refreshToken: newRefreshToken,
                    expiresIn: process.env.JWT_EXPIRES_IN || '1h'
                }
            }
        });
        
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            throw new AppError('无效的刷新令牌', 401);
        }
        throw error;
    }
}));

/**
 * 用户登出
 * POST /api/auth/logout
 */
router.post('/logout', authMiddleware, asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    
    // 从Redis中删除刷新令牌
    await redis.deleteCache(`refresh_token:${userId}`);
    
    // 将访问令牌加入黑名单（可选）
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
        const decoded = jwt.decode(token);
        const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
        if (expiresIn > 0) {
            await redis.setCache(`blacklist_token:${token}`, 'true', expiresIn);
        }
    }
    
    // 记录登出日志
    logger.info('用户登出', {
        userId,
        username: req.user.username,
        ip: req.ip
    });
    
    res.json({
        success: true,
        message: '登出成功'
    });
}));

/**
 * 获取当前用户信息
 * GET /api/auth/me
 */
router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
    const result = await db.query(
        `SELECT id, username, email, display_name, avatar_url, role, is_active, 
                email_verified, last_login_at, created_at, updated_at
         FROM users WHERE id = $1`,
        [req.user.userId]
    );
    
    if (result.rows.length === 0) {
        throw new AppError('用户不存在', 404);
    }
    
    const user = result.rows[0];
    
    res.json({
        success: true,
        data: {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                displayName: user.display_name,
                avatarUrl: user.avatar_url,
                role: user.role,
                isActive: user.is_active,
                emailVerified: user.email_verified,
                lastLoginAt: user.last_login_at,
                createdAt: user.created_at,
                updatedAt: user.updated_at
            }
        }
    });
}));

/**
 * 修改密码
 * PUT /api/auth/password
 */
router.put('/password', authMiddleware, changePasswordValidation, asyncHandler(async (req, res) => {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ValidationError('输入验证失败', errors.array());
    }
    
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;
    
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
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
        throw new AppError('当前密码错误', 400);
    }
    
    // 加密新密码
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    
    // 更新密码
    await db.query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newPasswordHash, userId]
    );
    
    // 清除所有刷新令牌（强制重新登录）
    await redis.deleteCache(`refresh_token:${userId}`);
    
    // 记录密码修改日志
    logger.info('用户修改密码', {
        userId,
        username: req.user.username,
        ip: req.ip
    });
    
    res.json({
        success: true,
        message: '密码修改成功，请重新登录'
    });
}));

/**
 * 更新用户资料
 * PUT /api/auth/profile
 */
router.put('/profile', authMiddleware, [
    body('displayName')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('显示名称不能超过100个字符'),
    body('avatarUrl')
        .optional()
        .isURL()
        .withMessage('头像URL格式不正确')
], asyncHandler(async (req, res) => {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ValidationError('输入验证失败', errors.array());
    }
    
    const { displayName, avatarUrl } = req.body;
    const userId = req.user.userId;
    
    // 构建更新字段
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (displayName !== undefined) {
        updates.push(`display_name = $${paramIndex++}`);
        values.push(displayName);
    }
    
    if (avatarUrl !== undefined) {
        updates.push(`avatar_url = $${paramIndex++}`);
        values.push(avatarUrl);
    }
    
    if (updates.length === 0) {
        throw new AppError('没有要更新的字段', 400);
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);
    
    // 更新用户资料
    const result = await db.query(
        `UPDATE users SET ${updates.join(', ')} 
         WHERE id = $${paramIndex}
         RETURNING id, username, email, display_name, avatar_url, role, updated_at`,
        values
    );
    
    const user = result.rows[0];
    
    // 记录资料更新日志
    logger.info('用户更新资料', {
        userId,
        username: req.user.username,
        updates: { displayName, avatarUrl },
        ip: req.ip
    });
    
    res.json({
        success: true,
        message: '资料更新成功',
        data: {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                displayName: user.display_name,
                avatarUrl: user.avatar_url,
                role: user.role,
                updatedAt: user.updated_at
            }
        }
    });
}));

module.exports = router;