/**
 * 照片管理路由
 * 处理照片上传、查看、管理、审核等功能
 */

const express = require('express');
const multer = require('multer');
const { body, query, validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
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

// 配置文件上传
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(process.env.UPLOAD_PATH || './uploads', 'temp');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB
        files: 20 // 最多20个文件
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,webp,heic,raw,cr2,nef,arw').split(',');
        const fileExt = path.extname(file.originalname).toLowerCase().slice(1);
        
        if (allowedTypes.includes(fileExt) || file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error(`不支持的文件类型: ${fileExt}`));
        }
    }
});

// 输入验证规则
const uploadValidation = [
    body('tags')
        .optional()
        .isArray()
        .withMessage('标签必须是数组'),
    body('tags.*')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('标签长度必须在1-50个字符之间'),
    body('watermarkText')
        .optional()
        .isLength({ max: 255 })
        .withMessage('水印文字不能超过255个字符'),
    body('autoTag')
        .optional()
        .isBoolean()
        .withMessage('autoTag必须是布尔值'),
    body('reviewRequired')
        .optional()
        .isBoolean()
        .withMessage('reviewRequired必须是布尔值')
];

const listPhotosValidation = [
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
        .isIn(['pending', 'published', 'rejected'])
        .withMessage('无效的照片状态'),
    query('tags')
        .optional()
        .isString()
        .withMessage('标签筛选必须是字符串'),
    query('sort')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('排序方式必须是asc或desc')
];

/**
 * 生成多分辨率图片
 */
async function generateMultiResolution(inputPath, watermarkOptions = null) {
    const versions = {};
    
    try {
        // 读取原图
        let image = sharp(inputPath);
        const metadata = await image.metadata();
        
        // 添加水印（如果需要）
        if (watermarkOptions && watermarkOptions.text) {
            const { text, position = 'bottom-right', opacity = 0.7 } = watermarkOptions;
            
            // 创建水印SVG
            const fontSize = Math.max(metadata.width / 40, 24);
            const watermarkSvg = `
                <svg width="${metadata.width}" height="${metadata.height}">
                    <text x="${position.includes('right') ? metadata.width - 20 : 20}" 
                          y="${position.includes('bottom') ? metadata.height - 20 : 40}"
                          font-family="Arial" font-size="${fontSize}" 
                          fill="white" fill-opacity="${opacity}"
                          text-anchor="${position.includes('right') ? 'end' : 'start'}">
                        ${text}
                    </text>
                </svg>
            `;
            
            image = image.composite([{
                input: Buffer.from(watermarkSvg),
                top: 0,
                left: 0
            }]);
        }
        
        // 原图（可能带水印）
        versions.original = await image
            .jpeg({ quality: 95, progressive: true })
            .toBuffer();
        
        // 中等尺寸 (最大1920px)
        if (metadata.width > 1920 || metadata.height > 1920) {
            versions.medium = await image
                .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 85, progressive: true })
                .toBuffer();
        } else {
            versions.medium = versions.original;
        }
        
        // 缩略图 (400px)
        versions.thumbnail = await image
            .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();
        
        // WebP格式（如果支持）
        if (process.env.WEBP_ENABLED === 'true') {
            versions.webp = await image
                .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 85 })
                .toBuffer();
        }
        
        return versions;
        
    } catch (error) {
        logger.error('图片处理失败', { inputPath, error: error.message });
        throw new AppError('图片处理失败', 500);
    }
}

/**
 * 保存图片到本地存储
 */
async function saveToLocalStorage(buffer, filename, subfolder = '') {
    const uploadDir = path.join(process.env.UPLOAD_PATH || './uploads', subfolder);
    await fs.mkdir(uploadDir, { recursive: true });
    
    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);
    
    // 返回相对URL路径
    return `/uploads/${subfolder}/${filename}`.replace(/\/+/g, '/');
}

/**
 * 模拟AI标签识别（实际项目中可以集成真实的AI服务）
 */
