<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AppIcon from './AppIcon.vue'
import memberPortraits from '../assets/employee-portraits.png'
import { memberStore } from '../stores/members'

const props = defineProps({
  query: { type: String, default: '' },
})

const TOTAL_MEMBERS = 12845

const memberPage = ref(1)
const pageSize = 3

const addVisible = ref(false)
const addForm = reactive({ name: '', phone: '', tier: '白银会员', points: 0, balance: 0 })

const balanceVisible = ref(false)
const balanceTarget = ref(null)
const balanceForm = reactive({ mode: 'set', amount: 0 })

const filteredMembers = computed(() => {
  const keyword = props.query.trim().toLowerCase()
  if (!keyword) return memberStore.members
  return memberStore.members.filter(item => item.phone.toLowerCase().includes(keyword) || item.name.toLowerCase().includes(keyword))
})

const pageMembers = computed(() => filteredMembers.value.slice((memberPage.value - 1) * pageSize, memberPage.value * pageSize))
const totalLabel = computed(() => (props.query.trim() ? filteredMembers.value.length : TOTAL_MEMBERS).toLocaleString('en-US'))
const memberRange = computed(() => {
  const total = filteredMembers.value.length
  if (!total) return '没有符合条件的会员'
  const start = (memberPage.value - 1) * pageSize + 1
  const end = Math.min(memberPage.value * pageSize, total)
  return `显示第 ${start} 至 ${end} 条，共 ${totalLabel.value} 名会员`
})

watch(() => props.query, () => { memberPage.value = 1 })

function tierClass(tier) {
  return tier === '钻石会员' ? 'diamond' : tier === '黄金会员' ? 'gold' : 'silver'
}

