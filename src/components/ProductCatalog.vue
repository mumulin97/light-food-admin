<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AppIcon from './AppIcon.vue'

const props = defineProps({ query: { type: String, default: '' } })

const seedProducts = [
  ['夏日田园沙拉', '店长推荐', '沙拉类', 12.5, 42, '份', 320, 12, 24, true, '🥗'],
  ['藜麦能量碗', '套餐优惠', '轻食碗', 15, 8, '份', 450, 28, 35, true, '🥣'],
  ['清新青柠昔', '夏日必备', '营养昔', 8.5, 56, '瓶', 180, 2, 38, true, '🥤'],
  ['坚果生酮能量棒', '暂时缺货', '生酮零食', 4.5, 0, '份', 210, 8, 5, false, '🍫'],
  ['牛油果高纤沙拉', '高人气', '沙拉类', 13.5, 31, '份', 360, 14, 26, true, '🥑'],
  ['香煎鸡胸沙拉', '蛋白优选', '沙拉类', 14.5, 26, '份', 390, 32, 18, true, '🥗'],
  ['羽衣甘蓝鲜蔬沙拉', '低卡', '沙拉类', 11.5, 19, '份', 260, 9, 21, true, '🥬'],
  ['烤南瓜芝士沙拉', '秋日限定', '沙拉类', 12, 17, '份', 340, 13, 30, true, '🎃'],
  ['地中海鹰嘴豆沙拉', '素食', '沙拉类', 12.8, 22, '份', 370, 16, 42, true, '🥗'],
  ['鲜虾柚香沙拉', '新品', '沙拉类', 16.5, 13, '份', 310, 25, 20, true, '🍤'],
  ['莓果芝士沙拉', '轻甜', '沙拉类', 13, 11, '份', 330, 11, 34, true, '🫐'],
  ['照烧鸡肉糙米碗', '热销', '轻食碗', 16.5, 38, '份', 520, 34, 48, true, '🍚'],
  ['三文鱼波奇碗', '店长推荐', '轻食碗', 18.5, 24, '份', 490, 30, 41, true, '🍣'],
  ['韩式牛肉能量碗', '高蛋白', '轻食碗', 17.5, 20, '份', 560, 38, 44, true, '🥩'],
  ['菌菇豆腐轻食碗', '素食', '轻食碗', 14, 15, '份', 410, 21, 39, true, '🍄'],
  ['香辣金枪鱼碗', '微辣', '轻食碗', 17, 9, '份', 470, 32, 36, true, '🐟'],
  ['莓果排毒昔', '抗氧化', '营养昔', 9.5, 28, '瓶', 220, 4, 46, true, '🫐'],
  ['抹茶燕麦昔', '清爽', '营养昔', 9, 32, '瓶', 240, 8, 39, true, '🍵'],
  ['芒果椰香昔', '人气', '营养昔', 9.5, 18, '瓶', 260, 4, 52, true, '🥭'],
  ['黑芝麻蛋白昔', '高蛋白', '营养昔', 10.5, 7, '瓶', 280, 20, 31, true, '🥤'],
  ['海盐杏仁脆片', '低碳', '生酮零食', 5.5, 25, '袋', 190, 7, 6, true, '🥜'],
  ['椰香奇亚籽布丁', '无糖', '生酮零食', 6.5, 14, '杯', 230, 9, 8, true, '🥥'],
  ['可可花生蛋白球', '能量补给', '生酮零食', 5, 16, '份', 205, 11, 7, true, '🍫'],
  ['芝士亚麻籽饼干', '暂时缺货', '生酮零食', 4.8, 0, '袋', 180, 9, 4, false, '🧀'],
].map(([name, tag, category, price, stock, unit, calories, protein, carbs, enabled, emoji], index) => ({ id: index + 1, name, tag, category, price, stock, unit, calories, protein, carbs, enabled, emoji }))

const products = ref(seedProducts)
const activeCategory = ref('全部菜品')
const stockFilters = reactive({ inStock: true, outOfStock: true })
const currentPage = ref(1)
const pageSize = 4
const dialogVisible = ref(false)
const editingId = ref(null)
const form = reactive({ name: '', tag: '', category: '沙拉类', price: 12, stock: 20, unit: '份', calories: 300, protein: 12, carbs: 24, enabled: true, emoji: '🥗' })

const categories = computed(() => [
  ['全部菜品', products.value.length, 'grid'],
  ['沙拉类', products.value.filter(item => item.category === '沙拉类').length, 'leaf'],
  ['轻食碗', products.value.filter(item => item.category === '轻食碗').length, 'box'],
  ['营养昔', products.value.filter(item => item.category === '营养昔').length, 'money'],
  ['生酮零食', products.value.filter(item => item.category === '生酮零食').length, 'badge'],
])

