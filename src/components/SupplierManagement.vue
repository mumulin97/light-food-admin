<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AppIcon from './AppIcon.vue'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import {
  createSupplier,
  deleteSupplier,
  fetchSuppliers,
  renewSupplierLicense,
  updateSupplier,
} from '../services/suppliersApi'

const props = defineProps({
  query: { type: String, default: '' },
})

const useBackend = isSupabaseConfigured()
const loading = ref(false)
const loadError = ref('')
const saving = ref(false)

const pageSize = 4
const STATUS_TABS = ['全部', '激活', '停用']
const CATEGORY_OPTIONS = ['乳制品/有机奶', '新鲜蔬菜/菌菇', '时令水果', '调味品/半成品', '粮油/干货', '冰鲜水产', '茶饮/茶底', '肉类/禽类', '烘焙原料', '冷冻食品']

// 按相对天数生成许可证到期日，保证演示数据始终贴近“当前”
function dateFromNow(days) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return date
}

const seedSuppliers = [
  ['晨曦有机牧场', '浙江省杭州市余杭区农科园 12 号', '乳制品/有机奶', '李明诚', '138-0000-1234', '激活', 'A+', 99, 'SP-3301-0148', 18],
  ['绿野农庄配送中心', '上海市松江区新浜农产品交易中心', '新鲜蔬菜/菌菇', '王小野', '156-8888-5678', '激活', 'A+', 100, 'SP-3101-0292', 26],
  ['丰收果园贸易公司', '成都市双流区农副产品批发市场', '时令水果', '赵丰', '139-4444-9988', '停用', 'B', 82, 'SP-5101-0377', -12],
  ['原味食品有限公司', '广东省广州市天河区高新路 88 号', '调味品/半成品', '张思语', '135-2222-3333', '激活', 'A', 96, 'SP-4401-0512', 200],
  ['清源粮油贸易', '江苏省南京市江宁区粮油市场 9 号', '粮油/干货', '陈国清', '137-6666-2211', '激活', 'A', 95, 'SP-3201-0631', 365],
  ['鲜潮海产', '福建省厦门市海沧区渔港路 5 号', '冰鲜水产', '林海涛', '159-3333-7788', '激活', 'A+', 98, 'SP-3502-0744', 95],
  ['谷雨茶叶合作社', '安徽省黄山市徽州区茶园路 20 号', '茶饮/茶底', '吴春晓', '138-5555-4646', '激活', 'A', 94, 'SP-3410-0856', 140],
  ['沃田蔬菜基地', '山东省寿光市蔬菜产业园', '新鲜蔬菜/菌菇', '孙沃', '136-7777-1212', '停用', 'B', 79, 'SP-3707-0963', -40],
  ['恒诚肉业', '河南省漯河市食品工业园', '肉类/禽类', '何恒', '155-8888-3434', '激活', 'A', 93, 'SP-4111-1075', 280],
  ['甜心烘焙原料', '北京市大兴区食品物流园', '烘焙原料', '甜佳', '134-9999-5656', '激活', 'A', 92, 'SP-1101-1182', 60],
  ['山泉饮品供应', '云南省昆明市呈贡区水源路 7 号', '茶饮/茶底', '泉一鸣', '158-2222-8989', '激活', 'A', 90, 'SP-5301-1294', 410],
  ['优选冻品仓', '湖北省武汉市东西湖区冷链园', '冷冻食品', '冯优', '137-1111-6767', '停用', 'B', 76, 'SP-4201-1308', 45],
].map(([name, address, category, contact, phone, status, score, fulfillment, licenseNo, licenseDays], i) => ({
  id: i + 1, name, address, category, contact, phone, status, score, fulfillment,
  licenseNo, licenseExpiry: dateFromNow(licenseDays),
}))

const suppliers = ref(useBackend ? [] : seedSuppliers)
const statusFilter = ref('全部')
const supplierPage = ref(1)

const addVisible = ref(false)
const addForm = reactive({ name: '', address: '', category: '乳制品/有机奶', contact: '', phone: '', status: '激活' })

