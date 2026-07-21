import { ref } from 'vue'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import {
  computeOrderAmount,
  createOrderInDb,
  defaultOrderListRange,
  fetchOrders,
  persistOrderState,
} from '../services/ordersApi'
import { orderStore, createOrder as createLocalOrder } from '../stores/orders'

const orders = ref([])
const loading = ref(false)
const creating = ref(false)
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
    if (creating.value) return null
    creating.value = true
    error.value = ''
    try {
      if (!enabled || !supabase) {
        const amount = computeOrderAmount(payload.items, payload.priceByProduct, payload.amount)
        const order = createLocalOrder({ ...payload, amount })
        orders.value = orderStore.orders
        return order.id
      }
      const id = await createOrderInDb(supabase, payload)
      await loadOrders()
      return id
    } catch (e) {
      error.value = e.message || '创建订单失败'
      throw e
    } finally {
      creating.value = false
    }
  }

  async function saveOrderState(order) {
    if (!enabled || !supabase) return
    await persistOrderState(supabase, order)
  }

  return {
    enabled,
    orders,
    loading,
    creating,
    error,
    listRange,
    loadOrders,
    setListRange,
    createOrder,
    saveOrderState,
  }
}