const filteredProducts = computed(() => {
  const keyword = props.query.trim().toLowerCase()
  return products.value.filter(item => {
    const matchesCategory = activeCategory.value === '全部菜品' || item.category === activeCategory.value
    const matchesQuery = !keyword || [item.name, item.tag, item.category].some(value => value.toLowerCase().includes(keyword))
    const matchesStock = item.stock > 0 ? stockFilters.inStock : stockFilters.outOfStock
    return matchesCategory && matchesQuery && matchesStock
  })
})

const pageProducts = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredProducts.value.slice(start, start + pageSize)
})

const rangeText = computed(() => {
  if (!filteredProducts.value.length) return '没有符合条件的菜品'
  const start = (currentPage.value - 1) * pageSize + 1
  const end = Math.min(currentPage.value * pageSize, filteredProducts.value.length)
  return `显示第 ${start}–${end} 条，共 ${filteredProducts.value.length} 个菜品`
})

const lowStockCount = computed(() => products.value.filter(item => item.stock <= 8).length)

watch([activeCategory, () => stockFilters.inStock, () => stockFilters.outOfStock, () => props.query], () => { currentPage.value = 1 })

function openAdd() {
  editingId.value = null
  Object.assign(form, { name: '', tag: '', category: '沙拉类', price: 12, stock: 20, unit: '份', calories: 300, protein: 12, carbs: 24, enabled: true, emoji: '🥗' })
  dialogVisible.value = true
}

function openEdit(product) {
  editingId.value = product.id
  Object.assign(form, product)
  dialogVisible.value = true
}

function saveProduct() {
  if (!form.name.trim() || Number(form.price) <= 0) {
    ElMessage({ message: '请填写有效的菜品名称和价格', type: 'warning', customClass: 'light-bites-message', duration: 2400 })
    return
  }
  if (editingId.value) {
    Object.assign(products.value.find(item => item.id === editingId.value), form)
    ElMessage({ message: '菜品信息已更新', type: 'success', customClass: 'light-bites-message', duration: 2400 })
  } else {
    products.value.unshift({ id: Date.now(), ...form })
    ElMessage({ message: '新菜品已添加', type: 'success', customClass: 'light-bites-message', duration: 2400 })
  }
  dialogVisible.value = false
}

function toggleProduct(product, enabled) {
  product.enabled = enabled
  ElMessage({ message: `${product.name}已${enabled ? '上架' : '下架'}`, type: 'success', customClass: 'light-bites-message', duration: 2400 })
}

function handleAction(command, product) {
  if (command === 'edit') openEdit(product)
  if (command === 'duplicate') {
    products.value.unshift({ ...product, id: Date.now(), name: `${product.name}（副本）` })
    ElMessage({ message: '已复制菜品', type: 'success', customClass: 'light-bites-message', duration: 2400 })
  }
  if (command === 'stock') {
    product.stock += 10
    ElMessage({ message: `${product.name}库存已增加 10 ${product.unit}`, type: 'success', customClass: 'light-bites-message', duration: 2400 })
  }
}

function showLowStock() {
  activeCategory.value = '全部菜品'
  stockFilters.inStock = false
  stockFilters.outOfStock = true
  ElMessage({ message: '已筛选缺货菜品', type: 'success', customClass: 'light-bites-message', duration: 2400 })
}
</script>

