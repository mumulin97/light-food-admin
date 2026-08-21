const app = getApp()

Page({
  data: {
    profile: {},
    currentStore: null,
    cartCount: 0,
    orderCount: 0
  },

  onShow: function () {
    this.syncData()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3, cartCount: app.globalData.totalItems })
    }
  },

  syncData: function () {
    this.setData({
      profile: app.globalData.profile || {},
      currentStore: app.globalData.currentStore,
      cartCount: app.globalData.totalItems,
      orderCount: (app.globalData.myOrderIds || []).length
    })
  },

  editName: function () {
    wx.showModal({
      title: '修改称呼',
      editable: true,
      placeholderText: '输入取餐人姓名',
      content: this.data.profile.name || '',
      confirmColor: '#2e7d32',
      success: result => {
        const name = (result.content || '').trim()
        if (!result.confirm || !name) return
        app.setProfile({ name })
        this.syncData()
        wx.showToast({ title: '称呼已更新', icon: 'success' })
      }
    })
  },

  editAddress: function () {
    wx.showModal({
      title: '常用配送地址',
      editable: true,
      placeholderText: '输入配送地址',
      content: this.data.profile.address || '',
      confirmColor: '#2e7d32',
      success: result => {
        if (!result.confirm) return
        app.setProfile({ address: (result.content || '').trim() })
        this.syncData()
        wx.showToast({ title: '地址已保存', icon: 'success' })
      }
    })
  },

  handleMenu: function (e) {
    const action = e.currentTarget.dataset.action
    if (action === 'orders') wx.switchTab({ url: '/pages/orders/orders' })
    if (action === 'cart') wx.switchTab({ url: '/pages/cart/cart' })
    if (action === 'store') wx.switchTab({ url: '/pages/index/index' })
    if (action === 'address') this.editAddress()
    if (action === 'contact') {
      const phone = this.data.currentStore && this.data.currentStore.phone
      if (!phone) wx.showToast({ title: '门店暂未配置电话', icon: 'none' })
      else wx.makePhoneCall({ phoneNumber: phone })
    }
    if (action === 'about') {
      wx.showModal({
        title: 'Monkey Kitchen',
        content: '专注新鲜现制、营养透明的轻食体验。订单、购物车与常用资料均会保存在当前设备。',
        showCancel: false,
        confirmColor: '#2e7d32'
      })
    }
  }
})
