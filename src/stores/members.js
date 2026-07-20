import { reactive } from 'vue'

const seedMembers = [
  ['罗艾琳', '138-0012-3456', '钻石会员', 15420, 245.00, 4120.50, '2022年10月12日'],
  ['陈马克', '139-0987-6543', '黄金会员', 8200, 12.40, 1850.25, '2023年01月05日'],
  ['珍妮佛', '136-0234-5678', '白银会员', 2150, 0.00, 450.00, '2024年03月18日'],
  ['王思睿', '137-1122-3344', '黄金会员', 6890, 88.00, 1620.00, '2023年05月20日'],
  ['李梦琪', '135-5566-7788', '白银会员', 1320, 30.50, 620.75, '2024年01月09日'],
  ['赵天成', '188-9900-1122', '钻石会员', 18760, 512.00, 5230.00, '2021年12月01日'],
  ['孙悦', '159-3344-5566', '白银会员', 980, 5.00, 310.00, '2024年06月15日'],
  ['周语彤', '186-7788-9900', '黄金会员', 7450, 156.00, 1980.40, '2023年03月28日'],
  ['吴俊杰', '131-2233-4455', '白银会员', 2680, 42.00, 780.00, '2024年02月11日'],
  ['郑雅文', '152-6677-8899', '钻石会员', 13200, 320.00, 3890.00, '2022年08月19日'],
  ['何晓东', '133-4455-6677', '黄金会员', 5600, 66.00, 1450.00, '2023年07月07日'],
  ['冯佳怡', '189-1122-3344', '白银会员', 1750, 18.00, 540.00, '2024年04月22日'],
].map(([name, phone, tier, points, balance, spent, joined], index) => ({ id: index + 1, name, phone, tier, points, balance, spent, joined, portraitIndex: index % 6 }))

export const memberStore = reactive({
  members: seedMembers,
})

// 等级规则：按累计消费自动升级（只升不降）
const TIER_RANK = { 白银会员: 1, 黄金会员: 2, 钻石会员: 3 }
const TIER_RULES = [[3000, '钻石会员'], [1500, '黄金会员'], [0, '白银会员']]
// 积分规则：每消费 ¥1 累计 1 积分
const POINTS_PER_YUAN = 1

export function tierForSpent(spent) {
  return (TIER_RULES.find(([min]) => spent >= min) || TIER_RULES[TIER_RULES.length - 1])[1]
}

export function findMember(id) {
  if (id == null || id === '') return null
  return memberStore.members.find(item => item.id === id || String(item.id) === String(id))
}

// 订单完成：为关联会员累计消费与积分，必要时升级等级
export function accrueForOrder(order) {
  if (!order?.memberId) return null
  const member = findMember(order.memberId)
  if (!member) return null

  const gainedPoints = Math.round(order.amount * POINTS_PER_YUAN)
  member.points += gainedPoints
  member.spent = Number((member.spent + order.amount).toFixed(2))

  const nextTier = tierForSpent(member.spent)
  const upgraded = TIER_RANK[nextTier] > TIER_RANK[member.tier]
  if (upgraded) member.tier = nextTier

  return { member, gainedPoints, upgraded, tier: member.tier }
}
