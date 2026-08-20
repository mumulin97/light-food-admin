<script setup>
import { computed, inject, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import AppIcon from './AppIcon.vue'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

const props = defineProps({
  initialView: { type: String, default: 'profile' },
})

const currentUser = inject('currentUser')
const updateCurrentUser = inject('authUpdateUser')
const route = useRoute()
const router = useRouter()
const useBackend = isSupabaseConfigured()
const PROFILE_EXTRA_KEY = 'lightbites-profile-extra'
const SECURITY_KEY = 'lightbites-security-settings'
const DEMO_PASSWORD_KEY = 'lightbites-demo-password'

const savingProfile = ref(false)
const changingPassword = ref(false)
const endingSessions = ref(false)
const activeView = computed(() => route.name === 'account' ? 'account' : props.initialView)

function readLocal(key, fallback = {}) {
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(key) || '{}') } } catch { return fallback }
}

const profileExtra = readLocal(PROFILE_EXTRA_KEY, {
  phone: '138-8888-8888',
  department: '运营管理中心',
  store: '全部门店',
  bio: '负责门店经营、供应链与团队协同。',
})

const profileForm = reactive({
  name: currentUser.value?.name || '',
  username: currentUser.value?.username || '',
  email: currentUser.value?.email || '',
  phone: currentUser.value?.phone || profileExtra.phone,
  department: currentUser.value?.department || profileExtra.department,
  store: currentUser.value?.store || profileExtra.store,
  bio: currentUser.value?.bio || profileExtra.bio,
})

const securityForm = reactive(readLocal(SECURITY_KEY, {
  loginAlert: true,
  operationConfirm: true,
  sessionTimeout: '30 分钟',
}))

const passwordForm = reactive({ current: '', next: '', confirm: '' })

const profileCompleteness = computed(() => {
  const fields = ['name', 'username', 'phone', 'department', 'store', 'bio']
  return Math.round(fields.filter(key => String(profileForm[key] || '').trim()).length / fields.length * 100)
})

const accountIdentifier = computed(() => currentUser.value?.email || currentUser.value?.username || 'admin')
const sessionPlatform = computed(() => {
  const text = navigator.userAgent
  if (/Macintosh|Mac OS X/.test(text)) return 'Mac · 当前浏览器'
  if (/Windows/.test(text)) return 'Windows · 当前浏览器'
  return '当前设备 · 当前浏览器'
})

const permissionGroups = [
  { icon: 'store', title: '门店与经营', description: '门店档案、经营指标与库存查看', level: '管理' },
  { icon: 'box', title: '商品与供应链', description: '产品、原料、供应商及采购协同', level: '管理' },
  { icon: 'cart', title: '订单与会员', description: '订单处理、会员资产与营销活动', level: '管理' },
  { icon: 'badge', title: '团队与系统', description: '员工账号、角色权限与系统日志', level: '管理' },
]

watch(() => currentUser.value, user => {
  if (!user) return
  profileForm.name = user.name || profileForm.name
  profileForm.username = user.username || profileForm.username
  profileForm.email = user.email || profileForm.email
}, { deep: true })

function notify(message, type = 'success') {
  ElMessage({ message, type, customClass: 'light-bites-message', duration: 2600 })
}

function openView(view) {
  router.push(view === 'profile' ? '/profile' : '/account')
}

async function saveProfile() {
  if (!profileForm.name.trim() || !profileForm.username.trim()) {
    notify('请填写姓名和登录账号', 'warning')
    return
  }
  savingProfile.value = true
  const patch = {
    name: profileForm.name.trim(),
    username: profileForm.username.trim(),
    phone: profileForm.phone.trim(),
    department: profileForm.department,
    store: profileForm.store,
    bio: profileForm.bio.trim(),
  }
  try {
    if (useBackend && supabase) {
      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: patch.name,
          username: patch.username,
          phone: patch.phone,
          department: patch.department,
          store: patch.store,
          bio: patch.bio,
          role: currentUser.value?.role || '超级管理员',
        },
      })
      if (error) throw error
    }
    localStorage.setItem(PROFILE_EXTRA_KEY, JSON.stringify(patch))
    updateCurrentUser(patch)
    notify('个人资料已保存，并同步到右上角账号信息')
  } catch (error) {
    notify(error.message || '个人资料保存失败', 'error')
  } finally {
    savingProfile.value = false
  }
}

