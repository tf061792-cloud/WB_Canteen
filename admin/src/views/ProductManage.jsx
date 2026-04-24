import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { productAPI, pricingAPI, categoryAPI } from '../api';
import Toast from '../components/Toast';
import * as XLSX from 'xlsx';
import { requestCache } from '../utils/requestCache';

// 每页显示条数
const PAGE_SIZE = 50;

export default function ProductManage() {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [categoryId, setCategoryId] = useState('');
  const [keyword, setKeyword] = useState('');
  const [toast, setToast] = useState(null);
  const [sortField, setSortField] = useState('id');
  const [sortOrder, setSortOrder] = useState('asc');
  
  // 弹窗状态
  const [showModal, setShowModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    name_th: '',
    category_id: '',
    price: '',
    cost_price: '',
    profit_weight: '',
    unit: '斤',
    specs: '',
    stock: 0,
    image: '',
    description: '',
    status: 'active'
  });
  
  const [batchData, setBatchData] = useState('');
  const [batchPreview, setBatchPreview] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const fileInputRef = useRef(null);
  
  // 批量删除
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);
  
  // 图片上传
  const [uploadedImages, setUploadedImages] = useState([]);
  const [showImageManager, setShowImageManager] = useState(false);
  const imageUploadRef = useRef(null);
  const [uploading, setUploading] = useState(false); // 商品图片上传状态
  const productImageInputRef = useRef(null); // 商品图片上传input引用

  // 处理商品图片上传
  const handleProductImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      showToast('请选择图片文件', 'error');
      return;
    }

    // 验证文件大小（最大10MB）
    if (file.size > 10 * 1024 * 1024) {
      showToast('图片大小不能超过10MB', 'error');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();
      if (result.code === 200) {
        setFormData(prev => ({ ...prev, image: result.data.url }));
        showToast('图片上传成功');
      } else {
        showToast(result.message || '上传失败', 'error');
      }
    } catch (error) {
      console.error('上传图片失败:', error);
      showToast('上传图片失败', 'error');
    } finally {
      setUploading(false);
      // 清空input，允许重复选择同一文件
      if (productImageInputRef.current) {
        productImageInputRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    fetchCategories();
    fetchProducts();
  }, [page, categoryId, keyword, sortField, sortOrder]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCategories = async () => {
    try {
      // 清除分类缓存，确保获取最新数据
      requestCache.clearByPrefix('/products/categories');
      const res = await categoryAPI.list();
      if (res.code === 200) {
        setCategories(res.data || []);
        console.log('分类列表已更新，共', res.data?.length || 0, '个分类');
      }
    } catch (error) {
      console.error('获取分类失败:', error);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = { page, pageSize: 50 };
      if (categoryId) params.categoryId = categoryId;
      if (keyword) params.keyword = keyword;
      params.sortField = sortField;
      params.sortOrder = sortOrder;
      
      console.log('[DEBUG] fetchProducts called with params:', params);
      
      const res = await pricingAPI.list(params);
      console.log('[DEBUG] API response:', { listLength: res.data?.list?.length, total: res.data?.total, page: res.data?.page });
      
      if (res.code === 200) {
        setProducts(res.data.list);
        setTotal(res.data.total);
      }
    } catch (error) {
      console.error('获取商品列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 计算销售价格
  const calculateSalePrice = (product) => {
    const cost = parseFloat(product.cost_price) || 0;
    const profit = parseFloat(product.profit_weight) || 0;
    return (cost + profit).toFixed(2);
  };

  // 处理图片URL - 本地图片特殊处理，外部图片处理CORS问题
  const getImageUrl = (url) => {
    if (!url) return '';
    // 本地图片直接返回
    if (url.startsWith('/uploads/') || url.startsWith('/api/')) return url;
    
    // 处理 Google Drive 图片的 CORS 问题
    if (url.includes('drive.google.com/uc?export=view&id=')) {
      // 提取文件ID
      const match = url.match(/id=([^&]+)/);
      if (match && match[1]) {
        // 使用 Googleusercontent 格式
        return `https://lh3.googleusercontent.com/d/${match[1]}`;
      }
    }
    
    // 其他外部图片直接返回
    return url;
  };

  // 保存价格字段
  const savePriceField = async (product, field, value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;
    
    const originalValue = product[field];
    if (numValue === originalValue) return;
    
    // 本地更新
    setProducts(prev => prev.map(p => {
      if (p.id === product.id) {
        const updated = { ...p, [field]: numValue };
        updated.sale_price = calculateSalePrice(updated);
        return updated;
      }
      return p;
    }));
    
    // 后台保存（无反馈）
    try {
      await pricingAPI.update(product.id, { [field]: numValue });
    } catch (error) {
      console.error('保存失败:', error);
    }
  };
  
  // 价格输入框组件
  const PriceInput = ({ product, field, value }) => {
    const [localValue, setLocalValue] = useState(value || '');
    
    const handleBlur = () => {
      savePriceField(product, field, localValue);
    };
    
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.target.blur();
      }
    };
    
    return (
      <input
        type="text"
        inputMode="decimal"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-14 px-0.5 py-0 border border-gray-200 rounded text-center text-[10px] focus:outline-none focus:border-blue-400 leading-tight [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    );
  };

  // 商品操作
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 构建提交数据，将空字符串转为 null（除特定字段外）
      const submitData = {
        name: formData.name || '',
        name_th: formData.name_th || null,
        category_id: formData.category_id || null,
        price: formData.price === '' ? null : parseFloat(formData.price),
        cost_price: formData.cost_price === '' ? null : parseFloat(formData.cost_price),
        profit_weight: formData.profit_weight === '' ? null : parseFloat(formData.profit_weight),
        unit: formData.unit || '斤',
        specs: formData.specs || null,
        stock: formData.stock ?? 0,
        image: formData.image || null,
        description: formData.description || null,
        status: formData.status || 'active'
      };
      
      if (editingProduct) {
        // 先更新前端列表，提供即时反馈
        setProducts(prev => prev.map(product => 
          product.id === editingProduct.id ? { ...product, ...submitData } : product
        ));
        
        await productAPI.update(editingProduct.id, submitData);
      } else {
        const res = await productAPI.add(submitData);
        if (res.code === 200) {
          // 先添加到前端列表，提供即时反馈
          const newProduct = {
            id: res.data.id,
            ...submitData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          setProducts(prev => [...prev, newProduct]);
        }
      }
      
      setShowModal(false);
      resetForm();
      // 清除商品相关缓存，强制刷新数据
      requestCache.clearByPrefix('/products');
      // 重新加载商品，确保数据一致性
      await fetchProducts();
      showToast(editingProduct ? '更新成功' : '添加成功', 'success');
    } catch (error) {
      // 如果发生错误，重新加载商品列表
      await fetchProducts();
      showToast('操作失败', 'error');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    const costPrice = product.cost_price || '';
    const profitWeight = product.profit_weight || '';
    // 计算售价：成本价 + 利润加权
    const calculatedPrice = (costPrice !== '' && profitWeight !== '') 
      ? (parseFloat(costPrice) + parseFloat(profitWeight)).toFixed(2)
      : (product.price || '');
    setFormData({
      name: product.name || '',
      name_th: product.name_th || '',
      category_id: product.category_id || '',
      price: calculatedPrice,
      cost_price: costPrice,
      profit_weight: profitWeight,
      unit: product.unit || '斤',
      specs: product.specs || '',
      stock: product.stock ?? 0,
      image: product.image || '',
      description: product.description || '',
      status: product.status || 'active'
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这个商品吗？')) return;
    try {
      // 先从前端列表中移除该商品，提供即时反馈
      setProducts(prev => prev.filter(product => product.id !== id));
      
      await productAPI.delete(id);
      // 清除商品相关缓存，强制刷新数据
      requestCache.clearByPrefix('/products');
      // 重新加载商品，确保数据一致性
      await fetchProducts();
      showToast('删除成功', 'success');
    } catch (error) {
      // 如果发生错误，重新加载商品列表
      await fetchProducts();
      showToast('删除失败', 'error');
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedProducts.size === 0) return;
    
    setBatchDeleting(true);
    try {
      const ids = Array.from(selectedProducts);
      
      // 先从前端列表中移除选中的商品，提供即时反馈
      setProducts(prev => prev.filter(product => !selectedProducts.has(product.id)));
      
      // 逐个删除
      await Promise.all(ids.map(id => productAPI.delete(id)));
      setSelectedProducts(new Set());
      // 清除商品相关缓存，强制刷新数据
      requestCache.clearByPrefix('/products');
      // 重新加载商品，确保数据一致性
      await fetchProducts();
      setShowBatchDeleteModal(false);
      showToast(`成功删除 ${ids.length} 个商品`, 'success');
    } catch (error) {
      // 如果发生错误，重新加载商品列表
      await fetchProducts();
      showToast('批量删除失败', 'error');
    } finally {
      setBatchDeleting(false);
    }
  };

  const handleToggleStatus = async (product) => {
    const newStatus = product.status === 'active' ? 'inactive' : 'active';
    try {
      // 先更新前端列表，提供即时反馈
      setProducts(prev => prev.map(p => 
        p.id === product.id ? { ...p, status: newStatus } : p
      ));
      
      await productAPI.update(product.id, { status: newStatus });
      // 清除商品相关缓存，强制刷新数据
      requestCache.clearByPrefix('/products');
      // 重新加载商品，确保数据一致性
      await fetchProducts();
      showToast('状态更新成功', 'success');
    } catch (error) {
      // 如果发生错误，重新加载商品列表
      await fetchProducts();
      showToast('更新失败', 'error');
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      name_th: '',
      category_id: '',
      price: '',
      cost_price: '',
      profit_weight: '',
      unit: '斤',
      specs: '',
      stock: 0,
      image: '',
      description: '',
      status: 'active'
    });
  };

  // ============ 批量导入功能 ============
  
  // 解析批量导入数据
  const parseBatchData = (text) => {
    console.log('解析文本数据:', text.substring(0, 200));
    const lines = text.trim().split('\n').filter(line => line.trim());
    const preview = [];
    
    // 跳过表头（第一行），从第二行开始
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // 跳过可能是表头的行（包含"商品名称"或"名称"等关键词）
      if (line.includes('商品名称') || line.includes('名称') && line.includes('泰文')) {
        console.log('跳过表头行:', line);
        continue;
      }
      const parts = line.split(/\t|,/).map(p => p.trim());
      console.log('解析行:', parts);
      if (parts.length >= 2) {
        // 处理图片URL - 支持ID_XXX格式或完整http(s) URL
        // 检查第10列（索引9）是否为图片URL
        let imageUrl = '';
        const imageValue = parts[9] || '';
        console.log('图片字段值:', imageValue);
        
        if (imageValue) {
          if (imageValue.startsWith('ID_')) {
            // 本地图片ID格式
            imageUrl = `/uploads/${imageValue}.png`;
          } else if (imageValue.startsWith('http://') || imageValue.startsWith('https://')) {
            // 外部图片URL
            imageUrl = imageValue;
          } else if (imageValue.startsWith('//')) {
            // 协议相对URL
            imageUrl = 'https:' + imageValue;
          } else {
            // 其他情况直接保留
            imageUrl = imageValue;
          }
        }
        console.log('最终图片URL:', imageUrl);
        
        preview.push({
          name: parts[0] || '',
          name_th: parts[1] || '',
          category_name: parts[2] || '',
          price: parseFloat(parts[3]) || 0,
          cost_price: parseFloat(parts[4]) || null,
          profit_weight: parseFloat(parts[5]) || null,
          unit: parts[6] || '斤',
          specs: parts[7] || '',
          stock: parseInt(parts[8]) || 0,
          image: imageUrl,
          image_id: imageValue,
          description: parts[10] || '',
          status: 'active'
        });
      }
    }
    setBatchPreview(preview);
  };

  // 解析XLSX文件
  const parseXLSX = (arrayBuffer) => {
    try {
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      
      if (jsonData.length < 2) {
        showToast('文件中没有数据', 'error');
        return;
      }

      // 跳过表头，从第2行开始解析
      console.log('XLSX数据:', jsonData);
      const preview = [];
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        console.log('解析Excel行:', row);
        if (row.length >= 2) {
          // 处理图片URL - 支持ID_XXX格式或完整http(s) URL
          const imageValue = String(row[9] || '');
          let imageUrl = '';
          console.log('Excel图片字段值:', imageValue);
          
          let imageId = null;
          if (imageValue) {
            if (imageValue.startsWith('ID_')) {
              imageUrl = `/uploads/${imageValue}.png`;
              imageId = imageValue;
            } else if (imageValue.startsWith('http://') || imageValue.startsWith('https://')) {
              imageUrl = imageValue;
            } else if (imageValue.startsWith('//')) {
              imageUrl = 'https:' + imageValue;
            } else {
              imageUrl = imageValue;
            }
          }
          console.log('Excel最终图片URL:', imageUrl);
          
          preview.push({
            name: String(row[0] || ''),
            name_th: String(row[1] || ''),
            category_name: String(row[2] || ''),
            price: parseFloat(row[3]) || 0,
            cost_price: parseFloat(row[4]) || null,
            profit_weight: parseFloat(row[5]) || null,
            unit: String(row[6] || '斤'),
            specs: String(row[7] || ''),
            stock: parseInt(row[8]) || 0,
            image: imageUrl,
            image_id: imageId,
            description: String(row[10] || ''),
            status: 'active'
          });
        }
      }
      setBatchPreview(preview);
      showToast(`成功解析 ${preview.length} 条数据`, 'success');
    } catch (e) {
      console.error('读取XLSX文件失败:', e.message);
      showToast('文件解析失败: ' + e.message, 'error');
    }
  };

  // 处理文件上传
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      // XLSX文件
      const reader = new FileReader();
      reader.onload = (event) => {
        const arrayBuffer = event.target.result;
        parseXLSX(arrayBuffer);
      };
      reader.readAsArrayBuffer(file);
    } else {
      // CSV/TXT 文件
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        setBatchData(text);
        parseBatchData(text);
      };
      reader.readAsText(file);
    }
  };

  const downloadTemplateCSV = () => {
    const template = `${t('product.name')},${t('product.thaiName')},${t('product.category')},${t('product.price')},${t('product.costPrice')},${t('product.profit')},${t('product.unit')},${t('product.specs')},${t('product.stock')},${t('product.imageURL')},${t('product.description')}
示例商品-苹果,แอปเปิ้ล,水果,10.00,6.00,4.00,斤,500g/个,100,ID_9D85D3F,新鲜红富士苹果
示例商品-香蕉,กล้วย,水果,8.00,5.00,3.00,斤,把,80,ID_A1B2C3D,进口香蕉
示例商品-猪肉,เนื้อหมู,肉类,25.00,18.00,7.00,斤,500g,50,https://example.com/pork.jpg,新鲜五花肉
外部图片示例-鱼,ปลา,海鲜,30.00,20.00,10.00,斤,条,20,https://example.com/fish.jpg,深海鱼`;
    
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '商品导入模板.csv';
    link.click();
  };

  // 下载XLSX模板
  const downloadTemplateXLSX = () => {
    const data = [
      ['商品名称', '泰文名称', '分类', '售价', '成本价', '利润', '单位', '规格', '库存', '图片URL', '描述'],
      ['示例商品-苹果', 'แอปเปิ้ล', '水果', 10.00, 6.00, 4.00, '斤', '500g/个', 100, 'ID_9D85D3F', '新鲜红富士苹果'],
      ['示例商品-香蕉', 'กล้วย', '水果', 8.00, 5.00, 3.00, '斤', '把', 80, 'ID_A1B2C3D', '进口香蕉'],
      ['示例商品-猪肉', 'เนื้อหมู', '肉类', 25.00, 18.00, 7.00, '斤', '500g', 50, 'https://example.com/pork.jpg', '新鲜五花肉'],
      ['外部图片示例-鱼', 'ปลา', '海鲜', 30.00, 20.00, 10.00, '斤', '条', 20, 'https://example.com/fish.jpg', '深海鱼']
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '商品导入模板');
    XLSX.writeFile(wb, '商品导入模板.xlsx');
  };

  // 统一下载模板入口
  const downloadTemplate = () => {
    // 默认下载CSV格式
    downloadTemplateCSV();
  };

  // 批量上传图片
  const handleBatchImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const formData = new FormData();
    files.forEach(file => {
      // 从文件名提取图片ID（如果文件名包含ID_开头）
      const match = file.name.match(/(ID_[A-Z0-9]+)/i);
      const imageId = match ? match[1] : null;
      formData.append('images', file);
      if (imageId) {
        formData.append('imageIds', imageId);
      }
    });

    try {
      showToast('正在上传图片...', 'info');
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/upload/batch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const result = await response.json();
      if (result.code === 200) {
        setUploadedImages(prev => [...prev, ...result.data]);
        showToast(`成功上传 ${result.data.length} 张图片`, 'success');
        
        // 更新预览中的图片URL
        const newPreview = batchPreview.map(item => {
          if (item.image_id && item.image_id.startsWith('ID_')) {
            const matchedImage = result.data.find(img => 
              img.filename.includes(item.image_id)
            );
            if (matchedImage) {
              return { ...item, image: matchedImage.url };
            }
          }
          return item;
        });
        setBatchPreview(newPreview);
      } else {
        showToast(result.message || '上传失败', 'error');
      }
    } catch (error) {
      console.error('上传图片错误:', error);
      showToast('上传图片失败', 'error');
    }
  };

  // 提交批量导入
  const handleBatchSubmit = async () => {
    if (batchPreview.length === 0) {
      showToast('没有可导入的数据', 'error');
      return;
    }
    
    setBatchLoading(true);
    let successCount = 0;
    let failCount = 0;
    
    for (const item of batchPreview) {
      try {
        // 查找分类ID
        let categoryId = '';
        const category = categories.find(c => c.name === item.category_name);
        if (category) {
          categoryId = category.id;
        }
        
        // 计算售价：如果提供了成本价和利润加权，但没有售价，则自动计算
        let salePrice = item.price;
        const costPrice = parseFloat(item.cost_price) || 0;
        const profitWeight = parseFloat(item.profit_weight) || 0;
        
        if ((!salePrice || salePrice === 0) && costPrice > 0) {
          salePrice = costPrice + profitWeight;
        }
        
        const productData = {
          name: item.name,
          name_th: item.name_th,
          category_id: categoryId,
          price: salePrice,
          cost_price: costPrice || null,
          profit_weight: profitWeight || null,
          unit: item.unit,
          specs: item.specs,
          stock: item.stock,
          image: item.image,
          description: item.description,
          status: 'active'
        };
        
        await productAPI.add(productData);
        successCount++;
      } catch (error) {
        failCount++;
        console.error('导入失败:', item.name, error);
      }
    }
    
    setBatchLoading(false);
    showToast(`导入完成：成功 ${successCount} 条，失败 ${failCount} 条`, successCount > 0 ? 'success' : 'error');
    
    if (successCount > 0) {
      setShowBatchModal(false);
      setBatchData('');
      setBatchPreview([]);
      // 清除商品相关缓存，强制刷新数据
      requestCache.clearByPrefix('/products');
      await fetchProducts();
    }
  };

  // 总页数
  const totalPages = Math.ceil(total / 50);

  return (
    <div className="p-4 max-w-[1600px] mx-auto">
      {/* Toast 提示 */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* 页面标题 */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-800">{t('menu.products')}</h1>
        <p className="text-xs text-gray-500 mt-1">{t('product.subtitle')}</p>
      </div>

      {/* 操作栏 - 单行布局 */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="px-2 py-1.5 border rounded text-xs min-w-[90px] focus:ring-2 focus:ring-blue-300 focus:border-blue-500 outline-none"
        >
          <option value="">{t('product.allCategories')}</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder={t('product.searchPlaceholder')}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="px-2 py-1.5 border rounded text-xs w-32 sm:w-40 focus:ring-2 focus:ring-blue-300 focus:border-blue-500 outline-none"
        />
        {selectedProducts.size > 0 && (
          <button
            onClick={() => setShowBatchDeleteModal(true)}
            className="px-2 py-1.5 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {t('product.batchDelete')} ({selectedProducts.size})
          </button>
        )}
        <div className="flex-1"></div>
        <button
          onClick={() => { setBatchData(''); setBatchPreview([]); setShowBatchModal(true); }}
          className="px-2 py-1.5 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          {t('product.batchImport')}
        </button>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="px-2 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('product.add')}
        </button>
      </div>

      {/* 表格 - 响应式 */}
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] table-auto">
            <thead className="bg-gray-50 sticky top-0">
              <tr className="text-left text-[10px] sm:text-xs">
                <th className="px-2 py-1.5 font-semibold text-gray-700 w-8">
                  <input
                    type="checkbox"
                    checked={products.length > 0 && selectedProducts.size === products.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedProducts(new Set(products.map(p => p.id)));
                      } else {
                        setSelectedProducts(new Set());
                      }
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </th>
                <th 
                  className="px-2 py-1.5 font-semibold text-gray-700 w-10 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => {
                    if (sortField === 'id') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('id');
                      setSortOrder('asc');
                    }
                  }}
                >
                  <div className="flex items-center gap-1">
                    ID
                    {sortField === 'id' && (
                      <span className="text-blue-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-2 py-1.5 font-semibold text-gray-700 w-12">{t('product.image')}</th>
                <th 
                  className="px-2 py-1.5 font-semibold text-gray-700 min-w-[100px] cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => {
                    if (sortField === 'name') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('name');
                      setSortOrder('asc');
                    }
                  }}
                >
                  <div className="flex items-center gap-1">
                    {t('product.name')}
                    {sortField === 'name' && (
                      <span className="text-blue-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-2 py-1.5 font-semibold text-gray-700 min-w-[100px] cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => {
                    if (sortField === 'name_th') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('name_th');
                      setSortOrder('asc');
                    }
                  }}
                >
                  <div className="flex items-center gap-1">
                    {t('product.thaiName')}
                    {sortField === 'name_th' && (
                      <span className="text-blue-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-2 py-1.5 font-semibold text-gray-700 w-20">{t('product.category')}</th>
                <th className="px-2 py-1.5 font-semibold text-gray-700 w-20">{t('product.specs')}</th>
                <th className="px-2 py-1.5 font-semibold text-gray-700 w-12">{t('product.unit')}</th>
                <th 
                  className="px-2 py-1.5 font-semibold text-gray-700 text-right w-16 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => {
                    if (sortField === 'cost_price') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('cost_price');
                      setSortOrder('asc');
                    }
                  }}
                >
                  <div className="flex items-center justify-end gap-1">
                    {t('product.costPrice')}
                    {sortField === 'cost_price' && (
                      <span className="text-blue-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-2 py-1.5 font-semibold text-gray-700 text-right w-14 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => {
                    if (sortField === 'profit_weight') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('profit_weight');
                      setSortOrder('asc');
                    }
                  }}
                >
                  <div className="flex items-center justify-end gap-1">
                    {t('product.profit')}
                    {sortField === 'profit_weight' && (
                      <span className="text-blue-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-2 py-1.5 font-semibold text-gray-700 text-right w-16 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => {
                    if (sortField === 'price') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('price');
                      setSortOrder('asc');
                    }
                  }}
                >
                  <div className="flex items-center justify-end gap-1">
                    {t('product.price')}
                    {sortField === 'price' && (
                      <span className="text-blue-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-2 py-1.5 font-semibold text-gray-700 w-12">{t('product.status')}</th>
                <th className="px-2 py-1.5 font-semibold text-gray-700 text-center w-20">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="13" className="px-2 py-6 text-center text-gray-500 text-xs">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      加载中...
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="13" className="px-2 py-6 text-center text-gray-500 text-xs">
                    暂无商品数据
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={selectedProducts.has(product.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedProducts);
                          if (e.target.checked) {
                            newSelected.add(product.id);
                          } else {
                            newSelected.delete(product.id);
                          }
                          setSelectedProducts(newSelected);
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-[10px] text-gray-500">{product.id}</td>
                    <td className="px-2 py-1.5">
                      <div className="w-12 h-12 relative">
                        {product.image ? (
                          <img
                            src={getImageUrl(product.image)}
                            alt={product.name}
                            className="w-12 h-12 object-contain rounded border border-gray-200 bg-gray-50"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"48\" height=\"48\"><rect width=\"48\" height=\"48\" fill=\"%23f3f4f6\"/><text x=\"50%\" y=\"50%\" text-anchor=\"middle\" dy=\".3em\" fill=\"%239ca3af\" font-size=\"10\">无图</text></svg>';
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400 border border-gray-200">
                            -
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="text-xs font-medium text-gray-900 truncate max-w-[120px]" title={product.name}>
                        {product.name}
                      </div>
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="text-[10px] text-gray-600 truncate max-w-[120px]" title={product.name_th}>
                        {product.name_th || '-'}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-[10px] text-gray-600">{product.category_name || '-'}</td>
                    <td className="px-2 py-1.5 text-[10px] text-gray-600 truncate max-w-[80px]" title={product.specs}>
                      {product.specs || '-'}
                    </td>
                    <td className="px-2 py-1.5 text-[10px] text-gray-600">
                      {product.unit || '斤'}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <PriceInput product={product} field="cost_price" value={product.cost_price} />
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <PriceInput product={product} field="profit_weight" value={product.profit_weight} />
                    </td>
                    <td className="px-2 py-1.5 text-right text-xs font-semibold text-purple-600">
                      ¥{calculateSalePrice(product)}
                    </td>
                    <td className="px-2 py-1.5">
                      <button
                        onClick={() => handleToggleStatus(product)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                          product.status === 'active'
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {product.status === 'active' ? t('product.onShelf') : t('product.offShelf')}
                      </button>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => handleEdit(product)}
                          className="text-blue-600 hover:text-blue-800 text-[10px] px-1 py-0.5 rounded hover:bg-blue-50 transition-colors"
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-800 text-[10px] px-1 py-0.5 rounded hover:bg-red-50 transition-colors"
                        >
                          {t('common.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 分页 - 响应式 */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mt-3">
        <div className="text-[10px] sm:text-xs text-gray-600">
          {t('common.total')} {total} {t('common.records')}，{t('common.page')} {page}/{totalPages || 1}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1 border rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            上一页
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1 border rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            下一页
          </button>
        </div>
      </div>

      {/* 商品编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base sm:text-lg font-bold">
                {editingProduct ? t('product.edit') : t('product.add')}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('product.name')} *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md text-xs focus:ring-2 focus:ring-blue-300 focus:border-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('product.thaiName')}</label>
                  <input
                    type="text"
                    value={formData.name_th}
                    onChange={(e) => setFormData({...formData, name_th: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md text-xs focus:ring-2 focus:ring-blue-300 focus:border-blue-500 outline-none"
                    placeholder="ชื่อสินค้า"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('product.category')} *</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md text-xs focus:ring-2 focus:ring-blue-300 focus:border-blue-500 outline-none"
                    required
                  >
                    <option value="">{t('product.selectCategory')}</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('product.costPrice')}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost_price}
                    onChange={(e) => {
                      const costPrice = e.target.value;
                      const profitWeight = formData.profit_weight;
                      // 自动计算售价：成本价 + 利润加权
                      const price = (costPrice !== '' && profitWeight !== '') 
                        ? (parseFloat(costPrice) + parseFloat(profitWeight)).toFixed(2)
                        : '';
                      setFormData({...formData, cost_price: costPrice, price});
                    }}
                    className="w-full px-3 py-2 border rounded-md text-xs focus:ring-2 focus:ring-blue-300 focus:border-blue-500 outline-none"
                    placeholder="成本价"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('product.profit')}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.profit_weight}
                    onChange={(e) => {
                      const profitWeight = e.target.value;
                      const costPrice = formData.cost_price;
                      // 自动计算售价：成本价 + 利润加权
                      const price = (costPrice !== '' && profitWeight !== '') 
                        ? (parseFloat(costPrice) + parseFloat(profitWeight)).toFixed(2)
                        : '';
                      setFormData({...formData, profit_weight: profitWeight, price});
                    }}
                    className="w-full px-3 py-2 border rounded-md text-xs focus:ring-2 focus:ring-blue-300 focus:border-blue-500 outline-none"
                    placeholder="利润加权"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('product.price')} *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    readOnly
                    className="w-full px-3 py-2 border rounded-md text-xs bg-gray-100 text-gray-600 cursor-not-allowed"
                    required
                  />
                  <p className="text-[10px] text-gray-500 mt-0.5">{t('product.autoCalculated')}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('product.unit')} *</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md text-xs focus:ring-2 focus:ring-blue-300 focus:border-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('product.specs')}</label>
                  <input
                    type="text"
                    value={formData.specs}
                    onChange={(e) => setFormData({...formData, specs: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md text-xs focus:ring-2 focus:ring-blue-300 focus:border-blue-500 outline-none"
                    placeholder="如：500g/个"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('product.stock')}</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border rounded-md text-xs focus:ring-2 focus:ring-blue-300 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('product.imageUrl')}</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={formData.image}
                    onChange={(e) => setFormData({...formData, image: e.target.value})}
                    className="flex-1 px-3 py-2 border rounded-md text-xs focus:ring-2 focus:ring-blue-300 focus:border-blue-500 outline-none"
                    placeholder="https://..."
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProductImageUpload}
                    className="hidden"
                    id="product-image-upload"
                    ref={productImageInputRef}
                  />
                  <label
                    htmlFor="product-image-upload"
                    className="px-3 py-2 bg-blue-500 text-white rounded-md text-xs cursor-pointer hover:bg-blue-600 transition-colors whitespace-nowrap"
                  >
                    {uploading ? t('common.uploading') + '...' : t('common.upload')}
                  </label>
                  {formData.image && (
                    <img
                      src={getImageUrl(formData.image)}
                      alt="预览"
                      className="w-24 h-24 object-contain rounded border border-gray-200 bg-gray-50"
                      referrerPolicy="no-referrer"
                      onError={(e) => { 
                        e.target.onerror = null;
                        e.target.src = 'data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\"><rect width=\"96\" height=\"96\" fill=\"%23f3f4f6\"/><text x=\"50%\" y=\"50%\" text-anchor=\"middle\" dy=\".3em\" fill=\"%239ca3af\" font-size=\"12\">加载失败</text></svg>'; 
                      }}
                    />
                  )}
                </div>
                <p className="text-[10px] text-gray-500 mt-1">{t('product.imageSupport')}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('product.description')}</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-md text-xs focus:ring-2 focus:ring-blue-300 focus:border-blue-500 outline-none resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-md text-xs hover:bg-gray-50 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700 transition-colors"
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 批量导入弹窗 */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base sm:text-lg font-bold">{t('product.batchImportTitle')}</h2>
              <button
                onClick={() => setShowBatchModal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {/* 操作说明 */}
              <div className="bg-blue-50 p-3 rounded-lg text-xs">
                <p className="font-medium text-blue-800 mb-1">{t('product.importInstructions')}：</p>
                <ul className="text-blue-700 space-y-0.5 list-disc list-inside">
                  <li>{t('product.importFormat1')}</li>
                  <li>{t('product.importFormat2')}</li>
                  <li>{t('product.importFormat3')}</li>
                  <li>{t('product.importFormat4')}</li>
                  <li>{t('product.importFormat5')}</li>
                </ul>
              </div>
              
              {/* 文件上传 */}
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {t('product.selectFile')}
                </button>
                <button
                  onClick={downloadTemplateCSV}
                  className="px-3 py-2 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  下载CSV模板
                </button>
                <button
                  onClick={downloadTemplateXLSX}
                  className="px-3 py-2 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {t('product.downloadExcelTemplate')}
                </button>
              </div>
              
              {/* 数据预览 */}
              {batchPreview.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs font-medium">数据预览（共 {batchPreview.length} 条）：</p>
                    <button
                      onClick={() => { setBatchData(''); setBatchPreview([]); }}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      清空
                    </button>
                  </div>
                  <div className="overflow-x-auto border rounded-lg max-h-60">
                    <table className="w-full text-[10px]">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="px-2 py-1 text-left">名称</th>
                          <th className="px-2 py-1 text-left">{t('product.thaiName')}</th>
                          <th className="px-2 py-1 text-left">分类</th>
                          <th className="px-2 py-1 text-right">{t('product.price')}</th>
                          <th className="px-2 py-1 text-right">成本</th>
                          <th className="px-2 py-1 text-right">{t('product.profit')}</th>
                          <th className="px-2 py-1 text-left">单位</th>
                          <th className="px-2 py-1 text-left">规格</th>
                          <th className="px-2 py-1 text-center">图片</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {batchPreview.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-2 py-1 truncate max-w-[100px]" title={item.name}>{item.name}</td>
                            <td className="px-2 py-1 truncate max-w-[100px]" title={item.name_th}>{item.name_th || '-'}</td>
                            <td className="px-2 py-1">{item.category_name}</td>
                            <td className="px-2 py-1 text-right">¥{item.price}</td>
                            <td className="px-2 py-1 text-right">{item.cost_price ? `¥${item.cost_price}` : '-'}</td>
                            <td className="px-2 py-1 text-right">{item.profit_weight ? `¥${item.profit_weight}` : '-'}</td>
                            <td className="px-2 py-1">{item.unit}</td>
                            <td className="px-2 py-1 truncate max-w-[80px]" title={item.specs}>{item.specs}</td>
                            <td className="px-2 py-1 text-center">
                              {item.image ? (
                                <img 
                                  src={getImageUrl(item.image)} 
                                  alt="" 
                                  className="w-10 h-10 object-cover rounded mx-auto border border-gray-200"
                                  referrerPolicy="no-referrer"
                                  crossOrigin="anonymous"
                                  onError={(e) => {
                                    console.log('图片加载失败:', item.image);
                                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"%3E%3Crect width="40" height="40" fill="%23f0f0f0"/%3E%3Ctext x="50%25" y="50%25" font-size="10" fill="%23999" text-anchor="middle" dy=".3em"%3E失败%3C/text%3E%3C/svg%3E';
                                  }}
                                />
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* 图片批量上传区域 */}
              {batchPreview.length > 0 && (
                <div className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700">{t('product.batchUploadImages')}</h3>
                    <span className="text-xs text-gray-500">
                      {t('product.matchedImages')} {batchPreview.filter(i => i.image_id && (i.image_id.startsWith('ID_') || i.image_id.startsWith('http'))).length} {t('product.images')}
                    </span>
                  </div>
                  <input
                    ref={imageUploadRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleBatchImageUpload}
                    className="hidden"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => imageUploadRef.current?.click()}
                      className="px-3 py-2 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {t('product.selectImageFiles')}
                    </button>
                    <button
                      onClick={() => setShowImageManager(true)}
                      className="px-3 py-2 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      {t('product.imageManager')}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2">
                    {t('product.imageUploadTip')}
                  </p>
                  
                  {/* 已上传图片列表 */}
                  {uploadedImages.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-600 mb-1">{t('product.uploadedImages')}：</p>
                      <div className="flex flex-wrap gap-2">
                        {uploadedImages.map((img, idx) => (
                          <div key={idx} className="relative group">
                            <img src={getImageUrl(img.url)} alt={img.filename} className="w-12 h-12 object-cover rounded border" referrerPolicy="no-referrer" />
                            <span className="text-[10px] text-gray-500 truncate max-w-[60px] block">{img.filename}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 border rounded-md text-xs hover:bg-gray-50 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleBatchSubmit}
                  disabled={batchPreview.length === 0 || batchLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md text-xs hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {batchLoading && (
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  {batchLoading ? t('common.importing') : `${t('common.confirm')} ${t('common.import')} (${batchPreview.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 批量删除确认弹窗 */}
      {showBatchDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{t('product.confirmBatchDelete')}</h3>
                <p className="text-sm text-gray-500">{t('common.undone')}</p>
              </div>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg mb-6">
              <p className="text-red-800 text-sm">
                {t('product.confirmDeleteSelected')} <span className="font-bold">{selectedProducts.size}</span> {t('product.items')}？
              </p>
              <p className="text-red-600 text-xs mt-1">{t('product.deleteWarning')}</p>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowBatchDeleteModal(false)}
                disabled={batchDeleting}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleBatchDelete}
                disabled={batchDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {batchDeleting && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                {batchDeleting ? t('common.deleting') : `${t('common.confirm')} ${t('common.delete')} (${selectedProducts.size})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 图片管理弹窗 */}
      {showImageManager && (
        <ImageManager 
          onClose={() => setShowImageManager(false)} 
          onSelect={(imageUrl) => {
            // 可以在这里处理图片选择
            showToast('已选择图片: ' + imageUrl, 'success');
          }}
        />
      )}
    </div>
  );
}

// 图片管理组件
function ImageManager({ onClose, onSelect }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/upload/list', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.code === 200) {
        setImages(result.data);
      }
    } catch (error) {
      console.error('获取图片列表失败:', error);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const result = await response.json();
      if (result.code === 200) {
        setImages(prev => [result.data, ...prev]);
      }
    } catch (error) {
      console.error('上传失败:', error);
    }
    setLoading(false);
  };

  const handleDelete = async (filename) => {
    if (!confirm('确定删除这张图片吗？')) return;
    
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/upload/${filename}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.code === 200) {
        setImages(prev => prev.filter(img => img.filename !== filename));
      }
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">{t('product.imageManager')}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">✕</button>
        </div>

        <div className="mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '上传中...' : '上传图片'}
          </button>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
          {images.map((img, idx) => (
            <div key={idx} className="relative group">
              <img 
                src={img.url} 
                alt={img.filename}
                className="w-full h-20 object-cover rounded border cursor-pointer hover:border-blue-500"
                referrerPolicy="no-referrer"
                onClick={() => onSelect(img.url)}
              />
              <button
                onClick={() => handleDelete(img.filename)}
                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
              <p className="text-[10px] text-gray-500 truncate mt-1">{img.filename}</p>
            </div>
          ))}
        </div>

        {images.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>暂无图片</p>
            <p className="text-sm">点击上方按钮上传图片</p>
          </div>
        )}
      </div>
    </div>
  );
}
