<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppIcon from './AppIcon.vue'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { inventoryStore, stockStatus } from '../stores/inventory'
import { replaceSuppliers, supplierStore } from '../stores/suppliers'
import { renameIngredientSupplier, syncInventoryStore } from '../services/inventoryApi'
import {
  createSupplier,
  deleteSupplier,
  fetchSuppliers,
  renewSupplierLicense,
  updateSupplier,
} from '../services/suppliersApi'

const props = defineProps({ query: { type: String, default: '' } })
const router = useRouter()
const useBackend = isSupabaseConfigured()
const loading = ref(false)
const loadError = ref('')
const saving = ref(false)
const pageSize = 6
const LICENSE_WARN_DAYS = 30
const STATUS_TABS = ['全部', '正常合作', '风险待办', '已停用']
const CATEGORY_OPTIONS = ['乳制品/有机奶', '新鲜蔬菜/菌菇', '时令水果', '调味品/半成品', '粮油/干货', '冰鲜水产', '茶饮/茶底', '肉类/禽类', '烘焙原料', '冷冻食品']

function dateFromNow(days) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return localDateString(date)
}

function localDateString(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const suppliers = ref(supplierStore.suppliers)
const statusFilter = ref('全部')
const supplierPage = ref(1)
const statusSavingIds = ref(new Set())

const formVisible = ref(false)
const editingSupplier = ref(null)
const supplierForm = reactive({ name: '', address: '', category: CATEGORY_OPTIONS[0], contact: '', phone: '', status: '激活', score: 'A', fulfillment: 95, licenseNo: '', licenseExpiry: dateFromNow(180) })
const detailVisible = ref(false)
const detailSupplier = ref(null)
const licenseVisible = ref(false)

function daysUntil(value) {
  const target = new Date(value)
  if (Number.isNaN(target.getTime())) return -Infinity
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.round((target - today) / 86400000)
}

function licenseStatus(supplier) {
  const days = daysUntil(supplier.licenseExpiry)
  if (days < 0) return 'expired'
  if (days <= LICENSE_WARN_DAYS) return 'warning'
  return 'ok'
}

function licenseLabel(supplier) {
  const days = daysUntil(supplier.licenseExpiry)
  if (!Number.isFinite(days)) return '日期待补充'
  if (days < 0) return `已过期 ${Math.abs(days)} 天`
  if (days === 0) return '今日到期'
  return days <= LICENSE_WARN_DAYS ? `${days} 天后到期` : '有效'
}

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '待补充'
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

function linkedIngredients(supplier) {
  return inventoryStore.ingredients.filter(item => item.supplier === supplier.name)
}

function supplierInsight(supplier) {
  const items = linkedIngredients(supplier)
  const lowStock = items.filter(item => stockStatus(item) !== 'normal')
  return {
    items,
    lowStock,
    value: items.reduce((sum, item) => sum + Number(item.price) * Number(item.stock), 0),
  }
}

function isRiskSupplier(supplier) {
  const insight = supplierInsight(supplier)
  return supplier.status === '激活' && (licenseStatus(supplier) !== 'ok' || supplier.fulfillment < 90 || insight.lowStock.length > 0)
}

const activeSuppliers = computed(() => suppliers.value.filter(item => item.status === '激活'))
const inactiveSuppliers = computed(() => suppliers.value.filter(item => item.status === '停用'))
const riskSuppliers = computed(() => suppliers.value.filter(isRiskSupplier))
const licenseAlerts = computed(() => suppliers.value.filter(item => licenseStatus(item) !== 'ok').sort((a, b) => daysUntil(a.licenseExpiry) - daysUntil(b.licenseExpiry)))
const expiringCount = computed(() => suppliers.value.filter(item => licenseStatus(item) === 'warning').length)
const expiredCount = computed(() => suppliers.value.filter(item => licenseStatus(item) === 'expired').length)
const averageFulfillment = computed(() => {
  if (!activeSuppliers.value.length) return 0
  return Math.round(activeSuppliers.value.reduce((sum, item) => sum + Number(item.fulfillment || 0), 0) / activeSuppliers.value.length)
})
const supplierNames = computed(() => new Set(suppliers.value.map(item => item.name)))
const unregisteredSources = computed(() => [...new Set(inventoryStore.ingredients.map(item => item.supplier).filter(name => name && name !== '待指定' && !supplierNames.value.has(name)))])
const unassignedCount = computed(() => inventoryStore.ingredients.filter(item => !item.supplier || item.supplier === '待指定').length)
const linkedIngredientCount = computed(() => inventoryStore.ingredients.filter(item => supplierNames.value.has(item.supplier)).length)
const coverageRate = computed(() => inventoryStore.ingredients.length ? Math.round(linkedIngredientCount.value / inventoryStore.ingredients.length * 100) : 0)
const networkHealthy = computed(() => !expiredCount.value && !inactiveSuppliers.value.some(item => supplierInsight(item).items.length) && !unregisteredSources.value.length && !unassignedCount.value)

const filteredSuppliers = computed(() => {
  const keyword = props.query.trim().toLowerCase()
  return suppliers.value.filter(item => {
    const matchesTab = statusFilter.value === '全部'
      || (statusFilter.value === '正常合作' && item.status === '激活' && !isRiskSupplier(item))
      || (statusFilter.value === '风险待办' && isRiskSupplier(item))
      || (statusFilter.value === '已停用' && item.status === '停用')
    const matchesQuery = !keyword || [item.name, item.category, item.contact, item.phone, item.address].some(value => String(value).toLowerCase().includes(keyword))
    return matchesTab && matchesQuery
  })
})

const pageSuppliers = computed(() => filteredSuppliers.value.slice((supplierPage.value - 1) * pageSize, supplierPage.value * pageSize))
const supplierRange = computed(() => {
  const total = filteredSuppliers.value.length
  if (!total) return '没有符合条件的供应商'
  const start = (supplierPage.value - 1) * pageSize + 1
  return `显示 ${start}–${Math.min(start + pageSize - 1, total)}，共 ${total} 家`
})

function statusCount(tab) {
  if (tab === '正常合作') return activeSuppliers.value.length - riskSuppliers.value.length
  if (tab === '风险待办') return riskSuppliers.value.length
  if (tab === '已停用') return inactiveSuppliers.value.length
  return suppliers.value.length
}

watch([statusFilter, () => props.query], () => { supplierPage.value = 1 })
watch(filteredSuppliers, list => {
  const maxPage = Math.max(1, Math.ceil(list.length / pageSize))
  if (supplierPage.value > maxPage) supplierPage.value = maxPage
})

async function loadData() {
  if (!useBackend || !supabase) return
  loading.value = true
  loadError.value = ''
  try {
    const [supplierList] = await Promise.all([fetchSuppliers(supabase), syncInventoryStore(supabase)])
    replaceSuppliers(supplierList)
  } catch (error) {
    loadError.value = error.message || '供应链数据加载失败'
    ElMessage.error(loadError.value)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)

function resetForm(source = null) {
  editingSupplier.value = source
  Object.assign(supplierForm, source ? {
    name: source.name, address: source.address, category: source.category, contact: source.contact,
    phone: source.phone, status: source.status, score: source.score, fulfillment: source.fulfillment,
    licenseNo: source.licenseNo, licenseExpiry: source.licenseExpiry,
  } : {
    name: '', address: '', category: CATEGORY_OPTIONS[0], contact: '', phone: '', status: '激活',
    score: 'A', fulfillment: 95, licenseNo: '', licenseExpiry: dateFromNow(180),
  })
  formVisible.value = true
}

function openSourceProfile(name) {
  resetForm()
  supplierForm.name = name
}

function validateForm() {
  if (!supplierForm.name.trim() || !supplierForm.contact.trim() || !supplierForm.phone.trim()) {
    ElMessage.warning('请填写供应商名称、联系人和联系电话')
    return false
  }
  const duplicate = suppliers.value.find(item => item.name === supplierForm.name.trim() && item.id !== editingSupplier.value?.id)
  if (duplicate) {
    ElMessage.warning('供应商名称已存在，请直接编辑原档案')
    return false
  }
  return true
}

async function saveSupplier() {
  if (!validateForm()) return
  const previousName = editingSupplier.value?.name
  const draft = {
    ...supplierForm,
    name: supplierForm.name.trim(), address: supplierForm.address.trim() || '待补充',
    contact: supplierForm.contact.trim(), phone: supplierForm.phone.trim(),
    fulfillment: Number(supplierForm.fulfillment) || 0,
    licenseNo: supplierForm.licenseNo.trim() || `SP-${String(Date.now()).slice(-8)}`,
  }
  saving.value = true
  try {
    let saved
    if (useBackend && supabase) {
      saved = editingSupplier.value ? await updateSupplier(supabase, editingSupplier.value.id, draft) : await createSupplier(supabase, draft)
      if (previousName && previousName !== saved.name) await renameIngredientSupplier(supabase, previousName, saved.name)
    } else {
      saved = editingSupplier.value ? { ...editingSupplier.value, ...draft } : { id: Date.now(), ...draft }
    }
    if (previousName && previousName !== saved.name) {
      inventoryStore.ingredients.forEach(item => { if (item.supplier === previousName) item.supplier = saved.name })
    }
    if (editingSupplier.value) {
      const index = suppliers.value.findIndex(item => item.id === editingSupplier.value.id)
      suppliers.value.splice(index, 1, saved)
      if (detailSupplier.value?.id === saved.id) detailSupplier.value = saved
    } else {
      suppliers.value.unshift(saved)
      supplierPage.value = 1
    }
    formVisible.value = false
    ElMessage.success(editingSupplier.value ? '供应商档案与原料关联已同步' : '供应商已建档并纳入供应链')
  } catch (error) {
    ElMessage.error(error.message || '保存供应商失败')
  } finally {
    saving.value = false
  }
}

function openDetail(supplier) {
  detailSupplier.value = supplier
  detailVisible.value = true
}

function setStatusSaving(id, pending) {
  const next = new Set(statusSavingIds.value)
  if (pending) next.add(id)
  else next.delete(id)
  statusSavingIds.value = next
}

async function toggleSupplier(supplier, requestedStatus = null) {
  const next = requestedStatus || (supplier.status === '激活' ? '停用' : '激活')
  if (next === supplier.status || statusSavingIds.value.has(supplier.id)) return
  const insight = supplierInsight(supplier)
  if (next === '停用' && insight.items.length) {
    await ElMessageBox.confirm(`该供应商关联 ${insight.items.length} 项原料，其中 ${insight.lowStock.length} 项待补货。停用后请尽快切换供货来源。`, '确认停用合作', { confirmButtonText: '确认停用', cancelButtonText: '取消', type: 'warning' })
  }
  setStatusSaving(supplier.id, true)
  try {
    const saved = useBackend && supabase ? await updateSupplier(supabase, supplier.id, { ...supplier, status: next }) : { ...supplier, status: next }
    Object.assign(supplier, saved)
    ElMessage.success(next === '激活' ? `已恢复与「${supplier.name}」的合作` : `已停用「${supplier.name}」，请关注原料转供`)
  } finally {
    setStatusSaving(supplier.id, false)
  }
}

async function toggleSupplierFromSwitch(supplier, enabled) {
  try {
    await toggleSupplier(supplier, enabled ? '激活' : '停用')
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error.message || '合作状态更新失败')
  }
}

async function removeSupplier(supplier) {
  const insight = supplierInsight(supplier)
  if (insight.items.length) {
    ElMessage.warning(`仍有 ${insight.items.length} 项原料关联该供应商，请先在原料管理中完成转供`)
    return
  }
  await ElMessageBox.confirm('删除后无法恢复，相关历史导出记录不受影响。', `删除「${supplier.name}」？`, { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' })
  if (useBackend && supabase) await deleteSupplier(supabase, supplier.id)
  const index = suppliers.value.findIndex(item => item.id === supplier.id)
  if (index >= 0) suppliers.value.splice(index, 1)
  ElMessage.success('供应商已删除')
}

async function handleAction(command, supplier) {
  try {
    if (command === 'edit') resetForm(supplier)
    if (command === 'toggle') await toggleSupplier(supplier)
    if (command === 'delete') await removeSupplier(supplier)
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error.message || '操作失败')
  }
}

function goInventory(supplier = '') {
  router.push({ path: '/inventory', query: supplier ? { supplier } : {} })
}

function resolveCoverageIssue() {
  if (unregisteredSources.value[0]) openSourceProfile(unregisteredSources.value[0])
  else if (unassignedCount.value) goInventory('待指定')
}

function licenseExpiryAfterRenew(supplier) {
  const base = daysUntil(supplier.licenseExpiry) < 0 ? new Date() : new Date(supplier.licenseExpiry)
  base.setFullYear(base.getFullYear() + 1)
  return localDateString(base)
}

async function renewLicense(supplier) {
  const expiry = licenseExpiryAfterRenew(supplier)
  try {
    if (useBackend && supabase) await renewSupplierLicense(supabase, supplier.id, expiry)
    supplier.licenseExpiry = expiry
    ElMessage.success(`资质已续期至 ${formatDate(expiry)}`)
    if (!licenseAlerts.value.length) licenseVisible.value = false
  } catch (error) {
    ElMessage.error(error.message || '续期失败')
  }
}

async function renewAllLicenses() {
  saving.value = true
  try {
    for (const supplier of [...licenseAlerts.value]) await renewLicense(supplier)
    licenseVisible.value = false
  } finally {
    saving.value = false
  }
}

function exportSuppliers() {
  const rows = [['供应商名称', '供应品类', '联系人', '电话', '状态', '履约率', '供货原料数', '低库存数', '许可证号', '资质有效期'], ...filteredSuppliers.value.map(item => {
    const insight = supplierInsight(item)
    return [item.name, item.category, item.contact, item.phone, item.status, `${item.fulfillment}%`, insight.items.length, insight.lowStock.length, item.licenseNo, formatDate(item.licenseExpiry)]
  })]
  const csv = `﻿${rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')}`
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = '供应商履约台账.csv'
  link.click()
  URL.revokeObjectURL(url)
  ElMessage.success('已导出当前筛选范围的供应商履约台账')
}
</script>

<template>
  <div class="supplier-content" v-loading="useBackend && loading" element-loading-text="正在同步供应链数据">
    <p v-if="loadError" class="dashboard-error" role="alert">{{ loadError }}</p>

    <section class="module-page-heading">
      <div><span class="module-kicker">供应链中心</span><h1>供应商协同</h1><p>从供应档案、资质履约到原料补货，统一处理供应链风险。</p></div>
      <span class="module-live-status" :class="{ 'has-risk': !networkHealthy }"><i />{{ networkHealthy ? '供应网络运行正常' : `${riskSuppliers.length + unregisteredSources.length} 项风险待处理` }}</span>
    </section>

    <section class="supplier-summary-grid">
      <article class="supplier-summary-card primary"><span>合作供应商</span><strong>{{ activeSuppliers.length }}<small>/ {{ suppliers.length }} 家</small></strong><p>{{ inactiveSuppliers.length ? `${inactiveSuppliers.length} 家已停用` : '全部保持合作' }}</p><img class="supplier-summary-art supplier-summary-art--partners" src="/dashboard-assets/console1-transparent.png" alt="" aria-hidden="true"/></article>
      <article class="supplier-summary-card"><span>平均履约率</span><strong>{{ averageFulfillment }}<small>%</small></strong><p>{{ averageFulfillment >= 95 ? '整体履约稳定' : '需要关注履约表现' }}</p><img class="supplier-summary-art supplier-summary-art--performance" src="/dashboard-assets/console2-transparent-final.png" alt="" aria-hidden="true"/></article>
      <article class="supplier-summary-card" :class="{ warning: licenseAlerts.length }"><span>资质待办</span><strong>{{ licenseAlerts.length }}<small> 家</small></strong><p v-if="licenseAlerts.length">{{ expiredCount }} 家已过期 · {{ expiringCount }} 家即将到期</p><p v-else>供应资质均在有效期内</p><span class="supplier-qualification-art" aria-hidden="true">📂📋</span><button v-if="licenseAlerts.length" type="button" @click="licenseVisible = true">处理</button></article>
      <article class="supplier-summary-card" :class="{ warning: coverageRate < 100 }"><span>原料档案覆盖</span><strong>{{ coverageRate }}<small>%</small></strong><p>{{ linkedIngredientCount }} / {{ inventoryStore.ingredients.length }} 项已关联</p><img class="supplier-summary-art supplier-summary-art--coverage" src="/dashboard-assets/console4-transparent.png" alt="" aria-hidden="true"/><button v-if="coverageRate < 100" type="button" @click="resolveCoverageIssue">补齐</button></article>
    </section>

    <section class="supplier-toolbar supplier-list-toolbar">
      <div class="supplier-status-filter">
        <span>合作状态</span>
        <div class="supplier-tabs" role="tablist"><button v-for="tab in STATUS_TABS" :key="tab" type="button" role="tab" :aria-selected="statusFilter === tab" :class="{ active: statusFilter === tab }" @click="statusFilter = tab"><span>{{ tab }}</span><b>{{ statusCount(tab) }}</b></button></div>
      </div>
      <div class="supplier-toolbar-actions"><el-button class="member-ghost-button" @click="exportSuppliers"><AppIcon name="upload" />导出</el-button><el-button class="member-primary-button" @click="resetForm()"><AppIcon name="plus" />新增供应商</el-button></div>
    </section>

    <div class="member-table-card">
      <el-table :data="pageSuppliers" class="member-table supplier-table" table-layout="fixed" :row-class-name="({ row }) => row.status === '停用' ? 'is-inactive' : ''" empty-text="没有符合条件的供应商">
        <el-table-column label="供应商" min-width="220"><template #default="{ row }"><button type="button" class="supplier-name-cell supplier-name-button" @click="openDetail(row)"><span class="supplier-avatar">{{ row.name.charAt(0) }}</span><span><strong>{{ row.name }}</strong><small>{{ row.category }}</small></span></button></template></el-table-column>
        <el-table-column label="供货关联" min-width="150"><template #default="{ row }"><div class="supplier-supply-cell"><strong>{{ supplierInsight(row).items.length }} 项原料</strong><small :class="{ danger: supplierInsight(row).lowStock.length }">{{ supplierInsight(row).lowStock.length ? `${supplierInsight(row).lowStock.length} 项待补货` : '库存正常' }}</small></div></template></el-table-column>
        <el-table-column label="履约表现" min-width="145"><template #default="{ row }"><div class="supplier-performance"><span><strong>{{ row.fulfillment }}%</strong><small>{{ row.score }}</small></span><i><b :style="{ width: `${row.fulfillment}%` }" /></i></div></template></el-table-column>
        <el-table-column label="资质状态" min-width="130"><template #default="{ row }"><span class="supplier-license-chip" :class="licenseStatus(row)">{{ licenseLabel(row) }}</span></template></el-table-column>
        <el-table-column label="合作状态" width="150"><template #default="{ row }"><div class="supplier-status-switch"><el-switch :model-value="row.status === '激活'" inline-prompt active-text="开" inactive-text="关" :loading="statusSavingIds.has(row.id)" @change="toggleSupplierFromSwitch(row, $event)" /><span :class="row.status === '激活' ? 'active' : 'inactive'"><strong>{{ row.status === '激活' ? '合作中' : '已停用' }}</strong><small>{{ row.status === '激活' ? '允许采购' : '暂停采购' }}</small></span></div></template></el-table-column>
        <el-table-column label="操作" width="178"><template #default="{ row }"><div class="table-row-actions supplier-row-actions"><button type="button" class="table-action-link" @click="openDetail(row)">查看</button><button type="button" class="table-action-link secondary" @click="resetForm(row)">编辑</button><el-dropdown trigger="click" popper-class="table-action-menu" @command="handleAction($event, row)"><el-button class="table-more-button" circle aria-label="更多操作"><AppIcon name="more" /></el-button><template #dropdown><el-dropdown-menu><el-dropdown-item command="delete" class="danger-text">删除供应商</el-dropdown-item></el-dropdown-menu></template></el-dropdown></div></template></el-table-column>
      </el-table>
      <footer class="member-table-footer"><span>{{ supplierRange }}</span><el-pagination v-model:current-page="supplierPage" background layout="prev, pager, next" :page-size="pageSize" :total="filteredSuppliers.length" :pager-count="5" /></footer>
    </div>
  </div>

  <el-drawer v-model="formVisible" class="supplier-drawer" size="560px" :with-header="false">
    <div class="modal-header"><div><span class="eyebrow">供应商档案</span><h2>{{ editingSupplier ? '编辑供应商' : '新增供应商' }}</h2></div><el-button class="icon-button" circle aria-label="关闭" @click="formVisible = false"><AppIcon name="close" /></el-button></div>
    <el-form label-position="top" @submit.prevent="saveSupplier">
      <div class="form-row"><el-form-item label="供应商名称"><el-input v-model="supplierForm.name" placeholder="须与原料供货来源一致" /></el-form-item><el-form-item label="供应品类"><el-select v-model="supplierForm.category"><el-option v-for="item in CATEGORY_OPTIONS" :key="item" :label="item" :value="item" /></el-select></el-form-item></div>
      <el-form-item label="地址"><el-input v-model="supplierForm.address" placeholder="输入供应商地址" /></el-form-item>
      <div class="form-row"><el-form-item label="联系人"><el-input v-model="supplierForm.contact" /></el-form-item><el-form-item label="联系电话"><el-input v-model="supplierForm.phone" /></el-form-item></div>
      <div class="form-row"><el-form-item label="质量等级"><el-select v-model="supplierForm.score"><el-option v-for="item in ['A+','A','B','C']" :key="item" :label="item" :value="item" /></el-select></el-form-item><el-form-item label="到货履约率"><el-input-number v-model="supplierForm.fulfillment" :min="0" :max="100" controls-position="right" /></el-form-item></div>
      <div class="form-row"><el-form-item label="许可证号"><el-input v-model="supplierForm.licenseNo" /></el-form-item><el-form-item label="资质有效期"><el-date-picker v-model="supplierForm.licenseExpiry" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" /></el-form-item></div>
      <el-form-item label="合作状态"><el-select v-model="supplierForm.status"><el-option label="合作中（允许采购）" value="激活" /><el-option label="已停用（暂停采购）" value="停用" /></el-select></el-form-item>
      <p class="supplier-form-tip">保存后将按供应商名称同步关联原料；修改名称时，现有供货关系会自动迁移。</p>
      <div class="drawer-actions"><el-button @click="formVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="saveSupplier">{{ editingSupplier ? '保存并同步' : '建档并关联' }}</el-button></div>
    </el-form>
  </el-drawer>

  <el-drawer v-model="detailVisible" class="supplier-detail-drawer" size="520px" :with-header="false">
    <div class="modal-header"><div><span class="eyebrow">供应链视图</span><h2>{{ detailSupplier?.name }}</h2></div><el-button class="icon-button" circle aria-label="关闭" @click="detailVisible = false"><AppIcon name="close" /></el-button></div>
    <div v-if="detailSupplier" class="supplier-detail">
      <div class="supplier-detail-top"><span class="supplier-status" :class="detailSupplier.status === '激活' ? 'active' : 'inactive'"><i />{{ detailSupplier.status }}</span><span class="supplier-detail-score">质量 {{ detailSupplier.score }} · 履约 {{ detailSupplier.fulfillment }}%</span></div>
      <dl class="supplier-detail-meta"><div><dt>供应品类</dt><dd>{{ detailSupplier.category }}</dd></div><div><dt>关联原料</dt><dd>{{ supplierInsight(detailSupplier).items.length }} 项</dd></div><div><dt>联系人</dt><dd>{{ detailSupplier.contact }}</dd></div><div><dt>联系电话</dt><dd>{{ detailSupplier.phone }}</dd></div></dl>
      <div class="supplier-license-row"><div><span>食品流通许可证</span><p>{{ detailSupplier.licenseNo }}</p></div><div class="supplier-license-right"><span class="supplier-license-chip" :class="licenseStatus(detailSupplier)">{{ licenseLabel(detailSupplier) }}</span><p>有效期至 {{ formatDate(detailSupplier.licenseExpiry) }}</p></div></div>
      <section class="supplier-detail-supply"><div><h3>供货原料</h3><button type="button" @click="goInventory(detailSupplier.name)">进入原料管理</button></div><ul v-if="supplierInsight(detailSupplier).items.length"><li v-for="item in supplierInsight(detailSupplier).items" :key="item.id"><span>{{ item.emoji }} {{ item.name }}<small>{{ item.sku }}</small></span><strong :class="stockStatus(item)">{{ item.stock }} {{ item.unit }}</strong></li></ul><p v-else>尚未关联原料。可在原料管理中将该供应商设为供货来源。</p></section>
      <div class="supplier-detail-actions"><el-button @click="resetForm(detailSupplier)">编辑档案</el-button><el-button type="primary" @click="goInventory(detailSupplier.name)">查看库存与补货</el-button></div>
    </div>
  </el-drawer>

  <el-drawer v-model="licenseVisible" class="supplier-license-drawer" size="560px" :with-header="false">
    <div class="modal-header"><div><span class="eyebrow">资质管理</span><h2>待处理供应资质</h2></div><el-button class="icon-button" circle aria-label="关闭" @click="licenseVisible = false"><AppIcon name="close" /></el-button></div>
    <p class="supplier-license-tip">过期供应商应暂停采购；续期后有效期自当前有效期或今日起延长一年。</p>
    <div class="supplier-license-list"><div v-for="item in licenseAlerts" :key="item.id" class="supplier-license-item" :class="licenseStatus(item)"><span class="supplier-avatar">{{ item.name.charAt(0) }}</span><div class="supplier-license-info"><strong>{{ item.name }}</strong><small>{{ item.licenseNo }} · {{ formatDate(item.licenseExpiry) }}</small></div><span class="supplier-license-chip" :class="licenseStatus(item)">{{ licenseLabel(item) }}</span><el-button class="supplier-renew-button" @click="renewLicense(item)">续期</el-button></div></div>
    <div class="drawer-actions"><el-button @click="licenseVisible = false">取消</el-button><el-button type="primary" :loading="saving" :disabled="!licenseAlerts.length" @click="renewAllLicenses">全部续期</el-button></div>
  </el-drawer>
</template>

<style scoped>
.module-live-status.has-risk { color: #a15d22; border-color: rgba(207, 147, 77, .35); }
.module-live-status.has-risk i { background: #e29a42; box-shadow: 0 0 0 4px rgba(226, 154, 66, .12); }
.supplier-content { gap: 20px; padding: 34px 32px 42px; background: radial-gradient(circle at 89% 3%, rgba(196,220,242,.4), transparent 31%), radial-gradient(circle at 28% 83%, rgba(180,222,210,.2), transparent 35%), transparent; }
.supplier-content .module-page-heading { min-height: 92px; align-items: center; margin: 0; }
.supplier-content .module-page-heading h1 { color: #173f32; font-size: 32px; }
.supplier-content .module-page-heading p { color: #71847c; }
.supplier-content .module-live-status { margin: 0; padding: 10px 14px; border-color: rgba(232,154,129,.38); background: linear-gradient(145deg, rgba(255,245,240,.72), rgba(247,226,224,.56)); color: #b36a57; box-shadow: 0 12px 25px rgba(165,88,70,.1), 0 1px 0 rgba(255,255,255,.9) inset; }
.supplier-content .module-live-status i { background: #f19b7f; box-shadow: 0 0 0 4px rgba(241,155,127,.13); }
.supplier-summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
.supplier-summary-card { position: relative; min-height: 154px; overflow: hidden; padding: 23px 20px; border: 1px solid rgba(255,255,255,.76); border-radius: 23px; background: radial-gradient(circle at 10% 0%, rgba(255,255,255,.84), transparent 40%), linear-gradient(145deg, rgba(255,255,255,.62), rgba(218,237,245,.36)); box-shadow: 0 19px 40px rgba(54,89,94,.09), 0 1px 0 rgba(255,255,255,.96) inset; backdrop-filter: blur(25px) saturate(1.25); transition: transform .2s ease, box-shadow .2s ease; }
.supplier-summary-card:hover { transform: translateY(-2px); box-shadow: 0 23px 44px rgba(48,85,91,.12), 0 1px 0 rgba(255,255,255,.98) inset; }
.supplier-summary-card.primary { border-color: rgba(181,224,210,.72); background: radial-gradient(circle at 12% 0%, rgba(255,255,255,.88), transparent 42%), linear-gradient(145deg, rgba(235,249,243,.76), rgba(214,238,239,.42)); }
.supplier-summary-card.warning { border-color: rgba(255,255,255,.76); background: radial-gradient(circle at 88% 12%, rgba(255,220,183,.22), transparent 38%), linear-gradient(145deg, rgba(255,255,255,.64), rgba(223,237,244,.38)); }
.supplier-summary-card > span:first-child { position: relative; z-index: 2; color: #3c584e; font-size: 13px; font-weight: 760; }
.supplier-summary-card > strong { position: relative; z-index: 2; display: block; margin-top: 14px; color: #163a2d; font-size: 33px; line-height: 1; letter-spacing: -.035em; }
.supplier-summary-card > strong small { margin-left: 4px; color: #768a82; font-size: 12px; font-weight: 650; letter-spacing: 0; }
.supplier-summary-card p { position: relative; z-index: 2; max-width: 56%; margin: 12px 0 0; color: #71837d; font-size: 11.5px; line-height: 1.4; }
.supplier-summary-card button { position: absolute; top: 16px; right: 16px; z-index: 3; height: 29px; padding: 0 11px; border: 1px solid rgba(120,182,159,.3); border-radius: 9px; color: #2d7d5e; background: rgba(235,249,243,.72); box-shadow: 0 6px 14px rgba(54,119,95,.07); font-size: 11px; font-weight: 760; }
.supplier-summary-art { position: absolute; z-index: 1; display: block; object-fit: contain; pointer-events: none; }
.supplier-summary-art--partners { right: -11px; bottom: -18px; width: 132px; height: 132px; }
.supplier-summary-art--performance { right: -4px; bottom: -12px; width: 125px; height: 125px; }
.supplier-summary-art--coverage { right: -14px; bottom: -22px; width: 143px; height: 143px; }
.supplier-qualification-art { position: absolute !important; right: 9px; bottom: 15px; z-index: 1 !important; color: inherit !important; font-size: 59px !important; font-weight: 400 !important; letter-spacing: -22px; filter: drop-shadow(0 11px 12px rgba(119,93,56,.13)); transform: rotate(-4deg); }
.supplier-list-toolbar { min-height: 70px; padding: 10px 14px; border: 1px solid rgba(255,255,255,.76) !important; border-radius: 21px !important; background: radial-gradient(circle at 10% 0%, rgba(255,255,255,.8), transparent 35%), linear-gradient(145deg, rgba(255,255,255,.58), rgba(216,236,243,.34)) !important; box-shadow: 0 18px 38px rgba(55,90,94,.085), 0 1px 0 rgba(255,255,255,.96) inset !important; backdrop-filter: blur(24px) saturate(1.24); }
.supplier-status-filter > span { color: #38544a; font-size: 13px; font-weight: 760; }
.supplier-tabs { padding: 4px; border-radius: 13px; background: rgba(224,234,237,.68); }
.supplier-tabs button { display: inline-flex; align-items: center; gap: 7px; padding: 0 14px; }
.supplier-tabs button.active { background: rgba(255,255,255,.84); color: #278362; box-shadow: 0 7px 16px rgba(55,104,90,.09), 0 1px 0 rgba(255,255,255,.92) inset; }
.supplier-tabs button b { min-width: 20px; height: 20px; display: grid; place-items: center; padding: 0 5px; border-radius: 999px; color: #7b8981; background: rgba(255,255,255,.75); font-size: 10.5px; }
.supplier-tabs button.active b { color: #fff; background: #218952; }
.supplier-toolbar-actions :deep(.member-ghost-button.el-button), .supplier-toolbar-actions :deep(.member-primary-button.el-button) { height: 46px; border-radius: 14px; }
.supplier-toolbar-actions :deep(.member-ghost-button.el-button) { border-color: rgba(112,169,157,.3); background: rgba(255,255,255,.38); color: #4d7067; box-shadow: 0 8px 18px rgba(53,91,91,.06), 0 1px 0 rgba(255,255,255,.86) inset; }
.supplier-toolbar-actions :deep(.member-primary-button.el-button) { border: 1px solid rgba(255,255,255,.62); background: linear-gradient(135deg, rgba(49,182,132,.97), rgba(46,134,132,.94)); box-shadow: 0 13px 25px rgba(37,137,117,.22), 0 1px 0 rgba(255,255,255,.4) inset; }
.supplier-content > .member-table-card { min-height: 480px; border: 1px solid rgba(255,255,255,.76) !important; border-radius: 23px !important; background: radial-gradient(circle at 14% 0%, rgba(255,255,255,.76), transparent 32%), linear-gradient(145deg, rgba(255,255,255,.58), rgba(220,237,244,.34)) !important; box-shadow: 0 22px 48px rgba(54,89,94,.1), 0 1px 0 rgba(255,255,255,.96) inset !important; backdrop-filter: blur(28px) saturate(1.25); }
.supplier-table { --el-table-header-bg-color: transparent !important; --el-table-row-hover-bg-color: rgba(232,247,242,.5) !important; --el-table-border-color: rgba(113,155,164,.17) !important; --el-table-bg-color: transparent; --el-table-tr-bg-color: transparent; background: transparent; }
.supplier-table :deep(.el-table__inner-wrapper), .supplier-table :deep(.el-table__header-wrapper), .supplier-table :deep(.el-table__body-wrapper) { background: transparent; }
.supplier-table :deep(.el-table__header-wrapper th.el-table__cell) { height: 58px; background: linear-gradient(180deg, rgba(213,232,244,.58), rgba(218,236,242,.35)); color: #607785; }
.supplier-table :deep(.el-table__body-wrapper td.el-table__cell) { height: 76px; }
.supplier-content :deep(.member-table-footer) { min-height: 68px; background: rgba(255,255,255,.12); }
.supplier-name-button { width: 100%; padding: 0; border: 0; background: none; text-align: left; }
.supplier-name-button:hover strong { color: #087824; }
.supplier-name-button .supplier-avatar { width: 42px; height: 42px; border-radius: 13px; background: linear-gradient(145deg, rgba(219,238,246,.92), rgba(230,241,245,.72)); color: #456979; box-shadow: inset 0 0 0 1px rgba(101,153,166,.09); }
.supplier-supply-cell strong, .supplier-supply-cell small { display: block; }
.supplier-supply-cell strong { color: #263c31; font-size: 13.5px; }
.supplier-supply-cell small { margin-top: 4px; color: #5f8a71; font-size: 12px; }
.supplier-supply-cell small.danger { color: #c16b28; }
.supplier-performance > span { display: flex; align-items: baseline; justify-content: space-between; width: 105px; }
.supplier-performance strong { color: #294238; font-size: 14px; }
.supplier-performance small { color: #3c8a65; font-size: 12px; font-weight: 750; }
.supplier-performance > i { width: 105px; height: 5px; display: block; margin-top: 7px; border-radius: 9px; background: #e8efeb; overflow: hidden; }
.supplier-performance > i b { height: 100%; display: block; border-radius: inherit; background: linear-gradient(90deg, #65bd8e, #23875d); }
.supplier-status-switch { display: flex; align-items: center; gap: 9px; }
.supplier-status-switch :deep(.el-switch) { --el-switch-on-color: #24935c; --el-switch-off-color: #bdc6c1; }
.supplier-status-switch > span strong, .supplier-status-switch > span small { display: block; white-space: nowrap; }
.supplier-status-switch > span strong { color: #2e4b3d; font-size: 12.5px; }
.supplier-status-switch > span small { margin-top: 2px; color: #87938c; font-size: 10.5px; }
.supplier-status-switch > span.inactive strong { color: #89938e; }
.supplier-row-actions { gap: 5px; }
.table-action-link.secondary { color: #6d7f75; }
.supplier-form-tip { margin: 4px 0 0; padding: 11px 13px; border-radius: 10px; color: #527064; background: #f0f7f3; font-size: 12px; line-height: 1.5; }
.supplier-detail-supply { padding-top: 16px; border-top: 1px solid #edf2ef; }
.supplier-detail-supply > div { display: flex; align-items: center; justify-content: space-between; }
.supplier-detail-supply h3 { margin: 0; color: #223a2f; font-size: 15px; }
.supplier-detail-supply button { border: 0; color: #087824; background: none; font-size: 12.5px; font-weight: 750; }
.supplier-detail-supply ul { max-height: 250px; display: grid; gap: 7px; margin: 12px 0 0; padding: 0; overflow-y: auto; list-style: none; }
.supplier-detail-supply li { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-radius: 10px; background: #f6f9f7; color: #32483d; font-size: 13px; }
.supplier-detail-supply li small { margin-left: 8px; color: #93a097; font-size: 11px; }
.supplier-detail-supply li strong { color: #3b765a; font-size: 12px; }
.supplier-detail-supply li strong.warning { color: #a56d19; }
.supplier-detail-supply li strong.danger { color: #bf4740; }
.supplier-detail-supply > p { color: #7c8b83; font-size: 13px; line-height: 1.6; }
.supplier-detail-actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 4px; }

@media (max-width: 1180px) {
  .supplier-summary-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 760px) {
  .supplier-content { padding: 22px 16px 36px; }
  .supplier-content .module-page-heading { min-height: auto; align-items: flex-start; }
  .supplier-summary-grid { grid-template-columns: 1fr; }
  .supplier-status-filter { align-items: flex-start; flex-direction: column; }
  .supplier-tabs { max-width: 100%; overflow-x: auto; }
  .supplier-tabs button { padding: 0 13px; white-space: nowrap; }
}
</style>