function formatMoney(value) {
  return `¥${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function openAdd() {
  Object.assign(addForm, { name: '', phone: '', tier: '白银会员', points: 0, balance: 0 })
  addVisible.value = true
}

function saveMember() {
  if (!addForm.name.trim() || !/^[\d-]{7,}$/.test(addForm.phone.trim())) {
    ElMessage({ message: '请填写会员姓名和有效手机号', type: 'warning', customClass: 'light-bites-message', duration: 2400 })
    return
  }
  memberStore.members.unshift({
    id: Date.now(),
    name: addForm.name.trim(),
    phone: addForm.phone.trim(),
    tier: addForm.tier,
    points: Number(addForm.points) || 0,
    balance: Number(addForm.balance) || 0,
    spent: 0,
    joined: new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '年').replace(/年(\d+)年(\d+)$/, '年$1月$2日'),
    portraitIndex: memberStore.members.length % 6,
  })
  memberPage.value = 1
  addVisible.value = false
  ElMessage({ message: `会员 ${addForm.name.trim()} 已添加`, type: 'success', customClass: 'light-bites-message', duration: 2400 })
}

function openBalance(member) {
  balanceTarget.value = member
  Object.assign(balanceForm, { mode: 'set', amount: member.balance })
  balanceVisible.value = true
}

function saveBalance() {
  const member = balanceTarget.value
  if (!member) return
  const amount = Number(balanceForm.amount) || 0
  if (balanceForm.mode === 'set') member.balance = Math.max(0, amount)
  if (balanceForm.mode === 'add') member.balance = Math.max(0, member.balance + amount)
  if (balanceForm.mode === 'subtract') member.balance = Math.max(0, member.balance - amount)
  balanceVisible.value = false
  ElMessage({ message: `${member.name} 的余额已更新为 ${formatMoney(member.balance)}`, type: 'success', customClass: 'light-bites-message', duration: 2400 })
}

function viewOrders(member) {
  ElMessage({ message: `正在打开 ${member.name} 的历史订单`, customClass: 'light-bites-message', duration: 2200 })
}

function exportMembers() {
  const rows = [['会员姓名', '手机号', '等级', '积分', '余额', '累计消费', '加入日期'], ...filteredMembers.value.map(item => [item.name, item.phone, item.tier, item.points, item.balance.toFixed(2), item.spent.toFixed(2), item.joined])]
  const csv = `﻿${rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')}`
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = '会员名录.csv'
  link.click()
  URL.revokeObjectURL(url)
  ElMessage({ message: '会员名录已导出', type: 'success', customClass: 'light-bites-message', duration: 2400 })
}

function portraitStyle(index) {
  const safeIndex = Number(index) % 6
  return {
    backgroundImage: `url(${memberPortraits})`,
    backgroundPosition: `${(safeIndex % 3) * 50}% ${Math.floor(safeIndex / 3) * 100}%`,
  }
}
</script>

<template>
  <div class="membership-content">
    <section class="member-metrics member-metrics-2" aria-label="会员经营指标">
      <article class="member-metric-card">
        <p>活跃会员总数</p>
        <div class="metric-line"><strong class="metric-figure green">{{ TOTAL_MEMBERS.toLocaleString('en-US') }}</strong><span class="metric-up"><AppIcon name="arrow" />12%</span></div>
      </article>
      <article class="member-metric-card">
        <p>月均消费额</p>
        <strong class="metric-figure">¥142.50</strong>
        <div class="metric-progress"><span style="--value:62%" /></div>
      </article>
    </section>

    <section class="member-block">
      <header class="member-section-heading">
        <div><h2>会员名录</h2><p>管理客户关系与忠诚度数据。</p></div>
        <div class="member-heading-actions">
          <el-button class="member-ghost-button" @click="exportMembers"><AppIcon name="download" />导出</el-button>
          <el-button class="member-primary-button" @click="openAdd"><AppIcon name="user-plus" />添加会员</el-button>
        </div>
      </header>

      <div class="member-table-card">
        <el-table :data="pageMembers" class="member-table" table-layout="fixed" empty-text="没有符合条件的会员">
          <el-table-column label="会员信息" min-width="210"><template #default="{ row }"><div class="member-info-cell"><span class="member-avatar" :style="portraitStyle(row.portraitIndex)" role="img" :aria-label="`${row.name}的头像`" /><span><strong>{{ row.name }}</strong><small>{{ row.phone }}</small></span></div></template></el-table-column>
          <el-table-column label="等级" min-width="104"><template #default="{ row }"><span class="tier-badge" :class="tierClass(row.tier)">{{ row.tier }}</span></template></el-table-column>
          <el-table-column label="积分" min-width="104"><template #default="{ row }"><span class="member-points">{{ row.points.toLocaleString('en-US') }} 积分</span></template></el-table-column>
          <el-table-column label="余额" min-width="104"><template #default="{ row }"><strong class="member-balance">{{ formatMoney(row.balance) }}</strong></template></el-table-column>
          <el-table-column label="累计消费" min-width="118"><template #default="{ row }"><span class="member-spent">{{ formatMoney(row.spent) }}</span></template></el-table-column>
          <el-table-column label="加入日期" min-width="128"><template #default="{ row }"><span class="member-joined">{{ row.joined }}</span></template></el-table-column>
          <el-table-column label="操作" width="112" align="right"><template #default="{ row }"><div class="member-actions"><button type="button" @click="openBalance(row)">调整余额</button><button type="button" @click="viewOrders(row)">查看订单</button></div></template></el-table-column>
        </el-table>
        <footer class="member-table-footer"><span>{{ memberRange }}</span><el-pagination v-model:current-page="memberPage" background layout="prev, pager, next" :page-size="pageSize" :total="filteredMembers.length" :pager-count="5" /></footer>
      </div>
    </section>
  </div>

  <el-drawer v-model="addVisible" class="member-drawer" size="540px" :with-header="false">
    <div class="modal-header"><div><span class="eyebrow">会员档案</span><h2>添加会员</h2></div><el-button class="icon-button" circle aria-label="关闭" @click="addVisible = false"><AppIcon name="close" /></el-button></div>
    <el-form label-position="top" @submit.prevent="saveMember">
      <div class="form-row"><el-form-item label="会员姓名"><el-input v-model="addForm.name" placeholder="输入会员姓名" /></el-form-item><el-form-item label="手机号"><el-input v-model="addForm.phone" placeholder="如 138-0000-0000" /></el-form-item></div>
      <div class="form-row"><el-form-item label="会员等级"><el-select v-model="addForm.tier"><el-option v-for="item in ['钻石会员', '黄金会员', '白银会员']" :key="item" :label="item" :value="item" /></el-select></el-form-item><el-form-item label="初始积分"><el-input-number v-model="addForm.points" :min="0" :step="100" :controls="false" /></el-form-item></div>
      <el-form-item label="初始余额 (¥)"><el-input-number v-model="addForm.balance" :min="0" :step="10" :controls="false" /></el-form-item>
      <div class="drawer-actions"><el-button @click="addVisible = false">取消</el-button><el-button type="primary" @click="saveMember">添加会员</el-button></div>
    </el-form>
  </el-drawer>

  <el-drawer v-model="balanceVisible" class="member-balance-drawer" size="480px" :with-header="false">
    <div class="modal-header"><div><span class="eyebrow">{{ balanceTarget?.name }} · 当前 {{ balanceTarget ? formatMoney(balanceTarget.balance) : '' }}</span><h2>调整余额</h2></div><el-button class="icon-button" circle aria-label="关闭" @click="balanceVisible = false"><AppIcon name="close" /></el-button></div>
    <el-form label-position="top" @submit.prevent="saveBalance">
      <el-form-item label="调整方式"><el-select v-model="balanceForm.mode"><el-option label="设置为" value="set" /><el-option label="充值增加" value="add" /><el-option label="扣减" value="subtract" /></el-select></el-form-item>
      <el-form-item :label="balanceForm.mode === 'set' ? '目标余额 (¥)' : '金额 (¥)'"><el-input-number v-model="balanceForm.amount" :min="0" :step="10" :controls="false" /></el-form-item>
      <div class="drawer-actions"><el-button @click="balanceVisible = false">取消</el-button><el-button type="primary" @click="saveBalance">确认调整</el-button></div>
    </el-form>
  </el-drawer>
</template>
