import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Package, Search, ChevronRight, Clock, CheckCircle, Truck, User, Phone } from 'lucide-react'
import { pickerAPI } from '../api/index.js'
import LanguageSelector from '../components/LanguageSelector.jsx'

export default function OrderList() {
  const { t } = useTranslation()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('pending')
  const navigate = useNavigate()
  
  useEffect(() => {
    fetchOrders()
  }, [activeTab])
  
  const fetchOrders = async () => {
    setLoading(true)
    try {
      // 待配货: confirmed, 已配货: picked/shipped
      const statusMap = {
        pending: 'confirmed',
        shipped: 'picked'  // 已配货页面查询 picked 状态
      }
      const res = await pickerAPI.getOrders({ 
        status: statusMap[activeTab] || 'confirmed',
        search: searchQuery 
      })
      console.log('[DEBUG] OrderList API response:', res);
      if (res.success || res.code === 200) {
        setOrders(res.data || []);
      }
    } catch (err) {
      console.error('获取订单失败:', err);
      console.error('错误详情:', err.response?.data);
    } finally {
      setLoading(false);
    }
  }
  
  const handleSearch = () => {
    fetchOrders()
  }
  
  const getStatusText = (status) => {
    const map = {
      confirmed: t('order.pending'),
      shipped: t('order.picking'),
      completed: t('order.completed')
    }
    return map[status] || status
  }
  
  const getStatusColor = (status) => {
    const map = {
      confirmed: 'bg-orange-100 text-orange-600',
      shipped: 'bg-blue-100 text-blue-600',
      completed: 'bg-green-100 text-green-600'
    }
    return map[status] || 'bg-gray-100 text-gray-600'
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">{t('order.orderList')}</h1>
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-500">
              {t('common.total')} {orders.length} {t('order.orderNo')}
            </div>
            <LanguageSelector />
          </div>
        </div>
        
        {/* 搜索栏 */}
        <div className="px-4 pb-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={t('order.inputProductName')}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium"
            >
              {t('common.search')}
            </button>
          </div>
        </div>
        
        {/* 标签切换 */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === 'pending'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-500'
            }`}
          >
            {t('order.pending')}
          </button>
          <button
            onClick={() => setActiveTab('shipped')}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === 'shipped'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-500'
            }`}
          >
            {t('order.picking')}
          </button>
        </div>
      </div>
      
      {/* 订单列表 */}
      <div className="p-4">
        {loading ? (
          <div className="text-center py-10 text-gray-500">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            {t('common.loading')}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            {t('common.noData')}
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => (
              <div
                key={order.id}
                onClick={() => navigate(`/pick/${order.id}`)}
                className="bg-white rounded-xl p-4 shadow-sm cursor-pointer active:scale-[0.98] transition"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">
                      #{order.order_no}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <User className="w-4 h-4" />
                    <span>{order.nickname || order.username}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{order.phone || '暂无电话'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(order.created_at).toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {order.items?.length || 0} {t('common.items')}
                  </span>
                  <span className="text-lg font-bold text-orange-500">
                    ฿{order.total_amount || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
