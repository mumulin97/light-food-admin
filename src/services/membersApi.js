import { memberStore } from '../stores/members'

function formatJoined(iso) {
  if (!iso) return ''
  const d = new Date(`${iso}T12:00:00`)
  return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月${String(d.getDate()).padStart(2, '0')}日`
}

export function mapMemberRow(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    tier: row.tier,
    points: row.points,
    balance: Number(row.balance),
    spent: Number(row.spent),
    joined: formatJoined(row.joined_on),
    portraitIndex: row.portrait_index ?? 0,
  }
}

export async function fetchMembers(client) {
  const { data, error } = await client.from('members').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(mapMemberRow)
}

export async function syncMemberStore(client) {
  const list = await fetchMembers(client)
  memberStore.members.splice(0, memberStore.members.length, ...list)
  return list
}

function payload(row) {
  return {
    name: row.name.trim(),
    phone: row.phone.trim(),
    tier: row.tier,
    points: Math.round(Number(row.points) || 0),
    balance: Number(row.balance) || 0,
    spent: Number(row.spent) || 0,
    portrait_index: Number(row.portraitIndex) || 0,
  }
}

export async function createMember(client, row) {
  const { data, error } = await client
    .from('members')
    .insert({ ...payload(row), joined_on: new Date().toISOString().slice(0, 10) })
    .select('*')
    .single()
  if (error) throw error
  return mapMemberRow(data)
}

export async function updateMemberBalance(client, id, balance) {
  const { error } = await client.from('members').update({ balance }).eq('id', id)
  if (error) throw error
}

export async function updateMember(client, id, fields) {
  const { error } = await client.from('members').update(fields).eq('id', id)
  if (error) throw error
}
