Component({
  data: {
    selected: 0,
    cartCount: 0,
    list: [
      {
        pagePath: '/pages/index/index',
        text: '点单',
        icon: '/assets/tab/order.svg',
        activeIcon: '/assets/tab/order-active.svg'
      },
      {
        pagePath: '/pages/cart/cart',
        text: '购物车',
        icon: '/assets/tab/cart.svg',
        activeIcon: '/assets/tab/cart-active.svg'
      },
      {
        pagePath: '/pages/orders/orders',
        text: '订单',
        icon: '/assets/tab/receipt.svg',
        activeIcon: '/assets/tab/receipt-active.svg'
      },
      {
        pagePath: '/pages/profile/profile',
        text: '我的',
        icon: '/assets/tab/profile.svg',
        activeIcon: '/assets/tab/profile-active.svg'
      }
    ]
  },
  methods: {
    switchTab: function (e) {
      const path = e.currentTarget.dataset.path
      wx.switchTab({ url: path })
    }
  }
})
