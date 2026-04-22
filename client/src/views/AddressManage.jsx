import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, MapPin, Phone, User, Check, Trash2, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { addressAPI } from '../api';

export default function AddressManage() {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    is_default: false
  });

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const res = await addressAPI.list();
      if (res.code === 200) {
        setAddresses(res.data || []);
      }
    } catch (error) {
      console.error('获取地址失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAddress) {
        await addressAPI.update(editingAddress.id, formData);
      } else {
        await addressAPI.create(formData);
      }
      setShowForm(false);
      setEditingAddress(null);
      setFormData({ name: '', phone: '', address: '', is_default: false });
      fetchAddresses();
    } catch (error) {
      alert(error.message || '操作失败');
    }
  };

  const handleEdit = (addr) => {
    setEditingAddress(addr);
    setFormData({
      name: addr.name,
      phone: addr.phone,
      address: addr.address,
      is_default: addr.is_default === 1
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这个收货地址吗？')) return;
    try {
      await addressAPI.delete(id);
      fetchAddresses();
    } catch (error) {
      alert('删除失败');
    }
  };

  const setDefault = async (id) => {
    try {
      const addr = addresses.find(a => a.id === id);
      if (addr) {
        await addressAPI.setDefault(id);
        fetchAddresses();
      }
    } catch (error) {
      alert('设置默认地址失败');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 border-b">
        <div className="flex items-center px-4 py-3">
          <button onClick={() => navigate('/user')} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold flex-1 text-center">收货地址</h1>
          <div className="w-9"></div>
        </div>
      </div>

      {/* Address List */}
      <div className="p-4 space-y-3">
        {addresses.map((addr) => (
          <div key={addr.id} className={`bg-white rounded-xl p-4 border-2 ${addr.is_default ? 'border-blue-500' : 'border-transparent'}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{addr.name}</span>
                  <Phone className="w-4 h-4 text-gray-400 ml-2" />
                  <span className="text-gray-600">{addr.phone}</span>
                  {addr.is_default === 1 && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
                      默认
                    </span>
                  )}
                </div>
                <div className="flex items-start gap-2 text-gray-600">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{addr.address}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-4 mt-3 pt-3 border-t">
              {!addr.is_default && (
                <button
                  onClick={() => setDefault(addr.id)}
                  className="flex items-center gap-1 text-sm text-gray-600"
                >
                  <Check className="w-4 h-4" />
                  设为默认
                </button>
              )}
              <button
                onClick={() => handleEdit(addr)}
                className="flex items-center gap-1 text-sm text-blue-600"
              >
                <Edit2 className="w-4 h-4" />
                编辑
              </button>
              <button
                onClick={() => handleDelete(addr.id)}
                className="flex items-center gap-1 text-sm text-red-500"
              >
                <Trash2 className="w-4 h-4" />
                删除
              </button>
            </div>
          </div>
        ))}

        {addresses.length === 0 && (
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">暂无收货地址</p>
            <p className="text-sm text-gray-400 mt-1">点击下方按钮添加</p>
          </div>
        )}
      </div>

      {/* Add Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t max-w-lg mx-auto">
        <button
          onClick={() => {
            setEditingAddress(null);
            setFormData({ name: '', phone: '', address: '', is_default: false });
            setShowForm(true);
          }}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          新增收货地址
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {editingAddress ? '编辑地址' : '新增地址'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2">
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">收货人</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入收货人姓名"
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="请输入手机号"
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">详细地址</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="请输入详细地址（街道、门牌号等）"
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  required
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <span className="text-sm">设为默认收货地址</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 border rounded-xl font-medium"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium"
                >
                  {editingAddress ? '保存' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Spacer for fixed button */}
      <div className="h-20"></div>
    </div>
  );
}