function saveSecurity() {
  localStorage.setItem(SECURITY_KEY, JSON.stringify(securityForm))
  notify('安全偏好已保存')
}

async function changePassword() {
  if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) {
    notify('请完整填写当前密码和新密码', 'warning')
    return
  }
  if (passwordForm.next.length < 8 || !/[A-Za-z]/.test(passwordForm.next) || !/\d/.test(passwordForm.next)) {
    notify('新密码至少 8 位，并同时包含字母和数字', 'warning')
    return
  }
  if (passwordForm.next !== passwordForm.confirm) {
    notify('两次输入的新密码不一致', 'warning')
    return
  }
  changingPassword.value = true
  try {
    if (useBackend && supabase) {
      if (!currentUser.value?.email) throw new Error('当前账号缺少邮箱，无法验证身份')
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: currentUser.value.email,
        password: passwordForm.current,
      })
      if (authError) throw new Error('当前密码不正确')
      const { error } = await supabase.auth.updateUser({ password: passwordForm.next })
      if (error) throw error
    } else {
      const savedPassword = localStorage.getItem(DEMO_PASSWORD_KEY) || '123456'
      if (passwordForm.current !== savedPassword) throw new Error('当前密码不正确')
      localStorage.setItem(DEMO_PASSWORD_KEY, passwordForm.next)
    }
    Object.assign(passwordForm, { current: '', next: '', confirm: '' })
    notify('密码已更新，下次登录请使用新密码')
  } catch (error) {
    notify(error.message || '密码更新失败', 'error')
  } finally {
    changingPassword.value = false
  }
}

async function endOtherSessions() {
  endingSessions.value = true
  try {
    if (useBackend && supabase) {
      const { error } = await supabase.auth.signOut({ scope: 'others' })
      if (error) throw error
    }
    notify('其他设备的登录会话已退出')
  } catch (error) {
    notify(error.message || '退出其他设备失败', 'error')
  } finally {
    endingSessions.value = false
  }
}
</script>

