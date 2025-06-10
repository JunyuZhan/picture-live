/**
 * 简化版后端应用启动文件
 * 用于开发测试，暂时不依赖外部服务
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// 基础中间件
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Picture Live API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// 模拟相册API
app.get('/api/sessions', (req, res) => {
  res.json({
    success: true,
    data: {
      sessions: [
        {
          id: '1',
          title: '测试相册',
          description: '这是一个测试相册',
          status: 'live',
          type: 'event',
          accessCode: 'TEST2024',
          photographer: {
            id: 'admin',
            username: 'admin',
            displayName: '管理员'
          },
          settings: {
            isPublic: true,
            allowDownload: true,
            allowComments: true,
            allowLikes: true,
            watermark: {
              enabled: false,
              position: 'bottom-right',
              opacity: 0.5
            },
            autoApprove: true,
            tags: []
          },
          stats: {
            totalPhotos: 0,
            totalViews: 0,
            totalLikes: 0,
            totalComments: 0,
            totalDownloads: 0,
            activeViewers: 0,
            peakViewers: 0
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        pages: 1
      }
    }
  });
});

// 创建相册API
app.post('/api/sessions', (req, res) => {
  const { title, description, isPublic = false } = req.body;
  
  if (!title) {
    return res.status(400).json({
      success: false,
      message: '相册标题不能为空'
    });
  }
  
  const session = {
    id: Date.now().toString(),
    title,
    description: description || '',
    status: 'active',
    isPublic,
    accessCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
    totalPhotos: 0,
    publishedPhotos: 0,
    pendingPhotos: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  res.status(201).json({
    success: true,
    message: '相册创建成功',
    data: { session }
  });
});

// 获取单个相册
app.get('/api/sessions/:id', (req, res) => {
  const { id } = req.params;
  
  const session = {
    id,
    title: '测试相册',
    description: '这是一个测试相册',
    status: 'active',
    isPublic: true,
    accessCode: 'TEST2024',
    totalPhotos: 0,
    publishedPhotos: 0,
    pendingPhotos: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    data: { session }
  });
});

// 模拟认证API
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: '邮箱和密码不能为空'
    });
  }
  
  // 模拟登录成功
  res.json({
    success: true,
    message: '登录成功',
    data: {
      user: {
        id: '1',
        username: 'testuser',
        email,
        displayName: '测试用户',
        role: 'photographer'
      },
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token'
    }
  });
});

app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({
      success: false,
      message: '用户名、邮箱和密码不能为空'
    });
  }
  
  // 模拟注册成功
  res.status(201).json({
    success: true,
    message: '注册成功',
    data: {
      user: {
        id: Date.now().toString(),
        username,
        email,
        displayName: username,
        role: 'photographer'
      }
    }
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在'
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`\n🚀 Picture Live API Server is running!`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Started at: ${new Date().toLocaleString()}\n`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('\n👋 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

module.exports = app;