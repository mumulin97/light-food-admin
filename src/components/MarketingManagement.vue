<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import AppIcon from './AppIcon.vue'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { createCampaign, fetchCampaigns, setCampaignEnabled } from '../services/campaignsApi'

const props = defineProps({
  query: { type: String, default: '' },
})

const useBackend = isSupabaseConfigured()
const loading = ref(false)
const loadError = ref('')
const saving = ref(false)

const campaignVisible = ref(false)
const campaignForm = reactive({ name: '', desc: '', expiry: '长期有效' })

const seedCampaigns = [
  { id: 1, name: '满减大促', icon: 'piggy', desc: '单笔订单满 ¥50 减 ¥10。适用于所有午餐菜单。', enabled: true, usageLabel: '使用次数', usage: '1,240 次', roi: '+18.5%', expiry: '14 天后过期' },
  { id: 2, name: '超值套餐', icon: 'receipt', desc: '购买任意沙拉即可享受鲜榨果汁 5 折优惠。', enabled: true, usageLabel: '使用次数', usage: '856 次', roi: '+12.2%', expiry: '长期有效' },
  { id: 3, name: '节日狂欢', icon: 'party', desc: '10 人以上团体订餐可享 8 折优惠专享套餐。', enabled: false, usageLabel: '历史使用', usage: '2,410 次', roi: '无数据', expiry: '计划于 12 月 1 日上线', scheduled: true },
]

const campaigns = ref(useBackend ? [] : seedCampaigns)

const filteredCampaigns = computed(() => {
  const keyword = props.query.trim().toLowerCase()
  if (!keyword) return campaigns.value
  return campaigns.value.filter(item => item.name.toLowerCase().includes(keyword) || item.desc.toLowerCase().includes(keyword))
})

async function loadCampaigns() {
  if (!useBackend || !supabase) return
  loading.value = true
  loadError.value = ''
  try {
    campaigns.value = await fetchCampaigns(supabase)
  } catch (e) {
    loadError.value = e.message || '加载营销活动失败'
    ElMessage({ message: loadError.value, type: 'error', customClass: 'light-bites-message', duration: 3200 })
  } finally {
    loading.value = false
  }
}

onMounted(loadCampaigns)

async function toggleCampaign(campaign) {
  if (useBackend && supabase) {
    try {
      await setCampaignEnabled(supabase, campaign.id, campaign.enabled)
      ElMessage({ message: `活动「${campaign.name}」已${campaign.enabled ? '启用' : '禁用'}`, type: 'success', customClass: 'light-bites-message', duration: 2400 })
    } catch (e) {
      campaign.enabled = !campaign.enabled
      ElMessage({ message: e.message || '更新活动状态失败', type: 'error', customClass: 'light-bites-message', duration: 3200 })
    }
    return
  }
  ElMessage({ message: `活动「${campaign.name}」已${campaign.enabled ? '启用' : '禁用'}`, type: 'success', customClass: 'light-bites-message', duration: 2400 })
}

function openCampaign() {
  Object.assign(campaignForm, { name: '', desc: '', expiry: '长期有效' })
  campaignVisible.value = true
}

async function saveCampaign() {
  if (!campaignForm.name.trim() || !campaignForm.desc.trim()) {
    ElMessage({ message: '请填写活动名称和描述', type: 'warning', customClass: 'light-bites-message', duration: 2400 })
    return
  }
  const draft = {
    name: campaignForm.name.trim(),
    icon: 'megaphone',
    desc: campaignForm.desc.trim(),
    enabled: true,
    usageLabel: '使用次数',
    usage: '0 次',
    roi: '无数据',
    expiry: campaignForm.expiry,
  }
  if (useBackend && supabase) {
    saving.value = true
    try {
      const created = await createCampaign(supabase, draft)
      campaigns.value.unshift(created)
      campaignVisible.value = false
      ElMessage({ message: `活动「${created.name}」已创建`, type: 'success', customClass: 'light-bites-message', duration: 2400 })
    } catch (e) {
      ElMessage({ message: e.message || '创建活动失败', type: 'error', customClass: 'light-bites-message', duration: 3200 })
    } finally {
      saving.value = false
    }
    return
  }
  campaigns.value.unshift({ id: Date.now(), ...draft })
  campaignVisible.value = false
  ElMessage({ message: `活动「${draft.name}」已创建`, type: 'success', customClass: 'light-bites-message', duration: 2400 })
}

