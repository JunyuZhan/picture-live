const logger = require('../utils/logger')
const { getCache, setCache } = require('../config/redis')

// Socket.IO事件处理
function socketHandler(io) {
  // 存储连接的客户端信息
  const connectedClients = new Map()
  
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`, {
      socketId: socket.id,
      clientIP: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent']
    })
    
    // 存储客户端信息
    connectedClients.set(socket.id, {
      id: socket.id,
      connectedAt: new Date(),
      sessionId: null,
      clientType: null, // 'photographer' | 'viewer'
      ip: socket.handshake.address
    })
    
    // 加入拍摄会话房间
    socket.on('join-session', async (data) => {
      try {
        const { sessionId, clientType, accessCode } = data
        
        if (!sessionId) {
          socket.emit('error', { message: 'Session ID is required' })
          return
        }
        
        // 验证会话是否存在（这里需要实现会话验证逻辑）
        // const session = await validateSession(sessionId, accessCode)
        
        // 更新客户端信息
        const clientInfo = connectedClients.get(socket.id)
        if (clientInfo) {
          clientInfo.sessionId = sessionId
          clientInfo.clientType = clientType
        }
        
        // 加入房间
        await socket.join(sessionId)
        
        logger.info(`Client joined session: ${sessionId}`, {
          socketId: socket.id,
          sessionId,
          clientType
        })
        
        // 通知客户端加入成功
        socket.emit('session-joined', {
          sessionId,
          clientType,
          timestamp: new Date().toISOString()
        })
        
        // 通知房间内其他客户端有新用户加入
        socket.to(sessionId).emit('user-joined', {
          socketId: socket.id,
          clientType,
          timestamp: new Date().toISOString()
        })
        
        // 发送当前房间统计信息
        const roomClients = await io.in(sessionId).fetchSockets()
        const roomStats = {
          totalClients: roomClients.length,
          photographers: roomClients.filter(s => {
            const info = connectedClients.get(s.id)
            return info?.clientType === 'photographer'
          }).length,
          viewers: roomClients.filter(s => {
            const info = connectedClients.get(s.id)
            return info?.clientType === 'viewer'
          }).length
        }
        
        io.to(sessionId).emit('room-stats', roomStats)
        
      } catch (error) {
        logger.error('Error joining session:', error)
        socket.emit('error', { message: 'Failed to join session' })
      }
    })
    
    // 离开拍摄会话房间
    socket.on('leave-session', async (data) => {
      try {
        const { sessionId } = data
        const clientInfo = connectedClients.get(socket.id)
        
        if (sessionId && clientInfo?.sessionId === sessionId) {
          await socket.leave(sessionId)
          
          logger.info(`Client left session: ${sessionId}`, {
            socketId: socket.id,
            sessionId
          })
          
          // 通知房间内其他客户端有用户离开
          socket.to(sessionId).emit('user-left', {
            socketId: socket.id,
            clientType: clientInfo.clientType,
            timestamp: new Date().toISOString()
          })
          
          // 更新客户端信息
          clientInfo.sessionId = null
          clientInfo.clientType = null
          
          // 发送更新后的房间统计信息
          const roomClients = await io.in(sessionId).fetchSockets()
          const roomStats = {
            totalClients: roomClients.length,
            photographers: roomClients.filter(s => {
              const info = connectedClients.get(s.id)
              return info?.clientType === 'photographer'
            }).length,
            viewers: roomClients.filter(s => {
              const info = connectedClients.get(s.id)
              return info?.clientType === 'viewer'
            }).length
          }
          
          io.to(sessionId).emit('room-stats', roomStats)
        }
        
      } catch (error) {
        logger.error('Error leaving session:', error)
        socket.emit('error', { message: 'Failed to leave session' })
      }
    })
    
    // 新照片上传通知
    socket.on('photo-uploaded', async (data) => {
      try {
        const { sessionId, photoData } = data
        const clientInfo = connectedClients.get(socket.id)
        
        if (!sessionId || clientInfo?.sessionId !== sessionId) {
          socket.emit('error', { message: 'Invalid session' })
          return
        }
        
        if (clientInfo.clientType !== 'photographer') {
          socket.emit('error', { message: 'Only photographers can upload photos' })
          return
        }
        
        logger.info(`Photo uploaded to session: ${sessionId}`, {
          socketId: socket.id,
          sessionId,
          photoId: photoData.id
        })
        
        // 向房间内的观看者广播新照片
        socket.to(sessionId).emit('new-photo', {
          photo: photoData,
          timestamp: new Date().toISOString()
        })
        
        // 缓存最新照片信息
        await setCache(`session:${sessionId}:latest_photo`, photoData, 3600)
        
      } catch (error) {
        logger.error('Error handling photo upload:', error)
        socket.emit('error', { message: 'Failed to process photo upload' })
      }
    })
    
    // 照片状态更新（审核通过/拒绝）
    socket.on('photo-status-updated', async (data) => {
      try {
        const { sessionId, photoId, status, reason } = data
        const clientInfo = connectedClients.get(socket.id)
        
        if (!sessionId || clientInfo?.sessionId !== sessionId) {
          socket.emit('error', { message: 'Invalid session' })
          return
        }
        
        logger.info(`Photo status updated: ${photoId}`, {
          socketId: socket.id,
          sessionId,
          photoId,
          status
        })
        
        // 向房间内所有客户端广播状态更新
        io.to(sessionId).emit('photo-status-changed', {
          photoId,
          status,
          reason,
          timestamp: new Date().toISOString()
        })
        
      } catch (error) {
        logger.error('Error handling photo status update:', error)
        socket.emit('error', { message: 'Failed to update photo status' })
      }
    })
    
    // 实时消息
    socket.on('send-message', async (data) => {
      try {
        const { sessionId, message, messageType = 'text' } = data
        const clientInfo = connectedClients.get(socket.id)
        
        if (!sessionId || clientInfo?.sessionId !== sessionId) {
          socket.emit('error', { message: 'Invalid session' })
          return
        }
        
        const messageData = {
          id: `msg_${Date.now()}_${socket.id}`,
          message,
          messageType,
          sender: {
            socketId: socket.id,
            clientType: clientInfo.clientType
          },
          timestamp: new Date().toISOString()
        }
        
        logger.debug(`Message sent to session: ${sessionId}`, {
          socketId: socket.id,
          sessionId,
          messageType
        })
        
        // 向房间内所有客户端广播消息
        io.to(sessionId).emit('new-message', messageData)
        
      } catch (error) {
        logger.error('Error handling message:', error)
        socket.emit('error', { message: 'Failed to send message' })
      }
    })
    
    // 获取房间统计信息
    socket.on('get-room-stats', async (data) => {
      try {
        const { sessionId } = data
        const clientInfo = connectedClients.get(socket.id)
        
        if (!sessionId || clientInfo?.sessionId !== sessionId) {
          socket.emit('error', { message: 'Invalid session' })
          return
        }
        
        const roomClients = await io.in(sessionId).fetchSockets()
        const roomStats = {
          totalClients: roomClients.length,
          photographers: roomClients.filter(s => {
            const info = connectedClients.get(s.id)
            return info?.clientType === 'photographer'
          }).length,
          viewers: roomClients.filter(s => {
            const info = connectedClients.get(s.id)
            return info?.clientType === 'viewer'
          }).length,
          timestamp: new Date().toISOString()
        }
        
        socket.emit('room-stats', roomStats)
        
      } catch (error) {
        logger.error('Error getting room stats:', error)
        socket.emit('error', { message: 'Failed to get room statistics' })
      }
    })
    
    // 客户端断开连接
    socket.on('disconnect', async (reason) => {
      const clientInfo = connectedClients.get(socket.id)
      
      logger.info(`Client disconnected: ${socket.id}`, {
        socketId: socket.id,
        reason,
        sessionId: clientInfo?.sessionId,
        clientType: clientInfo?.clientType
      })
      
      // 如果客户端在某个会话中，通知其他客户端
      if (clientInfo?.sessionId) {
        socket.to(clientInfo.sessionId).emit('user-left', {
          socketId: socket.id,
          clientType: clientInfo.clientType,
          reason,
          timestamp: new Date().toISOString()
        })
        
        // 发送更新后的房间统计信息
        try {
          const roomClients = await io.in(clientInfo.sessionId).fetchSockets()
          const roomStats = {
            totalClients: roomClients.length,
            photographers: roomClients.filter(s => {
              const info = connectedClients.get(s.id)
              return info?.clientType === 'photographer'
            }).length,
            viewers: roomClients.filter(s => {
              const info = connectedClients.get(s.id)
              return info?.clientType === 'viewer'
            }).length
          }
          
          io.to(clientInfo.sessionId).emit('room-stats', roomStats)
        } catch (error) {
          logger.error('Error updating room stats on disconnect:', error)
        }
      }
      
      // 清理客户端信息
      connectedClients.delete(socket.id)
    })
    
    // 错误处理
    socket.on('error', (error) => {
      logger.error(`Socket error for client ${socket.id}:`, error)
    })
  })
  
  // 定期清理断开的连接信息
  setInterval(() => {
    const now = Date.now()
    for (const [socketId, clientInfo] of connectedClients.entries()) {
      // 如果连接超过24小时没有活动，清理信息
      if (now - clientInfo.connectedAt.getTime() > 24 * 60 * 60 * 1000) {
        connectedClients.delete(socketId)
        logger.debug(`Cleaned up stale client info: ${socketId}`)
      }
    }
  }, 60 * 60 * 1000) // 每小时清理一次
  
  logger.info('Socket.IO handler initialized')
}

module.exports = socketHandler