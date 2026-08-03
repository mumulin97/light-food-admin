import { reactive } from 'vue'

const seedCampaigns = [
  { id: 1, name: '满减大促', icon: 'piggy', desc: '单笔订单满 ¥50 减 ¥10，适用于全部商品。', enabled: true, usageLabel: '使用次数', usage: '1,240 次', roi: '+18.5%', expiry: '14 天后过期', scheduled: false, type: '满减', threshold: 50, discount: 10, rate: 1, product: '全部商品', audience: '全部顾客', channel: '全渠道', budget: 3000 },
  { id: 2, name: '超值套餐', icon: 'receipt', desc: '任意商品一次购买 2 件可享 9 折优惠。', enabled: true, usageLabel: '使用次数', usage: '856 次', roi: '+12.2%', expiry: '长期有效', scheduled: false, type: '件数折扣', threshold: 2, discount: 0, rate: 0.9, product: '全部商品', audience: '会员', channel: '全渠道', budget: 2000 },
  { id: 3, name: '节日狂欢', icon: 'party', desc: '钻石会员下单可享 8 折专属优惠。', enabled: false, usageLabel: '历史使用', usage: '2,410 次', roi: '无数据', expiry: '计划上线', scheduled: true, type: '折扣', threshold: 0, discount: 0, rate: 0.8, product: '全部商品', audience: '钻石会员', channel: '全渠道', budget: 5000 },
]

export const campaignStore = reactive({ campaigns: seedCampaigns, loaded: false })

export function replaceCampaigns(rows = []) {
  campaignStore.campaigns.splice(0, campaignStore.campaigns.length, ...rows)
  campaignStore.loaded = true
}

export function campaignUsageNumber(campaign) {
  return Number(String(campaign?.usage || '').replace(/[^\d.]/g, '')) || 0
}

export function campaignRuleLabel(campaign) {
  if (campaign.type === '满减') return `满 ¥${Number(campaign.threshold)} 减 ¥${Number(campaign.discount)}`
  if (campaign.type === '折扣') return `${Math.round(Number(campaign.rate) * 10)} 折优惠`
  if (campaign.type === '件数折扣') return `满 ${Number(campaign.threshold)} 件享 ${Math.round(Number(campaign.rate) * 10)} 折`
  return '按活动规则执行'
}

function audienceMatched(campaign, member) {
  if (campaign.audience === '全部顾客') return true
  if (campaign.audience === '会员') return Boolean(member)
  return Boolean(member && member.tier === campaign.audience)
}

export function bestCampaignForOrder({ items = [], amount = 0, member = null, method = '堂食' }) {
  const quantity = items.reduce((sum, item) => sum + Number(item[1] || 0), 0)
  const productNames = items.map(item => item[0])
  const candidates = campaignStore.campaigns
    .filter(campaign => campaign.enabled && !campaign.scheduled)
    .filter(campaign => campaign.channel === '全渠道' || campaign.channel === method)
    .filter(campaign => campaign.product === '全部商品' || productNames.includes(campaign.product))
    .filter(campaign => audienceMatched(campaign, member))
    .map(campaign => {
      let discount = 0
      if (campaign.type === '满减' && amount >= Number(campaign.threshold)) discount = Number(campaign.discount)
      if (campaign.type === '折扣') discount = amount * (1 - Number(campaign.rate))
      if (campaign.type === '件数折扣' && quantity >= Number(campaign.threshold)) discount = amount * (1 - Number(campaign.rate))
      return { campaign, discount: Math.max(0, Math.min(amount, Number(discount.toFixed(2)))) }
    })
    .filter(item => item.discount > 0)
    .sort((a, b) => b.discount - a.discount)
  if (!candidates.length) return null
  const best = candidates[0]
  return { ...best, payable: Number((amount - best.discount).toFixed(2)) }
}

export function recordCampaignConversion(campaignId) {
  const campaign = campaignStore.campaigns.find(item => item.id === campaignId || String(item.id) === String(campaignId))
  if (!campaign) return null
  const usage = campaignUsageNumber(campaign) + 1
  campaign.usageLabel = '使用次数'
  campaign.usage = `${usage.toLocaleString('zh-CN')} 次`
  return campaign
}
