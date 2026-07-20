<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AppIcon from './AppIcon.vue'
import { inventoryStore, stockStatus, formatStock, receivePurchase, upsertIngredients } from '../stores/inventory'

const props = defineProps({
  query: { type: String, default: '' },
})

const TOTAL_INGREDIENTS = 124
const pageSize = 5
const CATEGORY_TABS = ['全部', '蔬菜', '肉类', '粮油', '饮品']
const CATEGORY_OPTIONS = ['蔬菜', '肉类', '粮油', '调料', '饮品底料']
const UNIT_OPTIONS = ['kg', '桶', 'L', '个', '袋']

const activeCategory = ref('全部')
const activeSupplier = ref('所有供应商')
const invPage = ref(1)

const addVisible = ref(false)
const addForm = reactive({ emoji: '🥗', name: '', sku: '', category: '蔬菜', price: 0, unit: 'kg', stock: 0, threshold: 0, supplier: '鲜农源配送' })

const stockVisible = ref(false)
const stockTarget = ref(null)
const stockForm = reactive({ mode: 'in', amount: 0 })

const purchaseVisible = ref(false)

const suppliers = computed(() => ['所有供应商', ...new Set(inventoryStore.ingredients.map(item => item.supplier))])

const filteredIngredients = computed(() => {
  const keyword = props.query.trim().toLowerCase()
  return inventoryStore.ingredients.filter(item => {
    const categoryMatched = activeCategory.value === '全部' || item.category.includes(activeCategory.value)
    const supplierMatched = activeSupplier.value === '所有供应商' || item.supplier === activeSupplier.value
    const queryMatched = !keyword || item.name.toLowerCase().includes(keyword) || item.sku.toLowerCase().includes(keyword)
    return categoryMatched && supplierMatched && queryMatched
  })
})

const hasFilter = computed(() => activeCategory.value !== '全部' || activeSupplier.value !== '所有供应商' || Boolean(props.query.trim()))
const pageIngredients = computed(() => filteredIngredients.value.slice((invPage.value - 1) * pageSize, invPage.value * pageSize))
const totalLabel = computed(() => (hasFilter.value ? filteredIngredients.value.length : TOTAL_INGREDIENTS).toLocaleString('en-US'))
const invRange = computed(() => {
  const total = filteredIngredients.value.length
  if (!total) return '没有符合条件的原料'
  const start = (invPage.value - 1) * pageSize + 1
  const end = Math.min(invPage.value * pageSize, total)
  return `显示第 ${start} 至 ${end} 条，共 ${totalLabel.value} 条原料`
})

const restockList = computed(() => inventoryStore.ingredients
  .filter(item => item.stock <= item.threshold * 1.5)
  .map(item => {
    const suggest = Math.max(0, Math.ceil(item.threshold * 2 - item.stock))
    return { ...item, suggest, subtotal: suggest * item.price }
  }))
const restockTotal = computed(() => restockList.value.reduce((sum, item) => sum + item.subtotal, 0))

watch([activeCategory, activeSupplier, () => props.query], () => { invPage.value = 1 })

