const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置存储 - 直接存储到磁盘
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// 文件过滤
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB限制
  }
});

// 单张图片上传（简化版）
router.post('/', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: 400, message: '没有上传文件' });
    }
    
    const imageUrl = `/uploads/${req.file.filename}`;
    
    console.log(`📷 图片上传: ${req.file.originalname}`);
    console.log(`   文件大小: ${(req.file.size / 1024).toFixed(1)} KB`);
    
    res.json({
      code: 200,
      message: '上传成功',
      data: {
        url: imageUrl,
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size
      }
    });
  } catch (error) {
    console.error('上传错误:', error);
    res.status(500).json({ code: 500, message: '上传失败: ' + error.message });
  }
});

// 批量图片上传（简化版）
router.post('/batch', upload.array('images', 50), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ code: 400, message: '没有上传文件' });
    }
    
    const results = req.files.map(file => ({
      url: `/uploads/${file.filename}`,
      filename: file.filename,
      originalname: file.originalname,
      size: file.size
    }));
    
    const totalSize = req.files.reduce((sum, file) => sum + file.size, 0);
    
    console.log(`📷 批量上传: ${results.length} 张图片`);
    console.log(`   总大小: ${(totalSize / 1024).toFixed(1)} KB`);
    
    res.json({
      code: 200,
      message: `成功上传 ${results.length} 张图片`,
      data: {
        files: results,
        totalSize
      }
    });
  } catch (error) {
    console.error('批量上传错误:', error);
    res.status(500).json({ code: 500, message: '上传失败: ' + error.message });
  }
});

// 根据图片ID上传（用于WPS/Excel图片ID）
router.post('/by-id', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: 400, message: '没有上传文件' });
    }
    
    const imageId = req.body.imageId || req.query.imageId;
    if (!imageId) {
      return res.status(400).json({ code: 400, message: '缺少图片ID参数' });
    }
    
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({
      code: 200,
      message: '上传成功',
      data: {
        imageId: imageId,
        url: imageUrl,
        filename: req.file.filename
      }
    });
  } catch (error) {
    console.error('上传错误:', error);
    res.status(500).json({ code: 500, message: '上传失败: ' + error.message });
  }
});

// 获取已上传的图片列表
router.get('/list', (req, res) => {
  try {
    const files = fs.readdirSync(uploadDir);
    const images = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
      })
      .map(file => ({
        filename: file,
        url: `/uploads/${file}`,
        size: fs.statSync(path.join(uploadDir, file)).size
      }));
    
    res.json({
      code: 200,
      data: images
    });
  } catch (error) {
    console.error('获取图片列表错误:', error);
    res.status(500).json({ code: 500, message: '获取图片列表失败' });
  }
});

// 删除图片
router.delete('/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ code: 200, message: '删除成功' });
    } else {
      res.status(404).json({ code: 404, message: '文件不存在' });
    }
  } catch (error) {
    console.error('删除错误:', error);
    res.status(500).json({ code: 500, message: '删除失败' });
  }
});

module.exports = router;
