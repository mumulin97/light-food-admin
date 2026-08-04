<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import AppIcon from './AppIcon.vue'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { campaignStore, campaignRuleLabel, campaignUsageNumber, replaceCampaigns } from '../stores/campaigns'
import { orderStore } from '../stores/orders'
import { memberStore } from '../stores/members'
import { createCampaign, fetchCampaigns, setCampaignEnabled, updateCampaign } from '../services/campaignsApi'
import { fetchOrders } from '../services/ordersApi'
import { syncMemberStore } from '../services/membersApi'
import { fetchCatalogProducts } from '../services/products'

defineOptions({ inheritAttrs: false })

const props = defineProps({ query: { type: String, default: '' } })
const router = useRouter()
const useBackend = isSupabaseConfigured()
const loading = ref(false)
const loadError = ref('')
const saving = ref(false)
const statusFilter = ref('全部')
const STATUS_TABS = ['全部', '进行中', '已暂停', '待上线']
const campaigns = ref(campaignStore.campaigns)
const orders = ref(useBackend ? [] : orderStore.orders)
const products = ref([])

const campaignVisible = ref(false)
const editingCampaign = ref(null)
const campaignForm = reactive({
  name: '', desc: '', type: '满减', threshold: 50, discount: 10, rate: 0.9,
  product: '全部商品', audience: '全部顾客', channel: '全渠道', budget: 3000,
  expiry: '30 天后过期', launchMode: '立即启用',
})

const productOptions = computed(() => ['全部商品', ...new Set([
  ...products.value.map(item => item.name),
  ...orders.value.flatMap(order => (order.items || []).map(item => item[0])),
])])
const activeCampaigns = computed(() => campaigns.value.filter(item => item.enabled && !item.scheduled))
const scheduledCampaigns = computed(() => campaigns.value.filter(item => item.scheduled))
const pausedCampaigns = computed(() => campaigns.value.filter(item => !item.enabled && !item.scheduled))
const completedOrders = computed(() => orders.value.filter(item => item.status === '已完成'))
const orderRevenue = computed(() => completedOrders.value.reduce((sum, item) => sum + Number(item.amount || 0), 0))
const memberOrderRate = computed(() => {
  if (!orders.value.length) return 0
  return Math.round(orders.value.filter(item => item.memberId).length / orders.value.length * 100)
})
const campaignUsageTotal = computed(() => campaigns.value.reduce((sum, item) => sum + campaignUsageNumber(item), 0))
const averageRoi = computed(() => {
  const values = campaigns.value
    .map(item => String(item.roi).replace(/[^\d.-]/g, ''))
    .filter(Boolean)
    .map(Number)
    .filter(Number.isFinite)
  return values.length ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1) : '0.0'
})

function campaignState(campaign) {
  if (campaign.scheduled) return '待上线'
  return campaign.enabled ? '进行中' : '已暂停'
}

function statusCount(status) {
  if (status === '进行中') return activeCampaigns.value.length
  if (status === '已暂停') return pausedCampaigns.value.length
  if (status === '待上线') return scheduledCampaigns.value.length
  return campaigns.value.length
}

const filteredCampaigns = computed(() => {
  const keyword = props.query.trim().toLowerCase()
  return campaigns.value.filter(item => {
    const statusMatched = statusFilter.value === '全部' || campaignState(item) === statusFilter.value
    const queryMatched = !keyword || [item.name, item.desc, item.product, item.audience].some(value => String(value).toLowerCase().includes(keyword))
    return statusMatched && queryMatched
  })
})

watch(() => props.query, () => { statusFilter.value = '全部' })

async function loadMarketingData() {
  if (!useBackend || !supabase) return
  loading.value = true
  loadError.value = ''
  try {
    const [campaignRows, orderRows, productRows] = await Promise.all([
      fetchCampaigns(supabase),
      fetchOrders(supabase, { limit: 300 }),
      fetchCatalogProducts(supabase),
      syncMemberStore(supabase),
    ])
    replaceCampaigns(campaignRows)
    orders.value = orderRows
    products.value = productRows
  } catch (error) {
    loadError.value = error.message || '营销经营数据加载失败'
    ElMessage.error(loadError.value)
  } finally {
    loading.value = false
  }
}

