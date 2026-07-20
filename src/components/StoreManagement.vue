<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AppIcon from './AppIcon.vue'

const starterStores = [
  ['绿色食坊 (The Green Pantry)', '西区花园街 124 号', 'Elena Rodriguez', '(555) 012-3456', '营业中', '西海岸', true],
  ['精致简餐 (Bite-Sized Bistro)', '市中心橡树大道 45 号', 'Marcus Thorne', '(555) 019-8765', '营业中', '中心区', false],
  ['都市绿洲 (装修中)', '中央天际线大道 892 号', 'Sarah Jenkins', '(555) 021-4433', '已关闭', '中心区', false],
  ['每日磨坊 (The Daily Grind)', '码头区港口码头 12 号', 'David Lee', '(555) 088-9900', '营业中', '港口区', true],
  ['鲜蔬实验室', '西区松林街 76 号', 'Mia Chen', '(555) 010-2018', '营业中', '西海岸', false],
  ['轻盈厨房', '中心区晨曦路 188 号', 'Noah Wilson', '(555) 030-7712', '营业中', '中心区', false],
  ['海岸能量站', '海滨大道 9 号', 'Olivia Martin', '(555) 046-3388', '营业中', '西海岸', false],
  ['谷物日记', '港口区仓湾路 116 号', 'Ethan Young', '(555) 052-8041', '已关闭', '港口区', false],
  ['田园沙拉社', '西区香草路 62 号', 'Ava Thompson', '(555) 017-9250', '营业中', '西海岸', false],
  ['城市轻食站', '中心广场 201 号', 'Lucas King', '(555) 067-1842', '营业中', '中心区', false],
  ['港湾鲜食', '码头区桅杆街 22 号', 'Emma White', '(555) 073-6104', '营业中', '港口区', false],
  ['薄荷小馆', '西区水杉路 15 号', 'James Moore', '(555) 082-1179', '营业中', '西海岸', false],
  ['清晨燕麦屋', '中心区云杉大道 77 号', 'Sophia Hall', '(555) 091-7260', '营业中', '中心区', false],
  ['蔚蓝餐桌', '港口区滨水路 308 号', 'Henry Allen', '(555) 014-5531', '营业中', '港口区', false],
  ['元气午餐', '西区学院街 39 号', 'Isabella Scott', '(555) 025-4419', '营业中', '西海岸', false],
  ['拾味健康餐', '中心区市场路 108 号', 'Daniel Green', '(555) 036-9822', '营业中', '中心区', false],
  ['海风简餐', '港口区灯塔路 51 号', 'Grace Baker', '(555) 047-3205', '已关闭', '港口区', false],
  ['绿洲能量碗', '西区榆树街 84 号', 'Jack Adams', '(555) 058-7773', '营业中', '西海岸', false],
  ['午后果园', '中心区星河路 26 号', 'Chloe Nelson', '(555) 069-2148', '营业中', '中心区', false],
  ['码头沙拉铺', '港口区船厂街 4 号', 'Leo Carter', '(555) 071-8406', '营业中', '港口区', false],
  ['自然三明治', '西区公园路 144 号', 'Lily Mitchell', '(555) 083-5062', '营业中', '西海岸', false],
  ['每日蔬醒', '中心区剧院街 19 号', 'Ryan Perez', '(555) 094-1320', '营业中', '中心区', false],
  ['港湾谷物社', '港口区堤岸路 68 号', 'Zoe Roberts', '(555) 015-6684', '营业中', '港口区', false],
  ['轻食公园', '西区森林大道 203 号', 'Owen Turner', '(555) 026-4007', '营业中', '西海岸', false],
].map(([name, address, manager, phone, status, region, isNew], index) => ({
  id: index + 1, name, address, manager, phone, status, region, isNew,
}))

