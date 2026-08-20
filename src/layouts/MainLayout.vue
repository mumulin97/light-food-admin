<script setup>
import { computed, inject, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { ElMessage } from 'element-plus'
import { navRoutes } from '../router/index.js'
import { orderStore, formatMoney as formatOrderMoney, formatOrderItems, dashboardStatusClass } from '../stores/orders'
import { memberStore, findMember } from '../stores/members'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { syncMemberStore } from '../services/membersApi'
import { fetchNotifications, markAllNotificationsRead } from '../services/notificationsApi'
import { localIsoDate, computeOrderAmount } from '../services/ordersApi'
import { fetchCampaigns, recordCampaignUsage } from '../services/campaignsApi'
import { bestCampaignForOrder, campaignStore, recordCampaignConversion, replaceCampaigns } from '../stores/campaigns'
import { useDashboard } from '../composables/useDashboard'
import { useOrders } from '../composables/useOrders'
import AppIcon from '../components/AppIcon.vue'
import AiAssistant from '../components/AiAssistant.vue'

const currentUser = inject('currentUser')
const logout = inject('authLogout')

const route = useRoute()
const router = useRouter()
const useBackend = isSupabaseConfigured()
const dashboard = useDashboard()
const { createOrder: persistNewOrder, creating: orderCreating } = useOrders()

const mockStores = ['中心旗舰店', '滨江轻食店', '云谷外卖店']
const selectedStoreLocal = ref('中心旗舰店')

const storeList = computed(() => (useBackend ? dashboard.stores.value : mockStores))

const selectedStore = computed({
  get: () => (useBackend ? dashboard.selectedStore.value : selectedStoreLocal.value),
  set: value => {
    if (useBackend) dashboard.selectedStore.value = value
    else selectedStoreLocal.value = value
  },
})

function isNavActive(item) {
  return route.name === item.name
}

const searchItems = [
  { label: '订单 #8821 · 张伟 James', icon: 'receipt' },
  { label: '抹茶能量碗 · 今日销量 842 份', icon: 'box' },
  { label: '库存预警 · 牛油果剩余 8 份', icon: 'warning' },
]

const sidebarOpen = ref(false)
const sidebarCollapsed = ref(false)
const searchQuery = ref('')
const searchFocused = ref(false)
const notificationVisible = ref(false)
const notifications = ref([])
const notificationsLoading = ref(false)

const unreadNotificationCount = computed(() => notifications.value.filter(item => !item.read).length)

const orderDialogVisible = ref(false)
const settingsVisible = ref(false)
const ordersVisible = ref(false)
const compactMode = ref(false)
const motionEnabled = ref(true)
const alertsEnabled = ref(true)
const orderFilter = ref('全部')
const orderFormLoading = ref(false)

const orderForm = reactive({ customer: '', memberId: null, product: '抹茶能量碗', quantity: 1, method: '堂食', note: '' })
const activeOrderMembers = computed(() => memberStore.members.filter(member => (member.status || '正常') === '正常'))

const productPrices = { 抹茶能量碗: 45, 牛油果高纤卷: 36, 藜麦田园沙拉: 34, 冷萃燕麦杯: 28 }
const productPriceMap = computed(() =>
  useBackend && Object.keys(dashboard.productPrices.value).length
    ? dashboard.productPrices.value
    : productPrices,
)
const productCatalog = computed(() => Object.keys(productPriceMap.value))
const selectedMemberLabel = computed(() => {
  const member = orderForm.memberId ? findMember(orderForm.memberId) : null
  return member ? `${member.name} · ${member.tier}` : '散客订单'
})
const orderPricing = computed(() => {
  try {
    const base = computeOrderAmount([[orderForm.product, orderForm.quantity]], productPriceMap.value)
    const member = orderForm.memberId ? findMember(orderForm.memberId) : null
    const offer = bestCampaignForOrder({ items: [[orderForm.product, orderForm.quantity]], amount: base, member, method: orderForm.method })
    return { base, offer, payable: offer?.payable ?? base }
  } catch {
    return { base: 0, offer: null, payable: 0 }
  }
})

const topSearchPlaceholder = computed(() => {
  const match = navRoutes.find(item => item.name === route.name)
  return match?.searchPlaceholder || route.meta.searchPlaceholder || '搜索...'
})

const isDashboard = computed(() => route.name === 'dashboard')

const consoleOrders = computed(() => (useBackend ? dashboard.dayOrders.value : orderStore.orders))
const filteredDrawerOrders = computed(() =>
  orderFilter.value === '全部'
    ? consoleOrders.value
    : consoleOrders.value.filter(order => order.status === orderFilter.value),
)

const aiBusinessContext = computed(() => ({
  dataSource: useBackend ? 'Supabase' : '本地演示数据',
  store: selectedStore.value,
  route: route.path,
  metrics: isDashboard.value && useBackend ? dashboard.metrics.value : {},
  latestOrders: consoleOrders.value.slice(0, 5).map(order => ({
    id: order.id,
    customer: order.customer,
    status: order.status,
    amount: Number(order.amount),
  })),
}))

const searchResults = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return query ? searchItems.filter(item => item.label.toLowerCase().includes(query)).slice(0, 5) : []
})

