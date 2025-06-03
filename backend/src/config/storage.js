/**
 * 存储配置模块
 * 支持本地存储、MinIO、阿里云OSS、AWS S3等多种存储方式
 */

const path = require('path');
const fs = require('fs').promises;
const { Client } = require('minio');
const OSS = require('ali-oss');
const AWS = require('aws-sdk');
const logger = require('../utils/logger');

class StorageManager {
    constructor() {
        this.provider = process.env.CLOUD_STORAGE_PROVIDER || 'local';
        this.uploadPath = process.env.UPLOAD_PATH || './uploads';
        this.initializeProvider();
    }

    initializeProvider() {
        switch (this.provider) {
            case 'minio':
                this.initMinIO();
                break;
            case 'aliyun':
                this.initAliyunOSS();
                break;
            case 's3':
                this.initAWSS3();
                break;
            case 'local':
            default:
                this.initLocalStorage();
                break;
        }
    }

    initMinIO() {
        this.minioClient = new Client({
            endPoint: process.env.MINIO_ENDPOINT || 'localhost',
            port: parseInt(process.env.MINIO_PORT) || 9000,
            useSSL: process.env.MINIO_USE_SSL === 'true',
            accessKey: process.env.MINIO_ACCESS_KEY,
            secretKey: process.env.MINIO_SECRET_KEY
        });
        this.bucket = process.env.MINIO_BUCKET || 'picture-live';
        logger.info('MinIO storage initialized');
    }

    initAliyunOSS() {
        this.ossClient = new OSS({
            region: process.env.ALIYUN_OSS_REGION,
            accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID,
            accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET,
            bucket: process.env.ALIYUN_OSS_BUCKET
        });
        logger.info('Aliyun OSS storage initialized');
    }

    initAWSS3() {
        this.s3Client = new AWS.S3({
            region: process.env.AWS_S3_REGION,
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        });
        this.bucket = process.env.AWS_S3_BUCKET;
        logger.info('AWS S3 storage initialized');
    }

    initLocalStorage() {
        logger.info('Local storage initialized');
    }

    /**
     * 上传文件
     * @param {Buffer} buffer - 文件缓冲区
     * @param {string} filename - 文件名
     * @param {string} subfolder - 子文件夹
     * @param {Object} options - 上传选项
     * @returns {Promise<string>} 文件URL
     */
    async uploadFile(buffer, filename, subfolder = '', options = {}) {
        const objectName = subfolder ? `${subfolder}/${filename}` : filename;
        
        switch (this.provider) {
            case 'minio':
                return await this.uploadToMinIO(buffer, objectName, options);
            case 'aliyun':
                return await this.uploadToAliyunOSS(buffer, objectName, options);
            case 's3':
                return await this.uploadToAWSS3(buffer, objectName, options);
            case 'local':
            default:
                return await this.uploadToLocal(buffer, filename, subfolder, options);
        }
    }

    /**
     * MinIO上传
     */
    async uploadToMinIO(buffer, objectName, options = {}) {
        try {
            // 确保bucket存在
            const bucketExists = await this.minioClient.bucketExists(this.bucket);
            if (!bucketExists) {
                await this.minioClient.makeBucket(this.bucket, 'us-east-1');
                logger.info(`Created MinIO bucket: ${this.bucket}`);
            }

            // 设置元数据
            const metaData = {
                'Content-Type': options.contentType || 'application/octet-stream',
                'X-Amz-Meta-Upload-Time': new Date().toISOString(),
                ...options.metadata
            };

            // 上传文件
            await this.minioClient.putObject(this.bucket, objectName, buffer, buffer.length, metaData);
            
            // 生成访问URL
            const baseUrl = process.env.MINIO_PUBLIC_URL || 
                `${process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http'}://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`;
            
            const url = `${baseUrl}/${this.bucket}/${objectName}`;
            
            logger.info(`File uploaded to MinIO: ${objectName}`);
            return url;
        } catch (error) {
            logger.error('MinIO upload failed:', error);
            throw new Error(`MinIO upload failed: ${error.message}`);
        }
    }

    /**
     * 阿里云OSS上传
     */
    async uploadToAliyunOSS(buffer, objectName, options = {}) {
        try {
            const result = await this.ossClient.put(objectName, buffer, {
                headers: {
                    'Content-Type': options.contentType || 'application/octet-stream',
                    ...options.headers
                }
            });
            
            logger.info(`File uploaded to Aliyun OSS: ${objectName}`);
            return result.url;
        } catch (error) {
            logger.error('Aliyun OSS upload failed:', error);
            throw new Error(`Aliyun OSS upload failed: ${error.message}`);
        }
    }

    /**
     * AWS S3上传
     */
    async uploadToAWSS3(buffer, objectName, options = {}) {
        try {
            const params = {
                Bucket: this.bucket,
                Key: objectName,
                Body: buffer,
                ContentType: options.contentType || 'application/octet-stream',
                ...options.s3Params
            };

            const result = await this.s3Client.upload(params).promise();
            
            logger.info(`File uploaded to AWS S3: ${objectName}`);
            return result.Location;
        } catch (error) {
            logger.error('AWS S3 upload failed:', error);
            throw new Error(`AWS S3 upload failed: ${error.message}`);
        }
    }

