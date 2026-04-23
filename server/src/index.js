// 主服务器入口 - CommonJS
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./db/sqlite');

// 导入路由
const authRoutes = require('./routes/auth');
const adminAuthRoutes = require('./routes/adminAuth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const bannerRoutes = require('./routes/banners');
const customerRoutes = require('./routes/customers');
const adminUserRoutes = require('./routes/adminUsers');
const distributionRoutes = require('./routes/distribution');
const pricingRoutes = require('./routes/pricing');
const promoterRouter = require('./routes/promoter');
const adminDistributionRoutes = require('./routes/adminDistribution');
const permissionRoutes = require('./routes/permissions');
const bannerAdminRoutes = require('./routes/bannerAdmin');
const pickerRoutes = require('./routes/picker');
const financeRoutes = require('./routes/finance');

const { adminAuth, userAuth: authenticate } = require('./middleware/auth');
const { checkPermission } = permissionRoutes; // 引入权限检查中间件

const app = express();
const PORT = process.env.PORT || 3006;

// 中间件
app.use(cors({
  origin: [
    'https://wbcanteen-admin.vercel.app',
    'https://wbcanteen-client.vercel.app', 
    'https://wbcanteen-picker.vercel.app',
    'http://localhost:3001',
    'http://localhost:3005',
    'http://localhost:3007'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// 图片代理 - 解决外部图片跨域问题（开发环境使用，生产环境建议用CDN）
app.get('/api/proxy/image', async (req, res) => {
  // 沙箱环境限制，返回重定向
  const imageUrl = req.query.url;
  if (!imageUrl) {
    return res.status(400).json({ code: 400, message: '缺少图片URL参数' });
  }
  
  // 验证URL格式
  if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    return res.status(400).json({ code: 400, message: '无效的图片URL' });
  }
  
  // 直接重定向到原图（前端使用 referrerPolicy 解决防盗链）
  res.redirect(imageUrl);
});

// 请求日志
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/products', productRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/addresses', require('./routes/addresses'));
app.use('/api/promoter', authenticate, promoterRouter.router);

// 管理端路由（需要认证）
app.use('/api/admin/customers', adminAuth, customerRoutes);
app.use('/api/admin/users', adminAuth, adminUserRoutes);
app.use('/api/admin/distribution', adminAuth, adminDistributionRoutes);
app.use('/api/admin/pricing', adminAuth, pricingRoutes);
app.use('/api/admin/permissions', adminAuth, permissionRoutes.router);
app.use('/api/admin/banners', adminAuth, bannerAdminRoutes);
app.use('/api/admin/upload', adminAuth, require('./routes/upload'));
app.use('/api/admin/finance', adminAuth, financeRoutes);

app.use('/api/picker', pickerRoutes);

// 网站基本信息（公开接口 + 管理端更新）
const siteInfoRoutes = require('./routes/siteInfo');
app.use('/api/site', siteInfoRoutes);
app.use('/api/admin/site', adminAuth, siteInfoRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 404 处理 - API 路径不存在时返回 JSON
app.use('/api/*', (req, res) => {
  console.log(`API 路径不存在: ${req.method} ${req.url}`);
  res.status(404).json({ code: 404, message: '接口不存在' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ code: 500, message: '服务器内部错误' });
});

// 启动服务器
async function start() {
  try {
    // 初始化数据库
    await initDatabase();
    
    app.listen(PORT, () => {
      console.log(`✅ 服务器运行在 http://localhost:${PORT}`);
      console.log(`   用户端 API: http://localhost:${PORT}/api`);
      console.log(`   管理端 API: http://localhost:${PORT}/api/admin`);
    });
  } catch (error) {
    console.error('启动失败:', error);
    process.exit(1);
  }
}

start();