<template>
  <div class="product-catalog-content">
    <section class="product-page-heading">
      <div><h1>菜品管理</h1><p>管理您的菜单项、营养成分和库存状态。</p></div>
      <el-button class="add-product-button" @click="openAdd"><AppIcon name="plus"/>添加菜品</el-button>
    </section>

    <section class="catalog-layout">
      <aside class="catalog-filter-card">
        <div class="catalog-filter-heading"><h2>类别筛选</h2><AppIcon name="filter"/></div>
        <div class="catalog-category-list">
          <button v-for="([label,count,icon]) in categories" :key="label" :class="{ active: activeCategory === label }" @click="activeCategory = label"><span><AppIcon :name="icon"/>{{ label }}</span><b>{{ count }}</b></button>
        </div>
        <div class="catalog-stock-filter"><h3>库存状态</h3><label><input v-model="stockFilters.inStock" type="checkbox"/><span>有货中</span><b>{{ products.filter(item => item.stock > 0).length }}</b></label><label><input v-model="stockFilters.outOfStock" type="checkbox"/><span>已售罄</span><b>{{ products.filter(item => item.stock === 0).length }}</b></label></div>
        <article class="catalog-alert-card"><span class="catalog-alert-icon"><AppIcon name="warning"/></span><h3>库存预警</h3><p>有 {{ lowStockCount }} 个项目库存严重不足，请立即检查并补货。</p><el-button @click="showLowStock">查看缺货详情</el-button></article>
      </aside>

      <div class="catalog-table-card">
        <el-table :data="pageProducts" class="catalog-table" table-layout="fixed" empty-text="暂无符合条件的菜品">
          <el-table-column label="菜品" min-width="190"><template #default="{ row }"><div class="catalog-product-cell"><span class="catalog-product-thumb">{{ row.emoji }}</span><span><strong>{{ row.name }}</strong><small>{{ row.tag }}</small></span></div></template></el-table-column>
          <el-table-column prop="category" label="类别" min-width="82"/>
          <el-table-column label="单价" width="72"><template #default="{ row }"><strong class="catalog-price">¥{{ row.price.toFixed(2) }}</strong></template></el-table-column>
          <el-table-column label="库存" width="70"><template #default="{ row }"><span class="catalog-stock" :class="{ low: row.stock <= 8 }"><AppIcon v-if="row.stock <= 8" name="warning"/>{{ row.stock }} {{ row.unit }}</span></template></el-table-column>
          <el-table-column label="热量" width="68"><template #default="{ row }"><span class="catalog-calories">{{ row.calories }}<small>kcal</small></span></template></el-table-column>
          <el-table-column label="状态" width="60" align="center"><template #default="{ row }"><el-switch :model-value="row.enabled" :disabled="row.stock === 0" aria-label="菜品上下架" @change="toggleProduct(row, $event)"/></template></el-table-column>
          <el-table-column width="42" align="right"><template #default="{ row }"><el-dropdown trigger="click" popper-class="catalog-action-menu" @command="handleAction($event,row)"><el-button class="catalog-more-button" circle aria-label="菜品操作"><AppIcon name="more"/></el-button><template #dropdown><el-dropdown-menu><el-dropdown-item command="edit">编辑菜品</el-dropdown-item><el-dropdown-item command="stock">快速补货 +10</el-dropdown-item><el-dropdown-item command="duplicate">创建副本</el-dropdown-item></el-dropdown-menu></template></el-dropdown></template></el-table-column>
        </el-table>
        <div class="catalog-pagination"><span>{{ rangeText }}</span><el-pagination v-model:current-page="currentPage" background layout="prev, pager, next" :page-size="pageSize" :total="filteredProducts.length" :pager-count="5"/></div>
      </div>
    </section>
  </div>

  <el-drawer v-model="dialogVisible" class="product-drawer" size="560px" :with-header="false">
    <div class="modal-header"><div><span class="eyebrow">菜单档案</span><h2>{{ editingId ? '编辑菜品' : '添加菜品' }}</h2></div><el-button class="icon-button" circle aria-label="关闭" @click="dialogVisible = false"><AppIcon name="close"/></el-button></div>
    <el-form label-position="top" @submit.prevent="saveProduct">
      <div class="product-form-name"><el-form-item label="菜品图标"><el-select v-model="form.emoji"><el-option v-for="emoji in ['🥗','🥣','🥤','🍫','🥑','🍣']" :key="emoji" :label="emoji" :value="emoji"/></el-select></el-form-item><el-form-item label="菜品名称"><el-input v-model="form.name" placeholder="输入菜品名称"/></el-form-item></div>
      <div class="form-row"><el-form-item label="菜品类别"><el-select v-model="form.category"><el-option v-for="category in ['沙拉类','轻食碗','营养昔','生酮零食']" :key="category" :label="category" :value="category"/></el-select></el-form-item><el-form-item label="营销标签"><el-input v-model="form.tag" placeholder="例如：新品、热销"/></el-form-item></div>
      <div class="product-form-grid"><el-form-item label="单价（元）"><el-input-number v-model="form.price" :min="0.1" :precision="2" :controls="false"/></el-form-item><el-form-item label="库存"><el-input-number v-model="form.stock" :min="0" :controls="false"/></el-form-item><el-form-item label="单位"><el-select v-model="form.unit"><el-option v-for="unit in ['份','瓶','杯','袋']" :key="unit" :label="unit" :value="unit"/></el-select></el-form-item></div>
      <div class="product-form-grid"><el-form-item label="热量 kcal"><el-input-number v-model="form.calories" :min="0" :controls="false"/></el-form-item><el-form-item label="蛋白质 g"><el-input-number v-model="form.protein" :min="0" :controls="false"/></el-form-item><el-form-item label="碳水 g"><el-input-number v-model="form.carbs" :min="0" :controls="false"/></el-form-item></div>
      <div class="product-availability-row"><span><strong>立即上架</strong><small>保存后在门店菜单中展示</small></span><el-switch v-model="form.enabled"/></div>
      <div class="drawer-actions"><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" @click="saveProduct">{{ editingId ? '保存更改' : '创建菜品' }}</el-button></div>
    </el-form>
  </el-drawer>
</template>
