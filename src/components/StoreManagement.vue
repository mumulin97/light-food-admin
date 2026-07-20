<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AppIcon from './AppIcon.vue'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { createStore, fetchAllStores, summarizeStores, updateStore } from '../services/stores'

const props = defineProps({
  query: { type: String, default: '' },
})

const emit = defineEmits(['stores-changed'])

const useBackend = isSupabaseConfigured()

const starterStores = [
  ['绿色食坊 (The Green Pantry)', '西区花园街 124 号', 'Elena Rodriguez', '(555) 012-3456', '营业中', '西海岸', true],
  ['精致简餐 (Bite-Sized Bistro)', '市中心橡树大道 45 号', 'Marcus Thorne', '(555) 019-8765', '营业中', '中心区', false],
  ['都市绿洲 (装修中)', '中央天际线大道 892 号', 'Sarah Jenkins', '(555) 021-4433', '已关闭', '中心区', false],
  ['每日磨坊 (The Daily Grind)', '码头区港口码头 12 号', 'David Lee', '(555) 088-9900', '营业中', '港口区', true],
].map(([name, address, manager, phone, status, region, isNew], index) => ({
  id: index + 1, name, address, manager, phone, status, region, isNew,
}))

const stores = ref(useBackend ? [] : starterStores)
const loading = ref(false)
const loadError = ref('')
const statusFilter = ref('全部')
const regionFilter = ref('全部区域')
const newOnly = ref(false)
const currentPage = ref(1)
const pageSize = 4
const dialogVisible = ref(false)
const inventoryVisible = ref(false)
const editingId = ref(null)
const selectedStore = ref(null)
const saving = ref(false)
const form = reactive({ name: '', address: '', manager: '', phone: '', status: '营业中', region: '西海岸' })

const summary = computed(() => summarizeStores(stores.value))

const filteredStores = computed(() => {
  const keyword = props.query.trim().toLowerCase()
  return stores.value.filter(store => {
    const matchesKeyword = !keyword || [store.name, store.address, store.manager, store.phone].some(value => String(value).toLowerCase().includes(keyword))
    const matchesStatus = statusFilter.value === '全部' || store.status === statusFilter.value
    const matchesRegion = regionFilter.value === '全部区域' || store.region === regionFilter.value
    return matchesKeyword && matchesStatus && matchesRegion && (!newOnly.value || store.isNew)
  })
})

const pageStores = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredStores.value.slice(start, start + pageSize)
})

const rangeText = computed(() => {
  if (!filteredStores.value.length) return '没有符合条件的门店'
  const start = (currentPage.value - 1) * pageSize + 1
  const end = Math.min(currentPage.value * pageSize, filteredStores.value.length)
  return `显示第 ${start}–${end} 条，共 ${filteredStores.value.length} 个门店`
})

watch([() => props.query, statusFilter, regionFilter, newOnly], () => { currentPage.value = 1 })

async function loadStores() {
  if (!useBackend || !supabase) return
  loading.value = true
  loadError.value = ''
  try {
    stores.value = await fetchAllStores(supabase)
  } catch (e) {
    loadError.value = e.message || '加载门店失败'
    ElMessage({ message: loadError.value, type: 'error', customClass: 'light-bites-message', duration: 3200 })
  } finally {
    loading.value = false
  }
}

onMounted(loadStores)

function openAdd() {
  editingId.value = null
  Object.assign(form, { name: '', address: '', manager: '', phone: '', status: '营业中', region: '西海岸' })
  dialogVisible.value = true
}

function openEdit(store) {
  editingId.value = store.id
  Object.assign(form, {
    name: store.name,
    address: store.address,
    manager: store.manager,
    phone: store.phone,
    status: store.status,
    region: store.region,
  })
  dialogVisible.value = true
}

