export function mapSupplierRow(row) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    category: row.category,
    contact: row.contact_name,
    phone: row.phone,
    status: row.status,
    score: row.score,
    fulfillment: row.fulfillment,
    licenseNo: row.license_no,
    licenseExpiry: row.license_expiry,
  }
}

function payload(row) {
  return {
    name: row.name.trim(),
    address: row.address?.trim() || '',
    category: row.category,
    contact_name: row.contact?.trim() || '',
    phone: row.phone?.trim() || '',
    status: row.status,
    score: row.score || 'A',
    fulfillment: Number(row.fulfillment) || 95,
    license_no: row.licenseNo || '',
    license_expiry: row.licenseExpiry instanceof Date
      ? row.licenseExpiry.toISOString().slice(0, 10)
      : row.licenseExpiry,
  }
}

export async function fetchSuppliers(client) {
  const { data, error } = await client.from('suppliers').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(mapSupplierRow)
}

export async function createSupplier(client, row) {
  const { data, error } = await client.from('suppliers').insert(payload(row)).select('*').single()
  if (error) throw error
  return mapSupplierRow(data)
}

export async function updateSupplier(client, id, row) {
  const { data, error } = await client.from('suppliers').update(payload(row)).eq('id', id).select('*').single()
  if (error) throw error
  return mapSupplierRow(data)
}

export async function renewSupplierLicense(client, id, expiryIso) {
  const { error } = await client.from('suppliers').update({ license_expiry: expiryIso }).eq('id', id)
  if (error) throw error
}

export async function deleteSupplier(client, id) {
  const { error } = await client.from('suppliers').delete().eq('id', id)
  if (error) throw error
}
