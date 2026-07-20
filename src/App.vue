<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { orderStore, createOrder as addOrder, formatMoney as formatOrderMoney, formatOrderItems, dashboardStatusClass } from './stores/orders'
import { memberStore, findMember } from './stores/members'
import AppIcon from './components/AppIcon.vue'
import Login from './components/Login.vue'
import RevenueChart from './components/RevenueChart.vue'
import StoreManagement from './components/StoreManagement.vue'
import ProductCatalog from './components/ProductCatalog.vue'
import EmployeeManagement from './components/EmployeeManagement.vue'
import MemberManagement from './components/MemberManagement.vue'
import MarketingManagement from './components/MarketingManagement.vue'
import OrderManagement from './components/OrderManagement.vue'
import InventoryManagement from './components/InventoryManagement.vue'
import SupplierManagement from './components/SupplierManagement.vue'

const navItems = [
  ['控制台', 'grid'], ['门店管理', 'store'], ['产品目录', 'box'], ['原料管理', 'leaf'],
  ['供应商', 'truck'], ['订单管理', 'cart'], ['会员系统', 'users'], ['营销活动', 'megaphone'],
  ['员工管理', 'badge'], ['系统日志', 'history'],
]

const stores = ['中心旗舰店', '滨江轻食店', '云谷外卖店']
const dateOptions = [
  { value: '2023年10月24日', label: '10月24日', meta: '今天' },
  { value: '2023年10月23日', label: '10月23日', meta: '昨天' },
  { value: '2023年10月22日', label: '10月22日', meta: '星期日' },
  { value: '2023年10月21日', label: '10月21日', meta: '星期六' },
]

const dateData = reactive({
  '2023年10月24日': { orders: '128', revenue: '¥4,250', products: '45', alerts: '3', chart: [760, 1120, 390, 1760, 1540, 3140, 3760] },
  '2023年10月23日': { orders: '114', revenue: '¥3,860', products: '45', alerts: '5', chart: [1540, 1880, 2050, 1730, 2840, 3060, 3550] },
  '2023年10月22日': { orders: '136', revenue: '¥4,580', products: '43', alerts: '2', chart: [2100, 1940, 2470, 2720, 2510, 3610, 4070] },
  '2023年10月21日': { orders: '142', revenue: '¥4,920', products: '44', alerts: '4', chart: [1900, 2270, 2140, 2960, 3190, 3880, 4270] },
})

const chartState = {
  14: [1420, 1680, 1760, 1510, 2240, 2460, 2180, 2780, 3040, 2860, 3380, 3650, 3420, 4120],
  30: [1280, 1490, 1370, 1880, 1720, 2100, 2380, 2260, 2640, 2490, 2840, 3110, 2980, 3270, 3510, 3360, 3720, 3480, 3940, 4210, 4020, 4380, 4260, 4510, 4780, 4620, 4950, 4820, 5160, 5380],
}

const rankingSets = {
  volume: [
    ['抹茶能量碗', '842 份', 100, '#087824'], ['牛油果高纤卷', '720 份', 86, '#299342'], ['藜麦田园沙拉', '615 份', 73, '#46a05c'], ['冷萃燕麦杯', '528 份', 63, '#62aa72'], ['浆果排毒思慕雪', '412 份', 49, '#7ab287'],
  ],
  revenue: [
    ['牛油果高纤卷', '¥21,600', 100, '#087824'], ['抹茶能量碗', '¥20,208', 94, '#299342'], ['藜麦田园沙拉', '¥17,220', 80, '#46a05c'], ['浆果排毒思慕雪', '¥12,360', 57, '#62aa72'], ['冷萃燕麦杯', '¥10,560', 49, '#7ab287'],
  ],
  growth: [
    ['浆果排毒思慕雪', '+32.6%', 100, '#087824'], ['冷萃燕麦杯', '+24.8%', 76, '#299342'], ['抹茶能量碗', '+18.2%', 56, '#46a05c'], ['藜麦田园沙拉', '+12.5%', 38, '#62aa72'], ['牛油果高纤卷', '+8.9%', 27, '#7ab287'],
  ],
}

