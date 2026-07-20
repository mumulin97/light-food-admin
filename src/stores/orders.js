import { reactive } from 'vue'
import { consumeForOrder } from './inventory'
import { accrueForOrder } from './members'

// 统一订单状态定义（订单管理 / 控制台 / 新建订单共用）
export const STATUS_META = {
  待处理: { class: 'pending', dot: true },
  制作中: { class: 'making', dot: true },
  待取餐: { class: 'ready', dot: true },
  已完成: { class: 'done', dot: false },
  已取消: { class: 'cancelled', dot: true },
}
export const STATUS_FLOW = ['待处理', '制作中', '待取餐', '已完成']
export const ALL_STATUSES = [...STATUS_FLOW, '已取消']
// 进入这些状态即视为已出餐，需扣减原料库存
const FULFILLED_STATUSES = ['制作中', '待取餐', '已完成']

// 控制台简版状态样式映射（复用 styles.css 的 .status.* 类）
const DASHBOARD_STATUS_CLASS = { 待处理: 'waiting', 制作中: 'preparing', 待取餐: 'ready', 已完成: 'finished', 已取消: 'cancelled' }
export function dashboardStatusClass(status) {
  return DASHBOARD_STATUS_CLASS[status] || 'waiting'
}

const avatarPalette = ['#dcefe5', '#e2edf8', '#f4e6d5', '#efe1f4', '#d9eeee', '#f7e4df']

const seedOrders = [
  ['#QS-4402', '张伟', 42.50, '制作中', '下午 12:45', '外带', [['抹茶能量碗', 1]]],
  ['#QS-4403', '王芳', 18.20, '待处理', '下午 12:52', '堂食', [['冷萃燕麦杯', 1]]],
  ['#QS-4398', '李明', 124.00, '待取餐', '下午 12:30', '外卖', [['轻盈双人套餐', 1], ['浆果排毒思慕雪', 2]]],
  ['#QS-4395', '赵敏', 56.75, '已完成', '下午 12:15', '堂食', [['牛油果高纤卷', 1], ['冷萃燕麦杯', 1]]],
  ['#QS-4390', '陈晨', 68.00, '待处理', '下午 12:08', '外带', [['藜麦田园沙拉', 2]]],
  ['#QS-4386', '刘洋', 34.00, '制作中', '上午 11:56', '堂食', [['藜麦田园沙拉', 1]]],
  ['#QS-4382', '孙丽', 90.50, '待取餐', '上午 11:47', '外卖', [['抹茶能量碗', 1], ['牛油果高纤卷', 1]]],
  ['#QS-4378', '周涛', 22.00, '已完成', '上午 11:39', '外带', [['冷萃燕麦杯', 1]]],
  ['#QS-4375', '吴静', 45.00, '待处理', '上午 11:30', '堂食', [['抹茶能量碗', 1]]],
  ['#QS-4371', '郑凯', 78.20, '制作中', '上午 11:22', '外卖', [['牛油果高纤卷', 1], ['藜麦田园沙拉', 1]]],
  ['#QS-4366', '冯婷', 15.50, '已取消', '上午 11:10', '堂食', [['浆果排毒思慕雪', 1]]],
  ['#QS-4362', '何强', 112.00, '待取餐', '上午 11:02', '外卖', [['轻盈双人套餐', 1], ['抹茶能量碗', 1]]],
  ['#QS-4358', '许娜', 36.00, '已完成', '上午 10:54', '外带', [['牛油果高纤卷', 1]]],
  ['#QS-4353', '邓超', 60.00, '待处理', '上午 10:45', '堂食', [['藜麦田园沙拉', 1], ['冷萃燕麦杯', 1]]],
  ['#QS-4349', '曾敏', 28.00, '制作中', '上午 10:37', '外带', [['冷萃燕麦杯', 1]]],
  ['#QS-4344', '彭勇', 84.50, '已完成', '上午 10:26', '外卖', [['抹茶能量碗', 1], ['牛油果高纤卷', 1]]],
  ['#QS-4340', '萧红', 42.50, '待取餐', '上午 10:18', '堂食', [['抹茶能量碗', 1]]],
  ['#QS-4335', '袁磊', 19.00, '已取消', '上午 10:05', '外带', [['浆果排毒思慕雪', 1]]],
].map(([id, customer, amount, status, time, method, items], i) => ({
  id, customer, amount, status, time, method, items,
  avatarColor: avatarPalette[i % avatarPalette.length],
  // 历史单中已出餐/已完成的，视为已扣料、已累计积分，避免重复处理
  ingredientsDeducted: FULFILLED_STATUSES.includes(status),
  pointsAccrued: status === '已完成',
  memberId: null,
}))

export const orderStore = reactive({
  orders: seedOrders,
  seq: 4406,
})

function currentTimeLabel() {
  const now = new Date()
  const hour = now.getHours()
  const label = hour < 12 ? '上午' : '下午'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return `${label} ${hour12}:${String(now.getMinutes()).padStart(2, '0')}`
}

// 新建订单：写入共享 store，返回新订单
export function createOrder({ customer, items, amount, method = '堂食', status = '待处理', memberId = null }) {
  const order = {
    id: `#QS-${orderStore.seq++}`,
    customer,
    amount,
    status,
    time: currentTimeLabel(),
    method,
    items,
    avatarColor: avatarPalette[orderStore.orders.length % avatarPalette.length],
    ingredientsDeducted: false,
    pointsAccrued: false,
    memberId,
  }
  orderStore.orders.unshift(order)
  return order
}

// 更新订单状态：首次出餐时扣减原料，首次完成时为关联会员累计积分
export function setOrderStatus(order, status) {
  order.status = status
  const result = { consumed: [], accrued: null }

  if (FULFILLED_STATUSES.includes(status) && !order.ingredientsDeducted) {
    order.ingredientsDeducted = true
    result.consumed = consumeForOrder(order.items)
  }
  if (status === '已完成' && !order.pointsAccrued) {
    order.pointsAccrued = true
    result.accrued = accrueForOrder(order)
  }
  return result
}

export function formatMoney(value) {
  return `¥${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatOrderItems(items) {
  return items.map(([name, qty]) => `${name} × ${qty}`).join('、')
}
