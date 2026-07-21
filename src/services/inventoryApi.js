import { inventoryStore } from '../stores/inventory'

export function mapIngredientRow(row) {
  return {
    id: row.id,
    emoji: row.emoji || '🥗',
    name: row.name,
    sku: row.sku,
    category: row.category || '蔬菜',
    price: Number(row.price),
    unit: row.unit || 'kg',
    stock: Number(row.stock),
    threshold: Number(row.threshold),
    supplier: row.supplier_name || '待指定',
  }
}

export async function fetchIngredients(client) {
  const { data, error } = await client.from('ingredients').select('*').order('name')
  if (error) throw error
  return (data || []).map(mapIngredientRow)
}

export async function syncInventoryStore(client) {
  const list = await fetchIngredients(client)
  inventoryStore.ingredients.splice(0, inventoryStore.ingredients.length, ...list)
  return list
}

function payload(row) {
  return {
    name: row.name.trim(),
    sku: row.sku.trim(),
    emoji: row.emoji || '🥗',
    category: row.category,
    price: Number(row.price) || 0,
    unit: row.unit || 'kg',
    stock: Number(row.stock) || 0,
    threshold: Number(row.threshold) || 0,
    supplier_name: row.supplier || '待指定',
  }
}

export async function createIngredient(client, row) {
  const { data, error } = await client.from('ingredients').insert(payload(row)).select('*').single()
  if (error) throw error
  return mapIngredientRow(data)
}

export async function updateIngredient(client, id, row) {
  const { data, error } = await client.from('ingredients').update(payload(row)).eq('id', id).select('*').single()
  if (error) throw error
  return mapIngredientRow(data)
}

export async function updateIngredientStock(client, id, stock) {
  const { error } = await client.from('ingredients').update({ stock }).eq('id', id)
  if (error) throw error
}

export async function deleteIngredient(client, id) {
  const { error } = await client.from('ingredients').delete().eq('id', id)
  if (error) throw error
}

export async function bulkAdjustStock(client, rows) {
  for (const { id, stock } of rows) {
    await updateIngredientStock(client, id, stock)
  }
}
