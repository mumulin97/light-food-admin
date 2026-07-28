// Supabase REST API 封装 - 原生小程序版
// 文档：https://supabase.com/docs/reference/javascript/installing
const { url, anonKey } = require('../config/supabase.js')

const REST_BASE = `${url}/rest/v1`

// 统一请求头
function getHeaders(extra = {}) {
  return Object.assign({
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
    'Content-Type': 'application/json'
  }, extra)
}

// 封装 wx.request 为 Promise
function request(method, path, { body, query, prefer } = {}) {
  return new Promise((resolve, reject) => {
    let urlPath = `${REST_BASE}${path}`
    if (query) {
      const params = []
      Object.keys(query).forEach(k => {
        const v = query[k]
        if (v !== undefined && v !== null) {
          params.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        }
      })
      if (params.length) urlPath += '?' + params.join('&')
    }

    const headers = getHeaders()
    if (prefer) headers['Prefer'] = prefer

    wx.request({
      url: urlPath,
      method,
      header: headers,
      data: body || {},
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          console.error('[Supabase] error', res.statusCode, res.data)
          reject(new Error(`Supabase ${res.statusCode}: ${JSON.stringify(res.data)}`))
        }
      },
      fail: (err) => {
        console.error('[Supabase] request fail', err)
        reject(err)
      }
    })
  })
}

// ====== 门店 ======
// 获取所有营业中的门店
function fetchStores() {
  return request('GET', '/stores', {
    query: {
      select: 'id,name,address,manager,phone,status,region',
      status: 'eq.营业中',
      order: 'created_at.asc'
    }
  })
}

// ====== 菜品 ======
// 获取上架的菜品
function fetchProducts() {
  return request('GET', '/products', {
    query: {
      select: 'id,name,price,is_active,tag,category,stock,unit,calories,protein,carbs,emoji',
      is_active: 'eq.true',
      order: 'category.asc,created_at.asc'
    }
  })
}

// ====== 订单 ======
// 调用 RPC 获取下一个订单号（如 #QS-4408）
function nextOrderId() {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${REST_BASE}/rpc/next_order_id`,
      method: 'POST',
      header: getHeaders(),
      data: {},
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          reject(new Error(`next_order_id failed: ${res.statusCode}`))
        }
      },
      fail: reject
    })
  })
}

// 创建订单（主表）
function createOrder(order) {
  return request('POST', '/orders', {
    body: order,
    prefer: 'return=representation'
  }).then(data => Array.isArray(data) ? data[0] : data)
}

// 批量插入订单明细
function createOrderItems(items) {
  if (!items || items.length === 0) return Promise.resolve([])
  return request('POST', '/order_items', {
    body: items,
    prefer: 'return=representation'
  })
}

// 获取订单列表（按创建时间倒序）
function fetchOrders(limit = 50) {
  return request('GET', '/orders', {
    query: {
      select: 'id,store_id,customer_name,amount,status,method,note,created_at',
      order: 'created_at.desc',
      limit
    }
  })
}

// 获取某订单的明细
function fetchOrderItems(orderId) {
  return request('GET', '/order_items', {
    query: {
      select: 'id,order_id,product_name,quantity,unit_price',
      order_id: `eq.${orderId}`
    }
  })
}

module.exports = {
  fetchStores,
  fetchProducts,
  nextOrderId,
  createOrder,
  createOrderItems,
  fetchOrders,
  fetchOrderItems
}
