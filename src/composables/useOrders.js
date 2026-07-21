import { ref } from 'vue'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import {
  createOrderInDb,
  defaultOrderListRange,
  fetchOrders,
  persistOrderState,
} from '../services/ordersApi'
import { orderStore, createOrder as createLocalOrder } from '../stores/orders'

const orders = ref([])
const loading = ref(false)
const error = ref('')
const listRange = ref(defaultOrderListRange())

export function useOrders() {
  const enabled = isSupabaseConfigured()

  async function setListRange(from, to) {
    listRange.value = { from, to }
  }

  async function loadOrders(options = {}) {
    if (!enabled || !supabase) {
      orders.value = orderStore.orders
      return orders.value
    }
    loading.value = true
    error.value = ''
    try {
      const range = options.fromIsoDate ? options : listRange.value
      orders.value = await fetchOrders(supabase, {
        fromIsoDate: range.from,
        toIsoDate: range.to,
        limit: 500,
      })
      return orders.value
    } catch (e) {
      error.value = e.message || '加载订单失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createOrder(payload) {
    if (!enabled || !supabase) {
      const order = createLocalOrder(payload)
      orders.value = orderStore.orders
      return order.id
    }
    const id = await createOrderInDb(supabase, payload)
    await loadOrders()
    return id
  }

  async function saveOrderState(order) {
    if (!enabled || !supabase) return
    await persistOrderState(supabase, order)
  }

  return {
    enabled,
    orders,
    loading,
    error,
    listRange,
    loadOrders,
    setListRange,
    createOrder,
    saveOrderState,
  }
}
