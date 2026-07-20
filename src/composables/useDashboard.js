import { computed, ref, watch } from 'vue'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import {
  createDashboardOrder,
  dateMeta,
  fetchActiveProductCount,
  fetchDayMetrics,
  fetchInventoryAlertCount,
  fetchOrdersForDay,
  fetchProductPrices,
  fetchProductRanking,
  fetchRevenueSeries,
  fetchStores,
  formatDisplayDate,
  listRecentDates,
  localIsoDate,
} from '../services/dashboard'
import { useOrders } from './useOrders'

const defaultMetrics = { orders: '—', revenue: '—', products: '—', alerts: '—' }

export function useDashboard() {
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
  const chartValues = ref([])
  const ranking = ref([])
  const dayOrders = ref([])
  const productPrices = ref({})

  const selectedDateLabel = computed(() => formatDisplayDate(selectedDateIso.value))

  async function refresh() {
    if (!enabled || !supabase) return
    const storeId = storeIdByName.value[selectedStore.value]
    if (!storeId) return

    loading.value = true
    error.value = ''
    try {
      const [productCount, alertCount, orders, series, rank, prices, dates] = await Promise.all([
        fetchActiveProductCount(supabase),
        fetchInventoryAlertCount(supabase),
        fetchOrdersForDay(supabase, storeId, selectedDateIso.value),
        fetchRevenueSeries(supabase, storeId, currentRange.value),
        fetchProductRanking(supabase, storeId, selectedDateIso.value, rankingMode.value),
        fetchProductPrices(supabase),
        listRecentDates(supabase, storeId),
      ])

      dayOrders.value = orders
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
      metrics.value = await fetchDayMetrics(supabase, storeId, selectedDateIso.value, productCount, alertCount)
    } catch (e) {
      error.value = e.message || '加载控制台数据失败'
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  async function initStores() {
    if (!enabled || !supabase) return
    loading.value = true
    error.value = ''
    try {
      const list = await fetchStores(supabase)
      stores.value = list.map(s => s.name)
      storeIdByName.value = Object.fromEntries(list.map(s => [s.name, s.id]))
      if (!selectedStore.value && list[0]) selectedStore.value = list[0].name
      await refresh()
    } catch (e) {
      error.value = e.message || '连接 Supabase 失败'
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  async function createOrder(payload) {
    if (!enabled || !supabase) return null
    const storeId = storeIdByName.value[selectedStore.value]
    const id = await createDashboardOrder(supabase, {
      storeId,
      priceByProduct: productPrices.value,
      ...payload,
    })
    selectedDateIso.value = localIsoDate()
    await refresh()
    await useOrders().loadOrders()
    return id
  }

  watch([selectedStore, selectedDateIso, currentRange, rankingMode], () => {
    refresh()
  })

  return {
    enabled,
    loading,
    error,
    stores,
    selectedStore,
    selectedDateIso,
    selectedDateLabel,
    dateOptions,
    currentRange,
    rankingMode,
    metrics,
    chartValues,
    ranking,
    dayOrders,
    productPrices,
    initStores,
    refresh,
    createOrder,
  }
}
