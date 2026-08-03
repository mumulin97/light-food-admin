# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目简介

轻食餐饮后台管理系统（light-food-admin），Vue 3 + Element Plus + ECharts 管理面板，支持 Supabase 后端和本地演示数据双模式。

## 技术栈

- **框架**: Vue 3 (Composition API, `<script setup>`)
- **UI**: Element Plus（按需注册组件 + 按需 CSS）
- **路由**: Vue Router 4 (HTML5 History)
- **图表**: ECharts 6
- **后端**: Supabase（可选，未配置时使用本地演示数据）
- **构建**: Vite 8
- **部署**: Netlify（SPA 回退 + Functions）
- **包管理**: pnpm

## 目录结构

```
src/
├── main.js                        # 入口，Element Plus 按需注册
├── App.vue                        # 根组件，登录/登出/会话管理
├── router/index.js                # 路由表（9 个模块，MainLayout 嵌套子路由）
├── lib/supabase.js                # Supabase 客户端、登录/配置检测
├── services/                      # API 层（每个模块一个文件，纯函数）
│   ├── backend.js                 # 后端开关、共享 store 同步
│   ├── dashboard.js               # 控制台数据聚合
│   ├── ordersApi.js               # 订单 CRUD
│   ├── products.js                # 产品 CRUD
│   ├── stores.js                  # 门店 CRUD
│   ├── inventoryApi.js            # 原料 CRUD
│   ├── suppliersApi.js            # 供应商 CRUD
│   ├── membersApi.js              # 会员 CRUD + 内存 store 同步
│   ├── campaignsApi.js            # 营销活动 CRUD
│   ├── employeesApi.js            # 员工 CRUD
│   └── notificationsApi.js        # 通知 CRUD
├── composables/                   # 组合式函数（视图状态管理）
│   ├── useDashboard.js            # 控制台状态 + 数据获取
│   └── useOrders.js               # 订单状态 + 创建/加载
├── stores/                        # 本地 store（演示数据 + 离线兜底）
│   ├── orders.js
│   ├── inventory.js
│   └── members.js
├── components/                    # 页面组件（每个模块一个 .vue 文件）
│   ├── Login.vue                  # 登录页（Supabase 邮箱 / 演示 admin）
│   ├── OrderManagement.vue        # 订单管理
│   ├── ProductCatalog.vue         # 产品目录
│   ├── StoreManagement.vue        # 门店管理
│   ├── InventoryManagement.vue    # 原料管理
│   ├── SupplierManagement.vue     # 供应商
│   ├── MemberManagement.vue       # 会员系统
│   ├── MarketingManagement.vue    # 营销活动
│   ├── EmployeeManagement.vue     # 员工管理 + 系统日志
│   ├── RevenueChart.vue           # 营收图表组件
│   ├── AiAssistant.vue            # AI 经营助手（Coze API）
│   └── AppIcon.vue                # SVG 图标组件
├── views/DashboardView.vue        # 控制台页面（组合多个组件）
└── layouts/MainLayout.vue         # 主布局（侧边栏 + 顶部栏 + 内容区）
```

## 关键架构

### 双模式（Supabase / 演示）

`src/lib/supabase.js#isSupabaseConfigured()` 检测 `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` 是否存在：
- **配置了** → 所有 CRUD 走 Supabase，登录走邮箱密码
- **未配置** → 使用本地 `stores/` 中的演示数据，登录用 `admin / 123456`

### 数据流

视图 → composable（useDashboard / useOrders）→ services（API 函数）→ Supabase 或本地 store

### 认证

`Login.vue` 提交登录 → `App.vue` 接收 `login` 事件 → `currentUser` 通过 `provide('currentUser')` 传递给所有子组件

### 部署

Netlify 部署，`netlify/functions/` 目录下的 `ai-assistant.mjs` 作为 Coze AI 助手的代理函数。

## 命令

```bash
pnpm dev          # 启动开发服务器（http://127.0.0.1:4173）
pnpm build        # 生产构建（输出到 dist/）
pnpm preview      # 预览生产构建
```

## Superbase 数据库

`supabase/full_schema.sql` 包含完整建表语句（含 6 次迁移），在 Supabase SQL Editor 中一次性执行。