watch(
  () => route.path,
  (newPath, oldPath) => {
    searchQuery.value = ''
    sidebarOpen.value = false
    if (useBackend && oldPath === '/stores') {
      dashboard.refreshStoreList().catch(() => {})
    }
  },
)

watch(notificationVisible, visible => {
  if (visible && useBackend) loadNotifications()
})

async function loadNotifications() {
  if (!useBackend || !supabase) return
  notificationsLoading.value = true
  try {
    notifications.value = await fetchNotifications(supabase, currentUser.value?.id)
  } catch (e) {
    ElMessage({
      message: e.message || '加载通知失败（若提示缺少表，请执行 supabase/migrations/006_notifications.sql）',
      type: 'error',
      customClass: 'light-bites-message',
      duration: 3600,
    })
  } finally {
    notificationsLoading.value = false
  }
}

onMounted(() => {
  if (useBackend) {
    loadNotifications()
    loadCampaignRuntime()
  }
})

async function loadCampaignRuntime() {
  if (!useBackend || !supabase) return campaignStore.campaigns
  try {
    const rows = await fetchCampaigns(supabase)
    replaceCampaigns(rows)
    return rows
  } catch {
    return campaignStore.campaigns
  }
}

async function trackCampaignConversion(offer) {
  if (!offer?.campaign) return
  const campaign = recordCampaignConversion(offer.campaign.id)
  if (useBackend && supabase && campaign) {
    recordCampaignUsage(supabase, campaign).catch(() => {})
  }
}

function success(message, customClass = 'light-bites-message') {
  ElMessage({ message, type: 'success', customClass, duration: 2400 })
}

function handleProfileCommand(command) {
  if (command === '退出登录') {
    logout()
    return
  }
  router.push(command === '个人资料' ? '/profile' : '/account')
}

function onStoresChanged() {
  if (!useBackend || route.name !== 'dashboard') return
  dashboard.loadStoreList(true).then(() => dashboard.refresh())
}

function onProductsChanged() {
  if (!useBackend || route.name !== 'dashboard') return
  dashboard.refresh()
}

function onEmployeeTab(tab) {
  router.push(tab === 'logs' ? '/logs' : '/employees')
}