function formatMoney(value) {
  return `¥${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function openAdd() {
  Object.assign(addForm, { emoji: '🥗', name: '', sku: '', category: '蔬菜', price: 0, unit: 'kg', stock: 0, threshold: 0, supplier: '鲜农源配送' })
  addVisible.value = true
}

function saveIngredient() {
  if (!addForm.name.trim() || !addForm.sku.trim()) {
    ElMessage({ message: '请填写原料名称和 SKU', type: 'warning', customClass: 'light-bites-message', duration: 2400 })
    return
  }
  inventoryStore.ingredients.unshift({ id: Date.now(), ...addForm, name: addForm.name.trim(), sku: addForm.sku.trim(), price: Number(addForm.price) || 0, stock: Number(addForm.stock) || 0, threshold: Number(addForm.threshold) || 0 })
  invPage.value = 1
  addVisible.value = false
  ElMessage({ message: `原料「${addForm.name.trim()}」已新增`, type: 'success', customClass: 'light-bites-message', duration: 2400 })
}

function openStock(item) {
  stockTarget.value = item
  Object.assign(stockForm, { mode: 'in', amount: 0 })
  stockVisible.value = true
}

function saveStock() {
  const item = stockTarget.value
  if (!item) return
  const amount = Number(stockForm.amount) || 0
  if (stockForm.mode === 'in') item.stock = item.stock + amount
  if (stockForm.mode === 'out') item.stock = Math.max(0, item.stock - amount)
  if (stockForm.mode === 'set') item.stock = Math.max(0, amount)
  stockVisible.value = false
  ElMessage({ message: `${item.name} 当前库存已更新为 ${formatStock(item)}`, type: 'success', customClass: 'light-bites-message', duration: 2400 })
}

function handleAction(command, item) {
  if (command === 'stock') openStock(item)
  if (command === 'edit') ElMessage({ message: `正在编辑「${item.name}」`, customClass: 'light-bites-message', duration: 2200 })
  if (command === 'delete') {
    inventoryStore.ingredients = inventoryStore.ingredients.filter(row => row.id !== item.id)
    ElMessage({ message: `原料「${item.name}」已删除`, type: 'success', customClass: 'light-bites-message', duration: 2400 })
  }
}

function generatePurchase() {
  if (!restockList.value.length) {
    ElMessage({ message: '当前无需补货的原料', customClass: 'light-bites-message', duration: 2400 })
    return
  }
  purchaseVisible.value = true
}

function confirmPurchase() {
  const amount = restockTotal.value
  const received = receivePurchase(restockList.value.map(item => ({ sku: item.sku, suggest: item.suggest })))
  purchaseVisible.value = false
  ElMessage({ message: `采购单已生成并入库，共 ${received.length} 项原料，金额 ${formatMoney(amount)}`, type: 'success', customClass: 'light-bites-message', duration: 2400 })
}

const importInput = ref(null)

function triggerImport() {
  importInput.value?.click()
}

// 解析一行 CSV（支持引号包裹与转义的 ""）
function parseCsvLine(line) {
  const cells = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i += 1 } else quoted = false
      } else cur += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { cells.push(cur); cur = '' }
    else cur += ch
  }
  cells.push(cur)
  return cells.map(cell => cell.trim())
}

function handleImportFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    const text = String(reader.result || '').replace(/^\uFEFF/, '')
    const lines = text.split(/\r?\n/).filter(line => line.trim())
    if (lines.length < 2) {
      ElMessage.warning('文件内容为空，请使用导出的 CSV 模板')
      return
    }
    // 跳过表头：原料名称,SKU,分类,采购单价,单位,当前库存,预警阈值,供应商
    const rows = lines.slice(1).map(line => {
      const [name, sku, category, price, unit, stock, threshold, supplier] = parseCsvLine(line)
      return { name, sku, category, price: Number(price), unit, stock: Number(stock), threshold: Number(threshold), supplier }
    }).filter(row => row.sku && row.name)

    if (!rows.length) {
      ElMessage.warning('未解析到有效原料数据，请检查文件格式')
      return
    }
    const { added, updated } = upsertIngredients(rows)
    invPage.value = 1
    ElMessage.success(`导入完成：新增 ${added} 项，更新 ${updated} 项`)
  }
  reader.onerror = () => ElMessage.error('文件读取失败，请重试')
  reader.readAsText(file, 'utf-8')
}

function exportIngredients() {
  const rows = [['原料名称', 'SKU', '分类', '采购单价', '单位', '当前库存', '预警阈值', '供应商'], ...filteredIngredients.value.map(item => [item.name, item.sku, item.category, item.price.toFixed(2), item.unit, item.stock, item.threshold, item.supplier])]
  const csv = `﻿${rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')}`
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = '原料库存.csv'
  link.click()
  URL.revokeObjectURL(url)
  ElMessage.success('原料库存已导出')
}
</script>

<template>
  <div class="inventory-content">
    <section class="inv-metrics" aria-label="库存概况">
      <article class="inv-card accent-green"><p>原料总数</p><div class="inv-figure-row"><strong>{{ TOTAL_INGREDIENTS }}</strong><span class="inv-trend"><AppIcon name="arrow" />+5</span></div></article>
      <article class="inv-card accent-red"><p>库存预警</p><div class="inv-figure-row"><strong class="danger">12</strong><span class="inv-need">需采购</span></div></article>
      <article class="inv-card accent-dark"><p>今日入库</p><div class="inv-figure-row"><strong>420kg</strong><span class="inv-sub">8 条记录</span></div></article>
      <article class="inv-card inv-suggest">
        <AppIcon class="inv-suggest-bg" name="cart" />
        <div><p>智能补货建议</p><small>基于近 7 天消耗量，建议立即补货蔬菜及禽肉类原料。</small></div>
        <el-button class="inv-suggest-button" @click="generatePurchase">生成采购单</el-button>
      </article>
    </section>

    <section class="inv-toolbar">
      <div class="inv-tabs" role="tablist">
        <button v-for="tab in CATEGORY_TABS" :key="tab" type="button" role="tab" :class="{ active: activeCategory === tab }" @click="activeCategory = tab">{{ tab }}</button>
        <span class="inv-toolbar-divider" />
        <el-dropdown trigger="click" popper-class="inv-supplier-menu" @command="activeSupplier = $event">
          <button type="button" class="inv-supplier-button">{{ activeSupplier }}<AppIcon name="chevron" /></button>
          <template #dropdown><el-dropdown-menu><el-dropdown-item v-for="item in suppliers" :key="item" :command="item" :class="{ selected: activeSupplier === item }"><span>{{ item }}</span><AppIcon v-if="activeSupplier === item" name="check" /></el-dropdown-item></el-dropdown-menu></template>
        </el-dropdown>
      </div>
      <div class="inv-toolbar-actions">
        <el-button class="member-primary-button" @click="openAdd"><AppIcon name="plus" />新增原料</el-button>
        <span class="inv-toolbar-divider" />
        <el-button class="inv-icon-button" aria-label="导入原料" title="导入 CSV" @click="triggerImport"><AppIcon name="upload" /></el-button>
        <input ref="importInput" type="file" accept=".csv,text/csv" class="inv-file-input" @change="handleImportFile" />
        <el-button class="inv-icon-button" aria-label="导出" @click="exportIngredients"><AppIcon name="download" /></el-button>
        <el-button class="inv-icon-button" aria-label="库存变更历史" @click="ElMessage({ message: '正在打开库存变更历史', customClass: 'light-bites-message', duration: 2200 })"><AppIcon name="history" /></el-button>
      </div>
    </section>

    <div class="member-table-card">
      <el-table :data="pageIngredients" class="member-table inv-table" table-layout="fixed" empty-text="没有符合条件的原料">
        <el-table-column label="原料名称" min-width="210"><template #default="{ row }"><div class="inv-name-cell"><span class="inv-thumb">{{ row.emoji }}</span><span><strong>{{ row.name }}</strong><small>SKU: {{ row.sku }}</small></span></div></template></el-table-column>
        <el-table-column label="分类" min-width="124"><template #default="{ row }"><span class="inv-category">{{ row.category }}</span></template></el-table-column>
        <el-table-column label="采购单价" min-width="120"><template #default="{ row }"><span class="inv-price">{{ formatMoney(row.price) }} / {{ row.unit }}</span></template></el-table-column>
        <el-table-column label="当前库存" min-width="110"><template #default="{ row }"><strong v-if="stockStatus(row) === 'normal'" class="inv-stock">{{ formatStock(row) }}</strong><span v-else class="inv-stock-pill" :class="stockStatus(row)">{{ formatStock(row) }}</span></template></el-table-column>
        <el-table-column label="预警阈值" min-width="100"><template #default="{ row }"><span class="inv-threshold">{{ row.threshold }} {{ row.unit }}</span></template></el-table-column>
        <el-table-column label="供应商" min-width="120"><template #default="{ row }"><span class="inv-supplier">{{ row.supplier }}</span></template></el-table-column>
        <el-table-column label="操作" width="150" align="right"><template #default="{ row }"><div class="inv-actions"><button type="button" class="inv-action-link" @click="openStock(row)">调整库存</button><el-dropdown trigger="click" popper-class="inv-action-menu" @command="handleAction($event, row)"><el-button class="inv-more-button" circle aria-label="更多操作"><AppIcon name="more" /></el-button><template #dropdown><el-dropdown-menu><el-dropdown-item command="stock">调整库存</el-dropdown-item><el-dropdown-item command="edit">编辑资料</el-dropdown-item><el-dropdown-item command="delete" divided class="danger-text">删除原料</el-dropdown-item></el-dropdown-menu></template></el-dropdown></div></template></el-table-column>
      </el-table>
      <footer class="member-table-footer"><span>{{ invRange }}</span><el-pagination v-model:current-page="invPage" background layout="prev, pager, next" :page-size="pageSize" :total="filteredIngredients.length" :pager-count="5" /></footer>
    </div>
  </div>

  <el-drawer v-model="addVisible" class="inv-drawer" size="540px" :with-header="false">
    <div class="modal-header"><div><span class="eyebrow">原料档案</span><h2>新增原料</h2></div><el-button class="icon-button" circle aria-label="关闭" @click="addVisible = false"><AppIcon name="close" /></el-button></div>
    <el-form label-position="top" @submit.prevent="saveIngredient">
      <div class="form-row"><el-form-item label="原料名称"><el-input v-model="addForm.name" placeholder="输入原料名称" /></el-form-item><el-form-item label="SKU 编号"><el-input v-model="addForm.sku" placeholder="如 VG-001" /></el-form-item></div>
      <div class="form-row"><el-form-item label="分类"><el-select v-model="addForm.category"><el-option v-for="item in CATEGORY_OPTIONS" :key="item" :label="item" :value="item" /></el-select></el-form-item><el-form-item label="供应商"><el-select v-model="addForm.supplier"><el-option v-for="item in suppliers.filter(s => s !== '所有供应商')" :key="item" :label="item" :value="item" /></el-select></el-form-item></div>
      <div class="form-row"><el-form-item label="采购单价 (¥)"><el-input-number v-model="addForm.price" :min="0" :step="1" :controls="false" /></el-form-item><el-form-item label="单位"><el-select v-model="addForm.unit"><el-option v-for="item in UNIT_OPTIONS" :key="item" :label="item" :value="item" /></el-select></el-form-item></div>
      <div class="form-row"><el-form-item label="当前库存"><el-input-number v-model="addForm.stock" :min="0" :step="1" :controls="false" /></el-form-item><el-form-item label="预警阈值"><el-input-number v-model="addForm.threshold" :min="0" :step="1" :controls="false" /></el-form-item></div>
      <div class="drawer-actions"><el-button @click="addVisible = false">取消</el-button><el-button type="primary" @click="saveIngredient">新增原料</el-button></div>
    </el-form>
  </el-drawer>

  <el-drawer v-model="stockVisible" class="inv-stock-drawer" size="480px" :with-header="false">
    <div class="modal-header"><div><span class="eyebrow">{{ stockTarget?.name }} · 当前 {{ stockTarget ? formatStock(stockTarget) : '' }}</span><h2>调整库存</h2></div><el-button class="icon-button" circle aria-label="关闭" @click="stockVisible = false"><AppIcon name="close" /></el-button></div>
    <el-form label-position="top" @submit.prevent="saveStock">
      <el-form-item label="调整方式"><el-select v-model="stockForm.mode"><el-option label="入库" value="in" /><el-option label="出库" value="out" /><el-option label="盘点设为" value="set" /></el-select></el-form-item>
      <el-form-item :label="`数量（${stockTarget?.unit || ''}）`"><el-input-number v-model="stockForm.amount" :min="0" :step="1" :controls="false" /></el-form-item>
      <div class="drawer-actions"><el-button @click="stockVisible = false">取消</el-button><el-button type="primary" @click="saveStock">确认调整</el-button></div>
    </el-form>
  </el-drawer>

  <el-drawer v-model="purchaseVisible" class="inv-purchase-drawer" size="540px" :with-header="false">
    <div class="modal-header"><div><span class="eyebrow">智能补货</span><h2>生成采购单</h2></div><el-button class="icon-button" circle aria-label="关闭" @click="purchaseVisible = false"><AppIcon name="close" /></el-button></div>
    <p class="inv-purchase-tip">以下 {{ restockList.length }} 项原料库存已低于或临近预警阈值，建议补货：</p>
    <div class="inv-purchase-list">
      <div v-for="item in restockList" :key="item.id" class="inv-purchase-item">
        <span class="inv-thumb">{{ item.emoji }}</span>
        <div class="inv-purchase-info"><strong>{{ item.name }}</strong><small>当前 {{ formatStock(item) }} · 阈值 {{ item.threshold }} {{ item.unit }}</small></div>
        <div class="inv-purchase-qty"><strong>+{{ item.suggest }} {{ item.unit }}</strong><small>{{ formatMoney(item.subtotal) }}</small></div>
      </div>
    </div>
    <div class="inv-purchase-total"><span>预计采购金额</span><strong>{{ formatMoney(restockTotal) }}</strong></div>
    <div class="drawer-actions"><el-button @click="purchaseVisible = false">取消</el-button><el-button type="primary" @click="confirmPurchase">确认生成</el-button></div>
  </el-drawer>
</template>