async function generateAITags(imagePath) {
    // 这里可以集成百度AI、腾讯AI、阿里云AI等服务
    // 目前返回模拟标签
    const possibleTags = [
        '人物', '风景', '建筑', '食物', '动物', '花卉',
        '室内', '户外', '正式', '轻松', '合影', '特写',
        '黑白', '彩色', '逆光', '夜景', '微距', '全景'
    ];
    
    // 随机返回2-4个标签
    const tagCount = Math.floor(Math.random() * 3) + 2;
    const selectedTags = [];
    
    for (let i = 0; i < tagCount; i++) {
        const randomTag = possibleTags[Math.floor(Math.random() * possibleTags.length)];
        if (!selectedTags.includes(randomTag)) {
            selectedTags.push(randomTag);
        }
    }
    
    return selectedTags;
}

/**
 * 上传照片
 * POST /api/sessions/:sessionId/photos
 */
router.post('/:sessionId/photos', 
    authenticateToken, 
    requireSessionAccess, 
    upload.array('photos', 20), 
    uploadValidation, 
    asyncHandler(async (req, res) => {
        // 验证输入
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ValidationError('输入验证失败', errors.array());
        }
        
        const sessionId = req.params.sessionId;
        const {
            tags = [],
            watermarkText,
            autoTag = false,
            reviewRequired = false
        } = req.body;
        
        const files = req.files;
        if (!files || files.length === 0) {
            throw new AppError('没有上传文件', 400);
        }
        
        // 获取会话信息
        const sessionResult = await db.query(
            'SELECT * FROM sessions WHERE id = $1',
            [sessionId]
        );
        
        if (sessionResult.rows.length === 0) {
            throw new AppError('会话不存在', 404);
        }
        
        const session = sessionResult.rows[0];
        const uploadResults = [];
        
        // 处理每个文件
        for (const file of files) {
            try {
                let processedTags = [...tags];
                
                // AI自动标签识别
                if (autoTag || session.auto_tag_enabled) {
                    const aiTags = await generateAITags(file.path);
                    processedTags = [...new Set([...processedTags, ...aiTags])];
                }
                
                // 水印配置
                let watermarkOptions = null;
                if (session.watermark_enabled) {
                    watermarkOptions = {
                        text: watermarkText || session.watermark_text || '照片直播',
                        position: 'bottom-right',
                        opacity: 0.7
                    };
                }
                
                // 生成多分辨率版本
                const versions = await generateMultiResolution(file.path, watermarkOptions);
                
                // 保存到本地存储
                const timestamp = Date.now();
                const baseFilename = `${sessionId}_${timestamp}_${uuidv4()}`;
                
                const urls = {};
                for (const [size, buffer] of Object.entries(versions)) {
                    const filename = `${baseFilename}_${size}.${size === 'webp' ? 'webp' : 'jpg'}`;
                    urls[size] = await saveToLocalStorage(buffer, filename, size);
                }
                
                // 确定照片状态
                let photoStatus = 'published';
                if (reviewRequired || session.review_mode) {
                    photoStatus = 'pending';
                }
                
                // 保存到数据库
                const photoResult = await db.query(
                    `INSERT INTO photos (
                        session_id, filename, original_url, medium_url, thumbnail_url, webp_url,
                        file_size, tags, status, metadata, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
                    RETURNING *`,
                    [
                        sessionId,
                        file.originalname,
                        urls.original,
                        urls.medium || urls.original,
                        urls.thumbnail,
                        urls.webp || null,
                        versions.original.length,
                        JSON.stringify(processedTags),
                        photoStatus,
                        JSON.stringify({
                            originalName: file.originalname,
                            mimeType: file.mimetype,
                            uploadedBy: req.user.userId,
                            uploadedAt: new Date().toISOString()
                        })
                    ]
                );
                
                const photo = photoResult.rows[0];
                uploadResults.push({
                    id: photo.id,
                    filename: photo.filename,
                    thumbnailUrl: photo.thumbnail_url,
                    mediumUrl: photo.medium_url,
                    originalUrl: photo.original_url,
                    webpUrl: photo.webp_url,
                    fileSize: photo.file_size,
                    tags: JSON.parse(photo.tags),
                    status: photo.status,
                    createdAt: photo.created_at
                });
                
                // 如果是已发布状态，通过WebSocket推送
                if (photoStatus === 'published' && req.io) {
                    req.io.to(`session_${sessionId}`).emit('new_photo', {
                        id: photo.id,
                        thumbnailUrl: photo.thumbnail_url,
                        webpUrl: photo.webp_url,
                        tags: JSON.parse(photo.tags),
                        createdAt: photo.created_at
                    });
                }
                
                // 清理临时文件
                await fs.unlink(file.path).catch(() => {});
                
            } catch (error) {
                logger.error('处理文件失败', {
                    filename: file.originalname,
                    sessionId,
                    error: error.message
                });
                
                // 清理临时文件
                await fs.unlink(file.path).catch(() => {});
                
                throw new AppError(`处理文件 ${file.originalname} 失败: ${error.message}`, 500);
            }
        }
        
        // 记录上传日志
        logger.info('照片上传成功', {
            sessionId,
            userId: req.user.userId,
            photoCount: uploadResults.length,
            ip: req.ip
        });
        
        res.status(201).json({
            success: true,
            message: `成功上传 ${uploadResults.length} 张照片`,
            data: {
                photos: uploadResults
            }
        });
    })
);

