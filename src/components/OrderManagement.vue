<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AppIcon from './AppIcon.vue'
import { useOrders } from '../composables/useOrders'
import { formatRangeLabel } from '../services/ordersApi'
import { orderStore, setOrderStatus, STATUS_META, ALL_STATUSES } from '../stores/orders'
import { findMember } from '../stores/members'

const props = defineProps({
  query: { type: String, default: '' },
})

const TOTAL_ORDERS = 248
const pageSize = 6
const FILTER_STATUSES = ['全部', ...ALL_STATUSES]

const { enabled: useBackend, orders, loading, error: ordersLoadError, loadOrders, saveOrderState, listRange } = useOrders()

const orderPage = ref(1)
const refreshing = ref(false)

const draftOrderId = ref('')
const draftStatus = ref('全部')
const appliedOrderId = ref('')
const appliedStatus = ref('全部')

const dateRangeLabel = computed(() => formatRangeLabel(listRange.value.from, listRange.value.to))

const detailVisible = ref(false)
const detailOrder = ref(null)

const allOrders = computed(() => (useBackend ? orders.value : orderStore.orders))

const filteredOrders = computed(() => {
  const keyword = props.query.trim().toLowerCase()
  const idKeyword = appliedOrderId.value.trim().toLowerCase()
  return allOrders.value.filter(order => {
    const queryMatched = !keyword || order.id.toLowerCase().includes(keyword) || order.customer.toLowerCase().includes(keyword) || order.items.some(([name]) => name.toLowerCase().includes(keyword))
    const idMatched = !idKeyword || order.id.toLowerCase().includes(idKeyword)
    const statusMatched = appliedStatus.value === '全部' || order.status === appliedStatus.value
    return queryMatched && idMatched && statusMatched
  })
})

const hasFilter = computed(() => Boolean(props.query.trim() || appliedOrderId.value.trim() || appliedStatus.value !== '全部'))
const pageOrders = computed(() => filteredOrders.value.slice((orderPage.value - 1) * pageSize, orderPage.value * pageSize))
const totalLabel = computed(() => (useBackend || hasFilter.value ? filteredOrders.value.length : TOTAL_ORDERS).toLocaleString('en-US'))
const orderRange = computed(() => {
  const total = filteredOrders.value.length
  if (!total) return '没有符合条件的订单'
  const start = (orderPage.value - 1) * pageSize + 1
  const end = Math.min(orderPage.value * pageSize, total)
  return `显示第 ${start}-${end} 条，共 ${totalLabel.value} 条订单`
})

watch([() => props.query, appliedOrderId, appliedStatus], () => { orderPage.value = 1 })

onMounted(() => {
  if (useBackend) {
    appliedStatus.value = '全部'
    draftStatus.value = '全部'
    loadOrders().catch(() => {})
  }
})

