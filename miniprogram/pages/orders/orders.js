const app = getApp()
const supabase = require('../../utils/supabase.js')

const ACTIVE_STATUSES = ['待处理', '制作中', '待取餐']
const STATUS_META = {
  '待处理': { className: 'pending', hint: '门店正在确认订单', step: 1 },
  '制作中': { className: 'making', hint: '餐品正在制作中', step: 2 },
  '待取餐': { className: 'pickup', hint: '餐品已完成，请及时取餐', step: 3 },
  '已完成': { className: 'completed', hint: '订单已完成', step: 4 },
  '已取消': { className: 'cancelled', hint: '订单已取消', step: 0 }
}

Page({
  data: {
    orders: [],
    displayOrders: [],
    statusTabs: ['全部', '进行中', '已完成'],
    currentStatus: '全部',
    activeCount: 0,
    completedCount: 0,
    loading: true,
    reorderingId: ''
  },

  onShow: function () {
    this.loadOrders()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2, cartCount: app.globalData.totalItems })
    }
  },

  onPullDownRefresh: function () {
    this.loadOrders().finally(() => wx.stopPullDownRefresh())
  },

  loadOrders: function () {
    const orderIds = app.globalData.myOrderIds || []
    if (!orderIds.length) {
      this.setData({ orders: [], displayOrders: [], activeCount: 0, completedCount: 0, loading: false })
      return Promise.resolve([])
    }

    this.setData({ loading: true })
    return Promise.all([
      supabase.fetchOrdersByIds(orderIds),
      supabase.fetchOrderItemsByOrders(orderIds),
      supabase.fetchProducts()
    ]).then(([orders, items, products]) => {
      this.availableProducts = products || []
      const itemGroups = (items || []).reduce((groups, item) => {
        if (!groups[item.order_id]) groups[item.order_id] = []
        groups[item.order_id].push(item)
        return groups
      }, {})
      const storeMap = (app.globalData.stores || []).reduce((map, store) => {
        map[String(store.id)] = store.name
        return map
      }, {})
      const processed = (orders || []).map(order => {
        const meta = STATUS_META[order.status] || { className: 'pending', hint: order.status, step: 1 }
        const orderItems = itemGroups[order.id] || []
        return {
          ...order,
          ...meta,
          items: orderItems,
          itemCount: orderItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
          amountText: Number(order.amount).toFixed(2),
          timeText: this.formatTime(order.created_at),
          storeName: storeMap[String(order.store_id)] || '轻食门店'
        }
      })
      this.setData({
        orders: processed,
        activeCount: processed.filter(item => ACTIVE_STATUSES.includes(item.status)).length,
        completedCount: processed.filter(item => item.status === '已完成').length,
        loading: false
      }, this.applyStatusFilter)
      return processed
    }).catch(err => {
      console.error('loadOrders failed', err)
      this.setData({ loading: false })
      wx.showToast({ title: '订单加载失败', icon: 'none' })
      return []
    })
  },

  switchStatus: function (e) {
    this.setData({ currentStatus: e.currentTarget.dataset.status }, this.applyStatusFilter)
  },

  applyStatusFilter: function () {
    const status = this.data.currentStatus
    const list = this.data.orders.filter(item => {
      if (status === '进行中') return ACTIVE_STATUSES.includes(item.status)
      if (status === '已完成') return item.status === '已完成'
      return true
    })
    this.setData({ displayOrders: list })
  },

  reorder: function (e) {
    const orderId = e.currentTarget.dataset.id
    const order = this.data.orders.find(item => item.id === orderId)
    if (!order || this.data.reorderingId) return
    this.setData({ reorderingId: orderId })

    let added = 0
    let unavailable = 0
    order.items.forEach(item => {
      const product = (this.availableProducts || []).find(candidate => candidate.name === item.product_name && Number(candidate.stock) > 0)
      if (product) {
        app.addToCart({
          ...product,
          soldOut: false,
          priceText: Number(product.price).toFixed(2),
          nutritionText: `${product.calories || 0} kcal · 蛋白质 ${product.protein || 0}g`
        }, item.quantity)
        added += Number(item.quantity)
      } else unavailable += Number(item.quantity)
    })

    this.setData({ reorderingId: '' })
    if (!added) {
      wx.showToast({ title: '原订单商品暂不可售', icon: 'none' })
      return
    }
    wx.showModal({
      title: '已加入购物车',
      content: unavailable ? `已加入 ${added} 件，另有 ${unavailable} 件暂不可售。` : `原订单 ${added} 件商品已加入购物车。`,
      cancelText: '继续查看',
      confirmText: '去结算',
      confirmColor: '#2e7d32',
      success: result => {
        if (result.confirm) wx.switchTab({ url: '/pages/cart/cart' })
      }
    })
  },

  formatTime: function (isoStr) {
    if (!isoStr) return ''
    const date = new Date(isoStr)
    const now = new Date()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    if (date.toDateString() === now.toDateString()) return `今天 ${hour}:${minute}`
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) return `昨天 ${hour}:${minute}`
    return `${month}-${day} ${hour}:${minute}`
  },

  goToMenu: function () {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