const detailVisible = ref(false)
const detailSupplier = ref(null)

// ---- 资质（食品流通许可证）到期管理 ----
const LICENSE_WARN_DAYS = 30
const licenseVisible = ref(false)

function daysUntil(date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
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
  if (days < 0) return `已过期 ${Math.abs(days)} 天`
  if (days === 0) return '今日到期'
  return `剩余 ${days} 天`
}

function formatDate(date) {
  const d = new Date(date)
  return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月${String(d.getDate()).padStart(2, '0')}日`
}

// 需处理的资质：已过期在前，其余按剩余天数升序
const licenseAlerts = computed(() => suppliers.value
  .filter(item => licenseStatus(item) !== 'ok')
  .sort((a, b) => daysUntil(a.licenseExpiry) - daysUntil(b.licenseExpiry)))
const expiredCount = computed(() => suppliers.value.filter(item => licenseStatus(item) === 'expired').length)
const expiringCount = computed(() => suppliers.value.filter(item => licenseStatus(item) === 'warning').length)

function openLicense() {
  if (!licenseAlerts.value.length) {
    ElMessage({ message: '所有供应商资质均在有效期内', type: 'success', customClass: 'light-bites-message', duration: 2400 })
    return
  }
  licenseVisible.value = true
}

// 续期一年（自到期日或今日中较晚者起算）
async function renewLicense(supplier) {
  const base = licenseExpiryAfterRenew(supplier)
  if (useBackend && supabase) {
    try {
      const iso = base.toISOString().slice(0, 10)
      await renewSupplierLicense(supabase, supplier.id, iso)
      supplier.licenseExpiry = iso
      ElMessage({ message: `「${supplier.name}」资质已续期至 ${formatDate(base)}`, type: 'success', customClass: 'light-bites-message', duration: 2400 })
    } catch (e) {
      ElMessage({ message: e.message || '续期失败', type: 'error', customClass: 'light-bites-message', duration: 3200 })
    }
  } else {
    supplier.licenseExpiry = base
    ElMessage({ message: `「${supplier.name}」资质已续期至 ${formatDate(base)}`, type: 'success', customClass: 'light-bites-message', duration: 2400 })
  }
  if (!licenseAlerts.value.length) licenseVisible.value = false
}

async function renewAllLicenses() {
  const targets = [...licenseAlerts.value]
  if (useBackend && supabase) {
    saving.value = true
    try {
      for (const item of targets) {
        const base = licenseExpiryAfterRenew(item)
        const iso = base.toISOString().slice(0, 10)
        await renewSupplierLicense(supabase, item.id, iso)
        item.licenseExpiry = iso
      }
      licenseVisible.value = false
      ElMessage({ message: `已为 ${targets.length} 家供应商完成资质续期`, type: 'success', customClass: 'light-bites-message', duration: 2400 })
    } catch (e) {
      ElMessage({ message: e.message || '批量续期失败', type: 'error', customClass: 'light-bites-message', duration: 3200 })
    } finally {
      saving.value = false
    }
    return
  }
  targets.forEach(item => { item.licenseExpiry = licenseExpiryAfterRenew(item) })
  licenseVisible.value = false
  ElMessage({ message: `已为 ${targets.length} 家供应商完成资质续期`, type: 'success', customClass: 'light-bites-message', duration: 2400 })
}

const activityLogs = [
  ['管理员', '新增了供应商', '晨曦牧场'],
  ['系统', '更新了 绿野农庄 的', '评价等级'],
  ['管理员', '停用了', '丰收果园'],
]

const filteredSuppliers = computed(() => {
  const keyword = props.query.trim().toLowerCase()
  return suppliers.value.filter(item => {
    const statusMatched = statusFilter.value === '全部' || item.status === statusFilter.value
    const queryMatched = !keyword || [item.name, item.category, item.contact, item.phone, item.address].some(value => value.toLowerCase().includes(keyword))
    return statusMatched && queryMatched
  })
})

const hasFilter = computed(() => statusFilter.value !== '全部' || Boolean(props.query.trim()))
const pageSuppliers = computed(() => filteredSuppliers.value.slice((supplierPage.value - 1) * pageSize, supplierPage.value * pageSize))
const totalLabel = computed(() => (hasFilter.value ? filteredSuppliers.value.length : suppliers.value.length).toLocaleString('en-US'))
const supplierTotalDisplay = computed(() => suppliers.value.length || (useBackend ? 0 : 124))
const supplierRange = computed(() => {
  const total = filteredSuppliers.value.length
  if (!total) return '没有符合条件的供应商'
  const start = (supplierPage.value - 1) * pageSize + 1
  const end = Math.min(supplierPage.value * pageSize, total)
  return `显示 ${start} 到 ${end}，共 ${totalLabel.value} 个供应商`
})

watch([statusFilter, () => props.query], () => { supplierPage.value = 1 })

async function loadSuppliers() {
  if (!useBackend || !supabase) return
  loading.value = true
  loadError.value = ''
  try {
    suppliers.value = await fetchSuppliers(supabase)
  } catch (e) {
    loadError.value = e.message || '加载供应商失败'
    ElMessage({ message: loadError.value, type: 'error', customClass: 'light-bites-message', duration: 3200 })
  } finally {
    loading.value = false
  }
}

onMounted(loadSuppliers)

function licenseExpiryAfterRenew(supplier) {
  const base = daysUntil(supplier.licenseExpiry) < 0 ? new Date() : new Date(supplier.licenseExpiry)
  base.setHours(0, 0, 0, 0)
  base.setFullYear(base.getFullYear() + 1)
  return base
}

function openAdd() {
  Object.assign(addForm, { name: '', address: '', category: '乳制品/有机奶', contact: '', phone: '', status: '激活' })
  addVisible.value = true
}

async function saveSupplier() {
  if (!addForm.name.trim() || !addForm.contact.trim() || !addForm.phone.trim()) {
    ElMessage({ message: '请填写供应商名称、联系人和电话', type: 'warning', customClass: 'light-bites-message', duration: 2400 })
    return
  }
  const draft = {
    ...addForm,
    name: addForm.name.trim(),
    contact: addForm.contact.trim(),
    phone: addForm.phone.trim(),
    address: addForm.address.trim() || '待补充',
    score: 'A',
    fulfillment: 100,
    licenseNo: `SP-NEW-${String(Date.now()).slice(-4)}`,
    licenseExpiry: dateFromNow(365),
  }
  if (useBackend && supabase) {
    saving.value = true
    try {
      const created = await createSupplier(supabase, draft)
      suppliers.value.unshift(created)
      supplierPage.value = 1
      addVisible.value = false
      ElMessage({ message: `供应商「${created.name}」已新增`, type: 'success', customClass: 'light-bites-message', duration: 2400 })
    } catch (e) {
      ElMessage({ message: e.message || '新增供应商失败', type: 'error', customClass: 'light-bites-message', duration: 3200 })
    } finally {
      saving.value = false
    }
    return
  }
  suppliers.value.unshift({ id: Date.now(), ...draft })
  supplierPage.value = 1
  addVisible.value = false
  ElMessage({ message: `供应商「${draft.name}」已新增`, type: 'success', customClass: 'light-bites-message', duration: 2400 })
}

function openDetail(supplier) {
  detailSupplier.value = supplier
  detailVisible.value = true
}

async function handleAction(command, supplier) {
  if (command === 'edit') ElMessage({ message: `正在编辑「${supplier.name}」`, customClass: 'light-bites-message', duration: 2200 })
  if (command === 'toggle') {
    const next = supplier.status === '激活' ? '停用' : '激活'
    if (useBackend && supabase) {
      try {
        await updateSupplier(supabase, supplier.id, { ...supplier, status: next })
        supplier.status = next
        ElMessage({ message: `「${supplier.name}」已${next}`, type: 'success', customClass: 'light-bites-message', duration: 2400 })
      } catch (e) {
        ElMessage({ message: e.message || '更新失败', type: 'error', customClass: 'light-bites-message', duration: 3200 })
      }
      return
    }
    supplier.status = next
    ElMessage({ message: `「${supplier.name}」已${next}`, type: 'success', customClass: 'light-bites-message', duration: 2400 })
  }
  if (command === 'delete') {
    if (useBackend && supabase) {
      try {
        await deleteSupplier(supabase, supplier.id)
        suppliers.value = suppliers.value.filter(row => row.id !== supplier.id)
        ElMessage({ message: `供应商「${supplier.name}」已删除`, type: 'success', customClass: 'light-bites-message', duration: 2400 })
      } catch (e) {
        ElMessage({ message: e.message || '删除失败', type: 'error', customClass: 'light-bites-message', duration: 3200 })
      }
      return
    }
    suppliers.value = suppliers.value.filter(row => row.id !== supplier.id)
    ElMessage({ message: `供应商「${supplier.name}」已删除`, type: 'success', customClass: 'light-bites-message', duration: 2400 })
  }
}

function exportSuppliers() {
  const rows = [['供应商名称', '地址', '供应品类', '联系人', '电话', '合作状态', '质量评分', '到货率', '许可证号', '资质有效期'], ...filteredSuppliers.value.map(item => [item.name, item.address, item.category, item.contact, item.phone, item.status, item.score, `${item.fulfillment}%`, item.licenseNo, formatDate(item.licenseExpiry)])]
  const csv = `﻿${rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')}`
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = '供应商名录.csv'
  link.click()
  URL.revokeObjectURL(url)
  ElMessage({ message: '供应商数据已导出', type: 'success', customClass: 'light-bites-message', duration: 2400 })
}
</script>

<template>
  <div class="supplier-content" v-loading="useBackend && loading">
    <p v-if="loadError" class="dashboard-error" role="alert">{{ loadError }}</p>
    <section class="supplier-toolbar">
      <div class="supplier-status-filter">
        <span>状态筛选：</span>
        <div class="supplier-tabs" role="tablist">
          <button v-for="tab in STATUS_TABS" :key="tab" type="button" role="tab" :class="{ active: statusFilter === tab }" @click="statusFilter = tab">{{ tab }}</button>
        </div>
      </div>
      <div class="supplier-toolbar-actions">
        <el-button class="member-ghost-button" @click="exportSuppliers"><AppIcon name="upload" />导出数据</el-button>
        <el-button class="member-primary-button" @click="openAdd"><AppIcon name="plus" />新增供应商</el-button>
      </div>
    </section>

    <section class="supplier-metrics">
      <article class="supplier-total-card">
        <div><p>合作供应商总数</p><div class="supplier-total-figure"><strong>{{ supplierTotalDisplay }}</strong><span>家供应商</span></div></div>
        <div class="supplier-total-stats">
          <div><small>本月新增</small><strong>+12</strong></div>
          <div><small>异常待处理</small><strong>3</strong></div>
        </div>
      </article>
      <article class="supplier-quality-card">
        <span class="supplier-quality-seal"><AppIcon name="check" /></span>
        <h3>质量评分 A+</h3>
        <p>基于过去 30 天的履约率和商品新鲜度评价</p>
      </article>
    </section>

    <div class="member-table-card">
      <el-table :data="pageSuppliers" class="member-table supplier-table" table-layout="fixed" :row-class-name="({ row }) => row.status === '停用' ? 'is-inactive' : ''" empty-text="没有符合条件的供应商">
        <el-table-column label="供应商名称" min-width="240"><template #default="{ row }"><div class="supplier-name-cell"><span class="supplier-avatar">{{ row.name.charAt(0) }}</span><span><strong>{{ row.name }}</strong><small>{{ row.address }}</small></span></div></template></el-table-column>
        <el-table-column label="供应品类" min-width="140"><template #default="{ row }"><span class="supplier-category">{{ row.category }}</span></template></el-table-column>
        <el-table-column label="联系人 / 电话" min-width="150"><template #default="{ row }"><div class="supplier-contact"><strong>{{ row.contact }}</strong><small>{{ row.phone }}</small></div></template></el-table-column>
        <el-table-column label="合作状态" min-width="110"><template #default="{ row }"><span class="supplier-status" :class="row.status === '激活' ? 'active' : 'inactive'"><i />{{ row.status }}</span></template></el-table-column>
        <el-table-column label="操作" width="120" align="left" class-name="table-op-column" label-class-name="table-op-column"><template #default="{ row }"><div class="table-row-actions"><button type="button" class="table-action-link" @click="openDetail(row)">查看</button><el-dropdown class="table-op-dropdown" trigger="click" popper-class="table-action-menu" @command="handleAction($event, row)"><el-button class="table-more-button" circle aria-label="更多操作"><AppIcon name="more" /></el-button><template #dropdown><el-dropdown-menu><el-dropdown-item command="edit">编辑资料</el-dropdown-item><el-dropdown-item command="toggle">{{ row.status === '激活' ? '停用合作' : '启用合作' }}</el-dropdown-item><el-dropdown-item command="delete" divided class="danger-text">删除供应商</el-dropdown-item></el-dropdown-menu></template></el-dropdown></div></template></el-table-column>
      </el-table>
      <footer class="member-table-footer"><span>{{ supplierRange }}</span><el-pagination v-model:current-page="supplierPage" background layout="prev, pager, next" :page-size="pageSize" :total="filteredSuppliers.length" :pager-count="5" /></footer>
    </div>

    <section class="supplier-bottom">
      <article class="supplier-feature">
        <span class="supplier-feature-title">重点合作</span>
        <div class="supplier-feature-image"><span>🥬</span><strong>绿野农庄新鲜供应</strong></div>
        <p>绿野农庄本周到货率达 100%，新鲜度评分优异。</p>
        <button type="button" class="supplier-feature-link" @click="ElMessage({ message: '正在打开绿野农庄分析报告', customClass: 'light-bites-message', duration: 2200 })">查看分析报告</button>
      </article>
      <article class="supplier-info-card">
        <span class="supplier-info-icon warning"><AppIcon name="clipboard" /></span>
        <div>
          <h4>资质过期预警</h4>
          <p v-if="licenseAlerts.length">已有 <strong>{{ expiringCount }} 家</strong>供应商的食品流通许可证即将到期（30 天内）<template v-if="expiredCount">，另有 <strong>{{ expiredCount }} 家</strong>已过期</template>。</p>
          <p v-else>所有供应商资质均在有效期内，暂无需处理。</p>
          <button type="button" class="supplier-info-button" @click="openLicense">{{ licenseAlerts.length ? '立即处理' : '查看资质' }}</button>
        </div>
      </article>
      <article class="supplier-info-card">
        <span class="supplier-info-icon"><AppIcon name="history" /></span>
        <div>
          <h4>最近操作日志</h4>
          <ul class="supplier-log-list">
            <li v-for="([who, action, target]) in activityLogs" :key="target"><b>{{ who }}</b> {{ action }} <span>{{ target }}</span></li>
          </ul>
        </div>
      </article>
    </section>

    <footer class="supplier-footer">© 2024 Light Bites 供应链管理系统 · 版权所有</footer>
  </div>

  <el-drawer v-model="addVisible" class="supplier-drawer" size="540px" :with-header="false">
    <div class="modal-header"><div><span class="eyebrow">供应商档案</span><h2>新增供应商</h2></div><el-button class="icon-button" circle aria-label="关闭" @click="addVisible = false"><AppIcon name="close" /></el-button></div>
    <el-form label-position="top" @submit.prevent="saveSupplier">
      <div class="form-row"><el-form-item label="供应商名称"><el-input v-model="addForm.name" placeholder="输入供应商名称" /></el-form-item><el-form-item label="供应品类"><el-select v-model="addForm.category"><el-option v-for="item in CATEGORY_OPTIONS" :key="item" :label="item" :value="item" /></el-select></el-form-item></div>
      <el-form-item label="地址"><el-input v-model="addForm.address" placeholder="输入供应商地址" /></el-form-item>
      <div class="form-row"><el-form-item label="联系人"><el-input v-model="addForm.contact" placeholder="联系人姓名" /></el-form-item><el-form-item label="联系电话"><el-input v-model="addForm.phone" placeholder="如 138-0000-0000" /></el-form-item></div>
      <el-form-item label="合作状态"><el-select v-model="addForm.status"><el-option label="激活" value="激活" /><el-option label="停用" value="停用" /></el-select></el-form-item>
      <div class="drawer-actions"><el-button @click="addVisible = false">取消</el-button><el-button type="primary" @click="saveSupplier">新增供应商</el-button></div>
    </el-form>
  </el-drawer>

  <el-drawer v-model="detailVisible" class="supplier-detail-drawer" size="480px" :with-header="false">
    <div class="modal-header"><div><span class="eyebrow">供应商详情</span><h2>{{ detailSupplier?.name }}</h2></div><el-button class="icon-button" circle aria-label="关闭" @click="detailVisible = false"><AppIcon name="close" /></el-button></div>
    <div v-if="detailSupplier" class="supplier-detail">
      <div class="supplier-detail-top"><span class="supplier-status" :class="detailSupplier.status === '激活' ? 'active' : 'inactive'"><i />{{ detailSupplier.status }}</span><span class="supplier-detail-score">质量评分 {{ detailSupplier.score }}</span></div>
      <dl class="supplier-detail-meta">
        <div><dt>供应品类</dt><dd>{{ detailSupplier.category }}</dd></div>
        <div><dt>本月到货率</dt><dd>{{ detailSupplier.fulfillment }}%</dd></div>
        <div><dt>联系人</dt><dd>{{ detailSupplier.contact }}</dd></div>
        <div><dt>联系电话</dt><dd>{{ detailSupplier.phone }}</dd></div>
      </dl>
      <div class="supplier-detail-address"><span>地址</span><p>{{ detailSupplier.address }}</p></div>
      <div class="supplier-license-row">
        <div><span>食品流通许可证</span><p>{{ detailSupplier.licenseNo }}</p></div>
        <div class="supplier-license-right">
          <span class="supplier-license-chip" :class="licenseStatus(detailSupplier)">{{ licenseLabel(detailSupplier) }}</span>
          <p>有效期至 {{ formatDate(detailSupplier.licenseExpiry) }}</p>
        </div>
      </div>
    </div>
  </el-drawer>

  <el-drawer v-model="licenseVisible" class="supplier-license-drawer" size="540px" :with-header="false">
    <div class="modal-header"><div><span class="eyebrow">资质管理</span><h2>待续期资质</h2></div><el-button class="icon-button" circle aria-label="关闭" @click="licenseVisible = false"><AppIcon name="close" /></el-button></div>
    <p class="supplier-license-tip">以下 {{ licenseAlerts.length }} 家供应商的食品流通许可证需要处理，续期后有效期延长 1 年：</p>
    <div class="supplier-license-list">
      <div v-for="item in licenseAlerts" :key="item.id" class="supplier-license-item" :class="licenseStatus(item)">
        <span class="supplier-avatar">{{ item.name.charAt(0) }}</span>
        <div class="supplier-license-info">
          <strong>{{ item.name }}</strong>
          <small>{{ item.licenseNo }} · 有效期至 {{ formatDate(item.licenseExpiry) }}</small>
        </div>
        <span class="supplier-license-chip" :class="licenseStatus(item)">{{ licenseLabel(item) }}</span>
        <el-button class="supplier-renew-button" @click="renewLicense(item)">续期</el-button>
      </div>
    </div>
    <div class="drawer-actions"><el-button @click="licenseVisible = false">取消</el-button><el-button type="primary" @click="renewAllLicenses">全部续期</el-button></div>
  </el-drawer>
</template>
