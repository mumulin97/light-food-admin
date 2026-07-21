export function mapProductRow(row) {
  return {
    id: row.id,
    name: row.name,
    tag: row.tag || '',
    category: row.category || '沙拉类',
    price: Number(row.price),
    stock: Number(row.stock),
    unit: row.unit || '份',
    calories: Number(row.calories),
    protein: Number(row.protein),
    carbs: Number(row.carbs),
    enabled: Boolean(row.is_active),
    emoji: row.emoji || '🥗',
  }
}

function toDbPayload(product) {
  return {
    name: product.name.trim(),
    price: Number(product.price),
    is_active: Boolean(product.enabled),
    tag: (product.tag || '').trim(),
    category: product.category,
    stock: Number(product.stock),
    unit: product.unit || '份',
    calories: Math.round(Number(product.calories) || 0),
    protein: Number(product.protein) || 0,
    carbs: Number(product.carbs) || 0,
    emoji: product.emoji || '🥗',
  }
}

export async function fetchCatalogProducts(client) {
  const { data, error } = await client
    .from('products')
    .select('id, name, price, is_active, tag, category, stock, unit, calories, protein, carbs, emoji, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(mapProductRow)
}

export async function createCatalogProduct(client, product) {
  const { data, error } = await client
    .from('products')
    .insert(toDbPayload(product))
    .select('id, name, price, is_active, tag, category, stock, unit, calories, protein, carbs, emoji')
    .single()
  if (error) throw error
  return mapProductRow(data)
}

export async function updateCatalogProduct(client, id, product) {
  const { data, error } = await client
    .from('products')
    .update(toDbPayload(product))
    .eq('id', id)
    .select('id, name, price, is_active, tag, category, stock, unit, calories, protein, carbs, emoji')
    .single()
  if (error) throw error
  return mapProductRow(data)
}

export async function setProductActive(client, id, enabled) {
  const { error } = await client.from('products').update({ is_active: enabled }).eq('id', id)
  if (error) throw error
}

export async function adjustProductStock(client, id, delta) {
  const { data: row, error: readError } = await client.from('products').select('stock').eq('id', id).single()
  if (readError) throw readError
  const next = Math.max(0, Number(row.stock) + delta)
  const { error } = await client.from('products').update({ stock: next }).eq('id', id)
  if (error) throw error
  return next
}

export async function duplicateCatalogProduct(client, product) {
  let name = `${product.name}（副本）`
  let attempt = 1
  while (attempt < 20) {
    try {
      return await createCatalogProduct(client, { ...product, name, enabled: product.enabled })
    } catch (e) {
      if (e.code === '23505' || e.message?.includes('duplicate')) {
        attempt += 1
        name = `${product.name}（副本${attempt}）`
        continue
      }
      throw e
    }
  }
  throw new Error('复制菜品失败，请手动修改名称')
}
