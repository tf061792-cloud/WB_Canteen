const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const router = express.Router();

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 图片尺寸配置
const SIZE_CONFIG = {
  small: { width: 150, height: 150, quality: 75 },
  medium: { width: 400, height: 400, quality: 80 },
  large: { width: 800, height: 800, quality: 85 }
};

// 配置存储 - 使用内存存储以便处理
const storage = multer.memoryStorage();

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
    fileSize: 10 * 1024 * 1024 // 10MB限制（处理前可能较大）
  }
});

// 图片优化处理函数
async function processImage(buffer, filename, size = 'medium') {
  const config = SIZE_CONFIG[size] || SIZE_CONFIG.medium;
  const ext = path.extname(filename).toLowerCase();
  const baseName = path.basename(filename, ext);
  const outputFilename = `${baseName}_${size}_${Date.now()}.jpg`;
  const outputPath = path.join(uploadDir, outputFilename);
  
  const info = await sharp(buffer)
    .resize({
      width: config.width,
      height: config.height,
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: config.quality, progressive: true })
    .toFile(outputPath);
  
  return {
    filename: outputFilename,
    path: `/uploads/${outputFilename}`,
    size: info.size,
    width: info.width,
    height: info.height
  };
}

// 单张图片上传（带优化）
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: 400, message: '没有上传文件' });
    }
    
    const originalSize = req.file.size;
    const results = {};
    
    // 生成多种尺寸
    for (const sizeName of ['small', 'medium', 'large']) {
      results[sizeName] = await processImage(req.file.buffer, req.file.originalname, sizeName);
    }
    
    // 默认返回medium尺寸
    const mediumResult = results.medium;
    const savedBytes = originalSize - mediumResult.size;
    const compressionRatio = ((savedBytes / originalSize) * 100).toFixed(1);
    
    console.log(`📷 图片上传优化: ${req.file.originalname}`);
    console.log(`   原始大小: ${(originalSize / 1024).toFixed(1)} KB`);
    console.log(`   优化后: ${(mediumResult.size / 1024).toFixed(1)} KB`);
    console.log(`   压缩率: ${compressionRatio}%`);
    
    res.json({
      code: 200,
      message: '上传成功',
      data: {
        url: mediumResult.path,
        filename: mediumResult.filename,
        originalname: req.file.originalname,
        originalSize: originalSize,
        optimizedSize: mediumResult.size,
        compressionRatio: `${compressionRatio}%`,
        sizes: results
      }
    });
  } catch (error) {
    console.error('上传错误:', error);
    res.status(500).json({ code: 500, message: '上传失败: ' + error.message });
  }
});

// 批量图片上传（带优化）
router.post('/batch', upload.array('images', 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ code: 400, message: '没有上传文件' });
    }
    
    const results = [];
    let totalOriginalSize = 0;
    let totalOptimizedSize = 0;
    
    for (const file of req.files) {
      totalOriginalSize += file.size;
      
      const mediumResult = await processImage(file.buffer, file.originalname, 'medium');
      totalOptimizedSize += mediumResult.size;
      
      results.push({
        url: mediumResult.path,
        filename: mediumResult.filename,
        originalname: file.originalname,
        originalSize: file.size,
        optimizedSize: mediumResult.size,
        compressionRatio: `${(((file.size - mediumResult.size) / file.size) * 100).toFixed(1)}%`
      });
    }
    
    const overallCompression = (((totalOriginalSize - totalOptimizedSize) / totalOriginalSize) * 100).toFixed(1);
    
    console.log(`📷 批量上传优化: ${results.length} 张图片`);
    console.log(`   总原始大小: ${(totalOriginalSize / 1024).toFixed(1)} KB`);
    console.log(`   总优化后: ${(totalOptimizedSize / 1024).toFixed(1)} KB`);
    console.log(`   平均压缩率: ${overallCompression}%`);
    
    res.json({
      code: 200,
      message: `成功上传 ${results.length} 张图片`,
      data: {
        files: results,
        totalOriginalSize,
        totalOptimizedSize,
        overallCompression: `${overallCompression}%`
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