async function saveStore() {
  if (!form.name.trim() || !form.address.trim() || !form.manager.trim() || !form.phone.trim()) {
    ElMessage({ message: '请完整填写门店信息', type: 'warning', customClass: 'light-bites-message', duration: 2400 })
    return
  }

  if (useBackend && supabase) {
    saving.value = true
    try {
      if (editingId.value) {
        await updateStore(supabase, editingId.value, form)
        ElMessage({ message: '门店信息已更新', type: 'success', customClass: 'light-bites-message', duration: 2400 })
      } else {
        await createStore(supabase, form)
        ElMessage({ message: '新门店已添加', type: 'success', customClass: 'light-bites-message', duration: 2400 })
      }
      await loadStores()
      emit('stores-changed')
      dialogVisible.value = false
    } catch (e) {
      const msg = e.message?.includes('duplicate') || e.code === '23505'
        ? '门店名称已存在，请换一个名称'
        : (e.message || '保存门店失败')
      ElMessage({ message: msg, type: 'error', customClass: 'light-bites-message', duration: 3200 })
    } finally {
      saving.value = false
    }
    return
  }

  if (editingId.value) {
    Object.assign(stores.value.find(store => store.id === editingId.value), { ...form })
    ElMessage({ message: '门店信息已更新', type: 'success', customClass: 'light-bites-message', duration: 2400 })
  } else {
    stores.value.unshift({ id: Date.now(), ...form, isNew: true })
    ElMessage({ message: '新门店已添加', type: 'success', customClass: 'light-bites-message', duration: 2400 })
  }
  dialogVisible.value = false
}

function openInventory(store) {
  selectedStore.value = store
  inventoryVisible.value = true
}
</script>

