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
        <div class="login-brand">
          <span class="login-kicker">猴猴轻食园</span>
          <h1 class="card-title">后台管理系统</h1>
          <span class="login-brand-line" aria-hidden="true">
            <i />
            <img src="/logo.png" alt="" />
            <i />
          </span>
        </div>

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
    </div>

    <footer class="login-footer">
      <span>© 2026 Houhou Light Food Management. All rights reserved.</span>
      <nav><button type="button" @click="forgot">隐私政策</button><button type="button" @click="forgot">服务条款</button><button type="button" @click="forgot">联系支持</button></nav>
    </footer>
  </div>
</template>
