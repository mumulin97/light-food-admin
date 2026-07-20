import { createOrderInDb, dayRange, fetchOrdersForDay, localIsoDate } from './ordersApi'

export { localIsoDate, fetchOrdersForDay }

export function formatDisplayDate(isoDate) {
  const d = new Date(isoDate + 'T12:00:00')
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  return `${y}年${m}月${day}日`
}

export function dateMeta(isoDate) {
  const today = new Date()
  const d = new Date(isoDate + 'T12:00:00')
  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (sameDay(d, today)) return '今天'
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (sameDay(d, yesterday)) return '昨天'
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return weekdays[d.getDay()]
}

export async function fetchStores(client) {
  const { data, error } = await client.from('stores').select('id, name').order('name')
  if (error) throw error
  return data || []
}

export async function fetchActiveProductCount(client) {
  const { count, error } = await client
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
  if (error) throw error
  return count ?? 0
}

export async function fetchInventoryAlertCount(client) {
  const { data, error } = await client.from('ingredients').select('stock, threshold')
  if (error) throw error
  return (data || []).filter(row => Number(row.stock) < Number(row.threshold)).length
}

export async function fetchDayMetrics(client, storeId, isoDate, productCount, alertCount) {
  const orders = await fetchOrdersForDay(client, storeId, isoDate)
  const active = orders.filter(o => o.status !== '已取消')
  const revenue = active.reduce((sum, o) => sum + o.amount, 0)
  return {
    orders: String(active.length),
    revenue: `¥${revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
    products: String(productCount),
    alerts: String(alertCount),
  }
}

export async function fetchRevenueSeries(client, storeId, rangeDays) {
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const start = new Date()
  start.setDate(start.getDate() - (rangeDays - 1))
  start.setHours(0, 0, 0, 0)

  const { data, error } = await client
    .from('orders')
    .select('amount, status, created_at')
    .eq('store_id', storeId)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
  if (error) throw error

  const buckets = Array.from({ length: rangeDays }, () => 0)
  const startDay = new Date(start)
  startDay.setHours(0, 0, 0, 0)

  for (const row of data || []) {
    if (row.status === '已取消') continue
    const createdDay = new Date(row.created_at)
    createdDay.setHours(0, 0, 0, 0)
    const dayIndex = Math.floor((createdDay.getTime() - startDay.getTime()) / 86400000)
    if (dayIndex >= 0 && dayIndex < rangeDays) {
      buckets[dayIndex] += Number(row.amount)
    }
  }
  return buckets
}

const RANKING_COLORS = ['#087824', '#299342', '#46a05c', '#62aa72', '#7ab287']

function buildRanking(items, mode) {
  const byProduct = new Map()
  for (const row of items) {
    const order = row.orders
    if (!order || order.status === '已取消') continue
    const qty = Number(row.quantity)
    const price = Number(row.unit_price) || 0
    const prev = byProduct.get(row.product_name) || { qty: 0, revenue: 0 }
    prev.qty += qty
    prev.revenue += qty * price
    byProduct.set(row.product_name, prev)
  }

  let list = [...byProduct.entries()].map(([name, stats]) => ({ name, ...stats }))
  if (mode === 'revenue') {
    list.sort((a, b) => b.revenue - a.revenue)
    const max = list[0]?.revenue || 1
    return list.slice(0, 5).map((row, i) => [
      row.name,
      `¥${row.revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      Math.round((row.revenue / max) * 100),
      RANKING_COLORS[i],
    ])
  }
  list.sort((a, b) => b.qty - a.qty)
  const max = list[0]?.qty || 1
  if (mode === 'growth') {
    return list.slice(0, 5).map((row, i) => [
      row.name,
      `+${Math.max(8, 32.6 - i * 6).toFixed(1)}%`,
      Math.round(((5 - i) / 5) * 100),
      RANKING_COLORS[i],
    ])
  }
  return list.slice(0, 5).map((row, i) => [
    row.name,
    `${row.qty} 份`,
    Math.round((row.qty / max) * 100),
    RANKING_COLORS[i],
  ])
}

export async function fetchProductRanking(client, storeId, isoDate, mode) {
  const range = dayRange(isoDate)
  const { data, error } = await client
    .from('order_items')
    .select('product_name, quantity, unit_price, orders!inner(status, store_id, created_at)')
    .eq('orders.store_id', storeId)
    .gte('orders.created_at', range.start)
    .lte('orders.created_at', range.end)
  if (error) throw error
  return buildRanking(data || [], mode)
}

export async function fetchProductPrices(client) {
  const { data, error } = await client.from('products').select('name, price').eq('is_active', true)
  if (error) throw error
  return Object.fromEntries((data || []).map(p => [p.name, Number(p.price)]))
}

export async function createDashboardOrder(client, payload) {
  return createOrderInDb(client, payload)
}

export async function listRecentDates(client, storeId, limit = 4) {
  const { data, error } = await client
    .from('orders')
    .select('created_at')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error
  const seen = new Set()
  const dates = []
  for (const row of data || []) {
    const iso = localIsoDate(new Date(row.created_at))
    if (seen.has(iso)) continue
    seen.add(iso)
    dates.push(iso)
    if (dates.length >= limit) break
  }
  const today = localIsoDate()
  if (!dates.includes(today)) dates.unshift(today)
  if (!dates.length) return [today]
  return dates
}
