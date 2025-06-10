/**
 * 文件处理工具
 * 处理图片上传、压缩、水印、多分辨率生成等功能
 */

const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const crypto = require('crypto');
const logger = require('./logger');

class FileHandler {
    constructor() {
        this.uploadPath = process.env.UPLOAD_PATH || './uploads';
        this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB
        this.allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,gif,webp').split(',');
        
        // 预设的图片尺寸
        this.imageSizes = {
            thumbnail: { width: 150, height: 150, quality: 80 },
            small: { width: 400, height: 400, quality: 85 },
            medium: { width: 800, height: 800, quality: 90 },
            large: { width: 1200, height: 1200, quality: 95 },
            original: { quality: 100 }
        };
        
        this.initializeDirectories();
    }
    
    /**
     * 初始化上传目录
     */
    async initializeDirectories() {
        try {
            const directories = [
                this.uploadPath,
                path.join(this.uploadPath, 'photos'),
                path.join(this.uploadPath, 'photos', 'original'),
                path.join(this.uploadPath, 'photos', 'large'),
                path.join(this.uploadPath, 'photos', 'medium'),
                path.join(this.uploadPath, 'photos', 'small'),
                path.join(this.uploadPath, 'photos', 'thumbnail'),
                path.join(this.uploadPath, 'temp'),
                path.join(this.uploadPath, 'watermarks')
            ];
            
            for (const dir of directories) {
                try {
                    await fs.access(dir);
                } catch {
                    await fs.mkdir(dir, { recursive: true });
                    logger.info('创建目录', { directory: dir });
                }
            }
        } catch (error) {
            logger.error('初始化上传目录失败', { error: error.message });
            throw error;
        }
    }
    
    /**
     * 生成唯一文件名
     */
    generateUniqueFilename(originalName) {
        const ext = path.extname(originalName).toLowerCase();
        const timestamp = Date.now();
        const random = crypto.randomBytes(8).toString('hex');
        return `${timestamp}_${random}${ext}`;
    }
    
    /**
     * 验证文件类型
     */
    validateFileType(filename) {
        const ext = path.extname(filename).toLowerCase().substring(1);
        return this.allowedTypes.includes(ext);
    }
    
    /**
     * 验证文件大小
     */
    validateFileSize(size) {
        return size <= this.maxFileSize;
    }
    
    /**
     * 获取图片元数据
     */
    async getImageMetadata(filePath) {
        try {
            const metadata = await sharp(filePath).metadata();
            return {
                width: metadata.width,
                height: metadata.height,
                format: metadata.format,
                size: metadata.size,
                density: metadata.density,
                hasAlpha: metadata.hasAlpha,
                orientation: metadata.orientation
            };
        } catch (error) {
            logger.error('获取图片元数据失败', {
                filePath,
                error: error.message
            });
            throw new Error('无法读取图片元数据');
        }
    }
    
    /**
     * 处理图片上传
     */
    async processImageUpload(file, options = {}) {
        try {
            const {
                sessionId,
                generateThumbnails = true,
                addWatermark = false,
                watermarkText = '',
                autoRotate = true
            } = options;
            
            // 验证文件
            if (!this.validateFileType(file.originalname)) {
                throw new Error('不支持的文件类型');
            }
            
            if (!this.validateFileSize(file.size)) {
                throw new Error('文件大小超出限制');
            }
            
            // 生成唯一文件名
            const uniqueFilename = this.generateUniqueFilename(file.originalname);
            const fileBaseName = path.parse(uniqueFilename).name;
            
            // 创建相册目录
            const sessionDir = path.join(this.uploadPath, 'photos', sessionId);
            await fs.mkdir(sessionDir, { recursive: true });
            
            // 处理原始图片
            let sharpInstance = sharp(file.buffer);
            
            // 自动旋转（根据EXIF信息）
            if (autoRotate) {
                sharpInstance = sharpInstance.rotate();
            }
            
            // 获取原始图片信息
            const originalMetadata = await sharpInstance.metadata();
            
            // 保存原始图片
            const originalPath = path.join(sessionDir, 'original', uniqueFilename);
            await fs.mkdir(path.dirname(originalPath), { recursive: true });
            await sharpInstance.jpeg({ quality: this.imageSizes.original.quality }).toFile(originalPath);
            
            const result = {
                filename: uniqueFilename,
                originalName: file.originalname,
                size: file.size,
                metadata: {
                    width: originalMetadata.width,
                    height: originalMetadata.height,
                    format: originalMetadata.format
                },
                paths: {
                    original: originalPath
                }
            };
            
            // 生成多分辨率图片
            if (generateThumbnails) {
                const thumbnailPaths = await this.generateThumbnails(
                    sharpInstance,
                    sessionDir,
                    fileBaseName,
                    addWatermark,
                    watermarkText
                );
                result.paths = { ...result.paths, ...thumbnailPaths };
            }
            
            logger.info('图片处理完成', {
                filename: uniqueFilename,
                sessionId,
                originalSize: file.size,
                dimensions: `${originalMetadata.width}x${originalMetadata.height}`
            });
            
            return result;
            
        } catch (error) {
            logger.error('图片处理失败', {
                filename: file.originalname,
                error: error.message
            });
            throw error;
        }
    }
    
