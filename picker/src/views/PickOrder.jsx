import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Package, Check, AlertCircle, Send, User, Phone, MapPin } from 'lucide-react'
import { pickerAPI } from '../api/index.js'
import LanguageSelector from '../components/LanguageSelector.jsx'

export default function PickOrder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [order, setOrder] = useState(null)
  const [pickItems, setPickItems] = useState([])
  const [remark, setRemark] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [newProduct, setNewProduct] = useState({
    product_id: '',
    actual_qty: 1,
    product_name: '',
    name_th: ''
  })
  
  useEffect(() => {
    fetchOrderDetail()
    fetchProducts()
  }, [id])
  
  const fetchProducts = async () => {
    try {
      setLoadingProducts(true)
      const res = await pickerAPI.getProducts()
      if (res.success) {
        // 后端返回的是数组，不是 {list: [...]} 结构
        setProducts(Array.isArray(res.data) ? res.data : [])
      }
    } catch (err) {
      console.error('获取商品列表失败:', err)
    } finally {
      setLoadingProducts(false)
    }
  }
  
  const fetchOrderDetail = async () => {
    try {
      const res = await pickerAPI.getOrderDetail(id)
      console.log('[PickOrder] API响应:', res)
      console.log('[PickOrder] 订单数据:', res.data)
      console.log('[PickOrder] 商品列表:', res.data?.items)
      if (res.success) {
        setOrder(res.data)
        // 初始化配货数据
        const items = res.data.items?.map(item => ({
          ...item,
          actual_qty: item.actual_qty || item.quantity,
          actual_weight: item.weight || '',
          checked: false
        })) || []
        console.log('[PickOrder] 处理后的商品:', items)
        setPickItems(items)
      }
    } catch (err) {
      console.error('获取订单详情失败:', err)
    } finally {
      setLoading(false)
    }
  }
  
  const handleQtyChange = (index, value) => {
    const newItems = [...pickItems]
    newItems[index].actual_qty = parseInt(value) || 0
    setPickItems(newItems)
  }
  
  const handleWeightChange = (index, value) => {
    const newItems = [...pickItems]
    newItems[index].actual_weight = value
    setPickItems(newItems)
  }
  
  const handleProductSelect = (index, productId) => {
    const newItems = [...pickItems]
    const product = products.find(p => p.id === parseInt(productId))
    if (product) {
      newItems[index].product_id = product.id
      newItems[index].product_name = product.name
      newItems[index].name_th = product.name_th || product.name
      newItems[index].price = product.price
      newItems[index].unit = product.unit || '件'
      newItems[index].specs = product.specs || ''
      console.log('[PickOrder] 选择商品:', newItems[index])
    }
    setPickItems(newItems)
  }
  
  const handleNameChange = (index, value) => {
    const newItems = [...pickItems]
    newItems[index].product_name = value
    // 同步修改泰文名称（如果泰文名称为空或与商品名称相同）
    if (!newItems[index].name_th || newItems[index].name_th === newItems[index].product_name) {
      newItems[index].name_th = value
    }
    setPickItems(newItems)
  }
  
  const handleNameThChange = (index, value) => {
    const newItems = [...pickItems]
    newItems[index].name_th = value
    // 同步修改商品名称（如果商品名称为空或与泰文名称相同）
    if (!newItems[index].product_name || newItems[index].product_name === newItems[index].name_th) {
      newItems[index].product_name = value
    }
    setPickItems(newItems)
  }
  
  // 处理补充商品的选择
  const handleNewProductSelect = (productId) => {
    const product = products.find(p => p.id === parseInt(productId))
    if (product) {
      setNewProduct(prev => ({
        ...prev,
        product_id: product.id,
        product_name: product.name,
        name_th: product.name_th || product.name
      }))
    }
  }
  
  // 处理补充商品数量变化
  const handleNewProductQtyChange = (value) => {
    setNewProduct(prev => ({
      ...prev,
      actual_qty: parseInt(value) || 1
    }))
  }
  
  // 处理补充商品名称变化
  const handleNewProductNameChange = (value) => {
    setNewProduct(prev => ({
      ...prev,
      product_name: value,
      // 同步修改泰文名称（如果泰文名称为空或与商品名称相同）
      name_th: !prev.name_th || prev.name_th === prev.product_name ? value : prev.name_th
    }))
  }
  
  // 处理补充商品泰文名称变化
  const handleNewProductNameThChange = (value) => {
    setNewProduct(prev => ({
      ...prev,
      name_th: value,
      // 同步修改商品名称（如果商品名称为空或与泰文名称相同）
      product_name: !prev.product_name || prev.product_name === prev.name_th ? value : prev.product_name
    }))
  }
  
  // 添加补充商品
  const addNewProduct = () => {
    if (!newProduct.product_id && !newProduct.product_name) {
      alert('请选择商品或输入商品名称')
      return
    }
    
    const product = products.find(p => p.id === newProduct.product_id)
    const unit = product?.unit || '件'
    const price = product?.price || 0
    
    const itemToAdd = {
      id: `new_${Date.now()}`, // 临时ID
      product_id: newProduct.product_id,
      product_name: newProduct.product_name,
      name_th: newProduct.name_th,
      quantity: newProduct.actual_qty,
      actual_qty: newProduct.actual_qty,
      unit,
      price,
      checked: true // 默认为已勾选
    }
    
    setPickItems(prev => [...prev, itemToAdd])
    setNewProduct({
      product_id: '',
      actual_qty: 1,
      product_name: '',
      name_th: ''
    })
    setShowAddProduct(false)
  }
  
  const toggleCheck = (index) => {
    const newItems = [...pickItems]
    newItems[index].checked = !newItems[index].checked
    setPickItems(newItems)
  }
  
  const checkAll = () => {
    const allChecked = pickItems.every(item => item.checked)
    setPickItems(pickItems.map(item => ({ ...item, checked: !allChecked })))
  }
  
  const handleSubmit = async () => {
    const unchecked = pickItems.filter(item => !item.checked)
    if (unchecked.length > 0) {
      alert(`还有 ${unchecked.length} 件商品未确认`)
      return
    }
    
    setSubmitting(true)
    try {
      const res = await pickerAPI.submitPickList(id, {
        items: pickItems.map(item => ({
          order_item_id: item.id,
          product_id: item.product_id,
          actual_qty: item.actual_qty,
          product_name: item.product_name,
          name_th: item.name_th,
          price: item.price,
          unit: item.unit
        })),
        remark
      })
      
      if (res.success) {
        alert('配货单提交成功！')
        navigate('/')
      } else {
        alert(res.message || '提交失败')
      }
    } catch (err) {
      alert(err.response?.data?.message || '提交失败')
    } finally {
      setSubmitting(false)
      setShowConfirm(false)
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-500 text-xs">
          <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-1.5"></div>
          {t('common.loading')}
        </div>
      </div>
    )
  }
  
  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-500 text-xs">
          <AlertCircle className="w-10 h-10 mx-auto mb-1.5 text-gray-300" />
          {t('common.noData')}
        </div>
      </div>
    )
  }
  
  const allChecked = pickItems.every(item => item.checked)
  const checkedCount = pickItems.filter(item => item.checked).length
  
  // 判断是否为已配货订单（只能查看不能修改）
  const isCompletedOrder = order.status === 'picked' || order.status === 'shipped' || order.status === 'completed'
  
  return (
    <div className="min-h-screen bg-gray-100 pb-16">
      {/* 头部 */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-2.5 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate(-1)}
              className="p-1 -ml-1 hover:bg-gray-100 rounded-full"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-xs font-bold">#{order.order_no}</h1>
            {isCompletedOrder && (
              <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-600 rounded">
                已配货
              </span>
            )}
          </div>
          <LanguageSelector />
        </div>
      </div>
      
      {/* 客户信息 - 紧凑卡片 */}
      <div className="mx-2 my-1.5 bg-white rounded-md p-2 shadow-sm">
        <div className="flex items-center gap-1 text-gray-700 mb-1">
          <User className="w-3 h-3" />
          <span className="text-[11px] font-medium">{order.nickname || order.username}</span>
        </div>
        <div className="flex items-center gap-1 text-gray-500 text-[10px]">
          <Phone className="w-2.5 h-2.5" />
          <span>{order.phone || '-'}</span>
        </div>
      </div>
      
      {/* 商品清单标题 */}
      <div className="mx-2 mt-2 mb-1 flex items-center justify-between">
        <span className="text-[10px] text-gray-500">{t('order.productList')} ({pickItems.length})</span>
        {!isCompletedOrder && (
          <div className="flex gap-1">
            <button
              onClick={() => setShowAddProduct(true)}
              className="text-[10px] text-green-500 font-medium px-2 py-0.5 bg-green-50 rounded"
            >
              补充商品
            </button>
            <button
              onClick={checkAll}
              className="text-[10px] text-blue-500 font-medium px-2 py-0.5 bg-blue-50 rounded"
            >
              {allChecked ? t('common.cancel') : t('common.selectAll')}
            </button>
          </div>
        )}
      </div>
      
      {/* 商品列表 - 卡片式布局 */}
      <div className="mx-2 space-y-1.5">
        {pickItems.map((item, index) => (
          <div 
            key={item.product_id} 
            className={`bg-white rounded-md p-2 shadow-sm border-l-2 ${item.checked ? 'border-l-green-500' : 'border-l-gray-200'}`}
          >
            {/* 第一行：勾选 + 商品名 + 数量 */}
            <div className="flex items-start gap-2">
              {/* 勾选按钮 - 只在未配货订单显示 */}
              {!isCompletedOrder && (
                <button
                  onClick={() => toggleCheck(index)}
                  className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    item.checked
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  {item.checked && <Check className="w-3 h-3" />}
                </button>
              )}
              {isCompletedOrder && item.checked && (
                <div className="w-5 h-5 rounded border border-green-500 bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              
              {/* 商品信息 */}
              <div className="flex-1 min-w-0">
                {isCompletedOrder ? (
                  /* 已配货订单 - 只读显示 */
                  <div className="text-[11px] font-medium text-gray-800">
                    {item.product_name}
                    {item.name_th && (
                      <span className="text-orange-600 ml-1">({item.name_th})</span>
                    )}
                  </div>
                ) : (
                  /* 待配货订单 - 下拉选择 */
                  <>
                    <select
                      value={item.product_id || ''}
                      onChange={(e) => handleProductSelect(index, e.target.value)}
                      className="w-full text-[11px] font-medium text-gray-800 border border-gray-200 rounded px-1 py-0.5 mb-0.5 bg-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">{loadingProducts ? '加载中...' : '选择商品'}</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name} {product.name_th ? `(${product.name_th})` : ''}
                        </option>
                      ))}
                    </select>
                    <div className="text-[10px] text-orange-600">
                      {item.product_name} {item.name_th ? `(${item.name_th})` : ''}
                    </div>
                  </>
                )}
              </div>
              
              {/* 数量 - 订单+实发 */}
              <div className="text-right flex-shrink-0 min-w-[55px]">
                <div className="text-[10px] text-gray-400">
                  下单:{item.quantity}{item.unit}
                </div>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <span className="text-[10px] text-gray-400">实发:</span>
                  {isCompletedOrder ? (
                    <span className="text-[10px] font-medium text-gray-800">
                      {item.actual_qty || item.quantity}{item.unit}
                    </span>
                  ) : (
                    <input
                      type="number"
                      value={item.actual_qty}
                      onChange={(e) => handleQtyChange(index, e.target.value)}
                      className="w-10 px-0.5 py-0.5 border border-gray-200 rounded text-center text-[10px] focus:outline-none focus:border-blue-500"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* 备注 */}
      <div className="mx-2 mt-2 bg-white rounded-md p-2 shadow-sm">
        <div className="text-[10px] text-gray-500 mb-1">{t('common.remark')}</div>
        {isCompletedOrder ? (
          <div className="text-[10px] text-gray-700 px-2 py-1 bg-gray-50 rounded">
            {remark || order.picker_remark || '无备注'}
          </div>
        ) : (
          <textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder={t('order.remark')}
            rows={2}
            className="w-full px-2 py-1 border border-gray-200 rounded text-[10px] resize-none focus:outline-none focus:border-blue-500"
          />
        )}
      </div>
      
      {/* 底部占位 */}
      <div className="h-12"></div>
      
      {/* 底部提交按钮 - 只在未配货订单显示 */}
      {!isCompletedOrder && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-2 py-1.5">
          <button
            onClick={() => setShowConfirm(true)}
            disabled={!allChecked || submitting}
            className="w-full bg-blue-500 text-white py-2 rounded-md font-medium flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
          >
            <Send className="w-3.5 h-3.5" />
            {submitting ? t('common.loading') : `${t('order.completePick')} (${checkedCount}/${pickItems.length})`}
          </button>
        </div>
      )}
      
      {/* 确认弹窗 */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 w-full max-w-[280px]">
            <div className="text-center mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-1.5">
                <Send className="w-4 h-4 text-blue-500" />
              </div>
              <h3 className="text-sm font-bold">{t('order.completePick')}?</h3>
              <p className="text-[10px] text-gray-500 mt-1">
                {t('order.confirmSubmit')}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 border border-gray-300 rounded-md text-gray-700 font-medium text-xs"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-2 bg-blue-500 text-white rounded-md font-medium text-xs"
              >
                {submitting ? t('common.loading') : t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 补充商品弹窗 */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 w-full max-w-[280px]">
            <div className="text-center mb-3">
              <h3 className="text-sm font-bold">补充商品</h3>
            </div>
            <div className="space-y-2">
              {/* 商品选择 */}
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">选择商品</label>
                <select
                  value={newProduct.product_id || ''}
                  onChange={(e) => handleNewProductSelect(e.target.value)}
                  className="w-full text-[11px] font-medium text-gray-800 border border-gray-200 rounded px-1 py-0.5 mb-0.5 bg-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">选择商品</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} {product.name_th ? `(${product.name_th})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* 商品名称（可手动输入） */}
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">商品名称</label>
                <input
                  type="text"
                  value={newProduct.product_name}
                  onChange={(e) => handleNewProductNameChange(e.target.value)}
                  placeholder="输入商品名称"
                  className="w-full text-[11px] font-medium text-gray-800 border border-gray-200 rounded px-1 py-0.5 bg-white focus:outline-none focus:border-blue-500"
                />
              </div>
              
              {/* 泰文名称 */}
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">泰文名称</label>
                <input
                  type="text"
                  value={newProduct.name_th}
                  onChange={(e) => handleNewProductNameThChange(e.target.value)}
                  placeholder="输入泰文名称"
                  className="w-full text-[11px] font-medium text-gray-800 border border-gray-200 rounded px-1 py-0.5 bg-white focus:outline-none focus:border-blue-500"
                />
              </div>
              
              {/* 数量 */}
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">数量</label>
                <input
                  type="number"
                  value={newProduct.actual_qty}
                  onChange={(e) => handleNewProductQtyChange(e.target.value)}
                  min="1"
                  className="w-full text-[11px] font-medium text-gray-800 border border-gray-200 rounded px-1 py-0.5 bg-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowAddProduct(false)}
                className="flex-1 py-2 border border-gray-300 rounded-md text-gray-700 font-medium text-xs"
              >
                取消
              </button>
              <button
                onClick={addNewProduct}
                className="flex-1 py-2 bg-green-500 text-white rounded-md font-medium text-xs"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
