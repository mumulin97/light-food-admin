# Houhou

## 轻食点管理仪表盘

根据 Stitch「管理仪表盘 - 轻食管理系统」画板实现的 Vue 3 管理后台。

技术栈：Vue 3、Vite、Element Plus、Apache ECharts、Supabase（可选）。

## 运行

```bash
pnpm install
pnpm dev
```

默认地址：`http://127.0.0.1:4173`

未配置 Supabase 时仍为本地演示数据（登录：`admin` / `123456`）。

## Supabase（控制台已接数据库）

1. 在 [Supabase](https://supabase.com) 创建项目。
2. **SQL Editor** 中执行 [`supabase/schema.sql`](supabase/schema.sql)（新建项目）。若之前已执行过旧版 schema，再依次执行 [`supabase/migrations/002_store_fields.sql`](supabase/migrations/002_store_fields.sql)、[`supabase/migrations/003_order_flags.sql`](supabase/migrations/003_order_flags.sql)。
3. **Authentication → Users** 创建管理员用户（邮箱 + 密码）。
4. **Project Settings → API** 复制 URL 与 `anon` key。
5. 复制 `.env.example` 为 `.env.local` 并填写：

```bash
cp .env.example .env.local
```

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

6. 重启 `pnpm dev`，使用 Supabase 邮箱密码登录。

### 控制台数据来源

| 模块 | 表 |
|------|-----|
| 门店切换 | `stores` |
| 门店管理 / 添加门店 | `stores`（完整字段） |
| 指标卡片 | `orders`、`products`、`ingredients` |
| 营收图表 | `orders` 按日汇总 |
| 畅销榜 | `order_items` + `orders` |
| 最新订单 / 新建订单 / **订单管理** | `orders`、`order_items` |

其他菜单页仍为前端 mock；**控制台、门店管理、订单管理（含新建订单）** 已与 Supabase 同步。

## Netlify 部署

1. 构建设置：`pnpm build`，发布目录 `dist`（见 `netlify.toml`）。
2. 在 Netlify **Environment variables** 配置 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`。
3. Supabase **Authentication → URL Configuration** 添加 Netlify 站点 URL。

### Coze AI 经营助手

智能体通过 Netlify Function 调用，Coze PAT 只保存在 Netlify 服务端环境变量中：

```env
COZE_API_TOKEN=pat_xxx
COZE_BOT_ID=7664841515671715881
COZE_API_BASE=https://api.coze.cn
```

不要给这些变量添加 `VITE_` 前缀，否则会被打包进浏览器。智能体必须先在 Coze 发布到 API，前端通过 `/.netlify/functions/ai-assistant` 调用。

本地联调 AI 时，先将 `.env.example` 复制为 `.env` 并填写变量，然后运行：

```bash
pnpm dev
```

浏览器访问 `http://127.0.0.1:4173`。Vite 的本地中间件会复用同一份 Function 代码；部署后则由 Netlify Functions 运行。

生产构建：

```bash
pnpm build
```
