const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const MAX_WIDTH = 800;
const MAX_HEIGHT = 800;
const QUALITY = 80;

const SIZE_CONFIG = {
  small: { width: 100, height: 100, quality: 75 },
  medium: { width: 300, height: 300, quality: 80 },
  large: { width: 600, height: 600, quality: 85 }
};

async function optimizeImage(inputPath, outputPath, size = 'medium') {
  try {
    const config = SIZE_CONFIG[size] || SIZE_CONFIG.medium;
    
    const info = await sharp(inputPath)
      .resize({
        width: config.width,
        height: config.height,
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: config.quality, progressive: true })
      .toFile(outputPath);
    
    console.log(`✅ 图片优化成功: ${outputPath}`);
    console.log(`   原始大小: ${fs.statSync(inputPath).size} bytes`);
    console.log(`   优化后大小: ${info.size} bytes`);
    console.log(`   压缩率: ${((1 - info.size / fs.statSync(inputPath).size) * 100).toFixed(1)}%`);
    
    return { success: true, size: info.size, path: outputPath };
  } catch (error) {
    console.error('❌ 图片优化失败:', error);
    return { success: false, error: error.message };
  }
}

async function optimizeUploadedFile(file, destinationDir) {
  try {
    const originalName = file.originalname;
    const ext = path.extname(originalName).toLowerCase();
    const baseName = path.basename(originalName, ext);
    const timestamp = Date.now();
    
    // 创建不同尺寸的图片
    const results = {};
    
    for (const [sizeName, config] of Object.entries(SIZE_CONFIG)) {
      const outputPath = path.join(destinationDir, `${baseName}_${sizeName}_${timestamp}.jpg`);
      
      const info = await sharp(file.path)
        .resize({
          width: config.width,
          height: config.height,
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: config.quality, progressive: true })
        .toFile(outputPath);
      
      results[sizeName] = {
        path: `/uploads/${path.basename(outputPath)}`,
        size: info.size
      };
    }
    
    // 清理临时文件
    fs.unlinkSync(file.path);
    
    return {
      success: true,
      sizes: results,
      originalName
    };
  } catch (error) {
    console.error('❌ 上传图片优化失败:', error);
    return { success: false, error: error.message };
  }
}

async function processImageFromUrl(imageUrl) {
  try {
    // 下载图片
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const buffer = await response.arrayBuffer();
    const tempPath = path.join(__dirname, '../public/uploads', `temp_${Date.now()}.jpg`);
    
    fs.writeFileSync(tempPath, Buffer.from(buffer));
    
    // 优化图片
    const outputPath = path.join(__dirname, '../public/uploads', `optimized_${Date.now()}.jpg`);
    const result = await optimizeImage(tempPath, outputPath);
    
    // 清理临时文件
    fs.unlinkSync(tempPath);
    
    if (result.success) {
      return {
        success: true,
        path: `/uploads/${path.basename(outputPath)}`,
        size: result.size
      };
    }
    
    return result;
  } catch (error) {
    console.error('❌ URL图片处理失败:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  optimizeImage,
  optimizeUploadedFile,
  processImageFromUrl,
  SIZE_CONFIG
};