    /**
     * 生成多分辨率缩略图
     */
    async generateThumbnails(sharpInstance, sessionDir, fileBaseName, addWatermark, watermarkText) {
        const paths = {};
        
        try {
            for (const [sizeName, sizeConfig] of Object.entries(this.imageSizes)) {
                if (sizeName === 'original') continue;
                
                const outputDir = path.join(sessionDir, sizeName);
                await fs.mkdir(outputDir, { recursive: true });
                
                const outputPath = path.join(outputDir, `${fileBaseName}.jpg`);
                
                let pipeline = sharpInstance.clone();
                
                // 调整尺寸
                if (sizeConfig.width && sizeConfig.height) {
                    pipeline = pipeline.resize(sizeConfig.width, sizeConfig.height, {
                        fit: 'inside',
                        withoutEnlargement: true
                    });
                }
                
                // 添加水印
                if (addWatermark && watermarkText && sizeName !== 'thumbnail') {
                    pipeline = await this.addTextWatermark(pipeline, watermarkText, sizeName);
                }
                
                // 输出JPEG格式
                await pipeline
                    .jpeg({ quality: sizeConfig.quality })
                    .toFile(outputPath);
                
                paths[sizeName] = outputPath;
            }
            
            return paths;
            
        } catch (error) {
            logger.error('生成缩略图失败', {
                fileBaseName,
                error: error.message
            });
            throw error;
        }
    }
    
    /**
     * 添加文字水印
     */
    async addTextWatermark(sharpInstance, text, sizeName) {
        try {
            const metadata = await sharpInstance.metadata();
            const { width, height } = metadata;
            
            // 根据图片尺寸调整字体大小
            let fontSize;
            switch (sizeName) {
                case 'large':
                    fontSize = Math.max(24, Math.min(width, height) * 0.03);
                    break;
                case 'medium':
                    fontSize = Math.max(18, Math.min(width, height) * 0.025);
                    break;
                case 'small':
                    fontSize = Math.max(14, Math.min(width, height) * 0.02);
                    break;
                default:
                    fontSize = 16;
            }
            
            // 创建水印SVG
            const watermarkSvg = `
                <svg width="${width}" height="${height}">
                    <defs>
                        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="1" dy="1" stdDeviation="1" flood-color="black" flood-opacity="0.5"/>
                        </filter>
                    </defs>
                    <text x="${width - 20}" y="${height - 20}" 
                          font-family="Arial, sans-serif" 
                          font-size="${fontSize}" 
                          fill="white" 
                          text-anchor="end" 
                          filter="url(#shadow)"
                          opacity="0.8">${text}</text>
                </svg>
            `;
            
            const watermarkBuffer = Buffer.from(watermarkSvg);
            
            return sharpInstance.composite([
                {
                    input: watermarkBuffer,
                    blend: 'over'
                }
            ]);
            
        } catch (error) {
            logger.error('添加水印失败', {
                text,
                sizeName,
                error: error.message
            });
            // 如果水印添加失败，返回原始图片
            return sharpInstance;
        }
    }
    
    /**
     * 删除文件
     */
    async deleteFile(filePath) {
        try {
            await fs.unlink(filePath);
            logger.info('文件删除成功', { filePath });
        } catch (error) {
            if (error.code !== 'ENOENT') {
                logger.error('文件删除失败', {
                    filePath,
                    error: error.message
                });
                throw error;
            }
        }
    }
    
