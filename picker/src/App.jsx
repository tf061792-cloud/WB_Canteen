import React, { Component } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { usePickerStore } from './stores/pickerStore.js'
import Login from './views/Login.jsx'
import OrderList from './views/OrderList.jsx'
import PickOrder from './views/PickOrder.jsx'

// 错误边界组件
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'red', background: '#fee', minHeight: '100vh' }}>
          <h2>页面渲染出错</h2>
          <pre>{this.state.error?.toString()}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

function App() {
  const { token, isLoggedIn } = usePickerStore()
  const [isLoading, setIsLoading] = React.useState(true)
  
  // 等待 persist 中间件初始化完成
  React.useEffect(() => {
    // 给 persist 中间件一点时间来从 localStorage 加载数据
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    )
  }
  
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route 
            path="/login" 
            element={token ? <Navigate to="/" /> : <Login />} 
          />
          <Route 
            path="/" 
            element={token ? <OrderList /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/pick/:id" 
            element={token ? <PickOrder /> : <Navigate to="/login" />} 
          />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
