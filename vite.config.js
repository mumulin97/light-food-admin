import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import aiAssistantHandler from './netlify/functions/ai-assistant.mjs'

function localNetlifyFunctions(env) {
  return {
    name: 'local-netlify-functions',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/.netlify/functions/ai-assistant', async (req, res) => {
        try {
          process.env.COZE_API_TOKEN = env.COZE_API_TOKEN || ''
          process.env.COZE_BOT_ID = env.COZE_BOT_ID || ''
          process.env.COZE_API_BASE = env.COZE_API_BASE || 'https://api.coze.cn'

          const chunks = []
          for await (const chunk of req) chunks.push(chunk)
          const body = chunks.length ? Buffer.concat(chunks) : undefined
          const request = new Request('http://127.0.0.1:4173/.netlify/functions/ai-assistant', {
            method: req.method,
            headers: req.headers,
            body: ['GET', 'HEAD'].includes(req.method) ? undefined : body,
          })
          const response = await aiAssistantHandler(request)
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          if (!response.body) {
            res.end()
            return
          }
          const reader = response.body.getReader()
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            res.write(Buffer.from(value))
          }
          res.end()
        } catch (error) {
          res.statusCode = 500
          res.setHeader('content-type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ error: error?.message || '本地 AI Function 运行失败' }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [vue(), localNetlifyFunctions(env)],
    server: {
      host: '127.0.0.1',
      port: 4173,
    },
  }
})
