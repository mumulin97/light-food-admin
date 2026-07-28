Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: '/pages/index/index',
        text: '点单',
        icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOWFhMzlkIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTMgMTFoMTgiLz48cGF0aCBkPSJNNSAxMWE3IDcgMCAwIDAgMTQgMCIvPjxwYXRoIGQ9Ik0xMSAzYy0xLjIgMS0xLjIgMi4yIDAgMy4yIi8+PHBhdGggZD0iTTE1IDNjLTEgLjgtMSAxLjggMCAyLjYiLz48L3N2Zz4=',
        activeIcon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMmU3ZDMyIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTMgMTFoMTgiLz48cGF0aCBkPSJNNSAxMWE3IDcgMCAwIDAgMTQgMCIvPjxwYXRoIGQ9Ik0xMSAzYy0xLjIgMS0xLjIgMi4yIDAgMy4yIi8+PHBhdGggZD0iTTE1IDNjLTEgLjgtMSAxLjggMCAyLjYiLz48L3N2Zz4='
      },
      {
        pagePath: '/pages/cart/cart',
        text: '购物车',
        icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOWFhMzlkIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iOSIgY3k9IjIwIiByPSIxLjQiLz48Y2lyY2xlIGN4PSIxOCIgY3k9IjIwIiByPSIxLjQiLz48cGF0aCBkPSJNMi41IDMuNUg1bDIuMiAxMWExLjMgMS4zIDAgMCAwIDEuMyAxaDguNmExLjMgMS4zIDAgMCAwIDEuMy0xTDIxIDdINiIvPjwvc3ZnPg==',
        activeIcon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMmU3ZDMyIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iOSIgY3k9IjIwIiByPSIxLjQiLz48Y2lyY2xlIGN4PSIxOCIgY3k9IjIwIiByPSIxLjQiLz48cGF0aCBkPSJNMi41IDMuNUg1bDIuMiAxMWExLjMgMS4zIDAgMCAwIDEuMyAxaDguNmExLjMgMS4zIDAgMCAwIDEuMy0xTDIxIDdINiIvPjwvc3ZnPg=='
      },
      {
        pagePath: '/pages/orders/orders',
        text: '订单',
        icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOWFhMzlkIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTYgMi41aDEydjE5bC0yLjItMS42LTIgMS42LTEuOC0xLjYtMS44IDEuNi0yLTEuNkw2IDIxLjV6Ii8+PHBhdGggZD0iTTkuNSA4aDVNOS41IDEyaDUiLz48L3N2Zz4=',
        activeIcon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMmU3ZDMyIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTYgMi41aDEydjE5bC0yLjItMS42LTIgMS42LTEuOC0xLjYtMS44IDEuNi0yLTEuNkw2IDIxLjV6Ii8+PHBhdGggZD0iTTkuNSA4aDVNOS41IDEyaDUiLz48L3N2Zz4='
      },
      {
        pagePath: '/pages/profile/profile',
        text: '我的',
        icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOWFhMzlkIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSI4IiByPSI0Ii8+PHBhdGggZD0iTTQuNSAyMC41YTcuNSA3LjUgMCAwIDEgMTUgMCIvPjwvc3ZnPg==',
        activeIcon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMmU3ZDMyIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSI4IiByPSI0Ii8+PHBhdGggZD0iTTQuNSAyMC41YTcuNSA3LjUgMCAwIDEgMTUgMCIvPjwvc3ZnPg=='
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
