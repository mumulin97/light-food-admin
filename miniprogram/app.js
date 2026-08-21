const supabase = require('./utils/supabase.js')

const STORAGE = {
  cart: 'mk-mini-cart',
  storeId: 'mk-mini-store-id',
  profile: 'mk-mini-profile',
  orderIds: 'mk-mini-order-ids'
}

const DEFAULT_PROFILE = {
  name: '轻食客',
  memberId: '',
  phone: '',
  address: ''
}

function readStorage(key, fallback) {
  try {
    const value = wx.getStorageSync(key)
    return value === '' || value === undefined || value === null ? fallback : value
  } catch (error) {
    console.warn('readStorage failed', key, error)
    return fallback
  }
}

App({
  globalData: {
    cart: [],
    totalAmount: 0,
    totalItems: 0,
    currentStore: null,
    stores: [],
    currentCategory: '全部',
    profile: { ...DEFAULT_PROFILE },
    myOrderIds: []
  },

  onLaunch: function () {
    const cart = readStorage(STORAGE.cart, [])
    const profile = readStorage(STORAGE.profile, {})
    const memberId = profile.memberId || `MK${String(Date.now()).slice(-8)}`

    this.globalData.cart = Array.isArray(cart) ? cart : []
    this.globalData.profile = { ...DEFAULT_PROFILE, ...profile, memberId }
    this.globalData.myOrderIds = readStorage(STORAGE.orderIds, [])
    this.updateCartTotal(false)
    this.persistProfile()
    this.loadStores()
  },

  loadStores: function () {
    return supabase.fetchStores().then(stores => {
      this.globalData.stores = stores || []
      const savedStoreId = readStorage(STORAGE.storeId, '')
      const savedStore = this.globalData.stores.find(item => String(item.id) === String(savedStoreId))
      if (!this.globalData.currentStore) {
        this.globalData.currentStore = savedStore || this.globalData.stores[0] || null
      }
      return this.globalData.stores
    }).catch(err => {
      console.error('loadStores failed', err)
      return []
    })
  },

  setCurrentStore: function (store) {
    this.globalData.currentStore = store || null
    if (store && store.id) wx.setStorageSync(STORAGE.storeId, store.id)
  },

  setProfile: function (patch) {
    this.globalData.profile = { ...this.globalData.profile, ...patch }
    this.persistProfile()
    return this.globalData.profile
  },

  persistProfile: function () {
    wx.setStorageSync(STORAGE.profile, this.globalData.profile)
  },

  addMyOrder: function (orderId) {
    const ids = [orderId, ...this.globalData.myOrderIds.filter(id => id !== orderId)].slice(0, 50)
    this.globalData.myOrderIds = ids
    wx.setStorageSync(STORAGE.orderIds, ids)
  },

  addToCart: function (product, quantity = 1) {
    const amount = Math.max(1, Number(quantity) || 1)
    const cart = this.globalData.cart
    const existingItem = cart.find(item => String(item.id) === String(product.id))
    if (existingItem) existingItem.quantity += amount
    else cart.push({ ...product, quantity: amount })
    this.updateCartTotal()
  },

  removeFromCart: function (productId) {
    const cart = this.globalData.cart
    const index = cart.findIndex(item => String(item.id) === String(productId))
    if (index > -1) {
      if (cart[index].quantity > 1) cart[index].quantity--
      else cart.splice(index, 1)
    }
    this.updateCartTotal()
  },

  removeCartItem: function (productId) {
    this.globalData.cart = this.globalData.cart.filter(item => String(item.id) !== String(productId))
    this.updateCartTotal()
  },

  clearCart: function () {
    this.globalData.cart = []
    this.updateCartTotal()
  },

  updateCartTotal: function (persist = true) {
    const cart = this.globalData.cart
    this.globalData.totalItems = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
    this.globalData.totalAmount = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0)
    if (persist) wx.setStorageSync(STORAGE.cart, cart)
    this.syncTabBarBadge()
  },

  syncTabBarBadge: function () {
    if (typeof getCurrentPages !== 'function') return
    const pages = getCurrentPages()
    const current = pages[pages.length - 1]
    if (current && typeof current.getTabBar === 'function' && current.getTabBar()) {
      current.getTabBar().setData({ cartCount: this.globalData.totalItems })
    }
  }
})