onMounted(loadMarketingData)

function resetForm(campaign = null) {
  editingCampaign.value = campaign
  Object.assign(campaignForm, campaign ? {
    name: campaign.name, desc: campaign.desc, type: campaign.type, threshold: campaign.threshold,
    discount: campaign.discount, rate: campaign.rate, product: campaign.product,
    audience: campaign.audience, channel: campaign.channel, budget: campaign.budget,
    expiry: campaign.expiry,
    launchMode: campaign.scheduled ? '计划上线' : campaign.enabled ? '立即启用' : '保存为草稿',
  } : {
    name: '', desc: '', type: '满减', threshold: 50, discount: 10, rate: 0.9,
    product: '全部商品', audience: '全部顾客', channel: '全渠道', budget: 3000,
    expiry: '30 天后过期', launchMode: '立即启用',
  })
  campaignVisible.value = true
}

function formRuleLabel() {
  return campaignRuleLabel(campaignForm)
}

async function saveCampaign() {
  if (!campaignForm.name.trim() || !campaignForm.desc.trim()) {
    ElMessage.warning('请填写活动名称和活动说明')
    return
  }
  if (campaignForm.type === '满减' && Number(campaignForm.discount) >= Number(campaignForm.threshold)) {
    ElMessage.warning('优惠金额需要小于订单门槛')
    return
  }
  const draft = {
    ...campaignForm,
    name: campaignForm.name.trim(), desc: campaignForm.desc.trim(), icon: campaignForm.type === '满减' ? 'piggy' : campaignForm.type === '件数折扣' ? 'receipt' : 'megaphone',
    enabled: campaignForm.launchMode === '立即启用', scheduled: campaignForm.launchMode === '计划上线',
    usageLabel: editingCampaign.value?.usageLabel || '使用次数', usage: editingCampaign.value?.usage || '0 次',
    roi: editingCampaign.value?.roi || '无数据',
    threshold: Number(campaignForm.threshold) || 0, discount: Number(campaignForm.discount) || 0,
    rate: Number(campaignForm.rate) || 1, budget: Number(campaignForm.budget) || 0,
  }
  saving.value = true
  try {
    let saved
    if (useBackend && supabase) {
      saved = editingCampaign.value ? await updateCampaign(supabase, editingCampaign.value.id, draft) : await createCampaign(supabase, draft)
    } else {
      saved = editingCampaign.value ? { ...editingCampaign.value, ...draft } : { id: Date.now(), ...draft }
    }
    if (editingCampaign.value) {
      const index = campaigns.value.findIndex(item => item.id === editingCampaign.value.id)
      campaigns.value.splice(index, 1, saved)
    } else campaigns.value.unshift(saved)
    campaignVisible.value = false
    ElMessage.success(`活动「${saved.name}」已${saved.enabled ? '上线' : saved.scheduled ? '进入待上线队列' : '保存为草稿'}`)
  } catch (error) {
    ElMessage.error(error.message || '保存活动失败')
  } finally {
    saving.value = false
  }
}

async function toggleCampaign(campaign, enabled) {
  const previous = campaign.enabled
  campaign.enabled = enabled
  campaign.scheduled = false
  try {
    if (useBackend && supabase) await setCampaignEnabled(supabase, campaign.id, enabled)
    ElMessage.success(`活动「${campaign.name}」已${enabled ? '启用并进入订单匹配' : '暂停投放'}`)
  } catch (error) {
    campaign.enabled = previous
    ElMessage.error(error.message || '活动状态更新失败')
  }
}

