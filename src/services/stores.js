function isNewThisMonth(createdAt) {
  const created = new Date(createdAt)
  const now = new Date()
  return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth()
}

export function mapStoreRow(row) {
  return {
    id: row.id,
    name: row.name,
    address: row.address || '',
    manager: row.manager || '',
    phone: row.phone || '',
    status: row.status || '营业中',
    region: row.region || '西海岸',
    isNew: isNewThisMonth(row.created_at),
    created_at: row.created_at,
  }
}

export async function fetchAllStores(client) {
  const { data, error } = await client
    .from('stores')
    .select('id, name, address, manager, phone, status, region, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(mapStoreRow)
}

export async function createStore(client, store) {
  const { data, error } = await client
    .from('stores')
    .insert({
      name: store.name.trim(),
      address: store.address.trim(),
      manager: store.manager.trim(),
      phone: store.phone.trim(),
      status: store.status,
      region: store.region,
    })
    .select('id, name, address, manager, phone, status, region, created_at')
    .single()
  if (error) throw error
  return mapStoreRow(data)
}

export async function updateStore(client, id, store) {
  const { data, error } = await client
    .from('stores')
    .update({
      name: store.name.trim(),
      address: store.address.trim(),
      manager: store.manager.trim(),
      phone: store.phone.trim(),
      status: store.status,
      region: store.region,
    })
    .eq('id', id)
    .select('id, name, address, manager, phone, status, region, created_at')
    .single()
  if (error) throw error
  return mapStoreRow(data)
}

export function summarizeStores(stores) {
  const openCount = stores.filter(s => s.status === '营业中').length
  const newThisMonth = stores.filter(s => s.isNew).length
  const health = stores.length ? ((openCount / stores.length) * 100).toFixed(1) : '—'
  return { openCount, newThisMonth, health, total: stores.length }
}
