<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import AppIcon from '../components/AppIcon.vue'
import RevenueChart from '../components/RevenueChart.vue'
import { useDashboard } from '../composables/useDashboard'
import { computeAlertTrend, computeTrendPercent } from '../services/dashboard'
import { orderStore, formatMoney as formatOrderMoney, dashboardStatusClass } from '../stores/orders'
import { inventoryStore } from '../stores/inventory'
import { campaignStore } from '../stores/campaigns'
import { isSupabaseConfigured } from '../lib/supabase'

defineProps({
  motionEnabled: { type: Boolean, default: true },
})

const emit = defineEmits(['open-notifications', 'open-all-orders'])

const useBackend = isSupabaseConfigured()
const dashboard = useDashboard()
const router = useRouter()

const mockDateOptions = [
  { value: '2023年10月24日', label: '10月24日', meta: '今天' },
  { value: '2023年10月23日', label: '10月23日', meta: '昨天' },
  { value: '2023年10月22日', label: '10月22日', meta: '星期日' },
  { value: '2023年10月21日', label: '10月21日', meta: '星期六' },
]

const dateData = {
  '2023年10月24日': { orders: '128', revenue: '¥4,250', products: '45', alerts: '3', chart: [760, 1120, 390, 1760, 1540, 3140, 3760] },
  '2023年10月23日': { orders: '114', revenue: '¥3,860', products: '45', alerts: '5', chart: [1540, 1880, 2050, 1730, 2840, 3060, 3550] },
  '2023年10月22日': { orders: '136', revenue: '¥4,580', products: '43', alerts: '2', chart: [2100, 1940, 2470, 2720, 2510, 3610, 4070] },
  '2023年10月21日': { orders: '142', revenue: '¥4,920', products: '44', alerts: '4', chart: [1900, 2270, 2140, 2960, 3190, 3880, 4270] },
}

const chartState = {
  14: [1420, 1680, 1760, 1510, 2240, 2460, 2180, 2780, 3040, 2860, 3380, 3650, 3420, 4120],
  30: [1280, 1490, 1370, 1880, 1720, 2100, 2380, 2260, 2640, 2490, 2840, 3110, 2980, 3270, 3510, 3360, 3720, 3480, 3940, 4210, 4020, 4380, 4260, 4510, 4780, 4620, 4950, 4820, 5160, 5380],
}

const rankingSets = {
  volume: [
    ['抹茶能量碗', '842 份', 100, '#28b879'], ['牛油果高纤卷', '720 份', 86, '#54a8ff'], ['藜麦田园沙拉', '615 份', 73, '#8b78ef'], ['冷萃燕麦杯', '528 份', 63, '#f3a74b'], ['浆果排毒思慕雪', '412 份', 49, '#45c7bf'],
  ],
  revenue: [
    ['牛油果高纤卷', '¥21,600', 100, '#28b879'], ['抹茶能量碗', '¥20,208', 94, '#54a8ff'], ['藜麦田园沙拉', '¥17,220', 80, '#8b78ef'], ['浆果排毒思慕雪', '¥12,360', 57, '#f3a74b'], ['冷萃燕麦杯', '¥10,560', 49, '#45c7bf'],
  ],
  growth: [
    ['浆果排毒思慕雪', '+32.6%', 100, '#28b879'], ['冷萃燕麦杯', '+24.8%', 76, '#54a8ff'], ['抹茶能量碗', '+18.2%', 56, '#8b78ef'], ['藜麦田园沙拉', '+12.5%', 38, '#f3a74b'], ['牛油果高纤卷', '+8.9%', 27, '#45c7bf'],
  ],
}

const selectedDateLocal = ref('2023年10月24日')
const currentRangeLocal = ref(7)
const rankingModeLocal = ref('volume')
const kitchenDrawerVisible = ref(false)
const kitchenDrawerView = ref('schedule')

