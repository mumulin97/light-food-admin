import { createRouter, createWebHistory } from 'vue-router'

const MainLayout = () => import('../layouts/MainLayout.vue')
const DashboardView = () => import('../views/DashboardView.vue')
const StoreManagement = () => import('../components/StoreManagement.vue')
const ProductCatalog = () => import('../components/ProductCatalog.vue')
const InventoryManagement = () => import('../components/InventoryManagement.vue')
const SupplierManagement = () => import('../components/SupplierManagement.vue')
const OrderManagement = () => import('../components/OrderManagement.vue')
const MemberManagement = () => import('../components/MemberManagement.vue')
const MarketingManagement = () => import('../components/MarketingManagement.vue')
const EmployeeManagement = () => import('../components/EmployeeManagement.vue')

export const navRoutes = [
  { path: '/', name: 'dashboard', label: '控制台', icon: 'grid', searchPlaceholder: '搜索分析数据、订单或产品...' },
  { path: '/stores', name: 'stores', label: '门店管理', icon: 'store', searchPlaceholder: '搜索门店名称...' },
  { path: '/products', name: 'products', label: '产品目录', icon: 'box', searchPlaceholder: '搜索产品、订单或库存...' },
  { path: '/inventory', name: 'inventory', label: '原料管理', icon: 'leaf', searchPlaceholder: '搜索原料名称...' },
  { path: '/suppliers', name: 'suppliers', label: '供应商', icon: 'truck', searchPlaceholder: '搜索供应商...' },
  { path: '/orders', name: 'orders', label: '订单管理', icon: 'cart', searchPlaceholder: '搜索订单、客户或商品...' },
  { path: '/members', name: 'members', label: '会员系统', icon: 'users', searchPlaceholder: '按手机号搜索会员...' },
  { path: '/marketing', name: 'marketing', label: '营销活动', icon: 'megaphone', searchPlaceholder: '搜索营销活动...' },
  { path: '/employees', name: 'employees', label: '员工管理', icon: 'badge', searchPlaceholder: '搜索员工或日志...' },
  { path: '/logs', name: 'logs', label: '系统日志', icon: 'history', searchPlaceholder: '搜索员工或日志...' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: MainLayout,
      children: [
        { path: '', name: 'dashboard', component: DashboardView, meta: { label: '控制台' } },
        { path: 'stores', name: 'stores', component: StoreManagement, meta: { label: '门店管理' } },
        { path: 'products', name: 'products', component: ProductCatalog, meta: { label: '产品目录' } },
        { path: 'inventory', name: 'inventory', component: InventoryManagement, meta: { label: '原料管理' } },
        { path: 'suppliers', name: 'suppliers', component: SupplierManagement, meta: { label: '供应商' } },
        { path: 'orders', name: 'orders', component: OrderManagement, meta: { label: '订单管理' } },
        { path: 'members', name: 'members', component: MemberManagement, meta: { label: '会员系统' } },
        { path: 'marketing', name: 'marketing', component: MarketingManagement, meta: { label: '营销活动' } },
        {
          path: 'employees',
          name: 'employees',
          component: EmployeeManagement,
          meta: { label: '员工管理' },
          props: { initialTab: 'employees' },
        },
        {
          path: 'logs',
          name: 'logs',
          component: EmployeeManagement,
          meta: { label: '系统日志' },
          props: { initialTab: 'logs' },
        },
        { path: '/:pathMatch(.*)*', redirect: '/' },
      ],
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

export default router
