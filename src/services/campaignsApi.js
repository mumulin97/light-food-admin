export function mapCampaignRow(row) {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    desc: row.description,
    enabled: row.enabled,
    usageLabel: row.usage_label,
    usage: row.usage_text,
    roi: row.roi,
    expiry: row.expiry_text,
    scheduled: row.scheduled,
  }
}

function payload(row) {
  return {
    name: row.name.trim(),
    icon: row.icon || 'megaphone',
    description: row.desc?.trim() || '',
    enabled: Boolean(row.enabled),
    usage_label: row.usageLabel || '使用次数',
    usage_text: row.usage || '0 次',
    roi: row.roi || '无数据',
    expiry_text: row.expiry || '长期有效',
    scheduled: Boolean(row.scheduled),
  }
}

export async function fetchCampaigns(client) {
  const { data, error } = await client.from('marketing_campaigns').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(mapCampaignRow)
}

export async function createCampaign(client, row) {
  const { data, error } = await client.from('marketing_campaigns').insert(payload(row)).select('*').single()
  if (error) throw error
  return mapCampaignRow(data)
}

export async function setCampaignEnabled(client, id, enabled) {
  const { error } = await client.from('marketing_campaigns').update({ enabled }).eq('id', id)
  if (error) throw error
}

export async function updateCampaign(client, id, row) {
  const { error } = await client.from('marketing_campaigns').update(payload(row)).eq('id', id)
  if (error) throw error
}