const kitchenSchedule = [
  { time: '07:30–11:30', name: '早餐备餐', team: '马库斯 · 林晓雯等 4 人', status: '进行中', tone: 'active' },
  { time: '10:30–14:30', name: '午市高峰', team: '萨拉 · 陈大卫等 6 人', status: '已就绪', tone: 'ready' },
  { time: '14:00–18:00', name: '下午轮值', team: '周子航 · 王雅琪等 3 人', status: '待交接', tone: 'pending' },
  { time: '17:30–21:30', name: '晚市收尾', team: '艾米丽 · 诺亚等 4 人', status: '未开始', tone: 'muted' },
]

const efficiencyIndicators = [
  { label: '出餐及时率', value: 96, note: '目标 92%', tone: 'mint' },
  { label: '备餐完成度', value: 92, note: '11 / 12 项', tone: 'blue' },
  { label: '人效利用率', value: 94, note: '较昨日 +6%', tone: 'amber' },
]

const selectedDateLabel = computed(() =>
  useBackend ? dashboard.selectedDateLabel.value : selectedDateLocal.value,
)

const selectedDateKey = computed(() =>
  useBackend ? dashboard.selectedDateIso.value : selectedDateLocal.value,
)

const dateOptionsList = computed(() => (useBackend ? dashboard.dateOptions.value : mockDateOptions))

const currentRange = computed({
  get: () => (useBackend ? dashboard.currentRange.value : currentRangeLocal.value),
  set: value => {
    if (useBackend) dashboard.currentRange.value = value
    else currentRangeLocal.value = value
  },
})

const rankingMode = computed({
  get: () => (useBackend ? dashboard.rankingMode.value : rankingModeLocal.value),
  set: value => {
    if (useBackend) dashboard.rankingMode.value = value
    else rankingModeLocal.value = value
  },
})

const currentMetrics = computed(() =>
  useBackend ? dashboard.metrics.value : dateData[selectedDateLocal.value],
)

const revenueDisplay = computed(() => {
  const raw = String(currentMetrics.value?.revenue ?? '¥0').trim()
  const currency = raw.match(/^[¥￥$€£]/)?.[0] || '¥'
  const amount = raw.replace(/^[¥￥$€£]\s*/, '') || '0'
  return { currency, amount }
})

function parseMetricNumber(field, raw) {
  if (field === 'revenue') return Number(String(raw).replace(/[¥,]/g, '')) || 0
  return Number(raw) || 0
}

function previousMockDateKey(key) {
  const keys = mockDateOptions.map(option => option.value)
  const index = keys.indexOf(key)
  return index >= 0 && index < keys.length - 1 ? keys[index + 1] : null
}

const currentMetricTrends = computed(() => {
  if (useBackend) return dashboard.metricTrends.value
  const key = selectedDateLocal.value
  const current = dateData[key]
  const prevKey = previousMockDateKey(key)
  if (!current || !prevKey) {
    return {
      orders: { label: '—', tone: 'stable' },
      revenue: { label: '—', tone: 'stable' },
      products: { label: '—', tone: 'stable' },
      alerts: { label: '—', tone: 'stable' },
    }
  }
  const previous = dateData[prevKey]
  return {
    orders: computeTrendPercent(
      parseMetricNumber('orders', current.orders),
      parseMetricNumber('orders', previous.orders),
    ),
    revenue: computeTrendPercent(
      parseMetricNumber('revenue', current.revenue),
      parseMetricNumber('revenue', previous.revenue),
    ),
    products: computeTrendPercent(
      parseMetricNumber('products', current.products),
      parseMetricNumber('products', previous.products),
    ),
    alerts: computeAlertTrend(
      parseMetricNumber('alerts', current.alerts),
      parseMetricNumber('alerts', previous.alerts),
    ),
  }
})

