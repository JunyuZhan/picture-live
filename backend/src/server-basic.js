/**
 * 最基础的后端服务器
 * 只使用Node.js内置模块，不依赖任何外部包
 */

const http = require('http');
const url = require('url');
const querystring = require('querystring');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3001;

// CORS处理函数
function setCORSHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

// JSON响应函数
function sendJSON(res, statusCode, data) {
  setCORSHeaders(res);
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data, null, 2));
}

// 解析请求体
function parseBody(req, callback) {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', () => {
    try {
      const data = body ? JSON.parse(body) : {};
      callback(null, data);
    } catch (error) {
      callback(error, null);
    }
  });
}

// 路由处理
function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;
  const query = parsedUrl.query;

  console.log(`${new Date().toISOString()} - ${method} ${pathname}`);

  // 处理OPTIONS请求（CORS预检）
  if (method === 'OPTIONS') {
    setCORSHeaders(res);
    res.writeHead(200);
    res.end();
    return;
  }

  // 健康检查
  if (pathname === '/api/health' && method === 'GET') {
    sendJSON(res, 200, {
      success: true,
      message: 'Picture Live API is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
    return;
  }

  // 获取会话列表
  if (pathname === '/api/sessions' && method === 'GET') {
    sendJSON(res, 200, {
      success: true,
      data: {
        sessions: [
          {
            id: '1',
            title: '测试会话',
            description: '这是一个测试会话',
            status: 'active',
            isPublic: true,
            accessCode: 'TEST2024',
            totalPhotos: 0,
            publishedPhotos: 0,
            pendingPhotos: 0,
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
    return;
  }

  // 创建会话
  if (pathname === '/api/sessions' && method === 'POST') {
    parseBody(req, (err, data) => {
      if (err) {
        sendJSON(res, 400, {
          success: false,
          message: '请求数据格式错误'
        });
        return;
      }

      const { title, description, isPublic = false } = data;
      
      if (!title) {
        sendJSON(res, 400, {
          success: false,
          message: '会话标题不能为空'
        });
        return;
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
      
      sendJSON(res, 201, {
        success: true,
        message: '会话创建成功',
        data: { session }
      });
    });
    return;
  }

  // 获取单个会话
  if (pathname.startsWith('/api/sessions/') && method === 'GET') {
    const sessionId = pathname.split('/')[3];
    
    const session = {
      id: sessionId,
      title: '测试会话',
      description: '这是一个测试会话',
      status: 'active',
      isPublic: true,
      accessCode: 'TEST2024',
      totalPhotos: 0,
      publishedPhotos: 0,
      pendingPhotos: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    sendJSON(res, 200, {
      success: true,
      data: { session }
    });
    return;
  }

  // 登录
  if (pathname === '/api/auth/login' && method === 'POST') {
    parseBody(req, (err, data) => {
      if (err) {
        sendJSON(res, 400, {
          success: false,
          message: '请求数据格式错误'
        });
        return;
      }

      const { email, password } = data;
      
      if (!email || !password) {
        sendJSON(res, 400, {
          success: false,
          message: '邮箱和密码不能为空'
        });
        return;
      }
      
      // 模拟登录成功
      sendJSON(res, 200, {
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
    return;
  }

  // 注册
  if (pathname === '/api/auth/register' && method === 'POST') {
    parseBody(req, (err, data) => {
      if (err) {
        sendJSON(res, 400, {
          success: false,
          message: '请求数据格式错误'
        });
        return;
      }

      const { username, email, password } = data;
      
      if (!username || !email || !password) {
        sendJSON(res, 400, {
          success: false,
          message: '用户名、邮箱和密码不能为空'
        });
        return;
      }
      
      // 模拟注册成功
      sendJSON(res, 201, {
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
    return;
  }

  // 404处理
  sendJSON(res, 404, {
    success: false,
    message: '接口不存在'
  });
}

// 创建服务器
const server = http.createServer(handleRequest);

// 启动服务器
server.listen(PORT, () => {
  console.log(`\n🚀 Picture Live API Server is running!`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Started at: ${new Date().toLocaleString()}\n`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('\n👋 Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n👋 Received SIGINT, shutting down gracefully...');
  server.close(() => {
    process.exit(0);
  });
});

module.exports = server;