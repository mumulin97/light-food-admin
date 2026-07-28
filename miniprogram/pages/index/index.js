const app = getApp()
const supabase = require('../../utils/supabase.js')

Page({
  data: {
    // 当前门店
    currentStore: null,
    // 全部门店
    stores: [],
    // 全部分类
    categories: ['全部', '沙拉类', '轻食碗', '营养昔', '生酮零食'],
    currentCategory: '全部',
    // 菜品列表（已按分类过滤）
    products: [],
    // 所有菜品（原始）
    allProducts: [],
    // 加载状态
    loading: true,
    // 门店下拉是否展开
    storeDropdownOpen: false,
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
      this.getTabBar().setData({ selected: 0 })
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
        priceText: Number(p.price).toFixed(2)
      }))

      this.setData({
        stores,
        currentStore,
        allProducts: processedProducts,
        products: this.filterByCategory(processedProducts, this.data.currentCategory),
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
  filterByCategory: function (products, category) {
    if (category === '全部') return products
    return products.filter(p => p.category === category)
  },

  // 切换分类
  switchCategory: function (e) {
    const category = e.currentTarget.dataset.category
    this.setData({
      currentCategory: category,
      products: this.filterByCategory(this.data.allProducts, category)
    })
  },

  // 展开/收起门店下拉
  toggleStoreDropdown: function () {
    this.setData({ storeDropdownOpen: !this.data.storeDropdownOpen })
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
    this.setData({
      cartTotalItems: app.globalData.totalItems,
      cartTotalAmount: app.globalData.totalAmount.toFixed(2)
    })
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

  goToCheckout: function () {
    if (app.globalData.totalItems === 0) {
      wx.showToast({ title: '购物车是空的', icon: 'none' })
      return
    }
    wx.switchTab({ url: '/pages/cart/cart' })
  }
})
