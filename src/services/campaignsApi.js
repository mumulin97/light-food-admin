const META_PREFIX = '__CAMPAIGN_META__'

function inferMeta(row) {
  if (row.name?.includes('满减')) return { type: '满减', threshold: 50, discount: 10, rate: 1, product: '全部商品', audience: '全部顾客', channel: '全渠道', budget: 3000 }
  if (row.name?.includes('套餐')) return { type: '件数折扣', threshold: 2, discount: 0, rate: 0.9, product: '全部商品', audience: '会员', channel: '全渠道', budget: 2000 }
  return { type: '折扣', threshold: 0, discount: 0, rate: 0.8, product: '全部商品', audience: '全部顾客', channel: '全渠道', budget: 0 }
}

function decodeDescription(row) {
  const description = row.description || ''
  if (!description.startsWith(META_PREFIX)) return { desc: description, meta: inferMeta(row) }
  const newline = description.indexOf('\n')
  try {
    const meta = JSON.parse(description.slice(META_PREFIX.length, newline < 0 ? undefined : newline))
    return { desc: newline < 0 ? '' : description.slice(newline + 1), meta: { ...inferMeta(row), ...meta } }
  } catch {
    return { desc: description, meta: inferMeta(row) }
  }
}

export function mapCampaignRow(row) {
  const { desc, meta } = decodeDescription(row)
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    desc,
    enabled: row.enabled,
    usageLabel: row.usage_label,
    usage: row.usage_text,
    roi: row.roi,
    expiry: row.expiry_text,
    scheduled: row.scheduled,
    ...meta,
  }
}

function payload(row) {
  return {
    name: row.name.trim(),
    icon: row.icon || 'megaphone',
    description: `${META_PREFIX}${JSON.stringify({ type: row.type, threshold: Number(row.threshold) || 0, discount: Number(row.discount) || 0, rate: Number(row.rate) || 1, product: row.product || '全部商品', audience: row.audience || '全部顾客', channel: row.channel || '全渠道', budget: Number(row.budget) || 0 })}\n${row.desc?.trim() || ''}`,
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

export async function recordCampaignUsage(client, campaign) {
  const { error } = await client.from('marketing_campaigns').update({ usage_label: '使用次数', usage_text: campaign.usage }).eq('id', campaign.id)
  if (error) throw error
}

export async function updateCampaign(client, id, row) {
  const { data, error } = await client.from('marketing_campaigns').update(payload(row)).eq('id', id).select('*').single()
  if (error) throw error
  return mapCampaignRow(data)
}