const stores = ref(starterStores)
const query = ref('')
const statusFilter = ref('全部')
const regionFilter = ref('全部区域')
const newOnly = ref(false)
const currentPage = ref(1)
const pageSize = 4
const dialogVisible = ref(false)
const inventoryVisible = ref(false)
const editingId = ref(null)
const selectedStore = ref(null)
const form = reactive({ name: '', address: '', manager: '', phone: '', status: '营业中', region: '西海岸' })

const filteredStores = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  return stores.value.filter(store => {
    const matchesKeyword = !keyword || [store.name, store.address, store.manager, store.phone].some(value => value.toLowerCase().includes(keyword))
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

watch([query, statusFilter, regionFilter, newOnly], () => { currentPage.value = 1 })

function openAdd() {
  editingId.value = null
  Object.assign(form, { name: '', address: '', manager: '', phone: '', status: '营业中', region: '西海岸' })
  dialogVisible.value = true
}

function openEdit(store) {
  editingId.value = store.id
  Object.assign(form, store)
  dialogVisible.value = true
}

function saveStore() {
  if (!form.name.trim() || !form.address.trim() || !form.manager.trim() || !form.phone.trim()) {
    ElMessage({ message: '请完整填写门店信息', type: 'warning', customClass: 'light-bites-message', duration: 2400 })
    return
  }
  if (editingId.value) {
    Object.assign(stores.value.find(store => store.id === editingId.value), form)
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
  <div class="store-management-content">
    <section class="store-page-heading">
      <div><h1>门店管理</h1><p>查看并控制区域网络内所有活跃及待处理的门店位置。</p></div>
      <el-button class="add-store-button" @click="openAdd"><AppIcon name="plus"/>添加新门店</el-button>
    </section>

    <section class="store-summary-grid" aria-label="门店网络摘要">
      <article class="store-summary-card"><span class="summary-icon green"><AppIcon name="globe"/></span><div><p>活跃市场</p><strong>12</strong><small>本月新增 2 个</small></div></article>
      <article class="store-summary-card"><span class="summary-icon blue"><AppIcon name="check"/></span><div><p>网络健康度</p><strong>98.4%</strong><small>全店平均正常运行时间</small></div></article>
      <article class="store-summary-card manager-card"><span class="summary-icon violet"><AppIcon name="users"/></span><div><p>区域负责人</p><div class="regional-manager"><span class="manager-avatar">AF</span><span><strong>Adrian Fletcher</strong><small>西海岸主管</small></span></div></div></article>
    </section>

    <section class="store-filter-panel" aria-label="门店筛选">
      <label class="store-search-field"><AppIcon name="search"/><input v-model="query" type="search" placeholder="按名称、地址搜索..." aria-label="按名称、地址搜索" /></label>
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
      <div class="drawer-actions"><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" native-type="submit">{{ editingId ? '保存更改' : '创建门店' }}</el-button></div>
    </el-form>
  </el-drawer>

  <el-drawer v-model="inventoryVisible" class="inventory-drawer" size="430px" :with-header="false">
    <div class="modal-header"><div><span class="eyebrow">门店库存</span><h2>{{ selectedStore?.name }}</h2></div><el-button class="icon-button" circle @click="inventoryVisible = false"><AppIcon name="close"/></el-button></div>
    <div class="inventory-store-meta"><span><AppIcon name="store"/></span><div><strong>{{ selectedStore?.address }}</strong><small>{{ selectedStore?.manager }} · {{ selectedStore?.phone }}</small></div></div>
    <div class="inventory-stats"><article><span>原料库存</span><strong>126 项</strong></article><article class="warning"><span>库存预警</span><strong>3 项</strong></article><article><span>最后盘点</span><strong>今天 09:40</strong></article></div>
    <el-button class="inventory-primary" type="primary" @click="ElMessage({ message: '已进入该门店库存管理', type: 'success', customClass: 'light-bites-message', duration: 2400 })">进入库存管理<AppIcon name="arrow"/></el-button>
  </el-drawer>
</template>