    /**
     * 删除照片的所有尺寸文件
     */
    async deletePhotoFiles(sessionId, filename) {
        try {
            const fileBaseName = path.parse(filename).name;
            const sessionDir = path.join(this.uploadPath, 'photos', sessionId);
            
            const filesToDelete = [
                path.join(sessionDir, 'original', filename),
                path.join(sessionDir, 'large', `${fileBaseName}.jpg`),
                path.join(sessionDir, 'medium', `${fileBaseName}.jpg`),
                path.join(sessionDir, 'small', `${fileBaseName}.jpg`),
                path.join(sessionDir, 'thumbnail', `${fileBaseName}.jpg`)
            ];
            
            for (const filePath of filesToDelete) {
                await this.deleteFile(filePath);
            }
            
            logger.info('照片文件删除完成', {
                sessionId,
                filename,
                deletedFiles: filesToDelete.length
            });
            
        } catch (error) {
            logger.error('删除照片文件失败', {
                sessionId,
                filename,
                error: error.message
            });
            throw error;
        }
    }
    
    /**
     * 获取文件路径
     */
    getFilePath(sessionId, filename, size = 'original') {
        const sessionDir = path.join(this.uploadPath, 'photos', sessionId);
        
        if (size === 'original') {
            return path.join(sessionDir, 'original', filename);
        } else {
            const fileBaseName = path.parse(filename).name;
            return path.join(sessionDir, size, `${fileBaseName}.jpg`);
        }
    }
    
    /**
     * 检查文件是否存在
     */
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * 获取文件统计信息
     */
    async getFileStats(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return {
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                isFile: stats.isFile(),
                isDirectory: stats.isDirectory()
            };
        } catch (error) {
            logger.error('获取文件统计信息失败', {
                filePath,
                error: error.message
            });
            throw error;
        }
    }
    
    /**
     * 清理临时文件
     */
    async cleanupTempFiles(olderThanHours = 24) {
        try {
            const tempDir = path.join(this.uploadPath, 'temp');
            const files = await fs.readdir(tempDir);
            const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
            
            let deletedCount = 0;
            
            for (const file of files) {
                const filePath = path.join(tempDir, file);
                const stats = await fs.stat(filePath);
                
                if (stats.mtime.getTime() < cutoffTime) {
                    await this.deleteFile(filePath);
                    deletedCount++;
                }
            }
            
            logger.info('临时文件清理完成', {
                deletedCount,
                olderThanHours
            });
            
            return deletedCount;
            
        } catch (error) {
            logger.error('清理临时文件失败', {
                error: error.message
            });
            throw error;
        }
    }
    
    /**
     * 获取目录大小
     */
    async getDirectorySize(dirPath) {
        try {
            let totalSize = 0;
            
            const calculateSize = async (currentPath) => {
                const stats = await fs.stat(currentPath);
                
                if (stats.isFile()) {
                    totalSize += stats.size;
                } else if (stats.isDirectory()) {
                    const files = await fs.readdir(currentPath);
                    for (const file of files) {
                        await calculateSize(path.join(currentPath, file));
                    }
                }
            };
            
            await calculateSize(dirPath);
            return totalSize;
            
        } catch (error) {
            logger.error('计算目录大小失败', {
                dirPath,
                error: error.message
            });
            throw error;
        }
    }
    
    /**
     * 创建文件备份
     */
    async createBackup(filePath, backupDir) {
        try {
            const filename = path.basename(filePath);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFilename = `${timestamp}_${filename}`;
            const backupPath = path.join(backupDir, backupFilename);
            
            await fs.mkdir(backupDir, { recursive: true });
            await fs.copyFile(filePath, backupPath);
            
            logger.info('文件备份创建成功', {
                originalPath: filePath,
                backupPath
            });
            
            return backupPath;
            
        } catch (error) {
            logger.error('创建文件备份失败', {
                filePath,
                backupDir,
                error: error.message
            });
            throw error;
        }
    }
    
    /**
     * 批量处理图片
     */
    async batchProcessImages(files, options = {}) {
        const results = [];
        const errors = [];
        
        for (let i = 0; i < files.length; i++) {
            try {
                const result = await this.processImageUpload(files[i], {
                    ...options,
                    progressCallback: (progress) => {
                        if (options.progressCallback) {
                            options.progressCallback({
                                fileIndex: i,
                                totalFiles: files.length,
                                fileProgress: progress,
                                overallProgress: ((i + progress / 100) / files.length) * 100
                            });
                        }
                    }
                });
                
                results.push(result);
                
            } catch (error) {
                errors.push({
                    filename: files[i].originalname,
                    error: error.message
                });
                
                logger.error('批量处理图片失败', {
                    filename: files[i].originalname,
                    error: error.message
                });
            }
        }
        
        return {
            successful: results,
            failed: errors,
            totalProcessed: files.length,
            successCount: results.length,
            errorCount: errors.length
        };
    }
}

module.exports = new FileHandler();