function formatMoney(value) {
  return `¥${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function isTerminal(status) {
  return status === '已完成' || status === '已取消'
}

function rowClassName({ row }) {
  return isTerminal(row.status) ? 'is-terminal' : ''
}

function applyFilters() {
  appliedOrderId.value = draftOrderId.value
  appliedStatus.value = draftStatus.value
  ElMessage({ message: '筛选条件已应用', type: 'success', customClass: 'light-bites-message', duration: 2400 })
}

async function changeStatus(order, status) {
  try {
    const { consumed, accrued } = setOrderStatus(order, status)
    if (useBackend) await saveOrderState(order)
    const parts = [`订单 ${order.id} 已更新为「${status}」`]
    if (consumed.length) parts.push(`已扣减原料：${consumed.map(item => `${item.name} ${item.amount}${item.unit}`).join('、')}`)
    if (accrued) {
      parts.push(`${accrued.member.name} +${accrued.gainedPoints} 积分`)
      if (accrued.upgraded) parts.push(`已升级为${accrued.tier}`)
    }
    ElMessage({ message: parts.join('，'), type: 'success', customClass: 'light-bites-message', duration: 2400 })
  } catch (e) {
    ElMessage({ message: e.message || '更新订单状态失败', type: 'error', customClass: 'light-bites-message', duration: 3200 })
  }
}

function memberName(order) {
  if (!order.memberId) return '散客'
  const member = findMember(order.memberId) || findMember(Number(order.memberId))
  return member ? `${member.name} · ${member.tier}` : '散客'
}

function openDetail(order) {
  detailOrder.value = order
  detailVisible.value = true
}

async function refreshOrders() {
  if (!useBackend) {
    refreshing.value = true
    window.setTimeout(() => {
      refreshing.value = false
      ElMessage({ message: '订单列表已刷新', type: 'success', customClass: 'light-bites-message', duration: 2400 })
    }, 700)
    return
  }
  refreshing.value = true
  try {
    await loadOrders()
    ElMessage({ message: '订单列表已刷新', type: 'success', customClass: 'light-bites-message', duration: 2400 })
  } catch (e) {
    ElMessage({ message: e.message || '刷新失败', type: 'error', customClass: 'light-bites-message', duration: 3200 })
  } finally {
    refreshing.value = false
  }
}

function exportOrders() {
  const rows = [['订单号', '客户', '金额', '状态', '下单时间', '就餐方式', '商品'], ...filteredOrders.value.map(order => [order.id, order.customer, order.amount.toFixed(2), order.status, order.time, order.method, order.items.map(([name, qty]) => `${name}×${qty}`).join(' ')])]
  const csv = `﻿${rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')}`
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = '订单列表.csv'
  link.click()
  URL.revokeObjectURL(url)
  ElMessage({ message: '订单列表已导出', type: 'success', customClass: 'light-bites-message', duration: 2400 })
}
</script>

<template>
  <div class="order-content" v-loading="useBackend && loading">
    <p v-if="useBackend && ordersLoadError" class="dashboard-error" role="alert">{{ ordersLoadError }}（若提示缺少列，请在 Supabase 执行 supabase/migrations/003_order_flags.sql）</p>
    <section class="order-page-heading">
      <div><h1>订单管理</h1><p>实时监控并更新当前活跃订单状态。</p></div>
      <div class="order-heading-actions">
        <el-button class="member-ghost-button" @click="exportOrders"><AppIcon name="download" />导出 CSV</el-button>
        <el-button class="member-primary-button" :loading="refreshing" @click="refreshOrders"><AppIcon v-if="!refreshing" name="refresh" />刷新</el-button>
      </div>
    </section>

    <section class="order-filters">
      <label class="order-filter-field"><span>订单编号</span><el-input v-model="draftOrderId" placeholder="如 #QS-90210" clearable @keyup.enter="applyFilters" /></label>
      <div class="order-filter-field"><span>日期范围</span><div class="order-date-field"><AppIcon name="calendar" />{{ dateRangeLabel }}</div></div>
      <label class="order-filter-field"><span>状态</span><el-select v-model="draftStatus"><el-option v-for="item in FILTER_STATUSES" :key="item" :label="item" :value="item" /></el-select></label>
      <el-button class="order-apply-button" @click="applyFilters">应用筛选</el-button>
    </section>

    <div class="member-table-card">
      <el-table :data="pageOrders" class="member-table order-table" table-layout="fixed" :row-class-name="rowClassName" empty-text="没有符合条件的订单">
        <el-table-column prop="id" label="订单号" min-width="120"><template #default="{ row }"><span class="order-id">{{ row.id }}</span></template></el-table-column>
        <el-table-column label="客户" min-width="130"><template #default="{ row }"><div class="order-customer"><span class="order-avatar" :style="{ background: row.avatarColor }">{{ row.customer.charAt(0) }}</span><span>{{ row.customer }}</span></div></template></el-table-column>
        <el-table-column label="金额" min-width="96"><template #default="{ row }"><strong class="order-amount">{{ formatMoney(row.amount) }}</strong></template></el-table-column>
        <el-table-column label="状态" min-width="110"><template #default="{ row }"><span class="order-status" :class="STATUS_META[row.status].class"><i v-if="STATUS_META[row.status].dot" />{{ row.status }}</span></template></el-table-column>
        <el-table-column prop="time" label="下单时间" min-width="120"><template #default="{ row }"><span class="order-time">{{ row.time }}</span></template></el-table-column>
        <el-table-column label="操作" width="180" align="right"><template #default="{ row }"><div class="order-actions"><button type="button" class="order-detail-link" @click="openDetail(row)">详情</button><el-dropdown v-if="!isTerminal(row.status)" trigger="click" popper-class="order-status-menu" @command="changeStatus(row, $event)"><el-button class="order-status-button">修改状态</el-button><template #dropdown><el-dropdown-menu><el-dropdown-item v-for="s in ALL_STATUSES.filter(item => item !== row.status)" :key="s" :command="s">{{ s }}</el-dropdown-item></el-dropdown-menu></template></el-dropdown><el-button v-else class="order-status-button" disabled>修改状态</el-button></div></template></el-table-column>
      </el-table>
      <footer class="member-table-footer"><span>{{ orderRange }}</span><el-pagination v-model:current-page="orderPage" background layout="prev, pager, next" :page-size="pageSize" :total="filteredOrders.length" :pager-count="5" /></footer>
    </div>
  </div>

  <el-drawer v-model="detailVisible" class="order-detail-drawer" size="480px" :with-header="false">
    <div class="modal-header"><div><span class="eyebrow">订单详情</span><h2>{{ detailOrder?.id }}</h2></div><el-button class="icon-button" circle aria-label="关闭" @click="detailVisible = false"><AppIcon name="close" /></el-button></div>
    <div v-if="detailOrder" class="order-detail">
      <div class="order-detail-top"><span class="order-status" :class="STATUS_META[detailOrder.status].class"><i v-if="STATUS_META[detailOrder.status].dot" />{{ detailOrder.status }}</span><span class="order-detail-time">{{ detailOrder.time }}</span></div>
      <dl class="order-detail-meta">
        <div><dt>客户</dt><dd>{{ detailOrder.customer }}</dd></div>
        <div><dt>就餐方式</dt><dd>{{ detailOrder.method }}</dd></div>
        <div><dt>关联会员</dt><dd>{{ memberName(detailOrder) }}</dd></div>
      </dl>
      <div class="order-detail-items">
        <span class="order-detail-label">商品明细</span>
        <div v-for="[name, qty] in detailOrder.items" :key="name" class="order-detail-item"><span>{{ name }}</span><span>× {{ qty }}</span></div>
      </div>
      <div class="order-detail-total"><span>合计</span><strong>{{ formatMoney(detailOrder.amount) }}</strong></div>
    </div>
  </el-drawer>
</template>