const searchItems = [
  { label: '订单 #8821 · 张伟 James', icon: 'receipt' },
  { label: '抹茶能量碗 · 今日销量 842 份', icon: 'box' },
  { label: '牛油果高纤卷 · 今日销量 720 份', icon: 'box' },
  { label: '库存预警 · 牛油果剩余 8 份', icon: 'warning' },
  { label: '会员增长分析 · 本周新增 86 人', icon: 'users' },
  { label: '中心旗舰店 · 营业数据', icon: 'store' },
]

const AUTH_KEY = 'lightbites-auth'
const currentUser = ref(null)
try {
  const stored = localStorage.getItem(AUTH_KEY)
  if (stored) currentUser.value = JSON.parse(stored)
} catch (e) { /* ignore malformed auth cache */ }

function handleLogin(user) {
  currentUser.value = user
  localStorage.setItem(AUTH_KEY, JSON.stringify(user))
}

function logout() {
  currentUser.value = null
  localStorage.removeItem(AUTH_KEY)
  ElMessage({ message: '已安全退出登录', customClass: 'light-bites-message', duration: 2400 })
}

const activeSection = ref('控制台')
const sidebarOpen = ref(false)
const sidebarCollapsed = ref(false)
const selectedStore = ref('中心旗舰店')
const selectedDate = ref('2023年10月24日')
const currentRange = ref(7)
const rankingMode = ref('volume')
const searchQuery = ref('')
const searchFocused = ref(false)
const notificationVisible = ref(false)
const notificationsRead = ref(false)
const orderDialogVisible = ref(false)
const settingsVisible = ref(false)
const ordersVisible = ref(false)
const compactMode = ref(false)
const motionEnabled = ref(true)
const alertsEnabled = ref(true)
const orderFilter = ref('全部')

const orderForm = reactive({ customer: '', memberId: null, product: '抹茶能量碗', quantity: 1, method: '堂食', note: '' })

// 选择会员时自动带出姓名
function selectOrderMember(memberId) {
  orderForm.memberId = memberId
  const member = memberId ? findMember(memberId) : null
  if (member) orderForm.customer = member.name
}
const productPrices = { 抹茶能量碗: 45, 牛油果高纤卷: 36, 藜麦田园沙拉: 34, 冷萃燕麦杯: 28 }

const currentMetrics = computed(() => dateData[selectedDate.value])
const chartValues = computed(() => currentRange.value === 7 ? currentMetrics.value.chart : chartState[currentRange.value])
const chartLabels = computed(() => {
  if (currentRange.value === 7) return ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  return chartValues.value.map((_, index) => `${index + 1}日`)
})
const currentRanking = computed(() => rankingSets[rankingMode.value])
const latestOrders = computed(() => orderStore.orders.slice(0, 3))
const filteredOrders = computed(() => orderFilter.value === '全部' ? orderStore.orders : orderStore.orders.filter(order => order.status === orderFilter.value))
const searchResults = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return query ? searchItems.filter(item => item.label.toLowerCase().includes(query)).slice(0, 5) : []
})
const topSearchPlaceholder = computed(() => {
  if (activeSection.value === '门店管理') return '搜索门店名称...'
  if (activeSection.value === '产品目录') return '搜索产品、订单或库存...'
  if (['员工管理', '系统日志'].includes(activeSection.value)) return '搜索员工或日志...'
  if (activeSection.value === '会员系统') return '按手机号搜索会员...'
  if (activeSection.value === '营销活动') return '搜索营销活动...'
  if (activeSection.value === '订单管理') return '搜索订单、客户或商品...'
  if (activeSection.value === '原料管理') return '搜索原料名称...'
  if (activeSection.value === '供应商') return '搜索供应商...'
  return '搜索分析数据、订单或产品...'
})

function success(message) {
  ElMessage({ message, type: 'success', customClass: 'light-bites-message', duration: 2400 })
}

