import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './i18n'

// 错误处理
try {
  const root = document.getElementById('root')
  if (!root) {
    throw new Error('找不到 root 元素')
  }
  
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
  console.log('[main] React 应用已渲染')
} catch (err) {
  console.error('[main] 渲染失败:', err)
  document.body.innerHTML = `<div style="padding: 20px; color: red;"><h3>渲染错误</h3><pre>${err.stack}</pre></div>`
}
