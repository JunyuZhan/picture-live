/**
 * WebSocket 实时通信处理器
 * 处理照片上传进度、会话状态更新、实时通知等功能
 */

const jwt = require('jsonwebtoken');
const db = require('../config/database');
const redis = require('../config/redis');
const logger = require('../utils/logger');

class SocketHandler {
    constructor(io) {
        this.io = io;
        this.connectedUsers = new Map(); // userId -> Set of socketIds
        this.socketUsers = new Map(); // socketId -> userId
        this.sessionRooms = new Map(); // sessionId -> Set of socketIds
        
        this.setupMiddleware();
        this.setupEventHandlers();
    }
    
    /**
     * 设置中间件
     */
    setupMiddleware() {
        // 身份验证中间件
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
                
                if (!token) {
                    return next(new Error('未提供认证令牌'));
                }
                
                // 验证JWT令牌
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                
                // 查询用户信息
                const result = await db.query(
                    'SELECT id, username, role FROM users WHERE id = $1',
                    [decoded.userId]
                );
                
                if (result.rows.length === 0) {
                    return next(new Error('用户不存在'));
                }
                
                socket.user = {
                    userId: result.rows[0].id,
                    username: result.rows[0].username,
                    role: result.rows[0].role
                };
                
                next();
            } catch (error) {
                logger.error('WebSocket认证失败', { error: error.message });
                next(new Error('认证失败'));
            }
        });
    }
    
    /**
     * 设置事件处理器
     */
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            this.handleConnection(socket);
        });
    }
    
    /**
     * 处理新连接
     */
    handleConnection(socket) {
        const userId = socket.user.userId;
        const socketId = socket.id;
        
        logger.info('WebSocket连接建立', {
            userId,
            socketId,
            username: socket.user.username
        });
        
        // 记录用户连接
        if (!this.connectedUsers.has(userId)) {
            this.connectedUsers.set(userId, new Set());
        }
        this.connectedUsers.get(userId).add(socketId);
        this.socketUsers.set(socketId, userId);
        
        // 加入用户个人房间
        socket.join(`user:${userId}`);
        
        // 发送连接成功消息
        socket.emit('connected', {
            message: '连接成功',
            userId,
            timestamp: new Date().toISOString()
        });
        
        // 设置事件监听器
        this.setupSocketEvents(socket);
        
        // 处理断开连接
        socket.on('disconnect', () => {
            this.handleDisconnection(socket);
        });
    }
    
    /**
     * 设置Socket事件监听器
     */
    setupSocketEvents(socket) {
        const userId = socket.user.userId;
        
        // 加入会话房间
        socket.on('join_session', async (data) => {
            try {
                const { sessionId, accessCode } = data;
                
                // 验证会话访问权限
                const hasAccess = await this.verifySessionAccess(userId, sessionId, accessCode);
                
                if (!hasAccess) {
                    socket.emit('error', {
                        type: 'access_denied',
                        message: '无权访问此会话'
                    });
                    return;
                }
                
                // 加入会话房间
                socket.join(`session:${sessionId}`);
                
                // 记录会话房间成员
                if (!this.sessionRooms.has(sessionId)) {
                    this.sessionRooms.set(sessionId, new Set());
                }
                this.sessionRooms.get(sessionId).add(socket.id);
                
                // 通知其他成员有新用户加入
                socket.to(`session:${sessionId}`).emit('user_joined', {
                    userId,
                    username: socket.user.username,
                    timestamp: new Date().toISOString()
                });
                
                // 发送加入成功消息
                socket.emit('session_joined', {
                    sessionId,
                    message: '成功加入会话',
                    timestamp: new Date().toISOString()
                });
                
                logger.info('用户加入会话房间', {
                    userId,
                    sessionId,
                    socketId: socket.id
                });
                
            } catch (error) {
                logger.error('加入会话房间失败', {
                    userId,
                    error: error.message,
                    data
                });
                
                socket.emit('error', {
                    type: 'join_session_failed',
                    message: '加入会话失败'
                });
            }
        });
        
        // 离开会话房间
        socket.on('leave_session', (data) => {
            const { sessionId } = data;
            
            socket.leave(`session:${sessionId}`);
            
            // 从会话房间记录中移除
            if (this.sessionRooms.has(sessionId)) {
                this.sessionRooms.get(sessionId).delete(socket.id);
                
                if (this.sessionRooms.get(sessionId).size === 0) {
                    this.sessionRooms.delete(sessionId);
                }
            }
            
            // 通知其他成员用户离开
            socket.to(`session:${sessionId}`).emit('user_left', {
                userId,
                username: socket.user.username,
                timestamp: new Date().toISOString()
            });
            
            socket.emit('session_left', {
                sessionId,
                message: '已离开会话',
                timestamp: new Date().toISOString()
            });
            
            logger.info('用户离开会话房间', {
                userId,
                sessionId,
                socketId: socket.id
            });
        });
        
        // 处理照片上传进度
        socket.on('upload_progress', (data) => {
            const { sessionId, filename, progress, status } = data;
            
            // 广播上传进度到会话房间
            socket.to(`session:${sessionId}`).emit('photo_upload_progress', {
                userId,
                username: socket.user.username,
                filename,
                progress,
                status,
                timestamp: new Date().toISOString()
            });
        });
        
        // 处理实时消息
        socket.on('send_message', async (data) => {
            try {
                const { sessionId, message, type = 'text' } = data;
                
                // 验证会话访问权限
                const hasAccess = await this.verifySessionAccess(userId, sessionId);
                
                if (!hasAccess) {
                    socket.emit('error', {
                        type: 'access_denied',
                        message: '无权在此会话中发送消息'
                    });
                    return;
                }
                
                const messageData = {
                    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    userId,
                    username: socket.user.username,
                    sessionId,
                    message,
                    type,
                    timestamp: new Date().toISOString()
                };
                
                // 广播消息到会话房间
                this.io.to(`session:${sessionId}`).emit('new_message', messageData);
                
                // 可选：将消息存储到数据库或Redis
                await this.storeMessage(messageData);
                
                logger.info('实时消息发送', {
                    userId,
                    sessionId,
                    messageType: type
                });
                
            } catch (error) {
                logger.error('发送实时消息失败', {
                    userId,
                    error: error.message,
                    data
                });
                
                socket.emit('error', {
                    type: 'send_message_failed',
                    message: '发送消息失败'
                });
            }
        });
        
        // 处理心跳
        socket.on('ping', () => {
            socket.emit('pong', {
                timestamp: new Date().toISOString()
            });
        });
    }
    
    /**
     * 处理断开连接
     */
    handleDisconnection(socket) {
        const userId = this.socketUsers.get(socket.id);
        
        if (userId) {
            // 从用户连接记录中移除
            if (this.connectedUsers.has(userId)) {
                this.connectedUsers.get(userId).delete(socket.id);
                
                if (this.connectedUsers.get(userId).size === 0) {
                    this.connectedUsers.delete(userId);
                }
            }
            
            // 从会话房间记录中移除
            for (const [sessionId, socketIds] of this.sessionRooms.entries()) {
                if (socketIds.has(socket.id)) {
                    socketIds.delete(socket.id);
                    
                    // 通知会话房间其他成员
                    socket.to(`session:${sessionId}`).emit('user_left', {
                        userId,
                        username: socket.user?.username,
                        timestamp: new Date().toISOString()
                    });
                    
                    if (socketIds.size === 0) {
                        this.sessionRooms.delete(sessionId);
                    }
                }
            }
            
            this.socketUsers.delete(socket.id);
        }
        
        logger.info('WebSocket连接断开', {
            userId,
            socketId: socket.id,
            username: socket.user?.username
        });
    }
    
    /**
     * 验证会话访问权限
     */
    async verifySessionAccess(userId, sessionId, accessCode = null) {
        try {
            const result = await db.query(
                `SELECT s.*, 
                        CASE 
                            WHEN s.user_id = $1 THEN true
                            WHEN s.access_type = 'public' THEN true
                            WHEN s.access_type = 'private' AND s.access_code = $2 THEN true
                            ELSE false
                        END as has_access
                 FROM sessions s
                 WHERE s.id = $3`,
                [userId, accessCode, sessionId]
            );
            
            if (result.rows.length === 0) {
                return false;
            }
            
            return result.rows[0].has_access;
            
        } catch (error) {
            logger.error('验证会话访问权限失败', {
                userId,
                sessionId,
                error: error.message
            });
            return false;
        }
    }
    
    /**
     * 存储实时消息
     */
    async storeMessage(messageData) {
        try {
            // 将消息存储到Redis（临时存储）
            const key = `session_messages:${messageData.sessionId}`;
            await redis.client.lpush(key, JSON.stringify(messageData));
            await redis.client.ltrim(key, 0, 99); // 只保留最近100条消息
            await redis.client.expire(key, 86400); // 24小时过期
            
        } catch (error) {
            logger.error('存储实时消息失败', {
                error: error.message,
                messageData
            });
        }
    }
    
    /**
     * 向特定用户发送通知
     */
    async sendNotificationToUser(userId, notification) {
        try {
            this.io.to(`user:${userId}`).emit('notification', {
                ...notification,
                timestamp: new Date().toISOString()
            });
            
            logger.info('发送用户通知', {
                userId,
                notificationType: notification.type
            });
            
        } catch (error) {
            logger.error('发送用户通知失败', {
                userId,
                error: error.message,
                notification
            });
        }
    }
    
    /**
     * 向会话房间广播消息
     */
    async broadcastToSession(sessionId, event, data) {
        try {
            this.io.to(`session:${sessionId}`).emit(event, {
                ...data,
                timestamp: new Date().toISOString()
            });
            
            logger.info('会话房间广播', {
                sessionId,
                event,
                dataType: typeof data
            });
            
        } catch (error) {
            logger.error('会话房间广播失败', {
                sessionId,
                event,
                error: error.message
            });
        }
    }
    
    /**
     * 通知照片状态更新
     */
    async notifyPhotoStatusUpdate(sessionId, photoData) {
        await this.broadcastToSession(sessionId, 'photo_status_updated', {
            type: 'photo_status_update',
            photo: photoData
        });
    }
    
    /**
     * 通知新照片上传
     */
    async notifyNewPhoto(sessionId, photoData) {
        await this.broadcastToSession(sessionId, 'new_photo', {
            type: 'new_photo',
            photo: photoData
        });
    }
    
    /**
     * 通知会话状态更新
     */
    async notifySessionStatusUpdate(sessionId, sessionData) {
        await this.broadcastToSession(sessionId, 'session_status_updated', {
            type: 'session_status_update',
            session: sessionData
        });
    }
    
    /**
     * 获取在线用户统计
     */
    getOnlineStats() {
        return {
            totalConnections: this.socketUsers.size,
            uniqueUsers: this.connectedUsers.size,
            activeSessions: this.sessionRooms.size
        };
    }
    
    /**
     * 获取会话在线用户
     */
    getSessionOnlineUsers(sessionId) {
        const socketIds = this.sessionRooms.get(sessionId) || new Set();
        const users = new Set();
        
        for (const socketId of socketIds) {
            const userId = this.socketUsers.get(socketId);
            if (userId) {
                users.add(userId);
            }
        }
        
        return Array.from(users);
    }
    
    /**
     * 强制断开用户连接
     */
    async disconnectUser(userId, reason = '管理员操作') {
        const socketIds = this.connectedUsers.get(userId);
        
        if (socketIds) {
            for (const socketId of socketIds) {
                const socket = this.io.sockets.sockets.get(socketId);
                if (socket) {
                    socket.emit('force_disconnect', {
                        reason,
                        timestamp: new Date().toISOString()
                    });
                    socket.disconnect(true);
                }
            }
        }
        
        logger.info('强制断开用户连接', {
            userId,
            reason
        });
    }
}

module.exports = SocketHandler;