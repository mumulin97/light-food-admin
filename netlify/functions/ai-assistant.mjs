const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders })
}

function sanitizeUserId(value) {
  const safe = String(value || 'houhou-dashboard')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 64)
  return safe || 'houhou-dashboard'
}

function buildBusinessPrompt(question, context) {
  return [
    `用户问题：${question}`,
    '',
    '以下是由轻食管理系统从 Supabase 或当前演示数据中整理的 business_context。',
    '请只依据这些数据回答；数据不足时明确说明，不要补造数字。',
    `business_context: ${JSON.stringify(context || {})}`,
  ].join('\n')
}

function parseCozeStream(raw) {
  let answer = ''
  let completedAnswer = ''

  for (const block of raw.split(/\r?\n\r?\n/)) {
    if (!block.trim()) continue
    const lines = block.split(/\r?\n/)
    const event = lines.find(line => line.startsWith('event:'))?.slice(6).trim() || ''
    const data = lines
      .filter(line => line.startsWith('data:'))
      .map(line => line.slice(5).trimStart())
      .join('\n')

    if (!data || data === '[DONE]') continue

    let payload
    try {
      payload = JSON.parse(data)
    } catch {
      continue
    }

    if (event === 'error' || payload.code) {
      throw new Error(payload.msg || payload.message || 'Coze 返回了错误')
    }

    const message = payload.message || payload
    const content = typeof message.content === 'string' ? message.content : ''
    const isAnswer = !message.type || message.type === 'answer'

    if (event === 'conversation.message.delta' && isAnswer) answer += content
    if (event === 'conversation.message.completed' && isAnswer && content) completedAnswer = content
  }

  return (answer || completedAnswer).trim()
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: '仅支持 POST 请求' }, 405)
  }

  const token = process.env.COZE_API_TOKEN
  const botId = process.env.COZE_BOT_ID
  const apiBase = (process.env.COZE_API_BASE || 'https://api.coze.cn').replace(/\/$/, '')

  if (!token || !botId) {
    return jsonResponse({ error: 'AI 服务尚未配置，请在 Netlify 设置 COZE_API_TOKEN 和 COZE_BOT_ID' }, 503)
  }

  let body
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: '请求内容不是有效的 JSON' }, 400)
  }

  const question = String(body?.question || '').trim()
  if (!question) return jsonResponse({ error: '请输入问题' }, 400)
  if (question.length > 1000) return jsonResponse({ error: '问题过长，请控制在 1000 字以内' }, 400)

  const contextText = JSON.stringify(body?.context || {})
  if (contextText.length > 24000) return jsonResponse({ error: '经营数据摘要过大，请缩小查询范围' }, 413)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 55000)

  try {
    const response = await fetch(`${apiBase}/v3/chat`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        bot_id: botId,
        user_id: sanitizeUserId(body?.userId),
        stream: true,
        additional_messages: [
          {
            role: 'user',
            content: buildBusinessPrompt(question, body?.context),
            content_type: 'text',
            type: 'question',
          },
        ],
      }),
      signal: controller.signal,
    })

    const raw = await response.text()
    if (!response.ok) {
      let detail = ''
      try {
        const parsed = JSON.parse(raw)
        detail = parsed.msg || parsed.message || ''
      } catch {
        detail = raw.slice(0, 240)
      }
      return jsonResponse({ error: detail || `Coze 请求失败（${response.status}）` }, response.status)
    }

    const answer = parseCozeStream(raw)
    if (!answer) return jsonResponse({ error: 'Coze 没有返回可展示的回答，请确认智能体已发布到 API' }, 502)

    return jsonResponse({ answer })
  } catch (error) {
    if (error?.name === 'AbortError') return jsonResponse({ error: 'AI 响应超时，请稍后重试' }, 504)
    return jsonResponse({ error: error?.message || 'AI 服务暂时不可用' }, 502)
  } finally {
    clearTimeout(timeout)
  }
}
