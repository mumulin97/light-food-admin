function formatRelativeTime(iso) {
  const then = new Date(iso).getTime()
  const diffMs = Date.now() - then
  if (!Number.isFinite(diffMs) || diffMs < 0) return '刚刚'
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  return new Date(iso).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

export function formatNotificationSubtitle(body, createdAt) {
  const time = formatRelativeTime(createdAt)
  const text = (body || '').trim()
  return text ? `${text} · ${time}` : time
}

function mapRow(row, readIds) {
  return {
    id: row.id,
    title: row.title,
    subtitle: formatNotificationSubtitle(row.body, row.created_at),
    icon: row.icon || 'warning',
    iconClass: row.icon_class || 'warning',
    read: readIds.has(row.id),
    createdAt: row.created_at,
  }
}

export async function fetchNotifications(client, userId) {
  const { data: rows, error } = await client
    .from('notifications')
    .select('id, title, body, icon, icon_class, created_at')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error

  let readIds = new Set()
  if (userId) {
    const { data: reads, error: readError } = await client
      .from('notification_reads')
      .select('notification_id')
      .eq('user_id', userId)
    if (readError) throw readError
    readIds = new Set((reads || []).map(r => r.notification_id))
  }

  return (rows || []).map(row => mapRow(row, readIds))
}

export async function markAllNotificationsRead(client, userId, notificationIds) {
  if (!userId || !notificationIds.length) return
  const payload = notificationIds.map(notification_id => ({
    notification_id,
    user_id: userId,
    read_at: new Date().toISOString(),
  }))
  const { error } = await client
    .from('notification_reads')
    .upsert(payload, { onConflict: 'notification_id,user_id' })
  if (error) throw error
}
