import { reactive } from 'vue'

const seedIngredients = [
  ['🥬', '嫩芽菠菜', 'VG-001', '蔬菜', 12.50, 'kg', 3.5, 10, '鲜农源配送'],
  ['🍗', '精选鸡胸肉', 'MT-042', '肉类', 28.00, 'kg', 85.0, 20, '汇源冷链'],
  ['🛢️', '一级大豆油', 'OIL-012', '粮油', 115.00, '桶', 12, 10, '中粮国际'],
  ['🍯', '赤砂糖', 'COND-05', '调料', 4.50, 'kg', 45.0, 10, '汇源冷链'],
  ['🍵', '茉莉绿茶底', 'BEV-101', '饮品底料', 88.00, 'kg', 15.0, 5, '茗茶工坊'],
  ['🥑', '有机牛油果', 'VG-018', '蔬菜', 24.00, 'kg', 6.0, 8, '鲜农源配送'],
  ['🐟', '冰鲜三文鱼', 'MT-051', '肉类', 96.00, 'kg', 30.0, 10, '汇源冷链'],
  ['🍚', '有机藜麦', 'GR-007', '粮油', 36.00, 'kg', 22.0, 15, '中粮国际'],
  ['🥛', '醇香燕麦奶', 'BEV-088', '饮品底料', 18.00, 'L', 40.0, 12, '茗茶工坊'],
  ['🧀', '低脂芝士', 'MT-063', '肉类', 52.00, 'kg', 9.0, 8, '汇源冷链'],
  ['🥒', '脆感黄瓜', 'VG-025', '蔬菜', 6.80, 'kg', 55.0, 15, '鲜农源配送'],
  ['🧂', '进口海盐', 'COND-11', '调料', 3.20, 'kg', 28.0, 5, '中粮国际'],
  ['🫒', '特级橄榄油', 'OIL-020', '粮油', 168.00, '桶', 4, 6, '中粮国际'],
  ['🍓', '冷冻草莓', 'VG-033', '蔬菜', 32.00, 'kg', 18.0, 10, '鲜农源配送'],
  ['🍋', '黄柠檬', 'VG-041', '蔬菜', 9.50, 'kg', 7.0, 10, '鲜农源配送'],
].map(([emoji, name, sku, category, price, unit, stock, threshold, supplier], i) => ({ id: i + 1, emoji, name, sku, category, price, unit, stock, threshold, supplier }))

export const inventoryStore = reactive({
  ingredients: seedIngredients,
})

// 配方（BOM）：产品 → [[原料 SKU, 每份用量], ...]
export const RECIPES = {
  抹茶能量碗: [['GR-007', 0.12], ['VG-001', 0.08], ['BEV-101', 0.02]],
  牛油果高纤卷: [['VG-018', 0.15], ['VG-025', 0.06], ['MT-063', 0.03]],
  藜麦田园沙拉: [['GR-007', 0.10], ['VG-001', 0.10], ['VG-025', 0.05]],
  冷萃燕麦杯: [['BEV-088', 0.25], ['COND-05', 0.01]],
  浆果排毒思慕雪: [['VG-033', 0.12], ['BEV-088', 0.15], ['VG-041', 0.03]],
  轻盈双人套餐: [['MT-042', 0.20], ['GR-007', 0.15], ['VG-001', 0.12], ['VG-025', 0.08]],
}

export function findIngredientBySku(sku) {
  return inventoryStore.ingredients.find(item => item.sku === sku)
}

export function stockStatus(item) {
  if (item.stock < item.threshold) return 'danger'
  if (item.stock <= item.threshold * 1.5) return 'warning'
  return 'normal'
}

export function formatStock(item) {
  const decimals = item.unit === 'kg' || item.unit === 'L' ? 1 : 0
  return `${Number(item.stock).toFixed(decimals)} ${item.unit}`
}

const IMPORT_EMOJI = { 蔬菜: '🥬', 肉类: '🍗', 粮油: '🌾', 调料: '🧂', 饮品底料: '🥤' }

// 批量导入：按 SKU 合并，已存在则更新、不存在则新增
export function upsertIngredients(rows = []) {
  let added = 0
  let updated = 0
  rows.forEach(row => {
    if (!row.sku || !row.name) return
    const existing = findIngredientBySku(row.sku)
    if (existing) {
      Object.assign(existing, {
        name: row.name,
        category: row.category || existing.category,
        price: Number.isFinite(row.price) ? row.price : existing.price,
        unit: row.unit || existing.unit,
        stock: Number.isFinite(row.stock) ? row.stock : existing.stock,
        threshold: Number.isFinite(row.threshold) ? row.threshold : existing.threshold,
        supplier: row.supplier || existing.supplier,
      })
      updated += 1
    } else {
      inventoryStore.ingredients.unshift({
        id: Date.now() + added,
        emoji: IMPORT_EMOJI[row.category] || '🥗',
        name: row.name,
        sku: row.sku,
        category: row.category || '蔬菜',
        price: Number.isFinite(row.price) ? row.price : 0,
        unit: row.unit || 'kg',
        stock: Number.isFinite(row.stock) ? row.stock : 0,
        threshold: Number.isFinite(row.threshold) ? row.threshold : 0,
        supplier: row.supplier || '待指定',
      })
      added += 1
    }
  })
  return { added, updated }
}

// 采购单确认：按建议量入库，返回入库明细
export function receivePurchase(list = []) {
  const received = []
  list.forEach(({ sku, suggest }) => {
    const ingredient = findIngredientBySku(sku)
    if (!ingredient || !suggest) return
    ingredient.stock = Number((ingredient.stock + suggest).toFixed(2))
    received.push({ name: ingredient.name, amount: suggest, unit: ingredient.unit })
  })
  return received
}

// 订单出餐：按配方扣减原料，返回扣减明细
export function consumeForOrder(items = []) {
  const consumed = new Map()
  items.forEach(([productName, qty]) => {
    const recipe = RECIPES[productName]
    if (!recipe) return
    recipe.forEach(([sku, perServing]) => {
      const ingredient = findIngredientBySku(sku)
      if (!ingredient) return
      const amount = Number((perServing * qty).toFixed(2))
      ingredient.stock = Math.max(0, Number((ingredient.stock - amount).toFixed(2)))
      const previous = consumed.get(sku)
      if (previous) previous.amount = Number((previous.amount + amount).toFixed(2))
      else consumed.set(sku, { name: ingredient.name, amount, unit: ingredient.unit })
    })
  })
  return [...consumed.values()]
}
