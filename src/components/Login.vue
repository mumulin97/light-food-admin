<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import AppIcon from './AppIcon.vue'
import { isSupabaseConfigured, profileFromSession, supabase, ensureProfileDisplayName } from '../lib/supabase'

const emit = defineEmits(['login'])

const useBackend = isSupabaseConfigured()
const DEMO = { username: 'admin', password: '123456' }

const form = reactive({ username: '', password: '' })
const remember = ref(false)
const loading = ref(false)
const error = ref('')

const accountLabel = computed(() => (useBackend ? '邮箱' : '用户名'))
const accountPlaceholder = computed(() => (useBackend ? 'name@example.com' : '请输入用户名'))

async function submit() {
  error.value = ''
  if (!form.username.trim() || !form.password) {
    error.value = `请输入${accountLabel.value}和密码`
    return
  }
  loading.value = true
  try {
    if (useBackend && supabase) {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: form.username.trim(),
        password: form.password,
      })
      if (authError) {
        error.value = authError.message.includes('Invalid login')
          ? '邮箱或密码错误，请重试'
          : authError.message
        return
      }
      const user = await ensureProfileDisplayName(data.session)
      ElMessage({ message: `登录成功，欢迎回来，${user.name}！`, type: 'success', customClass: 'light-bites-message', duration: 2400 })
      emit('login', user)
      return
    }

    await new Promise(resolve => window.setTimeout(resolve, 480))
    if (form.username.trim() === DEMO.username && form.password === DEMO.password) {
      ElMessage({ message: '登录成功，欢迎回来，猴猴大王！', type: 'success', customClass: 'light-bites-message', duration: 2400 })
      emit('login', { name: '猴猴大王', role: '超级管理员', username: form.username.trim() })
    } else {
      error.value = '用户名或密码错误，请重试'
    }
  } finally {
    loading.value = false
  }
}

function forgot() {
  ElMessage({
    message: useBackend ? '请在 Supabase 控制台重置密码，或联系管理员' : '请联系系统管理员重置密码',
    customClass: 'light-bites-message',
    duration: 2400,
  })
}
</script>

<template>
  <div class="login-page">
    <div class="login-bg" aria-hidden="true">
      <div class="bg-grid" />
      <div class="bg-glow glow-1" />
      <div class="bg-glow glow-2" />
      <div class="bg-glow glow-3" />
      <span class="bg-watermark">BUSINESS</span>
      <div class="bg-bowl" />
    </div>

    <div class="login-body">
      <div class="login-card">
        <div class="brand-lockup">
          <span class="brand-emblem">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3v6a2 2 0 0 0 2 2 2 2 0 0 0 2-2V3M10 11v10M17 3c-1.6 0-2.8 2-2.8 4.6S15.4 12 17 12v9"/></svg>
          </span>
          <span class="brand-text"><strong>轻食点</strong><small>后台管理系统</small></span>
        </div>

        <h1 class="card-title">后台管理系统</h1>
        <p class="card-subtitle">{{ useBackend ? '使用 Supabase 账号登录' : '欢迎回来，请登录您的账户' }}</p>

        <form class="login-form" @submit.prevent="submit">
          <div class="field">
            <label class="field-label">{{ accountLabel }}</label>
            <el-input
              v-model="form.username"
              size="large"
              :placeholder="accountPlaceholder"
              :autocomplete="useBackend ? 'email' : 'username'"
              @input="error = ''"
            >
              <template #prefix><AppIcon name="user" /></template>
            </el-input>
          </div>
          <div class="field">
            <label class="field-label">密码</label>
            <el-input v-model="form.password" type="password" size="large" placeholder="请输入密码" show-password autocomplete="current-password" @input="error = ''" @keyup.enter="submit">
              <template #prefix><AppIcon name="lock" /></template>
            </el-input>
          </div>

          <div class="field-row">
            <label class="remember"><input v-model="remember" type="checkbox" /><span>记住我</span></label>
            <button type="button" class="forgot" @click="forgot">忘记密码?</button>
          </div>

          <p v-if="error" class="login-error" role="alert"><AppIcon name="warning" />{{ error }}</p>

          <el-button class="login-submit" type="primary" size="large" native-type="submit" :loading="loading">
            {{ loading ? '登录中…' : '登录' }}
          </el-button>
        </form>
      </div>

      <div class="login-hero-text">
        <h2><span class="line-dark">猴猴美食总动员</span><span class="line-green">后台管理</span></h2>
        <p class="hero-sub">香香香，好吃好吃超好吃</p>
        <div class="hero-badges">
          <span class="hero-badge">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.4 3 8.5 7 10 4-1.5 7-5.6 7-10V6l-7-3ZM9 12l2 2 4-4"/></svg>
            超级保密
          </span>
          <span class="hero-badge">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></svg>
            超快速度
          </span>
        </div>
      </div>
    </div>

    <footer class="login-footer">
      <span>© 2024 Light Bites Catering Management. All rights reserved.</span>
      <nav><button type="button" @click="forgot">隐私政策</button><button type="button" @click="forgot">服务条款</button><button type="button" @click="forgot">联系支持</button></nav>
    </footer>
  </div>
</template>
