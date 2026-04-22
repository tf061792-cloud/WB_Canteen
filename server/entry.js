const http = require('http');
const fs = require('fs');
const path = require('path');
const net = require('net');  // 用于 WebSocket 代理

const PORT = 5000;
const BACKEND_PORT = 3006;
const CLIENT_DEV_PORT = 3001;  // Vite 开发服务器端口
const ADMIN_DEV_PORT = 3005;   // 管理端 Vite 端口
const PICKER_DEV_PORT = 3007;  // 配货端 Vite 端口

// 开发模式标志 - 使用 Vite 开发服务器
const USE_DEV_SERVER = true;  // 设为 false 则使用静态文件构建产物

// 代理请求到开发服务器
function proxyToDevServer(req, res, targetPort, pathPrefix = '') {
  const headers = { ...req.headers };
  delete headers.host;
  
  // 构建目标路径
  let targetPath = req.url;
  if (pathPrefix) {
    // 移除前缀，例如 /client/xxx -> /xxx
    targetPath = req.url.replace(pathPrefix, '') || '/';
    // 确保路径以 / 开头
    if (!targetPath.startsWith('/')) {
      targetPath = '/' + targetPath;
    }
  }
  
  // 调试日志
  console.log(`[Proxy] ${req.method} ${req.url} -> localhost:${targetPort}${targetPath}`);
  
  const options = {
    hostname: 'localhost',
    port: targetPort,
    path: targetPath,
    method: req.method,
    headers: headers
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  
  proxyReq.on('error', (err) => {
    console.error(`[Proxy Error] ${req.method} ${req.url} -> port ${targetPort}${targetPath}: ${err.message}`);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Dev server unavailable', path: targetPath }));
  });
  
  req.pipe(proxyReq);
}

const DIST_CLIENT = path.join(__dirname, '../client/dist');
const DIST_ADMIN = path.join(__dirname, '../admin/dist');
const DIST_PICKER = path.join(__dirname, '../picker/dist');
const DIST_PICKER_ASSETS = path.join(DIST_PICKER, 'assets');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function serveStatic(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const originalUrl = req.url;  // 保存带查询参数的原始URL
  const url = req.url.split('?')[0];

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API 代理
  if (url.startsWith('/api/')) {
    // 保留原始headers，不强制覆盖Content-Type（支持文件上传）
    const headers = { ...req.headers };
    delete headers.host;
    
    const options = {
      hostname: 'localhost',
      port: BACKEND_PORT,
      path: originalUrl,  // 使用原始URL（包含查询参数）
      method: req.method,
      headers: headers
    };

    // 使用流式传输支持二进制文件上传
    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Backend unavailable' }));
    });
    
    req.pipe(proxyReq);
    return;
  }

  // 上传图片代理 /uploads/* -> 代理到后端
  if (url.startsWith('/uploads/')) {
    const headers = { ...req.headers };
    delete headers.host;
    
    const options = {
      hostname: 'localhost',
      port: BACKEND_PORT,
      path: originalUrl,
      method: req.method,
      headers: headers
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (err) => {
      console.error('Proxy error (uploads):', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Backend unavailable' }));
    });
    
    req.pipe(proxyReq);
    return;
  }

  // 入口页面 /
  if (url === '/' || url === '/index.html') {
    const indexPath = path.join(__dirname, '../index.html');
    serveStatic(res, indexPath, 'text/html; charset=utf-8');
    return;
  }

  // 管理端API代理 /admin/* 路径（需要放在静态文件处理之前）
  if (url.startsWith('/admin/upload') || url.startsWith('/admin/auth') || url.startsWith('/admin/pricing') || url.startsWith('/admin/customers') || url.startsWith('/admin/users') || url.startsWith('/admin/distribution') || url.startsWith('/admin/permissions') || url.startsWith('/admin/banners') || url.startsWith('/admin/site')) {
    const headers = { ...req.headers };
    delete headers.host;
    // 删除 content-length，让 Node.js 自动处理 chunked 传输
    delete headers['content-length'];
    
    const options = {
      hostname: 'localhost',
      port: BACKEND_PORT,
      path: '/api' + originalUrl,  // 使用原始URL（包含查询参数）
      method: req.method,
      headers: headers
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Backend unavailable' }));
    });
    
    req.pipe(proxyReq);
    return;
  }

  // 调试页面
  if (url === '/debug') {
    const debugPath = path.join(__dirname, 'public/debug.html');
    if (fs.existsSync(debugPath)) {
      serveStatic(res, debugPath, 'text/html; charset=utf-8');
    } else {
      res.writeHead(404);
      res.end('Debug page not found');
    }
    return;
  }

  // Vite 开发资源 - 根据 Referer 判断来源（必须在 /client/ 之前）
  if (USE_DEV_SERVER && (url.startsWith('/src/') || url.startsWith('/@vite/') || url.startsWith('/@fs/') || url.startsWith('/@react-refresh') || url.startsWith('/node_modules/'))) {
    const referer = req.headers.referer || '';
    if (referer.includes('/picker/')) {
      proxyToDevServer(req, res, PICKER_DEV_PORT);
      return;
    }
    if (referer.includes('/client/')) {
      proxyToDevServer(req, res, CLIENT_DEV_PORT);
      return;
    }
    if (referer.includes('/admin/')) {
      proxyToDevServer(req, res, ADMIN_DEV_PORT);
      return;
    }
    // 如果没有 referer 或不包含已知路径，默认代理到配货端
    // 因为配货端是当前活跃的开发端口
    proxyToDevServer(req, res, PICKER_DEV_PORT);
    return;
  }

  // 用户端 Vite 开发服务器代理 /client/*
  if (url.startsWith('/client/')) {
    proxyToDevServer(req, res, CLIENT_DEV_PORT, '/client');
    return;
  }

  // 管理端 - 开发模式：代理到 Vite 开发服务器（保留/admin/前缀，因为Vite配置了base: '/admin/'）
  if (USE_DEV_SERVER && url.startsWith('/admin/')) {
    proxyToDevServer(req, res, ADMIN_DEV_PORT, '');
    return;
  }

  // 管理端资源 /admin/assets/* - 生产模式
  if (url.startsWith('/admin/assets/')) {
    const assetPath = url.replace('/admin/', '');
    const fullPath = path.join(DIST_ADMIN, assetPath);
    if (fs.existsSync(fullPath)) {
      serveStatic(res, fullPath, getContentType(fullPath));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
    return;
  }

  // 管理端 /admin/* - 生产模式
  if (url.startsWith('/admin/')) {
    let filePath = url.slice(6); // 去掉 /admin
    if (!filePath || filePath === '/') { filePath = 'index.html'; }
    const fullPath = path.join(DIST_ADMIN, filePath);
    
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      serveStatic(res, fullPath, getContentType(fullPath));
    } else {
      serveStatic(res, path.join(DIST_ADMIN, 'index.html'), 'text/html; charset=utf-8');
    }
    return;
  }

  // 配货端 - 开发模式：代理到 Vite 开发服务器
  if (USE_DEV_SERVER && url.startsWith('/picker/')) {
    proxyToDevServer(req, res, PICKER_DEV_PORT, '/picker/');
    return;
  }
  
  // 配货端 - 生产模式：使用静态文件
  if (url.startsWith('/picker/assets/')) {
    const assetPath = url.replace('/picker/', '');
    const fullPath = path.join(DIST_PICKER, assetPath);
    if (fs.existsSync(fullPath)) {
      serveStatic(res, fullPath, getContentType(fullPath));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
    return;
  }

  // 配货端 /picker/* - 生产模式
  if (url.startsWith('/picker/')) {
    let filePath = url.slice(8); // 去掉 /picker
    if (!filePath || filePath === '/') { filePath = 'index.html'; }
    const fullPath = path.join(DIST_PICKER, filePath);
    
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      serveStatic(res, fullPath, getContentType(fullPath));
    } else {
      serveStatic(res, path.join(DIST_PICKER, 'index.html'), 'text/html; charset=utf-8');
    }
    return;
  }

  // 静态资源 /assets/* -> 根据 Referer 判断来源
  if (url.startsWith('/assets/')) {
    const referer = req.headers.referer || '';
    
    // 如果 referer 来自用户端开发服务器，代理到 Vite dev server
    if (referer.includes('/client/')) {
      // 先尝试从 dist 目录提供（生产构建产物）
      const distPath = path.join(DIST_CLIENT, url);
      if (fs.existsSync(distPath)) {
        serveStatic(res, distPath, getContentType(distPath));
      } else {
        // 如果 dist 不存在，代理到 Vite 开发服务器
        proxyToDevServer(req, res, CLIENT_DEV_PORT);
      }
      return;
    }
    
    // 管理端资源
    if (referer.includes('/admin/')) {
      const fullPath = path.join(DIST_ADMIN, url);
      if (fs.existsSync(fullPath)) {
        serveStatic(res, fullPath, getContentType(fullPath));
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
      return;
    }
    
    // 默认从用户端 dist 目录提供
    const clientPath = path.join(DIST_CLIENT, url);
    if (fs.existsSync(clientPath)) {
      serveStatic(res, clientPath, getContentType(clientPath));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<h1>404 Not Found</h1>');
});

// WebSocket 代理 - 用于 Vite HMR
server.on('upgrade', (req, socket, head) => {
  const url = req.url;
  
  // 确定目标端口
  let targetPort = null;
  const referer = req.headers.referer || '';
  
  if (url.startsWith('/@vite/') || url.startsWith('/__vite') || url.includes('hmr') || url.startsWith('/client')) {
    targetPort = CLIENT_DEV_PORT;
  } else if (referer.includes('/picker/') || url.startsWith('/picker') || 
             (referer.includes('/picker/') && (url.startsWith('/src/') || url.startsWith('/node_modules/')))) {
    targetPort = PICKER_DEV_PORT;
  } else if (url.startsWith('/src/') || url.startsWith('/node_modules/')) {
    // 尝试根据 cookie 或 origin 判断，或者默认尝试配货端
    targetPort = PICKER_DEV_PORT;
  }
  
  if (!targetPort) {
    socket.destroy();
    return;
  }
  
  // 使用 net 创建到目标服务器的连接
  const proxySocket = net.connect(targetPort, '127.0.0.1', () => {
    // 构建 HTTP upgrade 请求头
    let headStr = `${req.method} ${url} HTTP/1.1\r\n`;
    
    // 复制所有请求头，但排除一些需要修改的头
    for (const [key, value] of Object.entries(req.headers)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey !== 'upgrade' && lowerKey !== 'connection' && lowerKey !== 'host') {
        headStr += `${key}: ${value}\r\n`;
      }
    }
    
    // 设置正确的 Host 头
    headStr += `Host: 127.0.0.1:${targetPort}\r\n`;
    
    // 确保必要的 WebSocket 头
    headStr += 'Connection: Upgrade\r\n';
    headStr += `Upgrade: ${req.headers.upgrade || 'websocket'}\r\n`;
    headStr += '\r\n';
    
    // 发送请求头
    proxySocket.write(headStr);
    
    // 如果有 head 数据，也发送
    if (head && head.length > 0) {
      proxySocket.write(head);
    }
    
    // 双向管道
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });
  
  // 处理错误
  proxySocket.on('error', (err) => {
    console.error('WebSocket proxy error:', err.message);
    socket.destroy();
  });
  
  socket.on('error', (err) => {
    console.error('Client socket error:', err.message);
    proxySocket.destroy();
  });
  
  // 处理连接关闭
  proxySocket.on('close', () => {
    socket.end();
  });
  
  socket.on('close', () => {
    proxySocket.end();
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`- Entry: http://localhost:${PORT}/`);
  console.log(`- Client: http://localhost:${PORT}/client/`);
  console.log(`- Admin: http://localhost:${PORT}/admin/`);
});
