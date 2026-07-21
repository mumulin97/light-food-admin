<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AppIcon from '../components/AppIcon.vue'
import RevenueChart from '../components/RevenueChart.vue'
import { useDashboard } from '../composables/useDashboard'
import { orderStore, formatMoney as formatOrderMoney, dashboardStatusClass } from '../stores/orders'
import { isSupabaseConfigured } from '../lib/supabase'

defineProps({
  motionEnabled: { type: Boolean, default: true },
})

const emit = defineEmits(['open-notifications', 'open-all-orders'])

const useBackend = isSupabaseConfigured()
const dashboard = useDashboard()

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
    ['抹茶能量碗', '842 份', 100, '#087824'], ['牛油果高纤卷', '720 份', 86, '#299342'], ['藜麦田园沙拉', '615 份', 73, '#46a05c'], ['冷萃燕麦杯', '528 份', 63, '#62aa72'], ['浆果排毒思慕雪', '412 份', 49, '#7ab287'],
  ],
  revenue: [
    ['牛油果高纤卷', '¥21,600', 100, '#087824'], ['抹茶能量碗', '¥20,208', 94, '#299342'], ['藜麦田园沙拉', '¥17,220', 80, '#46a05c'], ['浆果排毒思慕雪', '¥12,360', 57, '#62aa72'], ['冷萃燕麦杯', '¥10,560', 49, '#7ab287'],
  ],
  growth: [
    ['浆果排毒思慕雪', '+32.6%', 100, '#087824'], ['冷萃燕麦杯', '+24.8%', 76, '#299342'], ['抹茶能量碗', '+18.2%', 56, '#46a05c'], ['藜麦田园沙拉', '+12.5%', 38, '#62aa72'], ['牛油果高纤卷', '+8.9%', 27, '#7ab287'],
  ],
}

const selectedDateLocal = ref('2023年10月24日')
const currentRangeLocal = ref(7)
const rankingModeLocal = ref('volume')

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

const consoleOrders = computed(() => (useBackend ? dashboard.dayOrders.value : orderStore.orders))
const latestOrders = computed(() => consoleOrders.value.slice(0, 3))
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

defineExpose({
  refresh: () => dashboard.refresh(),
  reloadStores: force => dashboard.loadStoreList(force),
})
</script>

<template>
  <div class="dashboard-content" v-loading="useBackend && dashboardLoading">
    <p v-if="useBackend && dashboardError" class="dashboard-error" role="alert">{{ dashboardError }}</p>
    <section class="page-heading">
      <div><h1>管理概览</h1><p>欢迎回来！这是轻食点中心店的实时运营数据。</p></div>
      <el-dropdown trigger="click" popper-class="date-dropdown" @command="selectDate">
        <el-button class="date-button" :aria-label="selectedDateLabel"><AppIcon name="calendar"/><span>{{ selectedDateLabel }}</span><AppIcon class="chevron" name="chevron"/></el-button>
        <template #dropdown><el-dropdown-menu><el-dropdown-item v-for="date in dateOptionsList" :key="date.value" :command="date.value" :class="{ selected: selectedDateKey === date.value }"><span>{{ date.label }}</span><small>{{ date.meta }}</small></el-dropdown-item></el-dropdown-menu></template>
      </el-dropdown>
    </section>

    <section class="metrics-grid" aria-label="关键经营指标">
      <article class="metric-card"><span class="metric-icon green"><AppIcon name="receipt"/></span><div class="metric-body"><p>今日订单数</p><strong class="metric-value">{{ currentMetrics.orders }}</strong></div><span class="trend positive">+12%</span></article>
      <article class="metric-card"><span class="metric-icon neutral"><AppIcon name="money"/></span><div class="metric-body"><p>今日总营收</p><strong class="metric-value">{{ currentMetrics.revenue }}</strong></div><span class="trend positive">+8.4%</span></article>
      <article class="metric-card"><span class="metric-icon blue"><AppIcon name="clipboard"/></span><div class="metric-body"><p>在售单品数</p><strong class="metric-value">{{ currentMetrics.products }}</strong></div><span class="trend stable">持平</span></article>
      <article class="metric-card alert-card" tabindex="0" @click="emit('open-notifications')"><span class="metric-icon red"><AppIcon name="warning"/></span><div class="metric-body"><p>库存预警</p><strong class="metric-value red-text">{{ currentMetrics.alerts }}</strong></div><span class="trend warning">预警</span></article>
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
        <div class="panel-heading"><h2>最新订单日志</h2><el-button class="view-all" text @click="emit('open-all-orders')">查看全部<AppIcon name="arrow"/></el-button></div>
        <el-table :data="latestOrders" class="orders-table" table-layout="fixed">
          <el-table-column prop="id" label="订单编号" min-width="92"/><el-table-column prop="customer" label="顾客姓名" min-width="82"/>
          <el-table-column label="订单状态" min-width="88"><template #default="{ row }"><span class="status" :class="dashboardStatusClass(row.status)">{{ row.status }}</span></template></el-table-column>
          <el-table-column label="交易金额" min-width="88" align="right"><template #default="{ row }">{{ formatOrderMoney(row.amount) }}</template></el-table-column>
        </el-table>
      </article>
      <article class="efficiency-card"><div><span class="efficiency-kicker">今日厨房状态</span><h2>厨房运营效能</h2><p>您的团队今日表现优异，运营效率达到 <strong>94%</strong>。请保持！</p></div><div class="efficiency-meter"><span style="--value:94%"/></div><div class="efficiency-actions"><el-button @click="ElMessage({ message: '今日排班：前厅 5 人，后厨 7 人，配送 3 人', customClass: 'light-bites-message', duration: 2400 })">查看排班</el-button><el-button @click="ElMessage({ message: '出餐均时 8.6 分钟，较上周提升 11%', customClass: 'light-bites-message', duration: 2400 })">效率详情<AppIcon name="arrow"/></el-button></div></article>
    </section>
  </div>
</template>
