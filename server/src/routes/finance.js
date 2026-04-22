const express = require('express');
const router = express.Router();
const { getDb } = require('../db/sqlite');
const { adminAuth } = require('../middleware/auth');

router.get('/overview', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = today.substring(0, 7) + '-01';
    
    const totalOrders = db.prepare(`SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as amount FROM orders WHERE status != 'cancelled'`).get();
    const completedOrders = db.prepare(`SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as amount FROM orders WHERE status = 'completed'`).get();
    const pendingOrders = db.prepare(`SELECT COUNT(*) as count FROM orders WHERE status IN ('pending', 'confirmed', 'picked', 'shipped')`).get();
    const todayOrders = db.prepare(`SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as amount FROM orders WHERE DATE(created_at) = ? AND status != 'cancelled'`).get(today);
    const monthOrders = db.prepare(`SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as amount FROM orders WHERE DATE(created_at) >= ? AND status != 'cancelled'`).get(startOfMonth);
    const totalCost = db.prepare(`SELECT COALESCE(SUM(actual_cost), 0) as cost FROM orders WHERE status = 'completed'`).get();
    const totalActualAmount = db.prepare(`SELECT COALESCE(SUM(actual_amount), 0) as amount FROM orders WHERE status = 'completed'`).get();
    const totalProfit = db.prepare(`SELECT COALESCE(SUM(profit_amount), 0) as profit FROM orders WHERE status = 'completed'`).get();
    const monthCost = db.prepare(`SELECT COALESCE(SUM(actual_cost), 0) as cost FROM orders WHERE DATE(created_at) >= ? AND status = 'completed'`).get(startOfMonth);
    const monthActualAmount = db.prepare(`SELECT COALESCE(SUM(actual_amount), 0) as amount FROM orders WHERE DATE(created_at) >= ? AND status = 'completed'`).get(startOfMonth);
    const monthProfit = db.prepare(`SELECT COALESCE(SUM(profit_amount), 0) as profit FROM orders WHERE DATE(created_at) >= ? AND status = 'completed'`).get(startOfMonth);
    
    res.json({code: 200, data: {
      totalOrders: totalOrders.count || 0,
      totalAmount: Number(totalOrders.amount) || 0,
      completedOrders: completedOrders.count || 0,
      completedAmount: Number(completedOrders.amount) || 0,
      pendingOrders: pendingOrders.count || 0,
      todayOrders: todayOrders.count || 0,
      todayAmount: Number(todayOrders.amount) || 0,
      monthOrders: monthOrders.count || 0,
      monthAmount: Number(monthOrders.amount) || 0,
      totalCost: Number(totalCost.cost) || 0,
      totalActualAmount: Number(totalActualAmount.amount) || 0,
      totalProfit: Number(totalProfit.profit) || 0,
      monthCost: Number(monthCost.cost) || 0,
      monthActualAmount: Number(monthActualAmount.amount) || 0,
      monthProfit: Number(monthProfit.profit) || 0
    }});
  } catch (error) {
    console.error('获取财务概览失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

router.get('/trend', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { type = 'daily' } = req.query;
    let dateFormat = type === 'monthly' ? "strftime('%Y-%m', created_at)" : type === 'yearly' ? "strftime('%Y', created_at)" : "strftime('%Y-%m-%d', created_at)";
    let groupBy = type === 'monthly' ? '%Y-%m' : type === 'yearly' ? '%Y' : '%Y-%m-%d';
    let query = `SELECT ${dateFormat} as date, COUNT(*) as orderCount, COALESCE(SUM(total), 0) as orderAmount, COALESCE(SUM(actual_cost), 0) as costAmount, COALESCE(SUM(actual_amount), 0) as actualAmount, COALESCE(SUM(profit_amount), 0) as profitAmount FROM orders WHERE status = 'completed' GROUP BY ${groupBy} ORDER BY date DESC LIMIT 30`;
    const trends = db.prepare(query).all();
    res.json({ code: 200, data: trends.map(t => ({
      date: t.date, orderCount: t.orderCount || 0, orderAmount: Number(t.orderAmount) || 0,
      costAmount: Number(t.costAmount) || 0, actualAmount: Number(t.actualAmount) || 0, profitAmount: Number(t.profitAmount) || 0
    }))});
  } catch (error) {
    console.error('获取财务趋势失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

router.get('/category', adminAuth, (req, res) => {
  try {
    const db = getDb();
    let query = `SELECT c.name as categoryName, COUNT(DISTINCT o.id) as orderCount, COALESCE(SUM(oi.subtotal), 0) as totalAmount FROM categories c LEFT JOIN products p ON c.id = p.category_id LEFT JOIN order_items oi ON p.id = oi.product_id LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'completed' GROUP BY c.id ORDER BY totalAmount DESC`;
    const categories = db.prepare(query).all();
    const totalAmount = categories.reduce((sum, cat) => sum + Number(cat.totalAmount), 0);
    res.json({ code: 200, data: categories.map(cat => ({
      categoryName: cat.categoryName || '未分类', orderCount: cat.orderCount || 0,
      totalAmount: Number(cat.totalAmount) || 0,
      percentage: totalAmount > 0 ? ((Number(cat.totalAmount) / totalAmount) * 100).toFixed(1) : 0
    }))});
  } catch (error) {
    console.error('获取分类统计失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

router.get('/product/top', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { limit = 10 } = req.query;
    let query = `SELECT oi.product_name, oi.name_th, COUNT(*) as orderCount, SUM(oi.quantity) as totalQuantity, COALESCE(SUM(oi.subtotal), 0) as totalAmount FROM order_items oi LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'completed' GROUP BY oi.product_id ORDER BY totalAmount DESC LIMIT ?`;
    const products = db.prepare(query).all(parseInt(limit) || 10);
    res.json({ code: 200, data: products.map(p => ({
      productName: p.product_name || '未知商品', nameTh: p.name_th || '',
      orderCount: p.orderCount || 0, totalQuantity: p.totalQuantity || 0, totalAmount: Number(p.totalAmount) || 0
    }))});
  } catch (error) {
    console.error('获取商品排名失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

router.get('/customer/top', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { limit = 10 } = req.query;
    let query = `SELECT u.id, u.username, u.nickname, u.order_title, COUNT(o.id) as orderCount, COALESCE(SUM(o.total), 0) as totalAmount, COALESCE(SUM(o.actual_cost), 0) as totalCost, COALESCE(SUM(o.profit_amount), 0) as totalProfit FROM users u LEFT JOIN orders o ON u.id = o.user_id AND o.status = 'completed' GROUP BY u.id ORDER BY totalAmount DESC LIMIT ?`;
    const customers = db.prepare(query).all(parseInt(limit) || 10);
    res.json({ code: 200, data: customers.map(c => ({
      id: c.id, username: c.username || '', nickname: c.nickname || '', orderTitle: c.order_title || '',
      orderCount: c.orderCount || 0, totalAmount: Number(c.totalAmount) || 0,
      totalCost: Number(c.totalCost) || 0, totalProfit: Number(c.totalProfit) || 0
    }))});
  } catch (error) {
    console.error('获取客户排名失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

router.get('/daily', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { days = 7 } = req.query;
    const daysInt = parseInt(days) || 7;
    const dailyData = [];
    for (let i = daysInt - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const date = d.toISOString().split('T')[0];
      const stats = db.prepare(`SELECT COUNT(*) as orderCount, COALESCE(SUM(total), 0) as orderAmount, COALESCE(SUM(actual_cost), 0) as costAmount, COALESCE(SUM(actual_amount), 0) as actualAmount, COALESCE(SUM(profit_amount), 0) as profitAmount FROM orders WHERE DATE(created_at) = ? AND status = 'completed'`).get(date);
      dailyData.push({
        date, orderCount: stats.orderCount || 0, orderAmount: Number(stats.orderAmount) || 0,
        costAmount: Number(stats.costAmount) || 0, actualAmount: Number(stats.actualAmount) || 0, profitAmount: Number(stats.profitAmount) || 0
      });
    }
    res.json({ code: 200, data: dailyData });
  } catch (error) {
    console.error('获取日报失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 获取每日订单收支明细
router.get('/daily/orders', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { date = new Date().toISOString().split('T')[0] } = req.query;
    
    const orders = db.prepare(`
      SELECT o.id, o.order_no, o.created_at, o.total, o.actual_cost, o.actual_amount, o.profit_amount, o.customs_fee, o.status, u.username, u.nickname, u.order_title
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE DATE(o.created_at) = ? AND o.status != 'cancelled'
      ORDER BY o.created_at DESC
    `).all(date);
    
    res.json({ code: 200, data: orders.map(order => ({
      id: order.id,
      orderNo: order.order_no,
      createdAt: order.created_at,
      total: Number(order.total) || 0,
      actualCost: Number(order.actual_cost) || 0,
      customsFee: Number(order.customs_fee) || 0,
      actualAmount: Number(order.actual_amount) || 0,
      profitAmount: Number(order.profit_amount) || 0,
      status: order.status,
      username: order.username || '',
      nickname: order.nickname || '',
      orderTitle: order.order_title || ''
    }))});
  } catch (error) {
    console.error('获取每日订单收支明细失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

module.exports = router;