function selectStore(store) {
  selectedStore.value = store
  success(`已切换至${store}`)
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

async function markAllRead() {
  const unreadIds = notifications.value.filter(item => !item.read).map(item => item.id)
  if (!unreadIds.length) return

  if (useBackend && supabase && currentUser.value?.id) {
    try {
      await markAllNotificationsRead(supabase, currentUser.value.id, unreadIds)
    } catch (e) {
      ElMessage({ message: e.message || '标记已读失败', type: 'error', customClass: 'light-bites-message', duration: 3200 })
      return
    }
  }

  notifications.value.forEach(item => {
    item.read = true
  })
  success('所有通知已标为已读')
}

function selectOrderMember(memberId) {
  orderForm.memberId = memberId
  const member = memberId ? findMember(memberId) : null
  if (member) orderForm.customer = member.name
}

function syncOrderFormProduct() {
  const catalog = productCatalog.value
  if (!catalog.length) return
  if (!catalog.includes(orderForm.product)) orderForm.product = catalog[0]
}

async function openNewOrderDialog() {
  orderDialogVisible.value = true
  if (!useBackend || !supabase) {
    syncOrderFormProduct()
    return
  }
  orderFormLoading.value = true
  try {
    await Promise.all([
      dashboard.loadStoreList(),
      dashboard.ensureProductPrices(),
      syncMemberStore(supabase),
      loadCampaignRuntime(),
    ])
    syncOrderFormProduct()
  } catch (e) {
    ElMessage({ message: e.message || '加载下单数据失败', type: 'error', customClass: 'light-bites-message', duration: 3200 })
  } finally {
    orderFormLoading.value = false
  }
}

function decreaseQuantity() {
  orderForm.quantity = Math.max(1, orderForm.quantity - 1)
}

function increaseQuantity() {
  orderForm.quantity = Math.min(20, orderForm.quantity + 1)
}

async function createOrder() {
  if (orderCreating.value) return
  if (!orderForm.customer.trim()) {
    ElMessage({ message: '请输入顾客姓名', type: 'warning', customClass: 'light-bites-message', duration: 2400 })
    return
  }
  const selectedMember = orderForm.memberId ? findMember(orderForm.memberId) : null
  if (selectedMember && (selectedMember.status || '正常') !== '正常') {
    ElMessage({ message: '冻结或已注销会员不能关联新订单', type: 'warning', customClass: 'light-bites-message', duration: 2600 })
    return
  }
  const prices = productPriceMap.value
  let total
  try {
    total = computeOrderAmount([[orderForm.product, orderForm.quantity]], prices)
  } catch (e) {
    ElMessage({ message: e.message || '订单金额无效', type: 'warning', customClass: 'light-bites-message', duration: 3200 })
    return
  }
  const offer = bestCampaignForOrder({
    items: [[orderForm.product, orderForm.quantity]],
    amount: total,
    member: orderForm.memberId ? findMember(orderForm.memberId) : null,
    method: orderForm.method,
  })
  const payable = offer?.payable ?? total
  const campaignNote = offer ? `营销活动：${offer.campaign.name}（优惠 ¥${offer.discount.toFixed(2)}）` : ''
  const orderNote = [orderForm.note.trim(), campaignNote].filter(Boolean).join('；')
  if (useBackend) {
    try {
      await dashboard.loadStoreList()
      await dashboard.ensureProductPrices()
      const storeId = dashboard.storeIdByName.value[selectedStore.value]
      if (!storeId) {
        ElMessage({ message: '请先选择门店', type: 'warning', customClass: 'light-bites-message', duration: 2400 })
        return
      }
      const id = await persistNewOrder({
        storeId,
        customer: orderForm.customer.trim(),
        items: [[orderForm.product, orderForm.quantity]],
        amount: payable,
        method: orderForm.method,
        note: orderNote,
        memberId: orderForm.memberId,
        priceByProduct: productPriceMap.value,
      })
      dashboard.selectedDateIso.value = localIsoDate()
      await trackCampaignConversion(offer)
      Object.assign(orderForm, { customer: '', memberId: null, product: '抹茶能量碗', quantity: 1, method: '堂食', note: '' })
      orderDialogVisible.value = false
      success(
        offer ? `订单 ${id} 已创建 · 已使用「${offer.campaign.name}」优惠 ¥${offer.discount.toFixed(2)}` : `订单 ${id} 已创建 · 可在控制台与订单管理中查看`,
        'light-bites-message dashboard-glass-message',
      )
      dashboard.refresh().catch((refreshError) => {
        ElMessage({
          message: refreshError?.message || '订单已创建，经营数据稍后自动刷新',
          type: 'warning',
          customClass: 'light-bites-message',
          duration: 2800,
        })
      })
    } catch (e) {
      ElMessage({ message: e.message || '创建订单失败', type: 'error', customClass: 'light-bites-message', duration: 3200 })
    }
    return
  }
  try {
    const id = await persistNewOrder({
      customer: orderForm.customer.trim(),
      items: [[orderForm.product, orderForm.quantity]],
      amount: payable,
      method: orderForm.method,
      status: '待处理',
      memberId: orderForm.memberId,
      note: orderNote,
      campaignId: offer?.campaign.id || null,
      campaignName: offer?.campaign.name || '',
      campaignDiscount: offer?.discount || 0,
    })
    await trackCampaignConversion(offer)
    Object.assign(orderForm, { customer: '', memberId: null, product: '抹茶能量碗', quantity: 1, method: '堂食', note: '' })
    orderDialogVisible.value = false
    success(
      offer ? `订单 ${id} 已创建 · 已使用「${offer.campaign.name}」优惠 ¥${offer.discount.toFixed(2)}` : `订单 ${id} 已创建 · 已进入待处理队列`,
      'light-bites-message dashboard-glass-message',
    )
  } catch (e) {
    ElMessage({ message: e.message || '创建订单失败', type: 'error', customClass: 'light-bites-message', duration: 3200 })
  }
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
  <div class="app-shell dashboard-shell">
    <aside id="sidebar" class="sidebar" :class="{ open: sidebarOpen, collapsed: sidebarCollapsed }" aria-label="主要导航">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true">
          <img class="project-brand-logo" src="/brand-assets/monkey-kitchen-logo-v2.png" alt="" />
        </div>
        <div class="brand-text">
          <img class="project-brand-wordmark" src="/brand-assets/monkey-kitchen-wordmark-v5.png" alt="Monkey Kitchen" />
        </div>
      </div>
      <button class="sidebar-toggle" aria-label="切换侧边栏" @click="sidebarCollapsed = !sidebarCollapsed"><svg viewBox="0 0 24 24"><path d="m15 6-6 6 6 6"/></svg></button>
      <nav class="nav-list">
        <RouterLink
          v-for="item in navRoutes"
          :key="item.path"
          v-slot="{ navigate }"
          :to="item.path"
          custom
        >
          <button type="button" class="nav-item" :class="{ active: isNavActive(item), 'nav-group-start': item.name === 'orders' || item.name === 'employees' }" @click="navigate"><AppIcon :name="item.icon"/><span class="nav-label">{{ item.label }}</span></button>
        </RouterLink>
      </nav>
      <el-button class="new-order-btn" @click="openNewOrderDialog"><AppIcon name="plus"/><span class="btn-label">新建订单</span></el-button>
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
          <el-dropdown v-if="isDashboard" class="store-dropdown" trigger="click" popper-class="light-bites-dropdown" @command="selectStore">
            <el-button class="store-switch"><AppIcon name="store"/><span>{{ selectedStore }}</span></el-button>
            <template #dropdown><el-dropdown-menu><el-dropdown-item v-for="store in storeList" :key="store" :command="store" :class="{ selected: selectedStore === store }"><span>{{ store }}</span><AppIcon v-if="selectedStore === store" name="check"/></el-dropdown-item></el-dropdown-menu></template>
          </el-dropdown>

          <el-popover v-model:visible="notificationVisible" placement="bottom-end" :width="360" trigger="click" popper-class="notification-popover">
            <template #reference><el-button class="icon-button notification-btn" circle aria-label="通知"><AppIcon name="bell"/><span v-if="alertsEnabled && unreadNotificationCount > 0" class="notification-dot"/></el-button></template>
            <div class="popover-header"><div><strong>通知</strong><span>{{ unreadNotificationCount ? `${unreadNotificationCount} 条未读` : '暂无未读' }}</span></div><button type="button" @click="markAllRead">全部已读</button></div>
            <div v-if="notificationsLoading" class="notice-empty">加载中…</div>
            <template v-else>
              <button v-for="item in notifications" :key="item.id" type="button" class="notice-item" :class="{ unread: !item.read }"><span class="notice-icon" :class="item.iconClass"><AppIcon :name="item.icon"/></span><span><strong>{{ item.title }}</strong><small>{{ item.subtitle }}</small></span></button>
              <p v-if="!notifications.length" class="notice-empty">{{ useBackend ? '暂无通知' : '连接 Supabase 后从数据库加载通知' }}</p>
            </template>
          </el-popover>

          <el-button class="icon-button settings-button" circle aria-label="设置" @click="settingsVisible = true"><AppIcon name="settings"/></el-button>
          <span class="topbar-divider" />
          <el-dropdown trigger="click" popper-class="profile-dropdown" @command="handleProfileCommand">
            <button class="profile-button"><span class="profile-copy"><strong>{{ currentUser?.name }}</strong><small>{{ currentUser?.role }}</small></span><span class="avatar"><img :src="currentUser?.avatar || '/brand-assets/monkey-kitchen-avatar-front.png'" alt="用户头像" /></span></button>
            <template #dropdown><el-dropdown-menu><el-dropdown-item command="个人资料">个人资料</el-dropdown-item><el-dropdown-item command="账号与权限">账号与权限</el-dropdown-item><el-dropdown-item divided command="退出登录" class="danger-text">退出登录</el-dropdown-item></el-dropdown-menu></template>
          </el-dropdown>
        </div>
      </header>

      <router-view v-slot="{ Component }">
        <component
          :is="Component"
          :query="searchQuery"
          :motion-enabled="motionEnabled"
          @stores-changed="onStoresChanged"
          @products-changed="onProductsChanged"
          @tab-change="onEmployeeTab"
          @open-notifications="notificationVisible = true"
          @open-all-orders="ordersVisible = true"
        />
      </router-view>
    </main>
  </div>

  <el-drawer v-model="orderDialogVisible" class="order-form-drawer" size="540px" :with-header="false" append-to-body :close-on-click-modal="!orderCreating" :close-on-press-escape="!orderCreating">
    <div class="modal-header order-form-header"><div><h2>新建订单</h2><p>填写顾客与商品信息，创建后自动进入待处理队列。</p></div><el-button class="icon-button" circle aria-label="关闭" @click="orderDialogVisible = false"><AppIcon name="close"/></el-button></div>
    <div class="order-form-content">
      <div v-if="orderFormLoading" class="order-form-loading-status" role="status"><i aria-hidden="true"/><span>正在同步商品与会员数据</span></div>
      <div class="order-context-strip">
        <span class="order-context-icon"><AppIcon name="store"/></span>
        <div><small>接单门店</small><strong>{{ selectedStore }}</strong></div>
        <span class="order-context-status"><i/>创建后待处理</span>
      </div>
      <el-form label-position="top" class="order-create-form" @submit.prevent="createOrder">
        <section class="order-form-section">
          <header class="order-form-section-head"><div><strong>顾客信息</strong><small>关联会员后可累计积分并匹配活动</small></div><b>{{ selectedMemberLabel }}</b></header>
          <div class="form-row order-form-row-member">
            <el-form-item label="顾客姓名"><el-input v-model="orderForm.customer" placeholder="输入顾客姓名"/></el-form-item>
            <el-form-item label="关联会员" class="order-member-field">
              <el-select v-model="orderForm.memberId" placeholder="散客（不累计积分）" clearable filterable :max-height="240" placement="bottom-start" :teleported="true" popper-class="order-form-popper" :popper-options="{ strategy: 'fixed' }" @change="selectOrderMember">
                <el-option v-for="member in activeOrderMembers" :key="member.id" :label="`${member.name} · ${member.tier}`" :value="member.id"/>
              </el-select>
            </el-form-item>
          </div>
        </section>

        <section class="order-form-section">
          <header class="order-form-section-head"><div><strong>订单内容</strong><small>选择商品、数量和就餐方式</small></div></header>
          <el-form-item label="选择产品">
            <el-select v-model="orderForm.product" :max-height="240" :teleported="true" popper-class="order-form-popper" :popper-options="{ strategy: 'fixed' }">
              <el-option v-for="product in productCatalog" :key="product" :label="product" :value="product"/>
            </el-select>
          </el-form-item>
          <div class="form-row order-fulfillment-row">
            <el-form-item label="数量"><div class="quantity-stepper"><el-button class="quantity-step-button" aria-label="减少数量" :disabled="orderForm.quantity <= 1" @click="decreaseQuantity"><i class="quantity-glyph quantity-glyph--minus" aria-hidden="true"/></el-button><el-input-number v-model="orderForm.quantity" :min="1" :max="20" :controls="false" aria-label="订单数量"/><el-button class="quantity-step-button" aria-label="增加数量" :disabled="orderForm.quantity >= 20" @click="increaseQuantity"><i class="quantity-glyph quantity-glyph--plus" aria-hidden="true"/></el-button></div></el-form-item>
            <el-form-item label="就餐方式">
              <div class="order-method-tabs" role="group" aria-label="就餐方式"><button v-for="method in ['堂食','外带','外卖']" :key="method" type="button" :class="{ active: orderForm.method === method }" @click="orderForm.method = method">{{ method }}</button></div>
            </el-form-item>
          </div>
        </section>

        <section class="order-form-section order-note-section">
          <header class="order-form-section-head"><div><strong>订单备注</strong><small>记录过敏信息、口味偏好或配送要求</small></div></header>
          <el-form-item><el-input v-model="orderForm.note" type="textarea" :rows="2" placeholder="选填，例如：少冰、酱汁分装、花生过敏……" maxlength="120" show-word-limit/></el-form-item>
        </section>
      </el-form>
      <div v-if="orderPricing.base" class="order-campaign-pricing" :class="{ matched: orderPricing.offer }">
        <div class="order-pricing-copy"><span>{{ orderPricing.offer ? '已自动匹配活动' : '订单结算' }}</span><strong>{{ orderPricing.offer?.campaign.name || '当前暂无可用优惠' }}</strong></div>
        <div class="order-pricing-detail"><span><small>商品金额</small><b>¥{{ orderPricing.base.toFixed(2) }}</b></span><span v-if="orderPricing.offer" class="discount"><small>活动优惠</small><b>-¥{{ orderPricing.offer.discount.toFixed(2) }}</b></span><span class="payable"><small>应付金额</small><strong>¥{{ orderPricing.payable.toFixed(2) }}</strong></span></div>
      </div>
      <div class="drawer-actions order-form-drawer-actions"><el-button :disabled="orderCreating" @click="orderDialogVisible = false">取消</el-button><el-button type="primary" :loading="orderCreating" :disabled="orderCreating" @click="createOrder">创建订单 · ¥{{ orderPricing.payable.toFixed(2) }}</el-button></div>
    </div>
  </el-drawer>

  <el-drawer v-model="settingsVisible" class="settings-drawer" size="430px" :with-header="false">
    <div class="modal-header"><div><h2>界面设置</h2></div><el-button class="icon-button" circle aria-label="关闭" @click="settingsVisible = false"><AppIcon name="close"/></el-button></div>
    <div class="settings-list"><label class="setting-row"><span><strong>紧凑布局</strong><small>减少卡片间距，展示更多数据</small></span><el-switch v-model="compactMode"/></label><label class="setting-row"><span><strong>数据动画</strong><small>切换筛选项时启用过渡效果</small></span><el-switch v-model="motionEnabled"/></label><label class="setting-row"><span><strong>运营提醒</strong><small>库存与订单异常时显示红点</small></span><el-switch v-model="alertsEnabled"/></label></div>
  </el-drawer>

  <el-drawer v-model="ordersVisible" class="orders-drawer" size="520px" :with-header="false">
    <div class="modal-header"><div><h2>今日全部订单</h2></div><el-button class="icon-button" circle aria-label="关闭" @click="ordersVisible = false"><AppIcon name="close"/></el-button></div>
    <div class="drawer-filter"><el-button v-for="filter in ['全部','待处理','制作中','待取餐','已完成']" :key="filter" :class="{ active: orderFilter === filter }" @click="orderFilter = filter">{{ filter }}</el-button></div>
    <div class="drawer-orders"><article v-for="order in filteredDrawerOrders" :key="order.id" class="drawer-order"><div><strong>{{ order.id }} · {{ order.customer }}</strong><small>{{ formatOrderItems(order.items) }}</small><small><span class="status" :class="dashboardStatusClass(order.status)">{{ order.status }}</span></small></div><span class="amount">{{ formatOrderMoney(order.amount) }}</span></article></div>
  </el-drawer>

  <AiAssistant :context="aiBusinessContext" :user-name="currentUser?.name" />
</template>
