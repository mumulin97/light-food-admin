const app = getApp()
const supabase = require('../../utils/supabase.js')

Page({
  data: {
    cartItems: [],
    totalAmount: 0,
    totalItems: 0,
    storeName: '',
    // 就餐方式
    methods: ['堂食', '外带', '外卖'],
    methodIndex: 0,
    // 姓名
    customerName: '',
    deliveryAddress: '',
    // 备注
    note: '',
    // 提交中
    submitting: false
  },

  onLoad: function () {
    this.loadCartData()
  },

  onShow: function () {
    this.loadCartData()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1, cartCount: app.globalData.totalItems })
    }
  },

  loadCartData: function () {
    const profile = app.globalData.profile || {}
    const store = app.globalData.currentStore
    this.setData({
      cartItems: app.globalData.cart.map(item => ({ ...item, priceText: Number(item.price).toFixed(2) })),
      totalAmount: app.globalData.totalAmount.toFixed(2),
      totalItems: app.globalData.totalItems,
      storeName: store ? store.name : '尚未选择门店',
      customerName: this.data.customerName || profile.name || '',
      deliveryAddress: this.data.deliveryAddress || profile.address || ''
    })
  },

  // 切换就餐方式
  switchMethod: function (e) {
    this.setData({ methodIndex: Number(e.currentTarget.dataset.index) })
  },

  // 输入姓名
  onNameInput: function (e) {
    this.setData({ customerName: e.detail.value.trim() })
  },

  // 输入备注
  onNoteInput: function (e) {
    this.setData({ note: e.detail.value })
  },

  onAddressInput: function (e) {
    this.setData({ deliveryAddress: e.detail.value })
  },

  // 数量加减
  increaseQty: function (e) {
    const productId = e.currentTarget.dataset.id
    const product = app.globalData.cart.find(item => item.id === productId)
    if (product) {
      app.addToCart(product)
      this.loadCartData()
    }
  },

  decreaseQty: function (e) {
    const productId = e.currentTarget.dataset.id
    app.removeFromCart(productId)
    this.loadCartData()
  },

  removeItem: function (e) {
    const productId = e.currentTarget.dataset.id
    wx.showModal({
      title: '移除商品',
      content: '确定从购物车移除这款轻食吗？',
      confirmColor: '#2e7d32',
      success: res => {
        if (!res.confirm) return
        app.removeCartItem(productId)
        this.loadCartData()
      }
    })
  },

  clearCart: function () {
    wx.showModal({
      title: '清空购物车',
      content: '已选商品将全部移除，是否继续？',
      confirmColor: '#c94f3d',
      success: res => {
        if (!res.confirm) return
        app.clearCart()
        this.loadCartData()
      }
    })
  },

  goToMenu: function () {
    wx.switchTab({ url: '/pages/index/index' })
  },

  // 提交订单到 Supabase
  submitOrder: function () {
    if (this.data.submitting) return
    if (app.globalData.cart.length === 0) {
      wx.showToast({ title: '购物车是空的', icon: 'none' })
      return
    }
    const store = app.globalData.currentStore
    if (!store || !store.id) {
      wx.showToast({ title: '请先选择门店', icon: 'none' })
      return
    }
    const nameInput = (this.data.customerName || '').trim()
    if (!nameInput) {
      wx.showToast({ title: '请填写取餐人姓名', icon: 'none' })
      return
    }
    const method = this.data.methods[this.data.methodIndex]
    const deliveryAddress = (this.data.deliveryAddress || '').trim()
    if (method === '外卖' && !deliveryAddress) {
      wx.showToast({ title: '请填写配送地址', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: '提交中...', mask: true })

    const cartItems = app.globalData.cart
    const amount = app.globalData.totalAmount
    const profile = app.setProfile({ name: nameInput, address: deliveryAddress || app.globalData.profile.address })
    const rawNote = (this.data.note || '').trim()
    const note = method === '外卖' ? `配送地址：${deliveryAddress}${rawNote ? `；备注：${rawNote}` : ''}` : rawNote
    const customerName = `${nameInput}（${profile.memberId}）`

    // 1. 获取订单号
    supabase.nextOrderId().then(orderId => {
      // 2. 写入订单主表
      return supabase.createOrder({
        id: orderId,
        store_id: store.id,
        customer_name: customerName,
        amount: amount,
        status: '待处理',
        method: method,
        note: note
      }).then(() => orderId)
    }).then(orderId => {
      // 3. 批量写入订单明细
      const items = cartItems.map(item => ({
        order_id: orderId,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: Number(item.price)
      }))
      return supabase.createOrderItems(items).then(() => orderId)
    }).then(orderId => {
      // 4. 清空购物车
      app.addMyOrder(orderId)
      app.clearCart()
      this.setData({ submitting: false })
      wx.hideLoading()
      wx.showModal({
        title: '下单成功',
        content: `订单号：${orderId}\n金额：¥${amount.toFixed(2)}\n${method} · ${store.name}`,
        showCancel: false,
        success: function () {
          wx.switchTab({ url: '/pages/orders/orders' })
        }
      })
    }).catch(err => {
      console.error('submitOrder failed', err)
      this.setData({ submitting: false })
      wx.hideLoading()
      wx.showModal({
        title: '下单失败',
        content: err.message || '请稍后重试',
        showCancel: false
      })
    })
  }
})