function editCampaign(campaign) {
  ElMessage({ message: `正在编辑活动「${campaign.name}」`, customClass: 'light-bites-message', duration: 2200 })
}
</script>

<template>
  <div class="membership-content" v-loading="useBackend && loading">
    <p v-if="loadError" class="dashboard-error" role="alert">{{ loadError }}</p>
    <section class="marketing-metrics" aria-label="营销经营指标">
      <article class="member-metric-card accent">
        <p>活动转化率</p>
        <strong class="metric-figure">24.8%</strong>
        <small>近 6 个月最高值</small>
      </article>
    </section>

    <section class="member-block">
      <header class="member-section-heading">
        <div><h2>营销活动</h2><p>创建并监控您的在线促销活动。</p></div>
        <el-button class="member-primary-button" @click="openCampaign"><AppIcon name="megaphone" />创建活动</el-button>
      </header>

      <div class="campaign-grid">
        <article v-for="campaign in filteredCampaigns" :key="campaign.id" class="campaign-card" :class="{ disabled: !campaign.enabled }">
          <div class="campaign-top">
            <span class="campaign-icon"><AppIcon :name="campaign.icon" /></span>
            <label class="campaign-toggle"><span>{{ campaign.enabled ? '已启用' : '已禁用' }}</span><el-switch v-model="campaign.enabled" @change="toggleCampaign(campaign)" /></label>
          </div>
          <h3>{{ campaign.name }}</h3>
          <p class="campaign-desc">{{ campaign.desc }}</p>
          <div class="campaign-stats">
            <div><small>{{ campaign.usageLabel }}</small><strong>{{ campaign.usage }}</strong></div>
            <div><small>投产比 (ROI)</small><strong :class="campaign.roi.startsWith('+') ? 'positive' : 'muted'">{{ campaign.roi }}</strong></div>
          </div>
          <footer class="campaign-foot"><span :class="{ scheduled: campaign.scheduled }">{{ campaign.expiry }}</span><button type="button" @click="editCampaign(campaign)">编辑详情</button></footer>
        </article>
        <p v-if="!filteredCampaigns.length" class="campaign-empty">没有符合条件的活动</p>
      </div>
    </section>
  </div>

  <el-drawer v-model="campaignVisible" class="campaign-drawer" size="540px" :with-header="false">
    <div class="modal-header"><div><span class="eyebrow">营销中心</span><h2>创建活动</h2></div><el-button class="icon-button" circle aria-label="关闭" @click="campaignVisible = false"><AppIcon name="close" /></el-button></div>
    <el-form label-position="top" @submit.prevent="saveCampaign">
      <el-form-item label="活动名称"><el-input v-model="campaignForm.name" placeholder="如 周末双倍积分" /></el-form-item>
      <el-form-item label="活动描述"><el-input v-model="campaignForm.desc" type="textarea" :rows="3" placeholder="描述优惠规则与适用范围" /></el-form-item>
      <el-form-item label="有效期"><el-select v-model="campaignForm.expiry"><el-option v-for="item in ['长期有效', '7 天后过期', '14 天后过期', '30 天后过期']" :key="item" :label="item" :value="item" /></el-select></el-form-item>
      <div class="drawer-actions"><el-button @click="campaignVisible = false">取消</el-button><el-button type="primary" @click="saveCampaign">创建活动</el-button></div>
    </el-form>
  </el-drawer>
</template>
