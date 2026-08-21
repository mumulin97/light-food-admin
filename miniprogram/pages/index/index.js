const app = getApp()
const supabase = require('../../utils/supabase.js')

Page({
  data: {
    // 当前门店
    currentStore: null,
    // 全部门店
    stores: [],
    // 全部分类
    categories: ['全部'],
    currentCategory: '全部',
    // 菜品列表（已按分类过滤）
    products: [],
    // 所有菜品（原始）
    allProducts: [],
    // 加载状态
    loading: true,
    // 门店下拉是否展开
    storeDropdownOpen: false,
    searchOpen: false,
    searchKeyword: '',
    // 购物车
    cartTotalItems: 0,
    cartTotalAmount: 0
  },

  onLoad: function () {
    this.loadData()
  },

  onShow: function () {
    this.updateCartInfo()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0, cartCount: app.globalData.totalItems })
    }
  },

  // 下拉刷新
  onPullDownRefresh: function () {
    this.loadData().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 加载门店 + 菜品
  loadData: function () {
    this.setData({ loading: true })

    return Promise.all([
      app.loadStores(),
      supabase.fetchProducts()
    ]).then(([stores, products]) => {
      const currentStore = app.globalData.currentStore || (stores[0] || null)
      const processedProducts = (products || []).map(p => ({
        ...p,
        // stock <= 0 视为售罄
        soldOut: Number(p.stock) <= 0,
        // 营养信息显示
        nutritionText: `${p.calories} kcal · 蛋白质 ${p.protein}g`,
        // 价格保留 2 位
        priceText: Number(p.price).toFixed(2),
        cartQuantity: this.getCartQuantity(p.id)
      }))
      const categories = ['全部', ...Array.from(new Set(processedProducts.map(item => item.category).filter(Boolean)))]

      this.setData({
        stores,
        currentStore,
        categories,
        allProducts: processedProducts,
        products: this.filterProducts(processedProducts),
        loading: false
      })
      app.setCurrentStore(currentStore)
    }).catch(err => {
      console.error('loadData failed', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    })
  },

  // 按分类过滤
  filterProducts: function (products) {
    const category = this.data.currentCategory
    const keyword = this.data.searchKeyword.trim().toLowerCase()
    return products.filter(item => {
      const categoryMatched = category === '全部' || item.category === category
      const keywordMatched = !keyword || [item.name, item.category, item.tag].some(value => String(value || '').toLowerCase().includes(keyword))
      return categoryMatched && keywordMatched
    })
  },

  // 切换分类
  switchCategory: function (e) {
    const category = e.currentTarget.dataset.category
    this.setData({ currentCategory: category }, () => {
      this.setData({ products: this.filterProducts(this.data.allProducts) })
    })
  },

  toggleSearch: function () {
    this.setData({ searchOpen: !this.data.searchOpen, storeDropdownOpen: false })
  },

  onSearchInput: function (e) {
    this.setData({ searchKeyword: e.detail.value }, () => {
      this.setData({ products: this.filterProducts(this.data.allProducts) })
    })
  },

  clearSearch: function () {
    this.setData({ searchKeyword: '', searchOpen: false }, () => {
      this.setData({ products: this.filterProducts(this.data.allProducts) })
    })
  },

  // 展开/收起门店下拉
  toggleStoreDropdown: function () {
    this.setData({ storeDropdownOpen: !this.data.storeDropdownOpen, searchOpen: false })
  },

  // 收起门店下拉
  closeStoreDropdown: function () {
    this.setData({ storeDropdownOpen: false })
  },

  // 切换门店
  switchStore: function (e) {
    const storeId = e.currentTarget.dataset.id
    const store = this.data.stores.find(s => s.id === storeId)
    if (store) {
      this.setData({ currentStore: store, storeDropdownOpen: false })
      app.setCurrentStore(store)
      wx.showToast({ title: store.name, icon: 'none', duration: 1000 })
    }
  },

  updateCartInfo: function () {
    const allProducts = this.data.allProducts.map(item => ({ ...item, cartQuantity: this.getCartQuantity(item.id) }))
    this.setData({
      cartTotalItems: app.globalData.totalItems,
      cartTotalAmount: app.globalData.totalAmount.toFixed(2),
      allProducts,
      products: this.filterProducts(allProducts)
    })
  },

  getCartQuantity: function (productId) {
    const item = app.globalData.cart.find(product => String(product.id) === String(productId))
    return item ? Number(item.quantity) : 0
  },

  addToCart: function (e) {
    const productId = e.currentTarget.dataset.id
    const product = this.data.allProducts.find(item => item.id === productId)
    if (product && !product.soldOut) {
      app.addToCart(product)
      this.updateCartInfo()
      wx.showToast({
        title: '已加入购物车',
        icon: 'success',
        duration: 1000
      })
    }
  },

  decreaseCart: function (e) {
    app.removeFromCart(e.currentTarget.dataset.id)
    this.updateCartInfo()
  },

  goToCheckout: function () {
    if (app.globalData.totalItems === 0) {
      wx.showToast({ title: '购物车是空的', icon: 'none' })
      return
    }
    wx.switchTab({ url: '/pages/cart/cart' })
  }
})
