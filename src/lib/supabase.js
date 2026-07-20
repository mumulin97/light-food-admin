import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const defaultDisplayName = import.meta.env.VITE_DEFAULT_DISPLAY_NAME?.trim()

export function isSupabaseConfigured() {
  return Boolean(url && anonKey)
}

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
export const supabase = isSupabaseConfigured()
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

function emailLocalPart(email) {
  return (email || '').split('@')[0] || ''
}

function isPhoneLikeIdentifier(value) {
  return /^\d+$/.test(String(value || '').trim())
}

export function profileFromSession(session) {
  const meta = session.user.user_metadata || {}
  const email = session.user.email || ''
  const local = emailLocalPart(email)

  let name =
    meta.display_name ||
    meta.username ||
    meta.full_name ||
    meta.name ||
    null

  if (!name && local && !isPhoneLikeIdentifier(local)) {
    name = local
  }
  if (!name && defaultDisplayName) {
    name = defaultDisplayName
  }
  if (!name) {
    name = '管理员'
  }

  const username = meta.username || name
  const role = meta.role || '超级管理员'

  return { name, role, username, email, id: session.user.id }
}

/** 手机号/纯数字邮箱登录时，把显示名写入 Supabase 用户 metadata（仅缺省时执行一次） */
export async function ensureProfileDisplayName(session) {
  if (!supabase || !session?.user) return profileFromSession(session)

  const meta = session.user.user_metadata || {}
  const hasCustomName = Boolean(meta.display_name || meta.username)
  const local = emailLocalPart(session.user.email)
  const shouldFix = !hasCustomName && (isPhoneLikeIdentifier(local) || isPhoneLikeIdentifier(meta.name))
  const displayName = defaultDisplayName || '猴猴'

  if (shouldFix && displayName) {
    const { error } = await supabase.auth.updateUser({
      data: {
        display_name: displayName,
        username: displayName,
        role: meta.role || '超级管理员',
      },
    })
    if (error) console.warn('updateUser metadata failed', error)
    else {
      const { data: { session: fresh } } = await supabase.auth.getSession()
      if (fresh) return profileFromSession(fresh)
    }
  }

  return profileFromSession(session)
}