function selectNav(section) {
  sidebarOpen.value = false
  if (['控制台', '门店管理', '产品目录', '原料管理', '供应商', '订单管理', '会员系统', '营销活动', '员工管理', '系统日志'].includes(section)) {
    activeSection.value = section
    searchQuery.value = ''
    return
  }
  success(`${section}模块即将开放`)
}

function selectStore(store) {
  selectedStore.value = store
  success(`已切换至${store}`)
}

function selectDate(date) {
  selectedDate.value = date
  success(`已更新 ${date} 的营业数据`)
}

function selectSearch(item) {
  searchQuery.value = item.label
  searchFocused.value = false
  success(`已定位：${item.label}`)
}

function submitSearch() {
  if (searchQuery.value.trim()) success(`正在搜索“${searchQuery.value.trim()}”`)
}

function hideSearch() {
  window.setTimeout(() => { searchFocused.value = false }, 150)
}

function markAllRead() {
  notificationsRead.value = true
  success('所有通知已标为已读')
}

function decreaseQuantity() {
  orderForm.quantity = Math.max(1, orderForm.quantity - 1)
}

function increaseQuantity() {
  orderForm.quantity = Math.min(20, orderForm.quantity + 1)
}

function createOrder() {
  if (!orderForm.customer.trim()) {
    ElMessage({ message: '请输入顾客姓名', type: 'warning', customClass: 'light-bites-message', duration: 2400 })
    return
  }
  const total = productPrices[orderForm.product] * orderForm.quantity
  const order = addOrder({
    customer: orderForm.customer.trim(),
    items: [[orderForm.product, orderForm.quantity]],
    amount: total,
    method: orderForm.method,
    status: '待处理',
    memberId: orderForm.memberId,
  })
  dateData[selectedDate.value].orders = String(Number(dateData[selectedDate.value].orders) + 1)
  Object.assign(orderForm, { customer: '', memberId: null, product: '抹茶能量碗', quantity: 1, method: '堂食', note: '' })
  orderDialogVisible.value = false
  success(`订单 ${order.id} 已创建并进入待处理队列`)
}

function handleShortcut(event) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    document.querySelector('#searchInput')?.focus()
  }
  if (event.key === 'Escape') sidebarOpen.value = false
}

watch(compactMode, value => document.body.classList.toggle('compact', value))
watch(motionEnabled, value => document.body.classList.toggle('reduce-motion', !value))

window.addEventListener('keydown', handleShortcut)
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleShortcut)
  document.body.classList.remove('compact', 'reduce-motion')
})
</script>

