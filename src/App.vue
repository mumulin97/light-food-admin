<script setup>
import { onMounted, provide, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { isSupabaseConfigured, profileFromSession, supabase, ensureProfileDisplayName } from './lib/supabase'
import Login from './components/Login.vue'
import AppIcon from './components/AppIcon.vue'

const AUTH_KEY = 'lightbites-auth'
const useBackend = isSupabaseConfigured()
const currentUser = ref(null)

provide('currentUser', currentUser)

async function bootstrapAuth() {
  if (useBackend && supabase) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      currentUser.value = await ensureProfileDisplayName(session)
    }
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        currentUser.value = event === 'SIGNED_IN'
          ? await ensureProfileDisplayName(session)
          : profileFromSession(session)
      } else if (event === 'SIGNED_OUT') {
        currentUser.value = null
      }
    })
    return
  }
  try {
    const stored = localStorage.getItem(AUTH_KEY)
    if (stored) currentUser.value = JSON.parse(stored)
  } catch (e) { /* ignore malformed auth cache */ }
}

onMounted(() => bootstrapAuth())

function handleLogin(user) {
  currentUser.value = user
  if (!useBackend) localStorage.setItem(AUTH_KEY, JSON.stringify(user))
}

async function logout() {
  if (useBackend && supabase) await supabase.auth.signOut()
  currentUser.value = null
  if (!useBackend) localStorage.removeItem(AUTH_KEY)
  ElMessage({ message: '已安全退出登录', customClass: 'light-bites-message', duration: 2400 })
}

provide('authLogout', logout)
</script>