const chartValues = computed(() => {
  if (useBackend) return dashboard.chartValues.value
  const metrics = dateData[selectedDateLocal.value]
  return currentRangeLocal.value === 7 ? metrics.chart : chartState[currentRangeLocal.value]
})

const chartLabels = computed(() => {
  const range = useBackend ? dashboard.currentRange.value : currentRangeLocal.value
  if (range === 7) return ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  return chartValues.value.map((_, index) => `${index + 1}日`)
})

const currentRanking = computed(() =>
  useBackend ? dashboard.ranking.value : rankingSets[rankingModeLocal.value],
)

const hasRankingData = computed(() => (currentRanking.value?.length ?? 0) > 0)

const consoleOrders = computed(() => (useBackend ? dashboard.dayOrders.value : orderStore.orders))
const latestOrders = computed(() => consoleOrders.value.slice(0, 3))
const pendingOrderCount = computed(() =>
  consoleOrders.value.filter(order => ['待处理', '制作中', '待取餐'].includes(order.status)).length,
)
const lowStockIngredients = computed(() =>
  inventoryStore.ingredients.filter(item => Number(item.stock) <= Number(item.threshold)),
)
const linkedSupplierCount = computed(() =>
  new Set(lowStockIngredients.value.map(item => item.supplier).filter(Boolean)).size,
)
const activeCampaignCount = computed(() =>
  campaignStore.campaigns.filter(campaign => campaign.enabled && !campaign.scheduled).length,
)
const closureItems = computed(() => [
  { key: 'orders', label: '订单处理', value: pendingOrderCount.value, unit: '笔待推进', icon: 'cart', route: '/orders', tone: 'blue' },
  { key: 'inventory', label: '库存响应', value: parseMetricNumber('alerts', currentMetrics.value?.alerts), unit: '项预警', icon: 'warning', route: '/inventory', tone: 'amber' },
  { key: 'suppliers', label: '供应协同', value: linkedSupplierCount.value, unit: '家需联动', icon: 'truck', route: '/suppliers', tone: 'mint' },
  { key: 'marketing', label: '活动承接', value: activeCampaignCount.value, unit: '个投放中', icon: 'megaphone', route: '/marketing', tone: 'violet' },
])
const closureIssueCount = computed(() => pendingOrderCount.value + parseMetricNumber('alerts', currentMetrics.value?.alerts))
const dashboardLoading = dashboard.loading
const dashboardError = dashboard.error

let bootstrapped = false

onMounted(async () => {
  if (!useBackend) return
  await dashboard.loadStoreList()
  bootstrapped = true
  await dashboard.refresh()
})

watch(
  () => [
    dashboard.selectedStore.value,
    dashboard.selectedDateIso.value,
    dashboard.currentRange.value,
    dashboard.rankingMode.value,
  ],
  () => {
    if (useBackend && bootstrapped) dashboard.refresh()
  },
)

function selectDate(date) {
  if (useBackend) dashboard.selectedDateIso.value = date
  else selectedDateLocal.value = date
  ElMessage({
    message: `已更新 ${useBackend ? dashboard.selectedDateLabel.value : date} 的营业数据`,
    type: 'success',
    customClass: 'light-bites-message',
    duration: 2400,
  })
}

function openKitchenDrawer(view) {
  kitchenDrawerView.value = view
  kitchenDrawerVisible.value = true
}

defineExpose({
  refresh: () => dashboard.refresh(),
  reloadStores: force => dashboard.loadStoreList(force),
})
</script>