    /**
     * 本地存储上传
     */
    async uploadToLocal(buffer, filename, subfolder = '', options = {}) {
        try {
            const uploadDir = path.join(this.uploadPath, subfolder);
            await fs.mkdir(uploadDir, { recursive: true });
            
            const filePath = path.join(uploadDir, filename);
            await fs.writeFile(filePath, buffer);
            
            const url = `/uploads/${subfolder}/${filename}`.replace(/\/+/g, '/');
            
            logger.info(`File uploaded locally: ${filePath}`);
            return url;
        } catch (error) {
            logger.error('Local upload failed:', error);
            throw new Error(`Local upload failed: ${error.message}`);
        }
    }

    /**
     * 删除文件
     */
    async deleteFile(objectName) {
        switch (this.provider) {
            case 'minio':
                return await this.deleteFromMinIO(objectName);
            case 'aliyun':
                return await this.deleteFromAliyunOSS(objectName);
            case 's3':
                return await this.deleteFromAWSS3(objectName);
            case 'local':
            default:
                return await this.deleteFromLocal(objectName);
        }
    }

    async deleteFromMinIO(objectName) {
        try {
            await this.minioClient.removeObject(this.bucket, objectName);
            logger.info(`File deleted from MinIO: ${objectName}`);
        } catch (error) {
            logger.error('MinIO delete failed:', error);
            throw new Error(`MinIO delete failed: ${error.message}`);
        }
    }

    async deleteFromAliyunOSS(objectName) {
        try {
            await this.ossClient.delete(objectName);
            logger.info(`File deleted from Aliyun OSS: ${objectName}`);
        } catch (error) {
            logger.error('Aliyun OSS delete failed:', error);
            throw new Error(`Aliyun OSS delete failed: ${error.message}`);
        }
    }

    async deleteFromAWSS3(objectName) {
        try {
            await this.s3Client.deleteObject({
                Bucket: this.bucket,
                Key: objectName
            }).promise();
            logger.info(`File deleted from AWS S3: ${objectName}`);
        } catch (error) {
            logger.error('AWS S3 delete failed:', error);
            throw new Error(`AWS S3 delete failed: ${error.message}`);
        }
    }

    async deleteFromLocal(objectName) {
        try {
            const filePath = path.join(this.uploadPath, objectName);
            await fs.unlink(filePath);
            logger.info(`File deleted locally: ${filePath}`);
        } catch (error) {
            logger.error('Local delete failed:', error);
            throw new Error(`Local delete failed: ${error.message}`);
        }
    }

    /**
     * 获取文件信息
     */
    async getFileInfo(objectName) {
        switch (this.provider) {
            case 'minio':
                return await this.getMinIOFileInfo(objectName);
            case 'aliyun':
                return await this.getAliyunOSSFileInfo(objectName);
            case 's3':
                return await this.getAWSS3FileInfo(objectName);
            case 'local':
            default:
                return await this.getLocalFileInfo(objectName);
        }
    }

    async getMinIOFileInfo(objectName) {
        try {
            const stat = await this.minioClient.statObject(this.bucket, objectName);
            return {
                size: stat.size,
                lastModified: stat.lastModified,
                etag: stat.etag,
                contentType: stat.metaData['content-type']
            };
        } catch (error) {
            logger.error('MinIO file info failed:', error);
            throw new Error(`MinIO file info failed: ${error.message}`);
        }
    }

    async getAliyunOSSFileInfo(objectName) {
        try {
            const result = await this.ossClient.head(objectName);
            return {
                size: parseInt(result.res.headers['content-length']),
                lastModified: new Date(result.res.headers['last-modified']),
                etag: result.res.headers.etag,
                contentType: result.res.headers['content-type']
            };
        } catch (error) {
            logger.error('Aliyun OSS file info failed:', error);
            throw new Error(`Aliyun OSS file info failed: ${error.message}`);
        }
    }

    async getAWSS3FileInfo(objectName) {
        try {
            const result = await this.s3Client.headObject({
                Bucket: this.bucket,
                Key: objectName
            }).promise();
            
            return {
                size: result.ContentLength,
                lastModified: result.LastModified,
                etag: result.ETag,
                contentType: result.ContentType
            };
        } catch (error) {
            logger.error('AWS S3 file info failed:', error);
            throw new Error(`AWS S3 file info failed: ${error.message}`);
        }
    }

    async getLocalFileInfo(objectName) {
        try {
            const filePath = path.join(this.uploadPath, objectName);
            const stats = await fs.stat(filePath);
            
            return {
                size: stats.size,
                lastModified: stats.mtime,
                contentType: 'application/octet-stream'
            };
        } catch (error) {
            logger.error('Local file info failed:', error);
            throw new Error(`Local file info failed: ${error.message}`);
        }
    }

    /**
     * 生成预签名URL（用于直接上传）
     */
    async generatePresignedUrl(objectName, expiry = 3600) {
        switch (this.provider) {
            case 'minio':
                return await this.minioClient.presignedPutObject(this.bucket, objectName, expiry);
            case 'aliyun':
                return this.ossClient.signatureUrl(objectName, {
                    method: 'PUT',
                    expires: expiry
                });
            case 's3':
                return await this.s3Client.getSignedUrlPromise('putObject', {
                    Bucket: this.bucket,
                    Key: objectName,
                    Expires: expiry
                });
            default:
                throw new Error('Presigned URLs not supported for local storage');
        }
    }
}

// 创建单例实例
const storageManager = new StorageManager();

module.exports = storageManager;