function formatMoney(value) {
  return `¥${Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}
</script>

<template>
  <div class="membership-content marketing-page" v-loading="useBackend && loading" element-loading-text="正在同步营销数据">
    <p v-if="loadError" class="dashboard-error" role="alert">{{ loadError }}</p>
    <section class="module-page-heading">
      <div><h1>营销活动</h1><p>连接会员、商品与订单，让活动从配置到转化形成闭环。</p></div>
      <span class="module-live-status"><i />{{ activeCampaigns.length }} 个活动正在匹配订单</span>
    </section>

    <section class="marketing-summary-grid" aria-label="营销经营指标">
      <article class="marketing-summary-card primary"><span>进行中活动</span><strong>{{ activeCampaigns.length }}<small> 个</small></strong><p>{{ scheduledCampaigns.length }} 个待上线 · {{ pausedCampaigns.length }} 个已暂停</p><img class="marketing-summary-art conveyor" src="/dashboard-assets/console1-transparent.png" alt="" /></article>
      <article class="marketing-summary-card"><span>累计核销</span><strong>{{ campaignUsageTotal.toLocaleString('zh-CN') }}<small> 次</small></strong><p>下单命中活动后自动回写</p><img class="marketing-summary-art settlement" src="/dashboard-assets/console2-transparent-final.png" alt="" /></article>
      <article class="marketing-summary-card"><span>平均 ROI</span><strong>{{ averageRoi }}<small>%</small></strong><p>基于已有活动投产数据</p><img class="marketing-summary-art roi" src="/dashboard-assets/marketing-roi.png" alt="" /></article>
      <article class="marketing-summary-card"><span>会员订单占比</span><strong>{{ memberOrderRate }}<small>%</small></strong><p>{{ memberStore.members.length }} 位会员可参与定向活动</p><img class="marketing-summary-art member-share" src="/dashboard-assets/marketing-member-share.png" alt="" /></article>
    </section>

    <section class="marketing-filter-bar">
      <div class="marketing-status-tabs" role="tablist"><button v-for="tab in STATUS_TABS" :key="tab" type="button" role="tab" :aria-selected="statusFilter === tab" :class="{ active: statusFilter === tab }" @click="statusFilter = tab"><span>{{ tab }}</span><b>{{ statusCount(tab) }}</b></button></div>
      <el-button class="member-primary-button" @click="resetForm()"><AppIcon name="megaphone" />创建活动</el-button>
    </section>

    <section class="marketing-workspace">
      <div class="campaign-grid marketing-campaign-grid">
        <article v-for="campaign in filteredCampaigns" :key="campaign.id" class="campaign-card marketing-campaign-card" :class="{ disabled: !campaign.enabled, scheduled: campaign.scheduled }">
          <div class="campaign-top">
            <div class="campaign-identity"><span class="campaign-icon"><AppIcon :name="campaign.icon" /></span><span class="campaign-state" :class="campaignState(campaign)">{{ campaignState(campaign) }}</span></div>
            <label class="campaign-toggle"><span>{{ campaign.enabled ? '投放中' : '已关闭' }}</span><el-switch :model-value="campaign.enabled" :disabled="campaign.scheduled" @change="toggleCampaign(campaign, $event)" /></label>
          </div>
          <div><h3>{{ campaign.name }}</h3><p class="campaign-desc">{{ campaign.desc }}</p></div>
          <div class="campaign-rule-row"><strong>{{ campaignRuleLabel(campaign) }}</strong><span>{{ campaign.product }}</span><span>{{ campaign.audience }}</span><span>{{ campaign.channel }}</span></div>
          <div class="campaign-stats"><div><small>{{ campaign.usageLabel }}</small><strong>{{ campaign.usage }}</strong></div><div><small>投产比 (ROI)</small><strong :class="String(campaign.roi).startsWith('+') ? 'positive' : 'muted'">{{ campaign.roi }}</strong></div><div><small>活动预算</small><strong>{{ formatMoney(campaign.budget) }}</strong></div></div>
          <footer class="campaign-foot"><span :class="{ scheduled: campaign.scheduled }">{{ campaign.expiry }}</span><button type="button" @click="resetForm(campaign)">编辑规则</button></footer>
        </article>
        <div v-if="!filteredCampaigns.length" class="campaign-empty"><strong>没有符合条件的活动</strong><p>调整状态筛选或创建一个新活动。</p></div>
      </div>

      <aside class="marketing-loop-panel">
        <span class="module-kicker">增长闭环</span><h2>活动会流向哪里</h2><p>启用后的活动会自动参与新建订单匹配，命中后更新核销次数，并继续影响会员消费与积分。</p>
        <ol><li><b>1</b><span><strong>活动规则</strong><small>{{ activeCampaigns.length }} 个规则正在生效</small></span></li><li><b>2</b><span><strong>商品与会员</strong><small>{{ productOptions.length - 1 }} 个商品 · {{ memberStore.members.length }} 位会员</small></span></li><li><b>3</b><span><strong>订单转化</strong><small>{{ completedOrders.length }} 单已完成 · {{ formatMoney(orderRevenue) }}</small></span></li><li><b>4</b><span><strong>效果回流</strong><small>{{ campaignUsageTotal.toLocaleString('zh-CN') }} 次核销进入活动分析</small></span></li></ol>
        <div class="marketing-loop-actions"><button type="button" @click="router.push('/products')">管理适用商品</button><button type="button" @click="router.push('/members')">查看目标会员</button><button type="button" @click="router.push('/orders')">跟踪活动订单</button></div>
      </aside>
    </section>
  </div>

  <el-drawer v-model="campaignVisible" class="campaign-drawer" size="580px" :with-header="false">
    <div class="modal-header"><div><span class="eyebrow">活动配置</span><h2>{{ editingCampaign ? '编辑营销活动' : '创建营销活动' }}</h2></div><el-button class="icon-button" circle aria-label="关闭" @click="campaignVisible = false"><AppIcon name="close" /></el-button></div>
    <el-form label-position="top" @submit.prevent="saveCampaign">
      <div class="form-row"><el-form-item label="活动名称"><el-input v-model="campaignForm.name" placeholder="如 周末会员满减" /></el-form-item><el-form-item label="活动类型"><el-select v-model="campaignForm.type"><el-option v-for="item in ['满减','折扣','件数折扣']" :key="item" :label="item" :value="item" /></el-select></el-form-item></div>
      <el-form-item label="活动说明"><el-input v-model="campaignForm.desc" type="textarea" :rows="3" placeholder="面向顾客展示的活动说明" /></el-form-item>
      <div class="form-row" v-if="campaignForm.type === '满减'"><el-form-item label="订单满额"><el-input-number v-model="campaignForm.threshold" :min="1" controls-position="right" /></el-form-item><el-form-item label="优惠金额"><el-input-number v-model="campaignForm.discount" :min="1" controls-position="right" /></el-form-item></div>
      <div class="form-row" v-else-if="campaignForm.type === '件数折扣'"><el-form-item label="商品件数"><el-input-number v-model="campaignForm.threshold" :min="2" controls-position="right" /></el-form-item><el-form-item label="折扣"><el-select v-model="campaignForm.rate"><el-option v-for="item in [{l:'9 折',v:.9},{l:'8.5 折',v:.85},{l:'8 折',v:.8}]" :key="item.v" :label="item.l" :value="item.v" /></el-select></el-form-item></div>
      <el-form-item v-else label="折扣"><el-select v-model="campaignForm.rate"><el-option v-for="item in [{l:'9 折',v:.9},{l:'8.5 折',v:.85},{l:'8 折',v:.8},{l:'7 折',v:.7}]" :key="item.v" :label="item.l" :value="item.v" /></el-select></el-form-item>
      <div class="campaign-rule-preview"><span>订单执行规则</span><strong>{{ formRuleLabel() }}</strong></div>
      <div class="form-row"><el-form-item label="适用商品"><el-select v-model="campaignForm.product" filterable><el-option v-for="item in productOptions" :key="item" :label="item" :value="item" /></el-select></el-form-item><el-form-item label="目标顾客"><el-select v-model="campaignForm.audience"><el-option v-for="item in ['全部顾客','会员','白银会员','黄金会员','钻石会员']" :key="item" :label="item" :value="item" /></el-select></el-form-item></div>
      <div class="form-row"><el-form-item label="投放渠道"><el-select v-model="campaignForm.channel"><el-option v-for="item in ['全渠道','堂食','外带','外卖']" :key="item" :label="item" :value="item" /></el-select></el-form-item><el-form-item label="活动预算"><el-input-number v-model="campaignForm.budget" :min="0" controls-position="right" /></el-form-item></div>
      <div class="form-row"><el-form-item label="有效期"><el-select v-model="campaignForm.expiry"><el-option v-for="item in ['长期有效','7 天后过期','14 天后过期','30 天后过期']" :key="item" :label="item" :value="item" /></el-select></el-form-item><el-form-item label="上线方式"><el-select v-model="campaignForm.launchMode"><el-option v-for="item in ['立即启用','保存为草稿','计划上线']" :key="item" :label="item" :value="item" /></el-select></el-form-item></div>
      <p class="campaign-form-tip">立即启用后，新建订单会自动匹配当前规则；同一订单只使用优惠金额最高的一个活动。</p>
      <div class="drawer-actions"><el-button @click="campaignVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="saveCampaign">{{ editingCampaign ? '保存活动' : '创建活动' }}</el-button></div>
    </el-form>
  </el-drawer>
</template>

<style scoped>
.marketing-page { gap: 14px; padding: 28px 30px 38px; }
.marketing-page .module-page-heading { min-height: 82px; margin: 0; align-items: center; }
.marketing-page .module-page-heading h1 { margin-top: 4px; font-size: 30px; letter-spacing: -.8px; }
.marketing-page .module-page-heading p { margin-top: 5px; font-size: 12.5px; }
.marketing-page .module-live-status { padding: 9px 13px; border: 1px solid rgba(255,255,255,.82); background: rgba(255,255,255,.6); box-shadow: 0 8px 22px rgba(54,87,81,.08); backdrop-filter: blur(14px); }
.marketing-summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 13px; }
.marketing-summary-card { position: relative; min-width: 0; min-height: 136px; box-sizing: border-box; overflow: hidden; padding: 20px 17px; border: 1px solid rgba(255,255,255,.9); border-radius: 21px; background: linear-gradient(145deg,rgba(255,255,255,.82),rgba(235,246,246,.58)); box-shadow: inset 0 0 0 1px rgba(193,219,216,.58), 0 14px 30px rgba(49,84,84,.08); backdrop-filter: blur(18px); }
.marketing-summary-card::after { position: absolute; right: -35px; bottom: -55px; width: 150px; height: 150px; border-radius: 50%; background: rgba(185,225,216,.28); filter: blur(26px); content: ''; }
.marketing-summary-card.primary {
  border-color: rgba(255,255,255,.42);
  color: #fff;
  background:
    radial-gradient(circle at 86% 14%, rgba(126,206,194,.28), transparent 27%),
    radial-gradient(circle at 18% 92%, rgba(91,140,208,.22), transparent 38%),
    radial-gradient(circle at 64% 112%, rgba(232,173,91,.18), transparent 30%),
    linear-gradient(145deg, rgba(31,60,72,.96), rgba(20,57,64,.94) 55%, rgba(24,65,61,.94));
  box-shadow:
    0 18px 34px rgba(32,61,74,.22),
    0 2px 0 rgba(255,255,255,.3) inset,
    0 -2px 0 rgba(5,25,30,.24) inset,
    12px 0 28px rgba(98,179,167,.08) inset;
  backdrop-filter: blur(24px) saturate(1.2);
}
.marketing-summary-card.primary::after { background: rgba(126,206,194,.17); }
.marketing-summary-card > span, .marketing-summary-card > strong, .marketing-summary-card > p { position: relative; z-index: 2; max-width: 62%; }
.marketing-summary-card > span { color: #536d61; font-size: 12px; font-weight: 750; }
.marketing-summary-card.primary > span { color: rgba(255,255,255,.84); }
.marketing-summary-card > strong { display: block; margin-top: 12px; color: #102d23; font-size: clamp(24px,2vw,31px); line-height: 1; letter-spacing: -.7px; }
.marketing-summary-card.primary > strong { color: #fff; }
.marketing-summary-card > strong small { margin-left: 2px; color: #71847a; font-size: 12px; font-weight: 650; }
.marketing-summary-card.primary > strong small { color: rgba(255,255,255,.8); }
.marketing-summary-card p { margin: 10px 0 0; color: #728078; font-size: 10.5px; line-height: 1.45; }
.marketing-summary-card.primary p { color: rgba(255,255,255,.78); }
.marketing-summary-art { position: absolute; z-index: 1; right: -2px; bottom: 4px; width: 46%; height: 86%; object-fit: contain; pointer-events: none; filter: drop-shadow(0 9px 8px rgba(38,65,58,.12)); }
.marketing-summary-art.conveyor { right: -3px; bottom: -3px; width: 49%; }
.marketing-summary-art.settlement { right: -4px; bottom: -7px; width: 49%; height: 98%; }
.marketing-summary-art.roi { right: 4px; bottom: 4px; width: 43%; height: 90%; }
.marketing-summary-art.member-share { right: 2px; bottom: 8px; width: 44%; height: 83%; }
.marketing-filter-bar { display: flex; min-height: 58px; box-sizing: border-box; align-items: center; justify-content: space-between; gap: 16px; padding: 10px 13px; border: 1px solid rgba(255,255,255,.88); border-radius: 19px; background: rgba(255,255,255,.62); box-shadow: inset 0 0 0 1px rgba(202,223,220,.54), 0 12px 26px rgba(45,78,77,.07); backdrop-filter: blur(18px); }
.marketing-status-tabs { display: inline-flex; gap: 5px; padding: 4px; border-radius: 11px; background: #edf3ef; }
.marketing-status-tabs button { height: 34px; display: inline-flex; align-items: center; gap: 7px; padding: 0 14px; border: 0; border-radius: 8px; color: #617168; background: transparent; font-size: 13px; font-weight: 650; }
.marketing-status-tabs button b { min-width: 19px; height: 19px; display: grid; place-items: center; padding: 0 5px; border-radius: 999px; background: #fff; font-size: 10px; }
.marketing-status-tabs button.active { color: #08783d; background: #fff; box-shadow: 0 2px 7px rgba(32,70,48,.08); }
.marketing-status-tabs button.active b { color: #fff; background: #278e5b; }
.marketing-workspace { display: grid; grid-template-columns: repeat(12,minmax(0,1fr)); gap: 13px; align-items: stretch; }
.marketing-campaign-grid { display: contents; }
.marketing-campaign-card { grid-column: span 4; min-width: 0; min-height: 286px; height: 100%; box-sizing: border-box; gap: 9px; padding: 16px; border: 1px solid rgba(255,255,255,.88); border-left-width: 1px; border-radius: 20px; background: linear-gradient(148deg,rgba(255,255,255,.84),rgba(240,248,247,.64)); box-shadow: inset 0 0 0 1px rgba(204,225,221,.58), 0 13px 28px rgba(48,81,77,.075); backdrop-filter: blur(17px); }
.marketing-campaign-card.scheduled { border-color: rgba(235,216,179,.9); background: linear-gradient(148deg,rgba(255,255,255,.87),rgba(255,249,237,.78)); }
.marketing-campaign-card h3 { margin-top: 8px; font-size: 20px; letter-spacing: -.35px; }
.marketing-campaign-card .campaign-desc { min-height: 38px; margin-top: 4px; font-size: 11.5px; line-height: 1.55; }
.campaign-identity { display: flex; align-items: center; gap: 10px; }
.campaign-state { padding: 5px 9px; border-radius: 999px; color: #23764d; background: #e8f4ed; font-size: 11px; font-weight: 750; }
.campaign-state.已暂停 { color: #78847d; background: #eef1ef; }
.campaign-state.待上线 { color: #9b681b; background: #fff2d9; }
.campaign-rule-row { display: flex; flex-wrap: nowrap; gap: 5px; }
.campaign-rule-row strong, .campaign-rule-row span { min-width: 0; padding: 4px 6px; border-radius: 7px; color: #617168; background: #f0f4f1; font-size: 9.5px; white-space: nowrap; }
.campaign-rule-row strong { color: #167346; background: #e7f5ed; }
.marketing-campaign-card .campaign-stats { grid-template-columns: repeat(3,1fr); gap: 8px; padding: 10px 11px; }
.marketing-campaign-card .campaign-stats small { font-size: 10.5px; white-space: nowrap; }
.marketing-campaign-card .campaign-stats strong { font-size: 15px; }
.marketing-campaign-card .campaign-foot { padding-top: 9px; }
.marketing-loop-panel { grid-column: 1 / -1; min-height: 154px; display: grid; grid-template-columns: minmax(200px,.72fr) minmax(0,2fr); grid-template-areas: "kicker steps" "title steps" "copy steps" "actions actions"; column-gap: 22px; align-content: start; box-sizing: border-box; padding: 17px; border: 1px solid rgba(255,255,255,.9); border-radius: 20px; background: linear-gradient(150deg,rgba(245,252,248,.85),rgba(255,255,255,.58)); box-shadow: inset 0 0 0 1px rgba(204,225,221,.58), 0 13px 28px rgba(45,78,77,.075); backdrop-filter: blur(18px); }
.marketing-loop-panel > .module-kicker { grid-area: kicker; }
.marketing-loop-panel h2 { margin: 0; color: #19362a; font-size: 20px; }
.marketing-loop-panel h2 { grid-area: title; }
.marketing-loop-panel > p { grid-area: copy; margin: 7px 0 0; color: #718078; font-size: 11px; line-height: 1.55; }
.marketing-loop-panel ol { grid-area: steps; display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 9px; margin: 0; padding: 0; list-style: none; }
.marketing-loop-panel li { min-width: 0; min-height: 56px; display: flex; align-items: center; gap: 9px; padding: 10px; border: 1px solid rgba(217,232,228,.7); border-radius: 12px; background: rgba(255,255,255,.68); }
.marketing-loop-panel li > b { width: 25px; height: 25px; display: grid; place-items: center; border-radius: 8px; color: #fff; background: #37956a; font-size: 11px; }
.marketing-loop-panel li span strong, .marketing-loop-panel li span small { display: block; }
.marketing-loop-panel li span strong { color: #30483d; font-size: 12.5px; }
.marketing-loop-panel li span small { margin-top: 3px; color: #849189; font-size: 10.5px; }
.marketing-loop-actions { grid-area: actions; display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-top: 11px; }
.marketing-loop-actions button { height: 34px; border: 1px solid #d9e6de; border-radius: 9px; color: #397158; background: #fff; font-size: 11.5px; font-weight: 700; }
.campaign-rule-preview { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-radius: 11px; color: #607269; background: #edf7f1; font-size: 12px; }
.campaign-rule-preview strong { color: #08783d; font-size: 14px; }
.campaign-form-tip { margin: 0; padding: 11px 13px; border-radius: 10px; color: #587065; background: #f2f7f4; font-size: 12px; line-height: 1.55; }
.campaign-empty strong { color: #3a4e43; }
.campaign-empty p { margin: 6px 0 0; }
@media (max-width: 1180px) {
  .marketing-summary-grid { grid-template-columns: 1fr 1fr; }
  .marketing-campaign-card, .marketing-loop-panel { grid-column: span 6; }
  .marketing-loop-panel { min-height: 320px; display: block; }
  .marketing-loop-panel > p { margin-top: 10px; }
  .marketing-loop-panel ol { grid-template-columns: 1fr 1fr; margin-top: 16px; }
  .marketing-loop-actions { grid-template-columns: repeat(3,1fr); }
}
@media (max-width: 760px) {
  .marketing-summary-grid { grid-template-columns: 1fr; }
  .marketing-campaign-card, .marketing-loop-panel { grid-column: 1 / -1; }
  .marketing-filter-bar { align-items: stretch; flex-direction: column; }
  .marketing-status-tabs { max-width: 100%; overflow-x: auto; }
  .marketing-status-tabs button { white-space: nowrap; }
  .marketing-loop-panel ol, .marketing-loop-actions { grid-template-columns: 1fr; }
}
</style>
