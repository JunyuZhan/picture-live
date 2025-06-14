/**
 * 认证中间件
 * 处理JWT令牌验证和用户权限检查
 */

const jwt = require('jsonwebtoken');
const redis = require('../config/redis');
const db = require('../config/database');
const logger = require('../utils/logger');
const { AppError } = require('./errorHandler');

/**
 * JWT令牌验证中间件
 */
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        
        if (!token) {
            throw new AppError('访问令牌缺失', 401);
        }
        
        // 检查令牌是否在黑名单中
        const isBlacklisted = await redis.getCache(`blacklist_token:${token}`);
        if (isBlacklisted) {
            throw new AppError('令牌已失效', 401);
        }
        
        // 验证JWT令牌
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 直接使用JWT中的用户状态信息
        if (!decoded.isActive) {
            throw new AppError('用户账户已被禁用', 401);
        }
        
        // 将用户信息添加到请求对象
        req.user = {
            userId: decoded.userId,
            username: decoded.username,
            email: decoded.email,
            role: decoded.role,
            isActive: decoded.isActive
        };
        
        next();
        
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return next(new AppError('无效的访问令牌', 401));
        }
        if (error.name === 'TokenExpiredError') {
            return next(new AppError('访问令牌已过期', 401));
        }
        next(error);
    }
};

/**
 * 可选的认证中间件（不强制要求登录）
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            req.user = null;
            return next();
        }
        
        // 检查令牌是否在黑名单中
        const isBlacklisted = await redis.getCache(`blacklist_token:${token}`);
        if (isBlacklisted) {
            req.user = null;
            return next();
        }
        
        // 验证JWT令牌
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 直接使用JWT中的用户信息
        if (!decoded.isActive) {
            req.user = null;
            return next();
        }
        
        req.user = {
            userId: decoded.userId,
            username: decoded.username,
            email: decoded.email,
            role: decoded.role,
            isActive: decoded.isActive
        };
        
        next();
        
    } catch (error) {
        // 可选认证失败时不抛出错误，只是设置user为null
        req.user = null;
        next();
    }
};

/**
 * 角色权限检查中间件
 * @param {string|Array} roles - 允许的角色
 */
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new AppError('需要登录', 401));
        }
        
        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        
        if (!allowedRoles.includes(req.user.role)) {
            logger.warn('用户权限不足', {
                userId: req.user.userId,
                userRole: req.user.role,
                requiredRoles: allowedRoles,
                ip: req.ip,
                path: req.path
            });
            
            return next(new AppError('权限不足', 403));
        }
        
        next();
    };
};

/**
 * 资源所有者检查中间件
 * 检查用户是否是资源的所有者
 * @param {string} resourceType - 资源类型 ('session', 'photo', 'user')
 * @param {string} paramName - 参数名称（默认为 'id'）
 */
const requireOwnership = (resourceType, paramName = 'id') => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return next(new AppError('需要登录', 401));
            }
            
            // 管理员可以访问所有资源
            if (req.user.role === 'admin') {
                return next();
            }
            
            const resourceId = req.params[paramName];
            
            if (!resourceId) {
                return next(new AppError('资源ID缺失', 400));
            }
            
            let query;
            let params = [resourceId, req.user.userId];
            
            switch (resourceType) {
                case 'session':
                    query = 'SELECT id FROM sessions WHERE id = $1 AND user_id = $2';
                    break;
                case 'photo':
                    query = 'SELECT id FROM photos WHERE id = $1 AND user_id = $2';
                    break;
                case 'user':
                    query = 'SELECT id FROM users WHERE id = $1 AND id = $2';
                    break;
                default:
                    return next(new AppError('不支持的资源类型', 400));
            }
            
            const result = await db.query(query, params);
            
            if (result.rows.length === 0) {
                logger.warn('用户尝试访问非拥有资源', {
                    userId: req.user.userId,
                    resourceType,
                    resourceId,
                    ip: req.ip,
                    path: req.path
                });
                
                return next(new AppError('资源不存在或无权访问', 404));
            }
            
            next();
            
        } catch (error) {
            next(error);
        }
    };
};

/**
 * 相册访问权限检查中间件
 * 检查用户是否有权访问指定相册
 */