<template>
  <svg class="icon-sprite" aria-hidden="true">
    <symbol id="i-grid" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></symbol>
    <symbol id="i-store" viewBox="0 0 24 24"><path d="M4 10v10h16V10M3 10l2-6h14l2 6M3 10c0 2 3 2 4.5 0 1.5 2 4.5 2 6 0 1.5 2 4.5 2 6 0M9 20v-6h6v6"/></symbol>
    <symbol id="i-box" viewBox="0 0 24 24"><path d="M3 7h18v14H3zM5 3h14l2 4H3zM9 11h6"/></symbol>
    <symbol id="i-leaf" viewBox="0 0 24 24"><path d="M19.5 4.5C13 4 7 8 7 14c0 3 2 5 5 5 6 0 8-6 7.5-14.5Z"/><path d="M5 21c2-5 5-8 10-11"/></symbol>
    <symbol id="i-truck" viewBox="0 0 24 24"><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7zM7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/></symbol>
    <symbol id="i-cart" viewBox="0 0 24 24"><path d="M3 4h2l2.5 11h10l3-8H6M9 20h.01M18 20h.01"/></symbol>
    <symbol id="i-users" viewBox="0 0 24 24"><path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 20v-2a4 4 0 0 0-3-3.87M16 2.13a4 4 0 0 1 0 7.75"/></symbol>
    <symbol id="i-megaphone" viewBox="0 0 24 24"><path d="m3 11 14-6v14L3 13zM17 9l4-2M17 15l4 2M7 14l2 6h3l-2-7"/></symbol>
    <symbol id="i-badge" viewBox="0 0 24 24"><path d="M9 4V2h6v2M5 6h14v15H5zM9 10h6M9 14h6M9 18h4"/></symbol>
    <symbol id="i-history" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2"/></symbol>
    <symbol id="i-plus" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></symbol>
    <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></symbol>
    <symbol id="i-bell" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></symbol>
    <symbol id="i-settings" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.55V21h-4v-.08A1.7 1.7 0 0 0 8.97 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.52-1.03H3v-4h.08A1.7 1.7 0 0 0 4.6 8.97a1.7 1.7 0 0 0-.34-1.88L4.2 7.03 7.03 4.2l.06.06A1.7 1.7 0 0 0 8.97 4.6 1.7 1.7 0 0 0 10 3.08V3h4v.08a1.7 1.7 0 0 0 1.03 1.52 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z"/></symbol>
    <symbol id="i-receipt" viewBox="0 0 24 24"><path d="M6 2v20l3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2zM9 9h6M9 13h6M9 17h4"/></symbol>
    <symbol id="i-money" viewBox="0 0 24 24"><path d="M3 6h18v12H3z"/><circle cx="12" cy="12" r="3"/><path d="M7 9H6v1M17 15h1v-1"/></symbol>
    <symbol id="i-clipboard" viewBox="0 0 24 24"><path d="M9 4h6l1 2h3v15H5V6h3zM9 14l2 2 4-5"/></symbol>
    <symbol id="i-warning" viewBox="0 0 24 24"><path d="m12 3 10 18H2zM12 9v5M12 18h.01"/></symbol>
    <symbol id="i-calendar" viewBox="0 0 24 24"><path d="M4 5h16v16H4zM8 2v6M16 2v6M4 10h16"/></symbol>
    <symbol id="i-chevron" viewBox="0 0 24 24"><path d="m8 10 4 4 4-4"/></symbol>
    <symbol id="i-more" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></symbol>
    <symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h14M14 7l5 5-5 5"/></symbol>
    <symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></symbol>
    <symbol id="i-close" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></symbol>
    <symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></symbol>
    <symbol id="i-lock" viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 15v2"/></symbol>
    <symbol id="i-cutlery" viewBox="0 0 24 24"><path d="M7 2v8a2 2 0 0 0 2 2 2 2 0 0 0 2-2V2M9 12v10M17 2c-1.7 0-3 2-3 5s1.3 4 3 4v11"/></symbol>
    <symbol id="i-user-plus" viewBox="0 0 24 24"><circle cx="9" cy="8" r="4"/><path d="M2 21v-1a6 6 0 0 1 6-6h3M18 11v6M15 14h6"/></symbol>
    <symbol id="i-piggy" viewBox="0 0 24 24"><path d="M3 12a6 6 0 0 1 6-6h4a6 6 0 0 1 5.7 4.1c.5.1 1.3.5 1.3 1.9v2c0 1-.7 1.3-1.2 1.4A6 6 0 0 1 16 19v2h-3v-1.6h-2V21H8v-2.1A6 6 0 0 1 5 15H4a1 1 0 0 1-1-1ZM13 6V3.5M16 11h.01"/></symbol>
    <symbol id="i-party" viewBox="0 0 24 24"><path d="m4 20 3-9 6 6-9 3ZM7 11l6 6M14 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 9l.6 1.4L21 11l-1.4.6L19 13l-.6-1.4L17 11l1.4-.6z"/></symbol>
    <symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></symbol>
    <symbol id="i-edit" viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4"/></symbol>
    <symbol id="i-filter" viewBox="0 0 24 24"><path d="M3 5h18l-7 8v5l-4 2v-7z"/></symbol>
    <symbol id="i-globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 4 6 4 9s-1 6-4 9c-3-3-4-6-4-9s1-6 4-9Z"/></symbol>
    <symbol id="i-download" viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M4 20h16"/></symbol>
    <symbol id="i-upload" viewBox="0 0 24 24"><path d="M12 15V3M7 8l5-5 5 5M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2"/></symbol>
    <symbol id="i-refresh" viewBox="0 0 24 24"><path d="M20 7v5h-5M4 17v-5h5M6.1 8a7 7 0 0 1 11.5-2.2L20 8M4 16l2.4 2.2A7 7 0 0 0 18 16"/></symbol>
    <symbol id="i-sparkles" viewBox="0 0 24 24"><path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8zM5 3l.7 1.8L7.5 5.5l-1.8.7L5 8l-.7-1.8-1.8-.7 1.8-.7z"/></symbol>
  </svg>

  <Login v-if="!currentUser" @login="handleLogin" />
  <router-view v-else />
</template>