<template>
  <div
    class="dashboard-content"
    v-loading="useBackend && dashboardLoading"
    element-loading-text="正在同步经营数据"
  >
    <p v-if="useBackend && dashboardError" class="dashboard-error" role="alert">{{ dashboardError }}</p>
    <section class="page-heading">
      <div><h1>管理概览</h1><p>实时掌握门店经营全局，监控营收趋势与运营效能。</p></div>
      <el-dropdown trigger="click" popper-class="date-dropdown" @command="selectDate">
        <el-button class="date-button" :aria-label="selectedDateLabel"><AppIcon name="calendar"/><span>{{ selectedDateLabel }}</span><AppIcon class="chevron" name="chevron"/></el-button>
        <template #dropdown><el-dropdown-menu><el-dropdown-item v-for="date in dateOptionsList" :key="date.value" :command="date.value" :class="{ selected: selectedDateKey === date.value }"><span>{{ date.label }}</span><small>{{ date.meta }}</small></el-dropdown-item></el-dropdown-menu></template>
      </el-dropdown>
    </section>

    <section class="metrics-grid" aria-label="关键经营指标">
      <article class="efficiency-card metric-card metric-card--efficiency">
        <img class="kitchen-tools-art" src="/dashboard-assets/kitchen-tools-transparent.png" alt="" aria-hidden="true" />
        <span class="efficiency-kicker">今日厨房状态</span>
        <h2>厨房运营效能</h2>
        <p>您的团队今日表现优异，运营效率达到 <strong>94%</strong>。请保持！</p>
        <div class="efficiency-meter"><span style="--value:94%"/></div>
        <div class="efficiency-actions">
          <el-button class="efficiency-btn" @click="openKitchenDrawer('schedule')">查看排班</el-button>
          <el-button class="efficiency-btn efficiency-btn--primary" @click="openKitchenDrawer('efficiency')">效率详情 <AppIcon name="arrow"/></el-button>
        </div>
      </article>
      <article class="metric-card metric-card--orders">
        <div class="metric-card-head"><span class="metric-icon green"><AppIcon name="receipt"/></span><div class="metric-body"><p>今日订单数</p><strong class="metric-value">{{ currentMetrics.orders }}</strong></div><span class="trend" :class="currentMetricTrends.orders.tone">{{ currentMetricTrends.orders.label }}</span></div>
        <img class="metric-visual" src="/dashboard-assets/console1-transparent.png" alt="" />
      </article>
      <article class="metric-card metric-card--revenue">
        <div class="metric-card-head"><span class="metric-icon neutral"><AppIcon name="money"/></span><div class="metric-body"><p>今日总营收</p><strong class="metric-value revenue-value"><span class="revenue-currency">{{ revenueDisplay.currency }}</span><span class="revenue-amount">{{ revenueDisplay.amount }}</span></strong></div><span class="trend" :class="currentMetricTrends.revenue.tone">{{ currentMetricTrends.revenue.label }}</span></div>
        <img class="metric-visual" src="/dashboard-assets/console2-transparent-final.png" alt="" />
      </article>
      <article class="metric-card metric-card--products">
        <div class="metric-card-head"><span class="metric-icon blue"><AppIcon name="clipboard"/></span><div class="metric-body"><p>在售单品数</p><strong class="metric-value">{{ currentMetrics.products }}</strong></div><span class="trend" :class="currentMetricTrends.products.tone">{{ currentMetricTrends.products.label }}</span></div>
        <img class="metric-visual" src="/dashboard-assets/console3-transparent.png" alt="" />
      </article>
      <article class="metric-card metric-card--alerts alert-card" tabindex="0" @click="emit('open-notifications')">
        <div class="metric-card-head"><span class="metric-icon red"><AppIcon name="warning"/></span><div class="metric-body"><p>库存预警</p><strong class="metric-value red-text">{{ currentMetrics.alerts }}</strong></div><span class="trend" :class="currentMetricTrends.alerts.tone">{{ currentMetricTrends.alerts.label }}</span></div>
        <img class="metric-visual" src="/dashboard-assets/console4-transparent.png" alt="" />
      </article>
    </section>

    <section class="analytics-grid">
      <article class="panel chart-panel">
        <div class="panel-heading"><h2>七日营收趋势</h2><div class="chart-actions"><el-dropdown trigger="click" popper-class="range-dropdown" @command="currentRange = Number($event)"><el-button class="range-button"><span class="range-button-label">最近 {{ currentRange }} 天</span><AppIcon name="chevron"/></el-button><template #dropdown><el-dropdown-menu><el-dropdown-item v-for="range in [7,14,30]" :key="range" :command="range" :class="{ selected: currentRange === range }">最近 {{ range }} 天</el-dropdown-item></el-dropdown-menu></template></el-dropdown></div></div>
        <div class="chart-wrap"><RevenueChart :values="chartValues" :labels="chartLabels" :animated="motionEnabled" /></div>
      </article>
      <article class="panel ranking-panel">
        <div class="panel-heading"><h2>畅销排行榜 Top 5</h2><el-dropdown trigger="click" popper-class="ranking-dropdown" @command="rankingMode = $event"><el-button class="more-button" aria-label="排行设置"><AppIcon name="more"/></el-button><template #dropdown><el-dropdown-menu><el-dropdown-item command="volume" :class="{ selected: rankingMode === 'volume' }">按销量排序</el-dropdown-item><el-dropdown-item command="revenue" :class="{ selected: rankingMode === 'revenue' }">按营收排序</el-dropdown-item><el-dropdown-item command="growth" :class="{ selected: rankingMode === 'growth' }">按增长排序</el-dropdown-item></el-dropdown-menu></template></el-dropdown></div>
        <div v-if="hasRankingData" class="ranking-list"><div v-for="([name,value,width,color]) in currentRanking" :key="name" class="ranking-item" :style="{ '--rank-color': color }"><div class="ranking-copy"><strong>{{ name }}</strong><span>{{ value }}</span></div><div class="rank-track"><div class="rank-bar" :style="{ '--bar-width': `${width}%` }"/></div></div></div>
        <div v-else class="ranking-empty" role="status">
          <AppIcon name="box"/>
          <p>暂无畅销数据</p>
          <small>当前日期或门店还没有可统计的订单，请切换日期、门店或稍后再看。</small>
        </div>
      </article>
    </section>

    <section class="lower-grid">
      <article class="panel orders-panel">
        <div class="panel-heading"><h2>最新订单日志</h2><el-button class="view-all" text @click="emit('open-all-orders')">查看全部<AppIcon name="arrow"/></el-button></div>
        <el-table :data="latestOrders" class="orders-table" table-layout="fixed" empty-text="暂无订单数据">
          <el-table-column prop="id" label="订单编号" min-width="92"><template #default="{ row }"><span class="order-log-id">{{ row.id }}</span></template></el-table-column>
          <el-table-column prop="customer" label="顾客姓名" min-width="82"><template #default="{ row }"><span class="order-log-customer">{{ row.customer }}</span></template></el-table-column>
          <el-table-column label="订单状态" min-width="88"><template #default="{ row }"><span class="status" :class="dashboardStatusClass(row.status)">{{ row.status }}</span></template></el-table-column>
          <el-table-column label="交易金额" min-width="88" align="right"><template #default="{ row }"><strong class="order-log-amount">{{ formatOrderMoney(row.amount) }}</strong></template></el-table-column>
        </el-table>
        <img class="order-receipts-art" src="/dashboard-assets/order-receipts-transparent.png" alt="" aria-hidden="true" />
      </article>
      <article class="panel closure-panel">
        <div class="panel-heading closure-heading">
          <div><h2>经营协同</h2><p>订单触发补货，供应与活动同步承接</p></div>
          <span class="closure-live"><i aria-hidden="true"/>实时联动</span>
        </div>
        <div class="closure-overview">
          <span class="closure-overview-icon"><AppIcon name="sparkles"/></span>
          <div><small>今日协同链路</small><strong>4 个环节已接通</strong><p>订单 → 库存 → 供应 → 活动</p></div>
          <span class="closure-overview-count"><b>{{ closureIssueCount }}</b><small>项待推进</small></span>
        </div>
        <div class="closure-flow" aria-label="经营协同流程">
          <button
            v-for="item in closureItems"
            :key="item.key"
            type="button"
            class="closure-step"
            :class="`closure-step--${item.tone}`"
            @click="router.push(item.route)"
          >
            <span class="closure-step-icon"><AppIcon :name="item.icon"/></span>
            <span class="closure-step-copy"><small>{{ item.label }}</small><strong>{{ item.value }}<b>{{ item.unit }}</b></strong></span>
            <AppIcon class="closure-step-arrow" name="arrow"/>
          </button>
        </div>
        <footer class="closure-footer">
          <span>数据随业务状态实时更新</span>
          <button type="button" @click="router.push('/logs')">查看协同记录<AppIcon name="arrow"/></button>
        </footer>
      </article>
    </section>
  </div>

  <el-drawer v-model="kitchenDrawerVisible" class="kitchen-operations-drawer" size="520px" :with-header="false">
    <div class="modal-header kitchen-drawer-header">
      <div><h2>{{ kitchenDrawerView === 'schedule' ? '今日排班' : '运营效率详情' }}</h2><p>{{ kitchenDrawerView === 'schedule' ? '按营业时段查看人员配置与交接状态。' : '拆解 94% 效能得分，定位可继续提升的环节。' }}</p></div>
      <el-button class="icon-button" circle aria-label="关闭" @click="kitchenDrawerVisible = false"><AppIcon name="close"/></el-button>
    </div>

    <div class="kitchen-drawer-switch" role="tablist" aria-label="厨房运营视图">
      <button type="button" role="tab" :aria-selected="kitchenDrawerView === 'schedule'" :class="{ active: kitchenDrawerView === 'schedule' }" @click="kitchenDrawerView = 'schedule'">今日排班</button>
      <button type="button" role="tab" :aria-selected="kitchenDrawerView === 'efficiency'" :class="{ active: kitchenDrawerView === 'efficiency' }" @click="kitchenDrawerView = 'efficiency'">效率分析</button>
    </div>

    <section v-if="kitchenDrawerView === 'schedule'" class="kitchen-schedule-list">
      <article v-for="shift in kitchenSchedule" :key="shift.time">
        <time>{{ shift.time }}</time>
        <div><strong>{{ shift.name }}</strong><small>{{ shift.team }}</small></div>
        <span :class="shift.tone">{{ shift.status }}</span>
      </article>
    </section>

    <section v-else class="kitchen-efficiency-detail">
      <div class="kitchen-score-card">
        <span><strong>94</strong><small>/ 100</small></span>
        <div><b>厨房运行顺畅</b><p>出餐与人员配置均处于健康区间，午市备餐仍有 1 项可提前完成。</p></div>
      </div>
      <div class="kitchen-indicator-list">
        <article v-for="indicator in efficiencyIndicators" :key="indicator.label">
          <div><strong>{{ indicator.label }}</strong><span>{{ indicator.value }}%</span></div>
          <div class="kitchen-indicator-track"><i :class="indicator.tone" :style="{ '--indicator-value': `${indicator.value}%` }"/></div>
          <small>{{ indicator.note }}</small>
        </article>
      </div>
      <div class="kitchen-insight"><AppIcon name="sparkles"/><div><strong>今日建议</strong><p>在 10:30 前完成午市最后一项备餐，可减少高峰期约 6 分钟等待。</p></div></div>
    </section>

    <div class="drawer-actions kitchen-drawer-actions">
      <el-button @click="kitchenDrawerVisible = false">关闭</el-button>
      <el-button type="primary" @click="router.push(kitchenDrawerView === 'schedule' ? '/employees' : '/orders'); kitchenDrawerVisible = false">{{ kitchenDrawerView === 'schedule' ? '进入员工管理' : '查看今日订单' }}</el-button>
    </div>
  </el-drawer>
</template>
