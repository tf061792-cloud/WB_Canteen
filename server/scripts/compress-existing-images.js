// 批量压缩已有的图片
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, '../public/uploads');
const SIZE_CONFIG = {
  small: { width: 150, height: 150, quality: 75 },
  medium: { width: 400, height: 400, quality: 80 },
  large: { width: 800, height: 800, quality: 85 }
};

async function compressImages() {
  console.log('📦 开始批量压缩已有的图片...\n');
  
  try {
    const files = fs.readdirSync(uploadDir);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext) && 
             !file.includes('_small_') && 
             !file.includes('_medium_') && 
             !file.includes('_large_');
    });
    
    console.log(`找到 ${imageFiles.length} 张需要压缩的图片`);
    
    let totalOriginalSize = 0;
    let totalOptimizedSize = 0;
    let successCount = 0;
    let failCount = 0;
    
    for (const filename of imageFiles) {
      const filePath = path.join(uploadDir, filename);
      const stats = fs.statSync(filePath);
      const originalSize = stats.size;
      totalOriginalSize += originalSize;
      
      try {
        // 生成三种尺寸
        for (const [sizeName, config] of Object.entries(SIZE_CONFIG)) {
          const ext = path.extname(filename).toLowerCase();
          const baseName = path.basename(filename, ext);
          const outputFilename = `${baseName}_${sizeName}_optimized.jpg`;
          const outputPath = path.join(uploadDir, outputFilename);
          
          const info = await sharp(filePath)
            .resize({
              width: config.width,
              height: config.height,
              fit: 'inside',
              withoutEnlargement: true
            })
            .jpeg({ quality: config.quality, progressive: true })
            .toFile(outputPath);
          
          if (sizeName === 'medium') {
            totalOptimizedSize += info.size;
          }
        }
        
        console.log(`✅ ${filename}`);
        console.log(`   原始: ${(originalSize / 1024).toFixed(1)} KB`);
        successCount++;
        
      } catch (error) {
        console.log(`❌ ${filename} - ${error.message}`);
        failCount++;
      }
    }
    
    console.log('\n📊 压缩完成!');
    console.log(`成功: ${successCount} 张`);
    console.log(`失败: ${failCount} 张`);
    console.log(`总原始大小: ${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`总优化后大小: ${(totalOptimizedSize / 1024 / 1024).toFixed(2)} MB`);
    if (totalOriginalSize > 0) {
      const compressionRatio = (((totalOriginalSize - totalOptimizedSize) / totalOriginalSize) * 100).toFixed(1);
      console.log(`平均压缩率: ${compressionRatio}%`);
    }
    
  } catch (error) {
    console.error('❌ 批量压缩失败:', error);
  }
}

compressImages();