/**
 * 获取会话照片列表
 * GET /api/sessions/:sessionId/photos
 */
router.get('/:sessionId/photos', 
    optionalAuth, 
    requireSessionAccess, 
    listPhotosValidation, 
    asyncHandler(async (req, res) => {
        // 验证输入
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ValidationError('输入验证失败', errors.array());
        }
        
        const sessionId = req.params.sessionId;
        const {
            page = 1,
            limit = 20,
            status,
            tags,
            sort = 'desc'
        } = req.query;
        
        const offset = (page - 1) * limit;
        
        // 检查用户权限
        const isOwner = req.user && req.session && req.user.userId === req.session.user_id;
        const isAdmin = req.user && req.user.role === 'admin';
        
        // 构建查询条件
        let whereClause = 'WHERE p.session_id = $1';
        let params = [sessionId];
        let paramIndex = 2;
        
        // 非所有者只能看到已发布的照片
        if (!isOwner && !isAdmin) {
            whereClause += ` AND p.status = 'published'`;
        } else if (status) {
            whereClause += ` AND p.status = $${paramIndex++}`;
            params.push(status);
        }
        
        // 标签筛选
        if (tags) {
            const tagArray = tags.split(',').map(tag => tag.trim());
            whereClause += ` AND p.tags::jsonb ?| $${paramIndex++}`;
            params.push(tagArray);
        }
        
        // 查询照片列表
        const photosResult = await db.query(
            `SELECT p.*, 
                    COUNT(*) OVER() as total_count
             FROM photo_details p
             ${whereClause}
             ORDER BY p.created_at ${sort.toUpperCase()}
             LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
            [...params, limit, offset]
        );
        
        const photos = photosResult.rows;
        const totalCount = photos.length > 0 ? parseInt(photos[0].total_count) : 0;
        
        // 获取可用标签
        const tagsResult = await db.query(
            `SELECT DISTINCT jsonb_array_elements_text(tags) as tag
             FROM photos 
             WHERE session_id = $1 AND status = 'published'
             ORDER BY tag`,
            [sessionId]
        );
        
        const availableTags = tagsResult.rows.map(row => row.tag);
        
        res.json({
            success: true,
            data: {
                photos: photos.map(photo => ({
                    id: photo.id,
                    filename: photo.filename,
                    thumbnailUrl: photo.thumbnail_url,
                    mediumUrl: photo.medium_url,
                    originalUrl: isOwner || isAdmin ? photo.original_url : photo.medium_url,
                    webpUrl: photo.webp_url,
                    fileSize: photo.file_size,
                    tags: JSON.parse(photo.tags || '[]'),
                    status: isOwner || isAdmin ? photo.status : undefined,
                    viewCount: photo.view_count,
                    downloadCount: photo.download_count,
                    createdAt: photo.created_at,
                    updatedAt: photo.updated_at
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalCount,
                    pages: Math.ceil(totalCount / limit)
                },
                availableTags
            }
        });
    })
);

/**
 * 获取单张照片详情
 * GET /api/photos/:id
 */
router.get('/photos/:id', optionalAuth, asyncHandler(async (req, res) => {
    const photoId = req.params.id;
    
    // 查询照片信息
    const result = await db.query(
        'SELECT * FROM photo_details WHERE id = $1',
        [photoId]
    );
    
    if (result.rows.length === 0) {
        throw new AppError('照片不存在', 404);
    }
    
    const photo = result.rows[0];
    
    // 检查访问权限
    const sessionResult = await db.query(
        'SELECT * FROM sessions WHERE id = $1',
        [photo.session_id]
    );
    
    const session = sessionResult.rows[0];
    const isOwner = req.user && req.user.userId === session.user_id;
    const isAdmin = req.user && req.user.role === 'admin';
    
    // 非公开会话需要验证访问权限
    if (!session.is_public && !isOwner && !isAdmin) {
        throw new AppError('无权访问此照片', 403);
    }
    
    // 非所有者只能查看已发布的照片
    if (!isOwner && !isAdmin && photo.status !== 'published') {
        throw new AppError('照片不存在', 404);
    }
    
    // 记录查看次数（非所有者）
    if (!isOwner && !isAdmin) {
        await db.query(
            `INSERT INTO photo_views (photo_id, ip_address, user_agent, viewed_at)
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
             ON CONFLICT DO NOTHING`,
            [photoId, req.ip, req.get('User-Agent') || '']
        );
        
        // 更新查看计数
        await db.query(
            'UPDATE photos SET view_count = view_count + 1 WHERE id = $1',
            [photoId]
        );
    }
    
    res.json({
        success: true,
        data: {
            photo: {
                id: photo.id,
                filename: photo.filename,
                thumbnailUrl: photo.thumbnail_url,
                mediumUrl: photo.medium_url,
                originalUrl: isOwner || isAdmin ? photo.original_url : photo.medium_url,
                webpUrl: photo.webp_url,
                fileSize: photo.file_size,
                tags: JSON.parse(photo.tags || '[]'),
                status: isOwner || isAdmin ? photo.status : undefined,
                viewCount: photo.view_count,
                downloadCount: photo.download_count,
                metadata: isOwner || isAdmin ? JSON.parse(photo.metadata || '{}') : undefined,
                createdAt: photo.created_at,
                updatedAt: photo.updated_at
            }
        }
    });
}));

/**
 * 更新照片信息
 * PUT /api/photos/:id
 */
router.put('/photos/:id', authenticateToken, requireOwnership('photo'), asyncHandler(async (req, res) => {
    const photoId = req.params.id;
    const { tags, status } = req.body;
    
    // 构建更新字段
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (tags !== undefined) {
        updates.push(`tags = $${paramIndex++}`);
        values.push(JSON.stringify(tags));
    }
    
    if (status !== undefined) {
        if (!['pending', 'published', 'rejected'].includes(status)) {
            throw new AppError('无效的照片状态', 400);
        }
        updates.push(`status = $${paramIndex++}`);
        values.push(status);
    }
    
    if (updates.length === 0) {
        throw new AppError('没有要更新的字段', 400);
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(photoId);
    
    // 更新照片
    const result = await db.query(
        `UPDATE photos SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`,
        values
    );
    
    const photo = result.rows[0];
    
    // 如果状态改为已发布，通过WebSocket推送
    if (status === 'published' && req.io) {
        req.io.to(`session_${photo.session_id}`).emit('photo_published', {
            id: photo.id,
            thumbnailUrl: photo.thumbnail_url,
            webpUrl: photo.webp_url,
            tags: JSON.parse(photo.tags || '[]'),
            createdAt: photo.created_at
        });
    }
    
    // 记录更新日志
    logger.info('照片更新成功', {
        photoId,
        userId: req.user.userId,
        updates: req.body,
        ip: req.ip
    });
    
    res.json({
        success: true,
        message: '照片更新成功',
        data: {
            photo: {
                id: photo.id,
                tags: JSON.parse(photo.tags || '[]'),
                status: photo.status,
                updatedAt: photo.updated_at
            }
        }
    });
}));

/**
 * 删除照片
 * DELETE /api/photos/:id
 */
router.delete('/photos/:id', authenticateToken, requireOwnership('photo'), asyncHandler(async (req, res) => {
    const photoId = req.params.id;
    
    // 获取照片信息
    const result = await db.query(
        'SELECT * FROM photos WHERE id = $1',
        [photoId]
    );
    
    if (result.rows.length === 0) {
        throw new AppError('照片不存在', 404);
    }
    
    const photo = result.rows[0];
    
    // 删除物理文件
    const urlsToDelete = [
        photo.original_url,
        photo.medium_url,
        photo.thumbnail_url,
        photo.webp_url
    ].filter(Boolean);
    
    for (const url of urlsToDelete) {
        if (url.startsWith('/uploads/')) {
            const filePath = path.join(process.cwd(), url);
            await fs.unlink(filePath).catch(() => {});
        }
    }
    
    // 删除数据库记录
    await db.query('DELETE FROM photos WHERE id = $1', [photoId]);
    
    // 通过WebSocket通知删除
    if (req.io) {
        req.io.to(`session_${photo.session_id}`).emit('photo_deleted', {
            id: photoId
        });
    }
    
    // 记录删除日志
    logger.info('照片删除成功', {
        photoId,
        sessionId: photo.session_id,
        userId: req.user.userId,
        ip: req.ip
    });
    
    res.json({
        success: true,
        message: '照片删除成功'
    });
}));

/**
 * 批量操作照片
 * POST /api/sessions/:sessionId/photos/batch
 */
router.post('/:sessionId/photos/batch', 
    authenticateToken, 
    requireSessionAccess, 
    asyncHandler(async (req, res) => {
        const sessionId = req.params.sessionId;
        const { action, photoIds, tags, status } = req.body;
        
        if (!action || !photoIds || !Array.isArray(photoIds)) {
            throw new AppError('缺少必要参数', 400);
        }
        
        const allowedActions = ['add_tags', 'remove_tags', 'set_tags', 'approve', 'reject', 'delete'];
        if (!allowedActions.includes(action)) {
            throw new AppError('无效的操作类型', 400);
        }
        
        let updatedCount = 0;
        
        switch (action) {
            case 'add_tags':
                if (!tags || !Array.isArray(tags)) {
                    throw new AppError('添加标签操作需要提供标签数组', 400);
                }
                
                for (const photoId of photoIds) {
                    const result = await db.query(
                        `UPDATE photos 
                         SET tags = (
                             SELECT jsonb_agg(DISTINCT value) 
                             FROM jsonb_array_elements_text(COALESCE(tags, '[]'::jsonb) || $2::jsonb) AS value
                         ),
                         updated_at = CURRENT_TIMESTAMP
                         WHERE id = $1 AND session_id = $3`,
                        [photoId, JSON.stringify(tags), sessionId]
                    );
                    
                    if (result.rowCount > 0) {
                        updatedCount++;
                    }
                }
                break;
                
            case 'set_tags':
                if (!tags || !Array.isArray(tags)) {
                    throw new AppError('设置标签操作需要提供标签数组', 400);
                }
                
                const setResult = await db.query(
                    `UPDATE photos 
                     SET tags = $1, updated_at = CURRENT_TIMESTAMP
                     WHERE id = ANY($2) AND session_id = $3`,
                    [JSON.stringify(tags), photoIds, sessionId]
                );
                
                updatedCount = setResult.rowCount;
                break;
                
            case 'approve':
                const approveResult = await db.query(
                    `UPDATE photos 
                     SET status = 'published', updated_at = CURRENT_TIMESTAMP
                     WHERE id = ANY($1) AND session_id = $2 AND status = 'pending'`,
                    [photoIds, sessionId]
                );
                
                updatedCount = approveResult.rowCount;
                
                // 通过WebSocket推送新发布的照片
                if (updatedCount > 0 && req.io) {
                    const publishedPhotos = await db.query(
                        `SELECT id, thumbnail_url, webp_url, tags, created_at
                         FROM photos 
                         WHERE id = ANY($1) AND status = 'published'`,
                        [photoIds]
                    );
                    
                    for (const photo of publishedPhotos.rows) {
                        req.io.to(`session_${sessionId}`).emit('photo_published', {
                            id: photo.id,
                            thumbnailUrl: photo.thumbnail_url,
                            webpUrl: photo.webp_url,
                            tags: JSON.parse(photo.tags || '[]'),
                            createdAt: photo.created_at
                        });
                    }
                }
                break;
                
            case 'reject':
                const rejectResult = await db.query(
                    `UPDATE photos 
                     SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
                     WHERE id = ANY($1) AND session_id = $2 AND status = 'pending'`,
                    [photoIds, sessionId]
                );
                
                updatedCount = rejectResult.rowCount;
                break;
                
            case 'delete':
                // 获取要删除的照片信息
                const photosToDelete = await db.query(
                    'SELECT * FROM photos WHERE id = ANY($1) AND session_id = $2',
                    [photoIds, sessionId]
                );
                
                // 删除物理文件
                for (const photo of photosToDelete.rows) {
                    const urlsToDelete = [
                        photo.original_url,
                        photo.medium_url,
                        photo.thumbnail_url,
                        photo.webp_url
                    ].filter(Boolean);
                    
                    for (const url of urlsToDelete) {
                        if (url.startsWith('/uploads/')) {
                            const filePath = path.join(process.cwd(), url);
                            await fs.unlink(filePath).catch(() => {});
                        }
                    }
                }
                
                // 删除数据库记录
                const deleteResult = await db.query(
                    'DELETE FROM photos WHERE id = ANY($1) AND session_id = $2',
                    [photoIds, sessionId]
                );
                
                updatedCount = deleteResult.rowCount;
                
                // 通过WebSocket通知删除
                if (updatedCount > 0 && req.io) {
                    for (const photoId of photoIds) {
                        req.io.to(`session_${sessionId}`).emit('photo_deleted', {
                            id: photoId
                        });
                    }
                }
                break;
        }
        
        // 记录批量操作日志
        logger.info('批量照片操作成功', {
            sessionId,
            userId: req.user.userId,
            action,
            photoIds,
            updatedCount,
            ip: req.ip
        });
        
        res.json({
            success: true,
            message: `成功${action === 'delete' ? '删除' : '更新'} ${updatedCount} 张照片`,
            data: {
                updatedCount
            }
        });
    })
);

/**
 * 下载照片
 * GET /api/photos/:id/download
 */
router.get('/photos/:id/download', optionalAuth, asyncHandler(async (req, res) => {
    const photoId = req.params.id;
    const { size = 'original' } = req.query;
    
    // 查询照片信息
    const result = await db.query(
        'SELECT * FROM photos WHERE id = $1',
        [photoId]
    );
    
    if (result.rows.length === 0) {
        throw new AppError('照片不存在', 404);
    }
    
    const photo = result.rows[0];
    
    // 检查访问权限
    const sessionResult = await db.query(
        'SELECT * FROM sessions WHERE id = $1',
        [photo.session_id]
    );
    
    const session = sessionResult.rows[0];
    const isOwner = req.user && req.user.userId === session.user_id;
    const isAdmin = req.user && req.user.role === 'admin';
    
    // 非公开会话需要验证访问权限
    if (!session.is_public && !isOwner && !isAdmin) {
        throw new AppError('无权下载此照片', 403);
    }
    
    // 非所有者只能下载已发布的照片
    if (!isOwner && !isAdmin && photo.status !== 'published') {
        throw new AppError('照片不存在', 404);
    }
    
    // 确定下载URL
    let downloadUrl;
    switch (size) {
        case 'thumbnail':
            downloadUrl = photo.thumbnail_url;
            break;
        case 'medium':
            downloadUrl = photo.medium_url;
            break;
        case 'webp':
            downloadUrl = photo.webp_url || photo.medium_url;
            break;
        case 'original':
        default:
            // 非所有者不能下载原图
            if (!isOwner && !isAdmin) {
                downloadUrl = photo.medium_url;
            } else {
                downloadUrl = photo.original_url;
            }
            break;
    }
    
    if (!downloadUrl) {
        throw new AppError('请求的图片尺寸不存在', 404);
    }
    
    // 构建文件路径
    const filePath = path.join(process.cwd(), downloadUrl);
    
    try {
        await fs.access(filePath);
    } catch (error) {
        throw new AppError('文件不存在', 404);
    }
    
    // 更新下载计数
    await db.query(
        'UPDATE photos SET download_count = download_count + 1 WHERE id = $1',
        [photoId]
    );
    
    // 设置下载响应头
    const filename = `${photo.filename}_${size}.${path.extname(downloadUrl).slice(1)}`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // 发送文件
    res.sendFile(filePath);
}));

module.exports = router;