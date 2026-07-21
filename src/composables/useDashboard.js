import { computed, ref } from 'vue'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import {
  computeAlertTrend,
  computeTrendPercent,
  createDashboardOrder,
  dateMeta,
  fetchActiveProductCount,
  fetchDayOrderStats,
  fetchInventoryRisks,
  fetchOrdersForDay,
  fetchProductPrices,
  fetchProductRanking,
  fetchRevenueSeries,
  fetchStores,
  formatDisplayDate,
  listRecentDates,
  localIsoDate,
  previousIsoDate,
} from '../services/dashboard'

const defaultMetrics = { orders: '—', revenue: '—', products: '—', alerts: '—' }
const defaultTrend = { label: '—', tone: 'stable' }
const defaultTrends = {
  orders: { ...defaultTrend },
  revenue: { ...defaultTrend },
  products: { ...defaultTrend },
  alerts: { ...defaultTrend },
}

/** @type {Record<string, number>} */
const productCountByDate = {}
/** @type {Record<string, number>} */
const alertCountByDate = {}

const enabled = isSupabaseConfigured()
const loading = ref(false)
const error = ref('')
const stores = ref([])
const storeIdByName = ref({})
const selectedStore = ref('')
const selectedDateIso = ref(localIsoDate())
const dateOptions = ref([])
const currentRange = ref(7)
const rankingMode = ref('volume')
const metrics = ref({ ...defaultMetrics })
const metricTrends = ref({ ...defaultTrends })
const chartValues = ref([])
const ranking = ref([])
const dayOrders = ref([])
const productPrices = ref({})
const inventoryRisks = ref([])

const selectedDateLabel = computed(() => formatDisplayDate(selectedDateIso.value))

let storeListPromise = null

async function loadStoreList(force = false) {
  if (!enabled || !supabase) return []
  if (!force && stores.value.length) return stores.value
  if (!force && storeListPromise) return storeListPromise
  storeListPromise = fetchStores(supabase)
    .then(list => {
      stores.value = list.map(s => s.name)
      storeIdByName.value = Object.fromEntries(list.map(s => [s.name, s.id]))
      if (!selectedStore.value && list[0]) selectedStore.value = list[0].name
      return list
    })
    .finally(() => {
      storeListPromise = null
    })
  return storeListPromise
}

async function ensureProductPrices() {
  if (!enabled || !supabase) return productPrices.value
  if (Object.keys(productPrices.value).length) return productPrices.value
  productPrices.value = await fetchProductPrices(supabase)
  return productPrices.value
}

async function refresh() {
  if (!enabled || !supabase) return
  const storeId = storeIdByName.value[selectedStore.value]
  if (!storeId) return

  loading.value = true
  error.value = ''
  try {
    const [productCount, risks, orders, series, rank, prices, dates] = await Promise.all([
      fetchActiveProductCount(supabase),
      fetchInventoryRisks(supabase),
      fetchOrdersForDay(supabase, storeId, selectedDateIso.value),
      fetchRevenueSeries(supabase, storeId, currentRange.value, selectedDateIso.value),
      fetchProductRanking(supabase, storeId, selectedDateIso.value, rankingMode.value),
      fetchProductPrices(supabase),
      listRecentDates(supabase, storeId),
    ])

    dayOrders.value = orders
    inventoryRisks.value = risks
    chartValues.value = series
    ranking.value = rank
    productPrices.value = prices
    dateOptions.value = dates.map(iso => {
      const d = new Date(`${iso}T12:00:00`)
      return {
        value: iso,
        label: `${d.getMonth() + 1}月${d.getDate()}日`,
        meta: dateMeta(iso),
        display: formatDisplayDate(iso),
      }
    })
    if (!dates.includes(selectedDateIso.value) && dates[0]) {
      selectedDateIso.value = dates[0]
    }

    const iso = selectedDateIso.value
    const active = orders.filter(o => o.status !== '已取消')
    const revenue = active.reduce((sum, o) => sum + o.amount, 0)
    const alertCount = risks.length
    const prevIso = previousIsoDate(iso)
    const prevStats = await fetchDayOrderStats(supabase, storeId, prevIso)

    productCountByDate[iso] = productCount
    alertCountByDate[iso] = alertCount
    const prevProductCount = productCountByDate[prevIso] ?? productCount
    const prevAlertCount = alertCountByDate[prevIso] ?? alertCount

    metrics.value = {
      orders: String(active.length),
      revenue: `¥${revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      products: String(productCount),
      alerts: String(alertCount),
    }
    metricTrends.value = {
      orders: computeTrendPercent(active.length, prevStats.orderCount),
      revenue: computeTrendPercent(revenue, prevStats.revenue),
      products: computeTrendPercent(productCount, prevProductCount),
      alerts: computeAlertTrend(alertCount, prevAlertCount),
    }
  } catch (e) {
    error.value = e.message || '加载控制台数据失败'
    console.error(e)
  } finally {
    loading.value = false
  }
}

/** @deprecated use loadStoreList + refresh from DashboardView */
async function initStores() {
  await loadStoreList(true)
  await refresh()
}

async function createOrder(payload) {
  if (!enabled || !supabase) return null
  await loadStoreList()
  await ensureProductPrices()
  const storeId = storeIdByName.value[selectedStore.value]
  const id = await createDashboardOrder(supabase, {
    storeId,
    priceByProduct: productPrices.value,
    ...payload,
  })
  selectedDateIso.value = localIsoDate()
  await refresh()
  return id
}

export function useDashboard() {
  return {
    enabled,
    loading,
    error,
    stores,
    storeIdByName,
    selectedStore,
    selectedDateIso,
    selectedDateLabel,
    dateOptions,
    currentRange,
    rankingMode,
    metrics,
    metricTrends,
    chartValues,
    ranking,
    dayOrders,
    productPrices,
    inventoryRisks,
    loadStoreList,
    ensureProductPrices,
    initStores,
    refresh,
    createOrder,
  }
}