<template>
  <div class="store-management-content" v-loading="useBackend && loading">
    <p v-if="loadError" class="dashboard-error" role="alert">{{ loadError }}</p>
    <section class="store-page-heading">
      <div><h1>门店管理</h1><p>查看并控制区域网络内所有活跃及待处理的门店位置。</p></div>
      <el-button class="add-store-button" @click="openAdd"><AppIcon name="plus"/>添加新门店</el-button>
    </section>

    <section class="store-summary-grid" aria-label="门店网络摘要">
      <article class="store-summary-card"><span class="summary-icon green"><AppIcon name="globe"/></span><div><p>活跃市场</p><strong>{{ summary.openCount }}</strong><small>本月新增 {{ summary.newThisMonth }} 个</small></div></article>
      <article class="store-summary-card"><span class="summary-icon blue"><AppIcon name="check"/></span><div><p>网络健康度</p><strong>{{ summary.health }}%</strong><small>营业中门店占比</small></div></article>
      <article class="store-summary-card manager-card"><span class="summary-icon violet"><AppIcon name="users"/></span><div><p>区域负责人</p><div class="regional-manager"><span class="manager-avatar">AF</span><span><strong>Adrian Fletcher</strong><small>西海岸主管</small></span></div></div></article>
    </section>

    <section class="store-filter-panel" aria-label="门店筛选">
      <label class="store-search-field store-search-field--hint"><AppIcon name="search"/><span>使用顶部搜索框按名称、地址筛选</span></label>
      <el-select v-model="statusFilter" class="store-status-select" aria-label="门店状态">
        <el-option label="所有状态" value="全部"/><el-option label="营业中" value="营业中"/><el-option label="已关闭" value="已关闭"/>
      </el-select>
      <el-popover placement="bottom-end" :width="284" trigger="click" popper-class="store-filter-popover">
        <template #reference><el-button class="more-filter-button"><AppIcon name="filter"/>更多筛选</el-button></template>
        <div class="advanced-filter"><strong>所在区域</strong><div class="filter-chip-list"><button v-for="region in ['全部区域','西海岸','中心区','港口区']" :key="region" :class="{ active: regionFilter === region }" @click="regionFilter = region">{{ region }}</button></div><label><span><strong>仅看本月新增</strong><small>筛选最近加入网络的门店</small></span><el-switch v-model="newOnly"/></label></div>
      </el-popover>
    </section>

    <section class="store-table-card">
      <el-table :data="pageStores" class="store-management-table" table-layout="fixed" empty-text="暂无符合条件的门店">
        <el-table-column label="门店名称" min-width="200"><template #default="{ row }"><div class="store-name-cell"><span class="store-row-icon" :class="{ closed: row.status === '已关闭' }"><AppIcon name="store"/></span><strong>{{ row.name }}</strong></div></template></el-table-column>
        <el-table-column label="地址" min-width="170"><template #default="{ row }"><el-tooltip placement="top" :show-after="220" popper-class="store-detail-tooltip"><template #content><div class="store-tooltip-content"><span><AppIcon name="store"/></span><div><small>门店地址</small><strong>{{ row.address }}</strong></div></div></template><span class="store-detail-text" tabindex="0" :aria-label="`门店地址：${row.address}`">{{ row.address }}</span></el-tooltip></template></el-table-column>
        <el-table-column label="负责人" min-width="120"><template #default="{ row }"><el-tooltip placement="top" :show-after="220" popper-class="store-detail-tooltip"><template #content><div class="store-tooltip-content"><span><AppIcon name="users"/></span><div><small>门店负责人</small><strong>{{ row.manager }}</strong></div></div></template><span class="store-detail-text" tabindex="0" :aria-label="`门店负责人：${row.manager}`">{{ row.manager }}</span></el-tooltip></template></el-table-column>
        <el-table-column prop="phone" label="电话" min-width="128"/>
        <el-table-column label="状态" width="88"><template #default="{ row }"><span class="store-status" :class="row.status === '营业中' ? 'open' : 'closed'">{{ row.status }}</span></template></el-table-column>
        <el-table-column label="操作" width="82" align="right"><template #default="{ row }"><div class="store-row-actions"><el-button circle aria-label="编辑门店" @click="openEdit(row)"><AppIcon name="edit"/></el-button><el-button circle aria-label="查看库存" @click="openInventory(row)"><AppIcon name="settings"/></el-button></div></template></el-table-column>
      </el-table>
      <div class="store-pagination-row"><span>{{ rangeText }}</span><el-pagination v-model:current-page="currentPage" background layout="prev, pager, next" :page-size="pageSize" :total="filteredStores.length" :pager-count="5"/></div>
    </section>
  </div>

  <el-drawer v-model="dialogVisible" class="store-drawer" size="540px" :with-header="false">
    <div class="modal-header"><div><span class="eyebrow">门店档案</span><h2>{{ editingId ? '编辑门店' : '添加新门店' }}</h2></div><el-button class="icon-button" circle @click="dialogVisible = false"><AppIcon name="close"/></el-button></div>
    <el-form label-position="top" @submit.prevent="saveStore">
      <el-form-item label="门店名称"><el-input v-model="form.name" placeholder="例如：绿意轻食中心店"/></el-form-item>
      <el-form-item label="门店地址"><el-input v-model="form.address" placeholder="输入完整地址"/></el-form-item>
      <div class="form-row"><el-form-item label="负责人"><el-input v-model="form.manager" placeholder="负责人姓名"/></el-form-item><el-form-item label="联系电话"><el-input v-model="form.phone" placeholder="联系电话"/></el-form-item></div>
      <div class="form-row"><el-form-item label="所在区域"><el-select v-model="form.region"><el-option v-for="region in ['西海岸','中心区','港口区']" :key="region" :label="region" :value="region"/></el-select></el-form-item><el-form-item label="营业状态"><el-select v-model="form.status"><el-option label="营业中" value="营业中"/><el-option label="已关闭" value="已关闭"/></el-select></el-form-item></div>
      <div class="drawer-actions"><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" native-type="submit" :loading="saving">{{ editingId ? '保存更改' : '创建门店' }}</el-button></div>
    </el-form>
  </el-drawer>

  <el-drawer v-model="inventoryVisible" class="inventory-drawer" size="430px" :with-header="false">
    <div class="modal-header"><div><span class="eyebrow">门店库存</span><h2>{{ selectedStore?.name }}</h2></div><el-button class="icon-button" circle @click="inventoryVisible = false"><AppIcon name="close"/></el-button></div>
    <div class="inventory-store-meta"><span><AppIcon name="store"/></span><div><strong>{{ selectedStore?.address }}</strong><small>{{ selectedStore?.manager }} · {{ selectedStore?.phone }}</small></div></div>
    <div class="inventory-stats"><article><span>原料库存</span><strong>126 项</strong></article><article class="warning"><span>库存预警</span><strong>3 项</strong></article><article><span>最后盘点</span><strong>今天 09:40</strong></article></div>
    <el-button class="inventory-primary" type="primary" @click="ElMessage({ message: '已进入该门店库存管理', type: 'success', customClass: 'light-bites-message', duration: 2400 })">进入库存管理<AppIcon name="arrow"/></el-button>
  </el-drawer>
</template>

<style scoped>
.store-search-field--hint {
  color: var(--muted, #6b7280);
  font-size: 13px;
}
.store-search-field--hint span {
  padding-left: 4px;
}
</style>