<template>
  <svg class="icon-sprite" aria-hidden="true">
    <symbol id="i-grid" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></symbol>
    <symbol id="i-store" viewBox="0 0 24 24"><path d="M4 10v10h16V10M3 10l2-6h14l2 6M3 10c0 2 3 2 4.5 0 1.5 2 4.5 2 6 0 1.5 2 4.5 2 6 0M9 20v-6h6v6"/></symbol>
    <symbol id="i-box" viewBox="0 0 24 24"><path d="M3 7h18v14H3zM5 3h14l2 4H3zM9 11h6"/></symbol>
    <symbol id="i-leaf" viewBox="0 0 24 24"><path d="M19.5 4.5C13 4 7 8 7 14c0 3 2 5 5 5 6 0 8-6 7.5-14.5Z"/><path d="M5 21c2-5 5-8 10-11"/></symbol>
    <symbol id="i-truck" viewBox="0 0 24 24"><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7zM7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/></symbol>
    <symbol id="i-cart" viewBox="0 0 24 24"><path d="M3 4h2l2.5 11h10l3-8H6M9 20h.01M18 20h.01"/></symbol>
    <symbol id="i-users" viewBox="0 0 24 24"><path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 20v-2a4 4 0 0 0-3-3.87M16 2.13a4 4 0 0 1 0 7.75"/></symbol>
    <symbol id="i-megaphone" viewBox="0 0 24 24"><path d="m3 11 14-6v14L3 13zM17 9l4-2M17 15l4 2M7 14l2 6h3l-2-7"/></symbol>
    <symbol id="i-badge" viewBox="0 0 24 24"><path d="M9 4V2h6v2M5 6h14v15H5zM9 10h6M9 14h6M9 18h4"/></symbol>
    <symbol id="i-history" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2"/></symbol>
    <symbol id="i-plus" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></symbol>
    <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></symbol>
    <symbol id="i-bell" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></symbol>
    <symbol id="i-settings" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.55V21h-4v-.08A1.7 1.7 0 0 0 8.97 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.52-1.03H3v-4h.08A1.7 1.7 0 0 0 4.6 8.97a1.7 1.7 0 0 0-.34-1.88L4.2 7.03 7.03 4.2l.06.06A1.7 1.7 0 0 0 8.97 4.6 1.7 1.7 0 0 0 10 3.08V3h4v.08a1.7 1.7 0 0 0 1.03 1.52 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z"/></symbol>
    <symbol id="i-receipt" viewBox="0 0 24 24"><path d="M6 2v20l3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2zM9 9h6M9 13h6M9 17h4"/></symbol>
    <symbol id="i-money" viewBox="0 0 24 24"><path d="M3 6h18v12H3z"/><circle cx="12" cy="12" r="3"/><path d="M7 9H6v1M17 15h1v-1"/></symbol>
    <symbol id="i-clipboard" viewBox="0 0 24 24"><path d="M9 4h6l1 2h3v15H5V6h3zM9 14l2 2 4-5"/></symbol>
    <symbol id="i-warning" viewBox="0 0 24 24"><path d="m12 3 10 18H2zM12 9v5M12 18h.01"/></symbol>
    <symbol id="i-calendar" viewBox="0 0 24 24"><path d="M4 5h16v16H4zM8 2v6M16 2v6M4 10h16"/></symbol>
    <symbol id="i-chevron" viewBox="0 0 24 24"><path d="m8 10 4 4 4-4"/></symbol>
    <symbol id="i-more" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></symbol>
    <symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h14M14 7l5 5-5 5"/></symbol>
    <symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></symbol>
    <symbol id="i-close" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></symbol>
    <symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></symbol>
    <symbol id="i-lock" viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 15v2"/></symbol>
    <symbol id="i-cutlery" viewBox="0 0 24 24"><path d="M7 2v8a2 2 0 0 0 2 2 2 2 0 0 0 2-2V2M9 12v10M17 2c-1.7 0-3 2-3 5s1.3 4 3 4v11"/></symbol>
    <symbol id="i-user-plus" viewBox="0 0 24 24"><circle cx="9" cy="8" r="4"/><path d="M2 21v-1a6 6 0 0 1 6-6h3M18 11v6M15 14h6"/></symbol>
    <symbol id="i-piggy" viewBox="0 0 24 24"><path d="M3 12a6 6 0 0 1 6-6h4a6 6 0 0 1 5.7 4.1c.5.1 1.3.5 1.3 1.9v2c0 1-.7 1.3-1.2 1.4A6 6 0 0 1 16 19v2h-3v-1.6h-2V21H8v-2.1A6 6 0 0 1 5 15H4a1 1 0 0 1-1-1ZM13 6V3.5M16 11h.01"/></symbol>
    <symbol id="i-party" viewBox="0 0 24 24"><path d="m4 20 3-9 6 6-9 3ZM7 11l6 6M14 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 9l.6 1.4L21 11l-1.4.6L19 13l-.6-1.4L17 11l1.4-.6z"/></symbol>
    <symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></symbol>
    <symbol id="i-edit" viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4"/></symbol>
    <symbol id="i-filter" viewBox="0 0 24 24"><path d="M3 5h18l-7 8v5l-4 2v-7z"/></symbol>
    <symbol id="i-globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 4 6 4 9s-1 6-4 9c-3-3-4-6-4-9s1-6 4-9Z"/></symbol>
    <symbol id="i-download" viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M4 20h16"/></symbol>
    <symbol id="i-upload" viewBox="0 0 24 24"><path d="M12 15V3M7 8l5-5 5 5M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2"/></symbol>
    <symbol id="i-refresh" viewBox="0 0 24 24"><path d="M20 7v5h-5M4 17v-5h5M6.1 8a7 7 0 0 1 11.5-2.2L20 8M4 16l2.4 2.2A7 7 0 0 0 18 16"/></symbol>
  </svg>

  <Login v-if="!currentUser" @login="handleLogin" />

  <template v-else>
  <div class="app-shell">
    <aside id="sidebar" class="sidebar" :class="{ open: sidebarOpen, collapsed: sidebarCollapsed }" aria-label="主要导航">
      <div class="brand"><div class="brand-mark"><span>🥗</span></div><div class="brand-text"><strong>轻食点</strong><small>餐饮管理后台</small></div></div>
      <button class="sidebar-toggle" aria-label="切换侧边栏" @click="sidebarCollapsed = !sidebarCollapsed"><svg viewBox="0 0 24 24"><path d="m15 6-6 6 6 6"/></svg></button>
      <nav class="nav-list">
        <button v-for="([label, icon]) in navItems" :key="label" class="nav-item" :class="{ active: activeSection === label }" @click="selectNav(label)"><AppIcon :name="icon"/><span class="nav-label">{{ label }}</span></button>
      </nav>
      <el-button class="new-order-btn" @click="orderDialogVisible = true"><AppIcon name="plus"/><span class="btn-label">新建订单</span></el-button>
    </aside>
    <div class="mobile-backdrop" :class="{ open: sidebarOpen }" @click="sidebarOpen = false" />

    <main class="main-shell">
      <header class="topbar">
        <el-button class="mobile-menu-btn icon-button" circle aria-label="打开导航" @click="sidebarOpen = true"><AppIcon name="menu"/></el-button>
        <form class="search-box" role="search" @submit.prevent="submitSearch">
          <AppIcon name="search"/>
          <input id="searchInput" v-model="searchQuery" type="search" autocomplete="off" :placeholder="topSearchPlaceholder" :aria-label="topSearchPlaceholder" @focus="searchFocused = true" @blur="hideSearch" />
          <div v-show="searchFocused && searchQuery" class="search-results popover open" role="listbox">
            <button v-for="item in searchResults" :key="item.label" type="button" role="option" @mousedown.prevent="selectSearch(item)"><AppIcon :name="item.icon"/><span>{{ item.label }}</span></button>
            <button v-if="!searchResults.length" type="button" disabled><span>没有找到“{{ searchQuery }}”</span></button>
          </div>
        </form>

        <div class="topbar-actions">
          <el-dropdown v-if="activeSection === '控制台'" class="store-dropdown" trigger="click" popper-class="light-bites-dropdown" @command="selectStore">
            <el-button class="store-switch"><AppIcon name="store"/><span>{{ selectedStore }}</span></el-button>
            <template #dropdown><el-dropdown-menu><el-dropdown-item v-for="store in stores" :key="store" :command="store" :class="{ selected: selectedStore === store }"><span>{{ store }}</span><AppIcon v-if="selectedStore === store" name="check"/></el-dropdown-item></el-dropdown-menu></template>
          </el-dropdown>

          <el-popover v-model:visible="notificationVisible" placement="bottom-end" :width="360" trigger="click" popper-class="notification-popover">
            <template #reference><el-button class="icon-button notification-btn" circle aria-label="通知"><AppIcon name="bell"/><span v-if="alertsEnabled && !notificationsRead" class="notification-dot"/></el-button></template>
            <div class="popover-header"><div><strong>通知</strong><span>{{ notificationsRead ? '暂无未读' : '3 条未读' }}</span></div><button @click="markAllRead">全部已读</button></div>
            <button class="notice-item" :class="{ unread: !notificationsRead }"><span class="notice-icon warning"><AppIcon name="warning"/></span><span><strong>3 种原料库存不足</strong><small>建议今天完成补货 · 8 分钟前</small></span></button>
            <button class="notice-item" :class="{ unread: !notificationsRead }"><span class="notice-icon"><AppIcon name="receipt"/></span><span><strong>订单 #8826 等待确认</strong><small>来自小程序 · 12 分钟前</small></span></button>
            <button class="notice-item" :class="{ unread: !notificationsRead }"><span class="notice-icon"><AppIcon name="users"/></span><span><strong>新增 12 位会员</strong><small>今日会员增长表现良好</small></span></button>
          </el-popover>

          <el-button class="icon-button settings-button" circle aria-label="设置" @click="settingsVisible = true"><AppIcon name="settings"/></el-button>
          <span class="topbar-divider" />
          <el-dropdown trigger="click" popper-class="profile-dropdown" @command="$event === '退出登录' ? logout() : success(`已打开${$event}`)">
            <button class="profile-button"><span class="profile-copy"><strong>{{ currentUser?.name }}</strong><small>{{ currentUser?.role }}</small></span><span class="avatar">{{ currentUser?.name?.charAt(0) }}</span></button>
            <template #dropdown><el-dropdown-menu><el-dropdown-item command="个人资料">个人资料</el-dropdown-item><el-dropdown-item command="账号与权限">账号与权限</el-dropdown-item><el-dropdown-item divided command="退出登录" class="danger-text">退出登录</el-dropdown-item></el-dropdown-menu></template>
          </el-dropdown>
        </div>
      </header>

      <StoreManagement v-if="activeSection === '门店管理'" />
      <ProductCatalog v-else-if="activeSection === '产品目录'" :query="searchQuery" />
      <EmployeeManagement v-else-if="['员工管理', '系统日志'].includes(activeSection)" :query="searchQuery" :initial-tab="activeSection === '系统日志' ? 'logs' : 'employees'" @tab-change="activeSection = $event === 'logs' ? '系统日志' : '员工管理'" />
      <MemberManagement v-else-if="activeSection === '会员系统'" :query="searchQuery" />
      <MarketingManagement v-else-if="activeSection === '营销活动'" :query="searchQuery" />
      <OrderManagement v-else-if="activeSection === '订单管理'" :query="searchQuery" />
      <InventoryManagement v-else-if="activeSection === '原料管理'" :query="searchQuery" />
      <SupplierManagement v-else-if="activeSection === '供应商'" :query="searchQuery" />
      <div v-else class="dashboard-content">
        <section class="page-heading">
          <div><h1>管理概览</h1><p>欢迎回来！这是轻食点中心店的实时运营数据。</p></div>
          <el-dropdown trigger="click" popper-class="date-dropdown" @command="selectDate">
            <el-button class="date-button" :aria-label="selectedDate"><AppIcon name="calendar"/><span>{{ selectedDate }}</span><AppIcon class="chevron" name="chevron"/></el-button>
            <template #dropdown><el-dropdown-menu><el-dropdown-item v-for="date in dateOptions" :key="date.value" :command="date.value" :class="{ selected: selectedDate === date.value }"><span>{{ date.label }}</span><small>{{ date.meta }}</small></el-dropdown-item></el-dropdown-menu></template>
          </el-dropdown>
        </section>

        <section class="metrics-grid" aria-label="关键经营指标">
          <article class="metric-card"><span class="metric-icon green"><AppIcon name="receipt"/></span><div class="metric-body"><p>今日订单数</p><strong class="metric-value">{{ currentMetrics.orders }}</strong></div><span class="trend positive">+12%</span></article>
          <article class="metric-card"><span class="metric-icon neutral"><AppIcon name="money"/></span><div class="metric-body"><p>今日总营收</p><strong class="metric-value">{{ currentMetrics.revenue }}</strong></div><span class="trend positive">+8.4%</span></article>
          <article class="metric-card"><span class="metric-icon blue"><AppIcon name="clipboard"/></span><div class="metric-body"><p>在售单品数</p><strong class="metric-value">{{ currentMetrics.products }}</strong></div><span class="trend stable">持平</span></article>
          <article class="metric-card alert-card" tabindex="0" @click="notificationVisible = true"><span class="metric-icon red"><AppIcon name="warning"/></span><div class="metric-body"><p>库存预警</p><strong class="metric-value red-text">{{ currentMetrics.alerts }}</strong></div><span class="trend warning">预警</span></article>
        </section>

        <section class="analytics-grid">
          <article class="panel chart-panel">
            <div class="panel-heading"><h2>七日营收趋势</h2><div class="chart-actions"><span class="legend"><i/>营业收入</span><el-dropdown trigger="click" popper-class="range-dropdown" @command="currentRange = Number($event)"><el-button class="range-button">最近 {{ currentRange }} 天<AppIcon name="chevron"/></el-button><template #dropdown><el-dropdown-menu><el-dropdown-item v-for="range in [7,14,30]" :key="range" :command="range" :class="{ selected: currentRange === range }">最近 {{ range }} 天</el-dropdown-item></el-dropdown-menu></template></el-dropdown></div></div>
            <div class="chart-wrap"><RevenueChart :values="chartValues" :labels="chartLabels" :animated="motionEnabled" /></div>
          </article>

          <article class="panel ranking-panel">
            <div class="panel-heading"><h2>畅销排行榜 Top 5</h2><el-dropdown trigger="click" popper-class="ranking-dropdown" @command="rankingMode = $event"><el-button class="more-button" aria-label="排行设置"><AppIcon name="more"/></el-button><template #dropdown><el-dropdown-menu><el-dropdown-item command="volume" :class="{ selected: rankingMode === 'volume' }">按销量排序</el-dropdown-item><el-dropdown-item command="revenue" :class="{ selected: rankingMode === 'revenue' }">按营收排序</el-dropdown-item><el-dropdown-item command="growth" :class="{ selected: rankingMode === 'growth' }">按增长排序</el-dropdown-item></el-dropdown-menu></template></el-dropdown></div>
            <div class="ranking-list"><div v-for="([name,value,width,color]) in currentRanking" :key="name" class="ranking-item"><div class="ranking-copy"><strong>{{ name }}</strong><span>{{ value }}</span></div><div class="rank-track"><div class="rank-bar" :style="{ '--bar-width': `${width}%`, '--bar-color': color }"/></div></div></div>
          </article>
        </section>

        <section class="lower-grid">
          <article class="panel orders-panel">
            <div class="panel-heading"><h2>最新订单日志</h2><el-button class="view-all" text @click="ordersVisible = true">查看全部<AppIcon name="arrow"/></el-button></div>
            <el-table :data="latestOrders" class="orders-table" table-layout="fixed">
              <el-table-column prop="id" label="订单编号" min-width="92"/><el-table-column prop="customer" label="顾客姓名" min-width="82"/>
              <el-table-column label="订单状态" min-width="88"><template #default="{ row }"><span class="status" :class="dashboardStatusClass(row.status)">{{ row.status }}</span></template></el-table-column>
              <el-table-column label="交易金额" min-width="88" align="right"><template #default="{ row }">{{ formatOrderMoney(row.amount) }}</template></el-table-column>
            </el-table>
          </article>
          <article class="efficiency-card"><div><span class="efficiency-kicker">今日厨房状态</span><h2>厨房运营效能</h2><p>您的团队今日表现优异，运营效率达到 <strong>94%</strong>。请保持！</p></div><div class="efficiency-meter"><span style="--value:94%"/></div><div class="efficiency-actions"><el-button @click="success('今日排班：前厅 5 人，后厨 7 人，配送 3 人')">查看排班</el-button><el-button @click="success('出餐均时 8.6 分钟，较上周提升 11%')">效率详情<AppIcon name="arrow"/></el-button></div></article>
        </section>
      </div>
    </main>
  </div>

  <el-drawer v-model="orderDialogVisible" class="order-form-drawer" size="540px" :with-header="false">
    <div class="modal-header"><div><span class="eyebrow">快速创建</span><h2>新建订单</h2></div><el-button class="icon-button" circle aria-label="关闭" @click="orderDialogVisible = false"><AppIcon name="close"/></el-button></div>
    <el-form label-position="top" @submit.prevent="createOrder">
      <div class="form-row"><el-form-item label="顾客姓名"><el-input v-model="orderForm.customer" placeholder="输入顾客姓名"/></el-form-item><el-form-item label="关联会员"><el-select v-model="orderForm.memberId" placeholder="散客（不累计积分）" clearable popper-class="order-form-popper" :teleported="true" @change="selectOrderMember"><el-option v-for="member in memberStore.members" :key="member.id" :label="`${member.name} · ${member.tier}`" :value="member.id"/></el-select></el-form-item></div>
      <el-form-item label="选择产品"><el-select v-model="orderForm.product"><el-option v-for="product in Object.keys(productPrices)" :key="product" :label="product" :value="product"/></el-select></el-form-item>
      <div class="form-row"><el-form-item label="数量"><div class="quantity-stepper"><el-button class="quantity-step-button" aria-label="减少数量" :disabled="orderForm.quantity <= 1" @click="decreaseQuantity">−</el-button><el-input-number v-model="orderForm.quantity" :min="1" :max="20" :controls="false" aria-label="订单数量"/><el-button class="quantity-step-button" aria-label="增加数量" :disabled="orderForm.quantity >= 20" @click="increaseQuantity">+</el-button></div></el-form-item><el-form-item label="就餐方式"><el-select v-model="orderForm.method"><el-option v-for="method in ['堂食','外带','外卖']" :key="method" :label="method" :value="method"/></el-select></el-form-item></div>
      <el-form-item label="备注"><el-input v-model="orderForm.note" type="textarea" :rows="3" placeholder="过敏信息、口味偏好等"/></el-form-item>
      <div class="drawer-actions"><el-button @click="orderDialogVisible = false">取消</el-button><el-button type="primary" native-type="submit">创建订单</el-button></div>
    </el-form>
  </el-drawer>

  <el-drawer v-model="settingsVisible" class="settings-drawer" size="430px" :with-header="false">
    <div class="modal-header"><div><span class="eyebrow">偏好设置</span><h2>界面设置</h2></div><el-button class="icon-button" circle aria-label="关闭" @click="settingsVisible = false"><AppIcon name="close"/></el-button></div>
    <div class="settings-list"><label class="setting-row"><span><strong>紧凑布局</strong><small>减少卡片间距，展示更多数据</small></span><el-switch v-model="compactMode"/></label><label class="setting-row"><span><strong>数据动画</strong><small>切换筛选项时启用过渡效果</small></span><el-switch v-model="motionEnabled"/></label><label class="setting-row"><span><strong>运营提醒</strong><small>库存与订单异常时显示红点</small></span><el-switch v-model="alertsEnabled"/></label></div>
    <div class="drawer-note"><AppIcon name="leaf"/><p>猴猴美食总动员，香香香</p></div>
  </el-drawer>

  <el-drawer v-model="ordersVisible" class="orders-drawer" size="520px" :with-header="false">
    <div class="modal-header"><div><span class="eyebrow">订单中心</span><h2>今日全部订单</h2></div><el-button class="icon-button" circle aria-label="关闭" @click="ordersVisible = false"><AppIcon name="close"/></el-button></div>
    <div class="drawer-filter"><el-button v-for="filter in ['全部','待处理','制作中','待取餐','已完成']" :key="filter" :class="{ active: orderFilter === filter }" @click="orderFilter = filter">{{ filter }}</el-button></div>
    <div class="drawer-orders"><article v-for="order in filteredOrders" :key="order.id" class="drawer-order"><div><strong>{{ order.id }} · {{ order.customer }}</strong><small>{{ formatOrderItems(order.items) }}</small><small><span class="status" :class="dashboardStatusClass(order.status)">{{ order.status }}</span></small></div><span class="amount">{{ formatOrderMoney(order.amount) }}</span></article></div>
  </el-drawer>
  </template>
</template>
