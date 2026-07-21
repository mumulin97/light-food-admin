<script setup>
import { nextTick, reactive, ref } from 'vue'

const props = defineProps({
  context: { type: Object, default: () => ({}) },
  userName: { type: String, default: 'manager' },
})

const visible = ref(false)
const input = ref('')
const sending = ref(false)
const receiving = ref(false)
const messageList = ref(null)
const messages = ref([
  {
    role: 'assistant',
    content: '你好，我是轻食经营助手。我可以结合当前门店的营收、订单、菜品和库存数据，帮你发现问题并给出建议。',
  },
])

const suggestions = [
  '总结今天的经营情况',
  '最近营收有什么异常？',
  '哪些菜品需要重点关注？',
  '给我一份门店行动建议',
]

function stableUserId() {
  const key = 'houhou-ai-session'
  let value = localStorage.getItem(key)
  if (!value) {
    value = `dashboard-${globalThis.crypto?.randomUUID?.() || Date.now()}`
    localStorage.setItem(key, value)
  }
  return value
}

async function scrollToLatest() {
  await nextTick()
  if (messageList.value) messageList.value.scrollTop = messageList.value.scrollHeight
}

function characterDelay(character) {
  if (/\n/.test(character)) return 85
  if (/[。！？；：]/.test(character)) return 72
  if (/[，、]/.test(character)) return 46
  return 28
}

async function appendCharacterByCharacter(targetMessage, content) {
  for (const character of Array.from(content)) {
    targetMessage.content += character
    await scrollToLatest()
    await new Promise(resolve => window.setTimeout(resolve, characterDelay(character)))
  }
}

async function consumeEventStream(response, targetMessage, onFirstContent) {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('浏览器无法读取 AI 数据流')

  const decoder = new TextDecoder()
  let buffer = ''

  const processBlock = async block => {
    const lines = block.split('\n')
    const event = lines.find(line => line.startsWith('event:'))?.slice(6).trim() || ''
    const data = lines
      .filter(line => line.startsWith('data:'))
      .map(line => line.slice(5).trimStart())
      .join('\n')
    if (!data) return

    let payload = {}
    try {
      payload = JSON.parse(data)
    } catch {
      return
    }

    if (event === 'delta' && payload.content) {
      if (!targetMessage.started) {
        targetMessage.started = true
        onFirstContent()
      }
      await appendCharacterByCharacter(targetMessage, payload.content)
    }
    if (event === 'error') throw new Error(payload.error || 'AI 流式响应失败')
  }

  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done }).replace(/\r\n/g, '\n')
    const blocks = buffer.split('\n\n')
    buffer = blocks.pop() || ''
    for (const block of blocks) await processBlock(block)
    if (done) break
  }
  if (buffer.trim()) await processBlock(buffer)
}

async function ask(question = input.value) {
  const text = String(question || '').trim()
  if (!text || sending.value) return

  messages.value.push({ role: 'user', content: text })
  input.value = ''
  sending.value = true
  await scrollToLatest()
  let assistantMessage = null

  try {
    const response = await fetch('/.netlify/functions/ai-assistant', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        question: text,
        context: props.context,
        userId: stableUserId(),
      }),
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.error || 'AI 服务暂时不可用')
    }
    if (!response.headers.get('content-type')?.includes('text/event-stream')) {
      throw new Error('未连接到流式 AI Function')
    }

    assistantMessage = reactive({ role: 'assistant', content: '', started: false })
    await consumeEventStream(response, assistantMessage, () => {
      messages.value.push(assistantMessage)
      receiving.value = true
    })
    if (!assistantMessage.content) throw new Error('AI 没有返回内容')
  } catch (error) {
    const message = error?.message || 'AI 服务暂时不可用'
    let hint = '请稍后重试，或检查 Netlify 环境变量和 Coze API 发布状态。'
    if (import.meta.env.DEV && /尚未配置/.test(message)) {
      hint = '请在 .env 中配置 COZE_API_TOKEN 和 COZE_BOT_ID，然后重启 pnpm dev。'
    } else if (import.meta.env.DEV && /Failed to fetch|未连接到本地 Netlify Function|Unexpected token/i.test(message)) {
      hint = '请重新运行 pnpm dev，并通过 http://127.0.0.1:4173 访问。'
    }
    messages.value.push({ role: 'error', content: `${message}。${hint}` })
  } finally {
    receiving.value = false
    sending.value = false
    await scrollToLatest()
  }
}

function resetConversation() {
  messages.value = [messages.value[0]]
  input.value = ''
}
</script>

<template>
  <button class="ai-fab" type="button" aria-label="打开 AI 经营助手" @click="visible = true">
    <span class="ai-fab-mark">AI</span>
    <span>经营助手</span>
    <i class="ai-fab-dot" />
  </button>

  <el-drawer v-model="visible" class="ai-assistant-drawer" size="min(460px, 100vw)" :with-header="false" append-to-body>
    <div class="ai-assistant-shell">
      <header class="ai-assistant-header">
        <div class="ai-assistant-avatar">AI</div>
        <div class="ai-assistant-title">
          <strong>轻食经营助手</strong>
          <span>数据驱动 · 由 Coze 提供分析能力</span>
        </div>
        <button type="button" class="ai-assistant-reset" @click="resetConversation">新对话</button>
        <button type="button" class="ai-assistant-close" aria-label="关闭" @click="visible = false">×</button>
      </header>

      <div ref="messageList" class="ai-assistant-messages" aria-live="polite">
        <article
          v-for="(message, index) in messages"
          :key="index"
          class="ai-message"
          :class="[`ai-message--${message.role}`]"
        >
          <div class="ai-message-bubble">{{ message.content }}</div>
        </article>
        <article v-if="sending && !receiving" class="ai-message ai-message--assistant">
          <div class="ai-message-bubble">
            <span class="ai-typing" aria-label="正在分析">
              <i /><i /><i />
            </span>
          </div>
        </article>
      </div>

      <section class="ai-assistant-suggestions" aria-label="推荐问题">
        <button
          v-for="suggestion in suggestions"
          :key="suggestion"
          class="ai-suggestion"
          type="button"
          :disabled="sending"
          @click="ask(suggestion)"
        >
          {{ suggestion }}
        </button>
      </section>

      <form class="ai-assistant-composer" @submit.prevent="ask()">
        <div class="ai-assistant-input-wrap">
          <textarea
            v-model="input"
            class="ai-assistant-input"
            rows="2"
            maxlength="1000"
            placeholder="问问营收、订单、菜品或库存情况…"
            @keydown.enter.exact.prevent="ask()"
          />
          <button class="ai-assistant-send" type="submit" :disabled="!input.trim() || sending" aria-label="发送">
            {{ sending ? '…' : '↑' }}
          </button>
        </div>
        <div class="ai-assistant-note">AI 建议仅供经营参考，关键操作仍需人工确认</div>
      </form>
    </div>
  </el-drawer>
</template>
