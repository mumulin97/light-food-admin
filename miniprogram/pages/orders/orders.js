const supabase = require('../../utils/supabase.js')

// 订单状态颜色映射
const STATUS_COLORS = {
  '待处理': '#ff9800',
  '制作中': '#2196f3',
  '待取餐': '#9c27b0',
  '已完成': '#2e7d32',
  '已取消': '#9e9e9e'
}

Page({
  data: {
    orders: [],
    loading: true
  },

  onLoad: function () {
    this.loadOrders()
  },

  onShow: function () {
    // 每次进入页面刷新
    this.loadOrders()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
  },

  // 下拉刷新
  onPullDownRefresh: function () {
    this.loadOrders().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  loadOrders: function () {
    this.setData({ loading: true })
    return supabase.fetchOrders(50).then(orders => {
      const processed = (orders || []).map(o => ({
        ...o,
        statusColor: STATUS_COLORS[o.status] || '#666666',
        amountText: Number(o.amount).toFixed(2),
        timeText: this.formatTime(o.created_at)
      }))

      this.setData({
        orders: processed,
        loading: false
      })

      // 异步加载每个订单的明细
      processed.forEach(order => {
        supabase.fetchOrderItems(order.id).then(items => {
          const orderList = this.data.orders.map(o => {
            if (o.id === order.id) {
              return { ...o, items: items || [] }
            }
            return o
          })
          this.setData({ orders: orderList })
        })
      })
    }).catch(err => {
      console.error('loadOrders failed', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    })
  },

  // 格式化时间
  formatTime: function (isoStr) {
    if (!isoStr) return ''
    const d = new Date(isoStr)
    const now = new Date()
    const month = (d.getMonth() + 1).toString().padStart(2, '0')
    const day = d.getDate().toString().padStart(2, '0')
    const hour = d.getHours().toString().padStart(2, '0')
    const min = d.getMinutes().toString().padStart(2, '0')

    if (d.toDateString() === now.toDateString()) {
      return `今天 ${hour}:${min}`
    }
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) {
      return `昨天 ${hour}:${min}`
    }
    return `${month}-${day} ${hour}:${min}`
  },

  goToMenu: function () {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