const requireSessionAccess = async (req, res, next) => {
    try {
        const sessionId = req.params.sessionId || req.params.id;
        
        if (!sessionId) {
            return next(new AppError('相册ID缺失', 400));
        }
        
        // 查询相册信息
        const result = await db.query(
            `SELECT id, user_id, is_public, access_code, status 
             FROM sessions WHERE id = $1`,
            [sessionId]
        );
        
        if (result.rows.length === 0) {
            return next(new AppError('相册不存在', 404));
        }
        
        const session = result.rows[0];
        
        // 相册已结束且不是公开相册
        if (session.status === 'ended' && !session.is_public) {
            // 只有相册创建者和管理员可以访问已结束的私有相册
            if (!req.user || (req.user.userId !== session.user_id && req.user.role !== 'admin')) {
                return next(new AppError('相册已结束', 403));
            }
        }
        
        // 检查访问权限
        let hasAccess = false;
        let accessReason = '';
        
        // 1. 相册创建者
        if (req.user && req.user.userId === session.user_id) {
            hasAccess = true;
            accessReason = 'owner';
        }
        // 2. 管理员
        else if (req.user && req.user.role === 'admin') {
            hasAccess = true;
            accessReason = 'admin';
        }
        // 3. 公开相册 - 任何人都可以访问
        else if (session.is_public) {
            hasAccess = true;
            accessReason = 'public_session';
        }
        // 4. 私有相册需要访问码
        else if (!session.is_public && session.access_code) {
            const providedCode = req.headers['x-access-code'] || req.query.accessCode;
            if (providedCode && providedCode === session.access_code) {
                hasAccess = true;
                accessReason = 'access_code';
                
                // 记录访问日志
                await db.query(
                    `INSERT INTO session_access_logs 
                     (session_id, ip_address, user_agent, access_code_used, access_granted, client_type)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [
                        sessionId,
                        req.ip,
                        req.get('User-Agent') || '',
                        providedCode,
                        true,
                        req.user ? 'photographer' : 'viewer'
                    ]
                );
            }
        }

        // 记录详细的访问检查日志
        logger.debug('相册访问权限检查', {
            sessionId,
            userId: req.user?.userId || 'anonymous',
            sessionOwnerId: session.user_id,
            userIdType: typeof req.user?.userId,
            sessionOwnerIdType: typeof session.user_id,
            userIdEquals: req.user?.userId === session.user_id,
            isPublic: session.is_public,
            hasAccessCode: !!session.access_code,
            providedCode: req.headers['x-access-code'] || req.query.accessCode || 'none',
            hasAccess,
            accessReason,
            ip: req.ip
        });
        
        if (!hasAccess) {
            // 记录访问失败日志
            await db.query(
                `INSERT INTO session_access_logs 
                 (session_id, ip_address, user_agent, access_code_used, access_granted, client_type)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    sessionId,
                    req.ip,
                    req.get('User-Agent') || '',
                    req.headers['x-access-code'] || req.query.accessCode || null,
                    false,
                    req.user ? 'photographer' : 'viewer'
                ]
            );
            
            return next(new AppError('无权访问此相册', 403));
        }
        
        // 将相册信息添加到请求对象
        req.session = session;
        
        next();
        
    } catch (error) {
        next(error);
    }
};

/**
 * API密钥认证中间件
 */
const authenticateApiKey = async (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key'];
        
        if (!apiKey) {
            return next(new AppError('API密钥缺失', 401));
        }
        
        // 查询API密钥
        const result = await db.query(
            `SELECT ak.*, u.id as user_id, u.username, u.role, u.is_active
             FROM api_keys ak
             JOIN users u ON ak.user_id = u.id
             WHERE ak.api_key = $1 AND ak.is_active = true AND u.is_active = true`,
            [apiKey]
        );
        
        if (result.rows.length === 0) {
            return next(new AppError('无效的API密钥', 401));
        }
        
        const apiKeyData = result.rows[0];
        
        // 检查API密钥是否过期
        if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
            return next(new AppError('API密钥已过期', 401));
        }
        
        // 更新最后使用时间
        await db.query(
            'UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
            [apiKeyData.id]
        );
        
        // 将用户和API密钥信息添加到请求对象
        req.user = {
            userId: apiKeyData.user_id,
            username: apiKeyData.username,
            role: apiKeyData.role,
            isActive: apiKeyData.is_active
        };
        
        req.apiKey = {
            id: apiKeyData.id,
            name: apiKeyData.key_name,
            permissions: apiKeyData.permissions || []
        };
        
        next();
        
    } catch (error) {
        next(error);
    }
};

/**
 * API权限检查中间件
 * @param {string} permission - 需要的权限
 */
const requireApiPermission = (permission) => {
    return (req, res, next) => {
        if (!req.apiKey) {
            return next(new AppError('需要API密钥认证', 401));
        }
        
        if (!req.apiKey.permissions.includes(permission)) {
            logger.warn('API密钥权限不足', {
                apiKeyId: req.apiKey.id,
                apiKeyName: req.apiKey.name,
                requiredPermission: permission,
                availablePermissions: req.apiKey.permissions,
                ip: req.ip,
                path: req.path
            });
            
            return next(new AppError('API权限不足', 403));
        }
        
        next();
    };
};

/**
 * 相册所有者权限检查中间件
 * 检查用户是否为指定相册的创建者
 */
const requireSessionOwnership = async (req, res, next) => {
    try {
        const sessionId = req.params.sessionId || req.params.id;
        
        if (!sessionId) {
            return next(new AppError('相册ID缺失', 400));
        }
        
        // 必须先进行身份验证
        if (!req.user) {
            return next(new AppError('需要登录', 401));
        }
        
        // 查询相册信息
        const result = await db.query(
            `SELECT id, user_id, title FROM sessions WHERE id = $1`,
            [sessionId]
        );
        
        if (result.rows.length === 0) {
            return next(new AppError('相册不存在', 404));
        }
        
        const session = result.rows[0];
        
        // 检查是否为相册创建者或管理员
        if (req.user.userId !== session.user_id && req.user.role !== 'admin') {
            logger.warn('相册权限检查失败', {
                sessionId,
                sessionTitle: session.title,
                userId: req.user.userId,
                sessionOwnerId: session.user_id,
                userRole: req.user.role,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            
            return next(new AppError('无权操作此相册', 403));
        }
        
        // 将相册信息添加到请求对象
        req.session = session;
        
        next();
        
    } catch (error) {
        next(error);
    }
};

module.exports = {
    authenticateToken,
    optionalAuth,
    requireRole,
    requireOwnership,
    requireSessionAccess,
    requireSessionOwnership,
    authenticateApiKey,
    requireApiPermission
};
