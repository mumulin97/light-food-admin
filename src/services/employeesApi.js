export function mapEmployeeRow(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    store: row.store_name,
    status: row.status,
    initials: row.initials,
    avatarColor: row.avatar_color,
    portraitIndex: row.portrait_index ?? 0,
  }
}

function payload(row) {
  return {
    name: row.name.trim(),
    email: row.email.trim(),
    role: row.role,
    store_name: row.store,
    status: row.status,
    initials: row.initials || row.name.slice(0, 2).toUpperCase(),
    avatar_color: row.avatarColor || '#dcefe5',
    portrait_index: Number(row.portraitIndex) || 0,
  }
}

export async function fetchEmployees(client) {
  const { data, error } = await client.from('employees').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(mapEmployeeRow)
}

export async function createEmployee(client, row) {
  const { data, error } = await client.from('employees').insert(payload(row)).select('*').single()
  if (error) throw error
  return mapEmployeeRow(data)
}

export async function updateEmployee(client, id, row) {
  const { data, error } = await client.from('employees').update(payload(row)).eq('id', id).select('*').single()
  if (error) throw error
  return mapEmployeeRow(data)
}

export function mapLogRow(row) {
  const d = new Date(row.created_at)
  const time = `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月${String(d.getDate()).padStart(2, '0')}日 - ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
  return {
    id: row.id,
    initials: row.initials,
    user: row.user_name,
    module: row.module,
    action: row.action,
    target: row.target,
    ip: row.ip,
    time,
    status: row.status,
  }
}

export async function fetchSystemLogs(client, limit = 200) {
  const { data, error } = await client.from('system_logs').select('*').order('created_at', { ascending: false }).limit(limit)
  if (error) throw error
  return (data || []).map(mapLogRow)
}

export async function appendSystemLog(client, entry) {
  const { error } = await client.from('system_logs').insert({
    initials: entry.initials || 'SYS',
    user_name: entry.user || '系统',
    module: entry.module || '',
    action: entry.action || '',
    target: entry.target || '',
    ip: entry.ip || '127.0.0.1',
    status: entry.status || '成功',
  })
  if (error) throw error
}
