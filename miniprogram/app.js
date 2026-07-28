const supabase = require('./utils/supabase.js')
const config = require('./config/supabase.js')

App({
  globalData: {
    cart: [],
    totalAmount: 0,
    totalItems: 0,
    // 当前选中门店
    currentStore: null,
    // 所有门店
    stores: [],
    // 当前选中分类
    currentCategory: '全部'
  },

  onLaunch: function () {
    console.log('App Launch')
    // 预加载门店数据
    this.loadStores()
  },

  // 加载门店列表
  loadStores: function () {
    return supabase.fetchStores().then(stores => {
      this.globalData.stores = stores || []
      if (!this.globalData.currentStore && this.globalData.stores.length > 0) {
        this.globalData.currentStore = this.globalData.stores[0]
      }
      return this.globalData.stores
    }).catch(err => {
      console.error('loadStores failed', err)
      return []
    })
  },

  // 设置当前门店
  setCurrentStore: function (store) {
    this.globalData.currentStore = store
  },

  // ===== 购物车操作 =====
  addToCart: function (product) {
    const cart = this.globalData.cart
    const existingItem = cart.find(item => item.id === product.id)
    if (existingItem) {
      existingItem.quantity++
    } else {
      cart.push({ ...product, quantity: 1 })
    }
    this.updateCartTotal()
  },

  removeFromCart: function (productId) {
    const cart = this.globalData.cart
    const index = cart.findIndex(item => item.id === productId)
    if (index > -1) {
      if (cart[index].quantity > 1) {
        cart[index].quantity--
      } else {
        cart.splice(index, 1)
      }
    }
    this.updateCartTotal()
  },

  clearCart: function () {
    this.globalData.cart = []
    this.globalData.totalAmount = 0
    this.globalData.totalItems = 0
  },

  updateCartTotal: function () {
    const cart = this.globalData.cart
    this.globalData.totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)
    this.globalData.totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }
})
