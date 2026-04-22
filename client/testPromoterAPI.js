// 测试推广员API的脚本
import fetch from 'node-fetch';

async function testPromoterAPI() {
  try {
    // 先登录获取token
    console.log('=== 测试登录 ===');
    const loginRes = await fetch('http://localhost:3006/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'llaa',
        password: 'test123'
      })
    });
    
    const loginData = await loginRes.json();
    console.log('登录结果:', loginData);
    
    if (loginData.code !== 200) {
      console.error('登录失败');
      return;
    }
    
    const token = loginData.data.token;
    console.log('获取到token:', token);
    
    // 测试获取客户列表
    console.log('\n=== 测试获取客户列表 ===');
    const customersRes = await fetch('http://localhost:3006/api/promoter/customers', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const customersData = await customersRes.json();
    console.log('客户列表结果:', customersData);
    
    // 测试获取统计数据
    console.log('\n=== 测试获取统计数据 ===');
    const statsRes = await fetch('http://localhost:3006/api/promoter/statistics', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const statsData = await statsRes.json();
    console.log('统计数据结果:', statsData);
    
    // 测试获取提成设置
    console.log('\n=== 测试获取提成设置 ===');
    const commissionRes = await fetch('http://localhost:3006/api/promoter/commission-settings', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const commissionData = await commissionRes.json();
    console.log('提成设置结果:', commissionData);
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

testPromoterAPI();
