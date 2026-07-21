const avatarPalette = ['#dcefe5', '#e2edf8', '#f4e6d5', '#efe1f4', '#d9eeee', '#f7e4df']

export function localIsoDate(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function dayRange(isoDate) {
  const start = new Date(`${isoDate}T00:00:00`)
  const end = new Date(`${isoDate}T23:59:59.999`)
  return { start: start.toISOString(), end: end.toISOString() }
}

export function formatOrderDateTime(isoOrDate) {
  const date = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate)
  if (Number.isNaN(date.getTime())) return '—'
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${hh}:${mm}`
}

function formatTimeLabel(iso) {
  return formatOrderDateTime(iso)
}

export function mapOrderRow(row, itemsByOrder) {
  const items = (itemsByOrder.get(row.id) || []).map(it => [it.product_name, it.quantity])
  const index = Math.abs(row.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0))
  const memberId = row.member_id != null && row.member_id !== '' ? row.member_id : null
  return {
    id: row.id,
    storeId: row.store_id,
    customer: row.customer_name,
    amount: Number(row.amount),
    status: row.status,
    time: formatTimeLabel(row.created_at),
    method: row.method,
    items,
    note: row.note || '',
    avatarColor: avatarPalette[index % avatarPalette.length],
    created_at: row.created_at,
    memberId,
    ingredientsDeducted: Boolean(row.ingredients_deducted),
    pointsAccrued: Boolean(row.points_accrued),
  }
}

async function attachOrderItems(client, orders) {
  if (!orders.length) return new Map()
  const ids = orders.map(o => o.id)
  const { data, error } = await client
    .from('order_items')
    .select('order_id, product_name, quantity, unit_price')
    .in('order_id', ids)
  if (error) throw error
  const map = new Map()
  for (const row of data || []) {
    if (!map.has(row.order_id)) map.set(row.order_id, [])
    map.get(row.order_id).push(row)
  }
  return map
}

export async function fetchOrders(client, options = {}) {
  const {
    storeId = null,
    fromIsoDate = null,
    toIsoDate = null,
    status = null,
    limit = 500,
  } = options

  let query = client
    .from('orders')
    .select(
      'id, store_id, customer_name, amount, status, method, created_at, member_id, note, ingredients_deducted, points_accrued',
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  if (storeId) query = query.eq('store_id', storeId)
  if (status && status !== '全部') query = query.eq('status', status)
  if (fromIsoDate) query = query.gte('created_at', dayRange(fromIsoDate).start)
  if (toIsoDate) query = query.lte('created_at', dayRange(toIsoDate).end)

  const { data, error } = await query
  if (error) throw error
  const rows = data || []
  const itemsByOrder = await attachOrderItems(client, rows)
  return rows.map(row => mapOrderRow(row, itemsByOrder))
}

export async function fetchOrdersForDay(client, storeId, isoDate) {
  return fetchOrders(client, { storeId, fromIsoDate: isoDate, toIsoDate: isoDate })
}

/** @returns {number} */
export function computeOrderAmount(items, priceByProduct = {}, amount) {
  const direct = Number(amount)
  if (Number.isFinite(direct) && direct > 0) {
    return Math.round(direct * 100) / 100
  }
  let total = 0
  for (const [productName, quantity] of items || []) {
    const unit = Number(priceByProduct[productName])
    const qty = Number(quantity)
    if (!Number.isFinite(unit) || !Number.isFinite(qty)) continue
    total += unit * qty
  }
  if (!Number.isFinite(total) || total <= 0) {
    throw new Error('无法计算订单金额，请重新选择产品或确认菜单价格已配置')
  }
  return Math.round(total * 100) / 100
}

export async function createOrderInDb(client, { storeId, customer, items, amount, method, note, memberId, priceByProduct = {} }) {
  const resolvedAmount = computeOrderAmount(items, priceByProduct, amount)
  const { data: newId, error: idError } = await client.rpc('next_order_id')
  if (idError) throw idError

  const { error: orderError } = await client.from('orders').insert({
    id: newId,
    store_id: storeId,
    customer_name: customer,
    amount: resolvedAmount,
    status: '待处理',
    method,
    note: note || null,
    member_id: memberId != null ? String(memberId) : null,
    ingredients_deducted: false,
    points_accrued: false,
  })
  if (orderError) throw orderError

  const itemRows = items.map(([productName, quantity]) => ({
    order_id: newId,
    product_name: productName,
    quantity,
    unit_price: Number(priceByProduct[productName]) || null,
  }))
  const { error: itemsError } = await client.from('order_items').insert(itemRows)
  if (itemsError) throw itemsError

  return newId
}

export async function persistOrderState(client, order) {
  const { error } = await client
    .from('orders')
    .update({
      status: order.status,
      ingredients_deducted: order.ingredientsDeducted,
      points_accrued: order.pointsAccrued,
    })
    .eq('id', order.id)
  if (error) throw error
}

export function defaultOrderListRange() {
  return rangeFromPresetDays(30)
}

/** 含首尾：days=30 表示从今天起往前共 30 个自然日 */
export function rangeFromPresetDays(days) {
  const to = localIsoDate()
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - (Math.max(1, days) - 1))
  const from = localIsoDate(fromDate)
  return { from, to }
}

export function formatRangeLabel(fromIso, toIso) {
  const fmt = iso => {
    const d = new Date(`${iso}T12:00:00`)
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
  }
  return `${fmt(fromIso)} – ${fmt(toIso)}`
}
