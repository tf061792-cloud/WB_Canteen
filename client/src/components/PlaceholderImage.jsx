import React from 'react';

const PlaceholderImage = ({ width = 64, height = 64, className = '' }) => {
  // 简单的占位图片 SVG
  const svgContent = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f5f5f5" />
      <text x="50%" y="50%" font-family="Arial" font-size="${Math.min(width, height) * 0.3}" text-anchor="middle" dominant-baseline="middle" fill="#999">暂无</text>
    </svg>
  `;
  
  const svgDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgContent)))}`;
  
  return (
    <img 
      src={svgDataUrl} 
      alt="暂无图片" 
      className={className}
      style={{ width, height }}
    />
  );
};

export default PlaceholderImage;