<template>
  <div class="account-center-content">
    <section class="account-page-heading">
      <div>
        <h1>{{ activeView === 'profile' ? '个人资料' : '账号与权限' }}</h1>
        <p>{{ activeView === 'profile' ? '维护个人身份与工作信息，资料保存后同步到全局账号展示。' : '管理登录安全、账号会话，并查看当前角色的业务操作范围。' }}</p>
      </div>
      <div class="system-tabs account-view-tabs" role="tablist" aria-label="账号中心页面">
        <button type="button" :class="{ active: activeView === 'profile' }" @click="openView('profile')">个人资料</button>
        <button type="button" :class="{ active: activeView === 'account' }" @click="openView('account')">账号与权限</button>
      </div>
    </section>

    <template v-if="activeView === 'profile'">
      <div class="profile-workspace">
        <section class="profile-hero-card">
          <div class="profile-hero-identity">
            <span class="account-avatar-large"><img :src="currentUser?.avatar || '/brand-assets/monkey-kitchen-avatar-front.png'" alt="用户头像" /></span>
            <div class="profile-hero-copy">
              <small>当前登录用户</small>
              <div><h2>{{ currentUser?.name }}</h2><span class="account-state"><i />账号正常</span></div>
              <p>{{ currentUser?.role }} · {{ profileForm.username }}</p>
            </div>
          </div>
          <div class="profile-hero-stats">
            <article><span class="profile-stat-icon"><AppIcon name="badge" /></span><div><small>所属部门</small><strong>{{ profileForm.department }}</strong><p>组织归属</p></div></article>
            <article><span class="profile-stat-icon blue"><AppIcon name="store" /></span><div><small>负责范围</small><strong>{{ profileForm.store }}</strong><p>业务管理范围</p></div></article>
            <article class="profile-completeness-stat"><div><small>资料完整度</small><strong>{{ profileCompleteness }}%</strong></div><i><b :style="{ width: `${profileCompleteness}%` }" /></i><p>{{ profileCompleteness === 100 ? '资料已完整' : '继续补充资料' }}</p></article>
          </div>
        </section>
        <section class="account-panel profile-editor-panel">
          <header class="account-panel-head"><div><h2>基本资料</h2><p>用于页面展示、通知接收与业务协同。</p></div><span class="account-panel-note"><AppIcon name="check" />保存后全局同步</span></header>
          <el-form label-position="top" class="account-form" @submit.prevent="saveProfile">
            <div class="account-form-grid">
              <el-form-item label="姓名"><el-input v-model="profileForm.name" maxlength="20" placeholder="输入姓名" /></el-form-item>
              <el-form-item label="登录账号"><el-input v-model="profileForm.username" maxlength="32" placeholder="输入登录账号" /></el-form-item>
              <el-form-item label="邮箱"><el-input v-model="profileForm.email" placeholder="当前账号未绑定邮箱" disabled /></el-form-item>
              <el-form-item label="联系电话"><el-input v-model="profileForm.phone" maxlength="24" placeholder="输入联系电话" /></el-form-item>
              <el-form-item label="所属部门"><el-select v-model="profileForm.department"><el-option v-for="item in ['运营管理中心','门店运营部','供应链中心','市场增长部']" :key="item" :label="item" :value="item" /></el-select></el-form-item>
              <el-form-item label="负责范围"><el-select v-model="profileForm.store"><el-option v-for="item in ['全部门店','中心旗舰店','滨江轻食店','云谷外卖店']" :key="item" :label="item" :value="item" /></el-select></el-form-item>
            </div>
            <el-form-item label="个人简介" class="profile-bio-field"><el-input v-model="profileForm.bio" type="textarea" :rows="3" maxlength="100" show-word-limit placeholder="简要描述工作职责" /></el-form-item>
            <div class="account-form-actions profile-form-actions"><el-button class="account-secondary-button" @click="router.back()">返回</el-button><el-button type="primary" class="account-primary-button" :loading="savingProfile" @click="saveProfile">保存个人资料</el-button></div>
          </el-form>
        </section>
      </div>
    </template>

    <template v-else>
      <section class="account-security-overview">
        <article><span class="account-feature-icon green"><AppIcon name="user" /></span><div><small>登录账号</small><strong>{{ accountIdentifier }}</strong><p>身份状态正常</p></div></article>
        <article><span class="account-feature-icon blue"><AppIcon name="badge" /></span><div><small>当前角色</small><strong>{{ currentUser?.role }}</strong><p>拥有全部业务管理权限</p></div></article>
        <article><span class="account-feature-icon amber"><AppIcon name="lock" /></span><div><small>安全状态</small><strong>良好</strong><p>登录提醒已{{ securityForm.loginAlert ? '开启' : '关闭' }}</p></div></article>
      </section>

      <div class="account-settings-grid">
        <section class="account-panel password-panel">
          <header class="account-panel-head"><div><h2>修改密码</h2><p>验证当前密码后更新登录凭证。</p></div><span class="account-panel-note"><AppIcon name="lock" />安全验证</span></header>
          <el-form label-position="top" class="account-form password-form" @submit.prevent="changePassword">
            <el-form-item label="当前密码"><el-input v-model="passwordForm.current" type="password" show-password autocomplete="current-password" placeholder="输入当前密码" /></el-form-item>
            <div class="account-form-grid"><el-form-item label="新密码"><el-input v-model="passwordForm.next" type="password" show-password autocomplete="new-password" placeholder="至少 8 位，包含字母和数字" /></el-form-item><el-form-item label="确认新密码"><el-input v-model="passwordForm.confirm" type="password" show-password autocomplete="new-password" placeholder="再次输入新密码" /></el-form-item></div>
            <div class="account-form-actions"><span class="password-tip">更新后可在会话管理中退出其他设备。</span><el-button type="primary" class="account-primary-button" :loading="changingPassword" @click="changePassword">更新密码</el-button></div>
          </el-form>
        </section>

        <section class="account-panel security-preferences">
          <header class="account-panel-head"><div><h2>安全偏好</h2><p>控制登录提醒与重要操作验证。</p></div><span class="account-panel-note"><AppIcon name="check" />设置已启用</span></header>
          <label><span><strong>异地登录提醒</strong><small>检测到新设备时发送提醒</small></span><el-switch v-model="securityForm.loginAlert" /></label>
          <label><span><strong>敏感操作确认</strong><small>导出和权限调整前再次确认</small></span><el-switch v-model="securityForm.operationConfirm" /></label>
          <div class="session-timeout"><span><strong>自动锁定</strong><small>无操作后重新验证身份</small></span><el-select v-model="securityForm.sessionTimeout"><el-option v-for="item in ['15 分钟','30 分钟','1 小时','永不']" :key="item" :label="item" :value="item" /></el-select></div>
          <el-button type="primary" class="account-primary-button full" @click="saveSecurity">保存安全偏好</el-button>
        </section>
      </div>

      <section class="account-panel permission-panel permission-panel-wide">
        <header class="account-panel-head"><div><h2>角色权限</h2><p>权限由“{{ currentUser?.role }}”角色统一继承。</p></div><el-button class="account-secondary-button" @click="router.push('/employees')">管理角色成员</el-button></header>
        <div class="permission-grid"><article v-for="item in permissionGroups" :key="item.title"><span class="permission-icon"><AppIcon :name="item.icon" /></span><div><strong>{{ item.title }}</strong><p>{{ item.description }}</p></div><b><AppIcon name="check" />{{ item.level }}</b></article></div>
      </section>

      <div class="account-session-grid">
        <section class="account-panel session-panel">
          <header class="account-panel-head"><div><h2>登录会话</h2><p>管理当前设备及其他已登录设备。</p></div></header>
          <div class="session-panel-body"><article><span class="session-device"><AppIcon name="globe" /></span><div><strong>{{ sessionPlatform }}</strong><p>中国上海 · 当前会话</p><small><i />在线</small></div></article><el-button class="account-secondary-button" :loading="endingSessions" @click="endOtherSessions">退出其他设备</el-button></div>
        </section>

        <button type="button" class="account-log-link account-log-card" @click="router.push('/logs')"><span><AppIcon name="history" /><span><strong>账号操作日志</strong><small>追踪权限、安全设置与登录行为变更</small></span></span><AppIcon name="arrow" /></button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.account-center-content { position: relative; min-height: calc(100vh - var(--topbar-height)); padding: 26px 34px 48px; background: radial-gradient(circle at 93% 4%, rgba(176,220,238,.23), transparent 31%), radial-gradient(circle at 8% 92%, rgba(185,231,211,.2), transparent 29%), linear-gradient(145deg,#f7faf8 0%,#f4f9fa 54%,#f7faf8 100%); }
.account-page-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 20px; }
.account-page-heading h1 { margin: 0; color: #173f32; font-size: 30px; line-height: 1.2; letter-spacing: -.035em; }
.account-page-heading p { margin: 8px 0 0; color: #647068; font-size: 14px; }
.account-view-tabs { display: inline-flex; align-items: center; gap: 4px; padding: 4px; border: 1px solid rgba(177,207,204,.72); border-radius: 13px; background: linear-gradient(135deg,rgba(232,248,243,.9),rgba(226,239,247,.86)); box-shadow: 0 8px 20px rgba(53,91,86,.08), inset 0 1px rgba(255,255,255,.88); }
.account-view-tabs button { min-height: 36px; display: inline-flex; align-items: center; gap: 7px; padding: 0 15px; border-radius: 9px; background: transparent; color: #58706b; font-size: 13px; font-weight: 750; }
.account-view-tabs button.active { background: linear-gradient(135deg,#2d9d75,#298c79); color: #fff; box-shadow: 0 6px 14px rgba(34,130,96,.2); }
.account-view-tabs svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; }
.profile-workspace { display: grid; gap: 18px; }
.account-identity-card,.account-completeness-card,.profile-hero-card,.account-security-overview article,.account-panel,.account-log-link { border: 1px solid rgba(255,255,255,.82); background: radial-gradient(circle at 10% 0%,rgba(255,255,255,.88),transparent 45%),linear-gradient(145deg,rgba(231,248,244,.88),rgba(222,237,247,.82)); box-shadow: 0 14px 32px rgba(45,84,83,.09),inset 0 1px rgba(255,255,255,.94); backdrop-filter: blur(20px) saturate(1.2); }
.profile-hero-card { min-height: 158px; display: grid; grid-template-columns: minmax(300px,.9fr) minmax(0,1.65fr); overflow: hidden; border-radius: 22px; }
.profile-hero-identity { display: flex; align-items: center; gap: 18px; padding: 24px 26px; border-right: 1px solid rgba(130,171,169,.18); background: radial-gradient(circle at 0 50%,rgba(198,236,220,.38),transparent 62%); }
.profile-hero-copy { min-width: 0; }
.profile-hero-copy > small,.profile-hero-stats small { color: #698079; font-size: 11.5px; font-weight: 750; }
.profile-hero-copy > div { display: flex; align-items: center; gap: 10px; margin-top: 5px; }
.profile-hero-copy h2 { margin: 0; overflow: hidden; color: #173f32; font-size: 25px; line-height: 1.2; text-overflow: ellipsis; white-space: nowrap; }
.profile-hero-copy p { margin: 7px 0 0; color: #60756e; font-size: 12.5px; }
.profile-hero-copy .account-state { padding: 5px 9px; font-size: 10.5px; }
.profile-hero-stats { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); align-items: stretch; }
.profile-hero-stats > article { min-width: 0; display: flex; align-items: center; gap: 11px; padding: 22px 18px; border-left: 1px solid rgba(130,171,169,.15); }
.profile-hero-stats > article:first-child { border-left: 0; }
.profile-hero-stats article > div { min-width: 0; }
.profile-hero-stats strong { display: block; margin-top: 6px; overflow: hidden; color: #23483b; font-size: 14px; line-height: 1.3; text-overflow: ellipsis; white-space: nowrap; }
.profile-hero-stats p { margin: 5px 0 0; color: #788780; font-size: 10.5px; }
.profile-stat-icon { width: 38px; height: 38px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 12px; background: rgba(213,241,229,.76); color: #247d5c; }
.profile-stat-icon.blue { background: rgba(216,236,249,.82); color: #397c9f; }
.profile-stat-icon :deep(svg) { width: 19px; height: 19px; fill: none; stroke: currentColor; stroke-width: 1.9; }
.profile-hero-stats > .profile-completeness-stat { display: block; }
.profile-completeness-stat > div { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.profile-completeness-stat > div strong { margin: 0; color: #21805e; font-size: 20px; }
.profile-completeness-stat > i { height: 6px; display: block; margin-top: 13px; overflow: hidden; border-radius: 999px; background: rgba(174,207,200,.38); }
.profile-completeness-stat > i b { height: 100%; display: block; border-radius: inherit; background: linear-gradient(90deg,#5ec795,#27966d); }
.account-identity-card { min-height: 246px; display: flex; flex-direction: column; align-items: stretch; gap: 22px; padding: 22px; border-radius: 20px; }
.profile-identity-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.account-avatar-large { width: 82px; height: 82px; display: grid; place-items: center; flex: 0 0 auto; overflow: hidden; border: 3px solid rgba(255,255,255,.84); border-radius: 24px; background: #eff8f1; box-shadow: 0 10px 22px rgba(35,95,65,.14); }
.account-avatar-large img { width: 100%; height: 100%; object-fit: cover; transform: scale(1.52); transform-origin: 50% 34%; }
.account-identity-card small,.account-completeness-card small,.account-security-overview small { color: #698079; font-size: 12px; font-weight: 700; }
.account-identity-card h2 { margin: 6px 0 4px; color: #173f32; font-size: 24px; }
.account-identity-card p,.account-completeness-card p,.account-security-overview p { margin: 0; color: #63746e; font-size: 13px; }
.profile-identity-copy { padding-top: 2px; }
.profile-identity-copy > span { display: block; margin-top: 14px; padding-top: 14px; border-top: 1px solid rgba(125,172,164,.18); color: #5f7770; font-size: 12.5px; line-height: 1.5; }
.account-state { display: inline-flex; align-items: center; gap: 7px; padding: 7px 11px; border-radius: 999px; background: rgba(222,245,230,.82); color: #16723e; font-size: 12px; font-weight: 800; white-space: nowrap; }
.account-state i { width: 7px; height: 7px; border-radius: 50%; background: #2caf67; box-shadow: 0 0 0 4px rgba(44,175,103,.12); }
.account-completeness-card { min-height: 150px; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 20px 22px; border-radius: 20px; }
.account-completeness-card strong { display: block; margin: 4px 0 3px; color: #173f32; font-size: 28px; }
.completion-ring { width: 72px; height: 72px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 50%; background: conic-gradient(#31a67b var(--progress),rgba(174,207,200,.32) 0); position: relative; }
.completion-ring::before { content: ''; position: absolute; inset: 7px; border-radius: inherit; background: #edf7f5; }
.completion-ring span { position: relative; color: #246d5b; font-size: 15px; font-weight: 850; }
.account-panel { padding: 22px; border-radius: 20px; }
.profile-editor-panel { padding: 24px 26px 22px; }
.profile-editor-panel .account-panel-head { margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid rgba(130,171,169,.18); }
.account-panel-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
.account-panel-head h2 { margin: 0; color: #173f32; font-size: 20px; }
.account-panel-head p { margin: 6px 0 0; color: #6a7973; font-size: 13px; }
.account-panel-note { display: inline-flex; align-items: center; gap: 6px; color: #31806b; font-size: 12px; font-weight: 800; }
.account-panel-note svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 2.4; }
.account-form-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 2px 16px; }
.profile-editor-panel .account-form-grid { grid-template-columns: repeat(3,minmax(0,1fr)); column-gap: 18px; }
.profile-editor-panel :deep(.el-form-item) { margin-bottom: 17px; }
.profile-editor-panel .profile-bio-field { margin-bottom: 15px; }
.account-form :deep(.el-form-item__label) { padding-bottom: 7px; color: #3f5750; font-size: 13px; font-weight: 750; }
.account-form :deep(.el-input__wrapper),.account-form :deep(.el-select__wrapper),.account-form :deep(.el-textarea__inner) { border: 1px solid rgba(174,205,207,.68); border-radius: 12px; background: linear-gradient(135deg,rgba(236,249,246,.86),rgba(231,241,248,.82)); box-shadow: inset 0 1px rgba(255,255,255,.92); }
.account-form :deep(.el-input__wrapper),.account-form :deep(.el-select__wrapper) { min-height: 44px; }
.account-form :deep(.el-input.is-disabled .el-input__wrapper) { background: rgba(224,235,237,.62); }
.account-form-actions { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding-top: 6px; }
.profile-form-actions { padding: 16px 0 0; border-top: 1px solid rgba(130,171,169,.18); }
.account-primary-button.el-button,.account-secondary-button.el-button { min-height: 40px; margin: 0; padding: 0 17px; border-radius: 11px; font-weight: 800; }
.account-primary-button.el-button { border: 0; background: linear-gradient(135deg,#2ca879,#288d7e); color: #fff; box-shadow: 0 8px 18px rgba(42,147,112,.18); }
.account-secondary-button.el-button { border: 1px solid rgba(142,187,181,.58); background: linear-gradient(135deg,rgba(238,249,246,.82),rgba(226,240,247,.76)); color: #397264; }
.account-primary-button.full,.account-secondary-button.full { width: 100%; }
.account-security-overview { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 16px; margin-bottom: 18px; }
.account-security-overview article { min-height: 104px; display: flex; align-items: center; gap: 14px; padding: 18px; border-radius: 18px; }
.account-security-overview strong { display: block; max-width: 260px; margin: 4px 0; overflow: hidden; color: #173f32; font-size: 17px; text-overflow: ellipsis; white-space: nowrap; }
.account-feature-icon,.permission-icon,.session-device { display: grid; place-items: center; flex: 0 0 auto; border-radius: 13px; }
.account-feature-icon { width: 44px; height: 44px; }
.account-feature-icon.green { background: rgba(215,244,226,.84); color: #25875d; }.account-feature-icon.blue { background: rgba(216,236,249,.9); color: #397c9f; }.account-feature-icon.amber { background: rgba(255,236,204,.82); color: #a16b20; }
.account-feature-icon svg,.permission-icon svg,.session-device svg { width: 21px; height: 21px; fill: none; stroke: currentColor; stroke-width: 1.9; }
.account-settings-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 18px; margin-bottom: 18px; align-items: stretch; }
.password-panel,.security-preferences { min-height: 342px; }
.password-panel { display: flex; flex-direction: column; }
.password-panel .password-form { flex: 1; display: flex; flex-direction: column; }
.password-panel .account-form-actions { margin-top: auto; }
.password-tip { margin-right: auto; color: #73817c; font-size: 12px; }
.permission-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 10px; }
.permission-panel-wide { margin-bottom: 18px; }
.permission-panel-wide .permission-grid { grid-template-columns: repeat(4,minmax(0,1fr)); }
.permission-panel-wide .permission-grid article { grid-template-columns: 42px minmax(0,1fr); align-content: center; }
.permission-panel-wide .permission-grid b { grid-column: 2; justify-self: start; }
.permission-grid article { min-height: 86px; display: grid; grid-template-columns: 42px minmax(0,1fr) auto; align-items: center; gap: 12px; padding: 13px; border: 1px solid rgba(174,205,207,.48); border-radius: 14px; background: rgba(238,249,246,.48); }
.permission-icon { width: 42px; height: 42px; background: rgba(213,241,229,.72); color: #247d5c; }
.permission-grid strong { color: #24483d; font-size: 14px; }.permission-grid p { margin: 4px 0 0; color: #71807a; font-size: 11.5px; line-height: 1.4; }.permission-grid b { display: inline-flex; align-items: center; gap: 4px; color: #27805e; font-size: 12px; }.permission-grid b svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2.5; }
.security-preferences { display: flex; flex-direction: column; }
.security-preferences label,.session-timeout { display: flex; align-items: center; justify-content: space-between; gap: 15px; padding: 13px 0; border-top: 1px solid rgba(130,171,169,.18); }
.security-preferences label span,.session-timeout > span { display: grid; gap: 4px; }.security-preferences label strong,.session-timeout strong { color: #2b4a40; font-size: 13px; }.security-preferences label small,.session-timeout small { color: #71807a; font-size: 11.5px; }
.security-preferences :deep(.el-switch) { --el-switch-on-color: #2b9d74; --el-switch-off-color: #c6d7d4; }
.session-timeout :deep(.el-select) { width: 108px; }.session-timeout :deep(.el-select__wrapper) { min-height: 38px; border: 1px solid rgba(157,193,194,.58); border-radius: 10px; background: linear-gradient(135deg,rgba(233,248,244,.88),rgba(226,239,247,.82)); box-shadow: none; }
.security-preferences > .account-primary-button { margin-top: auto; }
.account-session-grid { display: grid; grid-template-columns: minmax(0,1.45fr) minmax(280px,.7fr); gap: 18px; align-items: stretch; }
.account-session-grid .session-panel { min-height: 156px; }
.session-panel-body { display: flex; align-items: center; gap: 16px; }
.session-panel-body > article { flex: 1 1 auto; margin-bottom: 0; }
.session-panel article { display: flex; gap: 12px; padding: 14px; margin-bottom: 14px; border: 1px solid rgba(164,199,198,.42); border-radius: 14px; background: rgba(235,247,244,.52); }
.session-device { width: 42px; height: 42px; background: rgba(218,238,248,.78); color: #397e91; }.session-panel article strong { color: #28483f; font-size: 13px; }.session-panel article p { margin: 5px 0; color: #71807a; font-size: 11.5px; }.session-panel article small { display: inline-flex; align-items: center; gap: 5px; color: #27805e; font-size: 11px; font-weight: 750; }.session-panel article small i { width: 6px; height: 6px; border-radius: 50%; background: #2cad6a; }
.account-log-link { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 17px 18px; border-radius: 16px; color: #2d5e52; text-align: left; }.account-log-link > span { display: flex; align-items: center; gap: 12px; }.account-log-link > span > svg { width: 22px; height: 22px; }.account-log-link span span { display: grid; gap: 3px; }.account-log-link strong { font-size: 13px; }.account-log-link small { color: #72817c; font-size: 11px; }.account-log-link svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; }
.account-log-card { min-height: 100%; padding: 24px; border-radius: 20px; background: radial-gradient(circle at 12% 20%,rgba(215,242,231,.82),transparent 44%),linear-gradient(145deg,rgba(239,250,247,.9),rgba(220,237,247,.84)); }
.account-log-card > span > svg { width: 38px; height: 38px; padding: 9px; border-radius: 12px; background: rgba(213,241,229,.8); color: #247d5c; }
.account-log-card strong { font-size: 15px; }.account-log-card small { max-width: 210px; margin-top: 3px; font-size: 11.5px; line-height: 1.45; }
@media (max-width: 1100px) { .profile-hero-card,.account-settings-grid,.account-session-grid { grid-template-columns: 1fr; }.profile-hero-identity { border-right: 0; border-bottom: 1px solid rgba(130,171,169,.18); }.profile-editor-panel .account-form-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }.permission-panel-wide .permission-grid,.account-security-overview { grid-template-columns: repeat(2,minmax(0,1fr)); } }
@media (max-width: 760px) { .account-center-content { padding: 22px 18px 40px; }.account-page-heading { flex-direction: column; }.account-view-tabs { width: 100%; }.account-view-tabs button { flex: 1; justify-content: center; }.profile-hero-stats,.profile-editor-panel .account-form-grid,.permission-panel-wide .permission-grid,.account-security-overview,.account-form-grid,.permission-grid { grid-template-columns: 1fr; }.profile-hero-stats > article { border-left: 0; border-top: 1px solid rgba(130,171,169,.15); }.session-panel-body { align-items: stretch; flex-direction: column; }.profile-form-actions { padding-right: 0; }.account-form-actions { align-items: stretch; flex-direction: column-reverse; }.password-tip { margin: 0 0 6px; }.account-form-actions .el-button { width: 100%; } }
</style>
