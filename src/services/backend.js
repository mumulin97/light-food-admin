import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { syncInventoryStore } from './inventoryApi'
import { syncMemberStore } from './membersApi'

export function backendEnabled() {
  return isSupabaseConfigured()
}

/** 登录后同步订单扣料 / 会员积分依赖的内存 store */
export async function syncSharedStores() {
  if (!backendEnabled() || !supabase) return
  await Promise.all([syncInventoryStore(supabase), syncMemberStore(supabase)])
}

export function backendErrorMessage(error, fallback = '操作失败') {
  if (!error) return fallback
  if (error.code === '23505' || error.message?.includes('duplicate')) return '记录已存在，请检查唯一字段'
  return error.message || fallback
}
