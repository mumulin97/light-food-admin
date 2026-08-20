<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppIcon from './AppIcon.vue'
import employeePortraits from '../assets/employee-portraits.png'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import {
  createEmployee,
  fetchEmployees,
  fetchSystemLogs,
  updateEmployee,
} from '../services/employeesApi'

const props = defineProps({
  query: { type: String, default: '' },
  initialTab: { type: String, default: 'employees' },
})
const emit = defineEmits(['tab-change'])
const router = useRouter()

const useBackend = isSupabaseConfigured()
const loading = ref(false)
const loadError = ref('')
const saving = ref(false)

const seedEmployees = [
  ['马库斯·索恩', 'marcus.t@lightbites.com', '厨师长', '总店厨房 HQ', '在线', 'MS', '#d7eee0'],
  ['萨拉·詹宁斯', 'sarah.j@lightbites.com', '经理', '西区熟食店', '值班中', 'SJ', '#e2edf8'],
  ['陈大卫', 'david.c@lightbites.com', '员工', '东区咖啡馆', '离线', 'DC', '#f4e6d5'],
  ['罗伯特·米勒', 'robert.m@lightbites.com', '厨师', '总店厨房 HQ', '请假', 'RM', '#efe1f4'],
  ['林晓雯', 'xiaowen.l@lightbites.com', '营养师', '中心旗舰店', '在线', 'LX', '#d9eeee'],
  ['艾米丽·沃森', 'emily.w@lightbites.com', '员工', '西区熟食店', '值班中', 'EW', '#f7e4df'],
  ['周子航', 'zihang.z@lightbites.com', '厨师', '中心旗舰店', '在线', 'ZZ', '#e5e8f6'],
  ['奥利维亚·金', 'olivia.k@lightbites.com', '经理', '东区咖啡馆', '离线', 'OK', '#f0ead7'],
  ['王雅琪', 'yaqi.w@lightbites.com', '员工', '中心旗舰店', '值班中', 'WY', '#dcefe5'],
  ['诺亚·布朗', 'noah.b@lightbites.com', '配送员', '西区熟食店', '在线', 'NB', '#dfe8f0'],
  ['李思远', 'siyuan.l@lightbites.com', '厨师', '总店厨房 HQ', '请假', 'LS', '#f4e2dc'],
  ['索菲亚·戴维斯', 'sophia.d@lightbites.com', '员工', '东区咖啡馆', '离线', 'SD', '#e9e2f4'],
  ['赵明辉', 'minghui.z@lightbites.com', '采购员', '总店厨房 HQ', '在线', 'ZM', '#e1eee0'],
  ['伊森·威尔逊', 'ethan.w@lightbites.com', '员工', '中心旗舰店', '值班中', 'EW', '#dcebf3'],
  ['何雨欣', 'yuxin.h@lightbites.com', '营养师', '西区熟食店', '在线', 'HY', '#f2e8d8'],
  ['米娅·泰勒', 'mia.t@lightbites.com', '员工', '东区咖啡馆', '离线', 'MT', '#eee0e8'],
  ['孙宇辰', 'yuchen.s@lightbites.com', '配送员', '中心旗舰店', '值班中', 'SY', '#d8ece8'],
  ['卢卡斯·安德森', 'lucas.a@lightbites.com', '厨师', '总店厨房 HQ', '在线', 'LA', '#e0e8f4'],
  ['唐可心', 'kexin.t@lightbites.com', '员工', '西区熟食店', '请假', 'TK', '#f4e5da'],
  ['艾娃·托马斯', 'ava.t@lightbites.com', '经理', '中心旗舰店', '在线', 'AT', '#e8e1f2'],
  ['徐嘉诚', 'jiacheng.x@lightbites.com', '厨师', '东区咖啡馆', '值班中', 'XJ', '#daede0'],
  ['伊莎贝拉·摩尔', 'isabella.m@lightbites.com', '员工', '西区熟食店', '离线', 'IM', '#dce9f1'],
  ['郑舒涵', 'shuhan.z@lightbites.com', '员工', '中心旗舰店', '在线', 'ZS', '#f2e7d8'],
  ['詹姆斯·马丁', 'james.m@lightbites.com', '配送员', '东区咖啡馆', '离线', 'JM', '#efe1e7'],
].map(([name, email, role, store, status, initials, avatarColor], index) => ({ id: index + 1, name, email, role, store, status, employmentStatus: '在职', initials, avatarColor, portraitIndex: index % 6 }))

const seedLogs = [
  { id: 1, initials: 'SJ', user: '萨拉·詹宁斯', module: '订单', action: '创建', target: '订单号 #8841', ip: '192.168.1.45', time: '2023年10月24日 - 14:22:10', status: '成功' },
  { id: 2, initials: 'DM', user: '陈大卫', module: '产品', action: '编辑', target: 'SKU: LB-99', ip: '192.168.1.102', time: '2023年10月24日 - 14:15:04', status: '成功' },
  { id: 3, initials: 'SJ', user: '萨拉·詹宁斯', module: '用户', action: '删除', target: '访客: ID#20', ip: '192.168.1.45', time: '2023年10月24日 - 13:58:22', status: '失败' },
  { id: 4, initials: 'SYS', user: '系统 内核', module: '安全', action: '认证', target: '密钥续期', ip: '127.0.0.1', time: '2023年10月24日 - 13:45:00', status: '成功' },
  { id: 5, initials: 'MS', user: '马库斯·索恩', module: '库存', action: '调整', target: '牛油果库存 -12', ip: '192.168.1.21', time: '2023年10月24日 - 12:38:17', status: '成功' },
  { id: 6, initials: 'AT', user: '艾娃·托马斯', module: '排班', action: '发布', target: '西区本周排班', ip: '192.168.1.77', time: '2023年10月24日 - 11:50:08', status: '成功' },
  { id: 7, initials: 'SYS', user: '系统 内核', module: '同步', action: '同步', target: '门店设备 #03', ip: '127.0.0.1', time: '2023年10月24日 - 10:42:51', status: '失败' },
  { id: 8, initials: 'LX', user: '林晓雯', module: '产品', action: '创建', target: '低卡夏日套餐', ip: '192.168.1.63', time: '2023年10月24日 - 09:26:30', status: '成功' },
].map((item, index) => {
  const occurredAt = new Date(Date.now() - [1, 2, 3, 4, 6, 9, 14, 20][index] * 60 * 60 * 1000)
  return {
    ...item,
    createdAt: occurredAt.toISOString(),
    time: `${occurredAt.getFullYear()}年${String(occurredAt.getMonth() + 1).padStart(2, '0')}月${String(occurredAt.getDate()).padStart(2, '0')}日 - ${String(occurredAt.getHours()).padStart(2, '0')}:${String(occurredAt.getMinutes()).padStart(2, '0')}:${String(occurredAt.getSeconds()).padStart(2, '0')}`,
  }
})

const logs = ref(useBackend ? [] : seedLogs)

const employees = ref(useBackend ? [] : seedEmployees)
const activeTab = ref(props.initialTab)
const employeePage = ref(1)
const logPage = ref(1)
const pageSize = 4
const filtersVisible = ref(false)
const refreshing = ref(false)
const dialogVisible = ref(false)
const editingId = ref(null)
const rosterView = ref('全部')
const roleFilter = ref('全部职位')
const statusFilter = ref('全部状态')
const storeFilter = ref('全部门店')
const draftRoleFilter = ref('全部职位')
const draftStatusFilter = ref('全部状态')
const draftStoreFilter = ref('全部门店')
const timeRange = ref('最近 30 天')
const logModuleFilter = ref('全部模块')
const logStatusView = ref('全部')
const form = reactive({ name: '', email: '', role: '员工', store: '中心旗舰店', status: '在线', employmentStatus: '在职' })

const filteredEmployees = computed(() => {
  const keyword = props.query.trim().toLowerCase()
  return employees.value.filter(item => {
    const queryMatched = !keyword || [item.name, item.email, item.role, item.store, item.status, item.employmentStatus].some(value => String(value || '').toLowerCase().includes(keyword))
    const rosterMatched = rosterView.value === '全部' || (item.employmentStatus || '在职') === rosterView.value
    return queryMatched && rosterMatched && (roleFilter.value === '全部职位' || item.role === roleFilter.value) && (statusFilter.value === '全部状态' || item.status === statusFilter.value) && (storeFilter.value === '全部门店' || item.store === storeFilter.value)
  })
})

const filteredLogs = computed(() => {
  const keyword = props.query.trim().toLowerCase()
  return logs.value.filter(item => {
    const queryMatched = !keyword || [item.user, item.module, item.action, item.target, item.ip, item.status].some(value => value.toLowerCase().includes(keyword))
    const moduleMatched = logModuleFilter.value === '全部模块' || item.module === logModuleFilter.value
    const statusMatched = logStatusView.value === '全部' || item.status === logStatusView.value
    const rangeHours = timeRange.value === '最近 24 小时' ? 24 : timeRange.value === '最近 7 天' ? 24 * 7 : 24 * 30
    const occurredAt = item.createdAt ? new Date(item.createdAt).getTime() : NaN
    const timeMatched = !Number.isFinite(occurredAt) || Date.now() - occurredAt <= rangeHours * 60 * 60 * 1000
    return queryMatched && moduleMatched && statusMatched && timeMatched
  })
})

const logModules = computed(() => ['全部模块', ...new Set(logs.value.map(item => item.module))])
const failedLogCount = computed(() => logs.value.filter(item => item.status === '失败').length)
const successfulLogCount = computed(() => logs.value.filter(item => item.status === '成功').length)
const logSuccessRate = computed(() => logs.value.length ? Math.round(successfulLogCount.value / logs.value.length * 100) : 100)
const logOperatorCount = computed(() => new Set(logs.value.map(item => item.user)).size)
const leaveEmployeeCount = computed(() => employees.value.filter(item => item.status === '请假').length)
const activeEmployeeCount = computed(() => employees.value.filter(item => (item.employmentStatus || '在职') === '在职').length)

const pageEmployees = computed(() => filteredEmployees.value.slice((employeePage.value - 1) * pageSize, employeePage.value * pageSize))
const pageLogs = computed(() => filteredLogs.value.slice((logPage.value - 1) * pageSize, logPage.value * pageSize))
const employeeRange = computed(() => filteredEmployees.value.length ? `显示 ${Math.min((employeePage.value - 1) * pageSize + 1, filteredEmployees.value.length)}–${Math.min(employeePage.value * pageSize, filteredEmployees.value.length)} / ${filteredEmployees.value.length} 名员工` : '没有符合条件的员工')
const logRange = computed(() => filteredLogs.value.length ? `显示 ${Math.min((logPage.value - 1) * pageSize + 1, filteredLogs.value.length)}–${Math.min(logPage.value * pageSize, filteredLogs.value.length)} / ${filteredLogs.value.length} 条日志` : '没有符合条件的日志')
const filterCount = computed(() => [roleFilter.value !== '全部职位', statusFilter.value !== '全部状态', storeFilter.value !== '全部门店'].filter(Boolean).length)

watch(() => props.initialTab, value => { activeTab.value = value })
watch([rosterView, roleFilter, statusFilter, storeFilter, logModuleFilter, logStatusView, timeRange, () => props.query], () => { employeePage.value = 1; logPage.value = 1 })
watch(filtersVisible, value => {
  if (!value) return
  draftRoleFilter.value = roleFilter.value
  draftStatusFilter.value = statusFilter.value
  draftStoreFilter.value = storeFilter.value
})

async function loadCurrentTab() {
  if (!useBackend || !supabase) return
  loading.value = true
  loadError.value = ''
  try {
    if (props.initialTab === 'logs') {
      logs.value = await fetchSystemLogs(supabase)
    } else {
      employees.value = await fetchEmployees(supabase)
    }
  } catch (e) {
    loadError.value = e.message || '加载失败'
    ElMessage({ message: loadError.value, type: 'error', customClass: 'light-bites-message', duration: 3200 })
  } finally {
    loading.value = false
  }
}

onMounted(loadCurrentTab)
watch(() => props.initialTab, loadCurrentTab)

function changeTab(tab) {
  activeTab.value = tab
  emit('tab-change', tab)
}

function openAdd() {
  editingId.value = null
  Object.assign(form, { name: '', email: '', role: '员工', store: '中心旗舰店', status: '在线', employmentStatus: '在职' })
  dialogVisible.value = true
}

function editEmployee(employee) {
  editingId.value = employee.id
  Object.assign(form, employee)
  dialogVisible.value = true
}

async function saveEmployee() {
  if (!form.name.trim() || !form.email.includes('@')) {
    ElMessage({ message: '请填写员工姓名和有效邮箱', type: 'warning', customClass: 'light-bites-message', duration: 2400 })
    return
  }
  if (useBackend && supabase) {
    saving.value = true
    try {
      if (editingId.value) {
        const updated = await updateEmployee(supabase, editingId.value, form)
        const idx = employees.value.findIndex(item => item.id === editingId.value)
        if (idx >= 0) employees.value[idx] = updated
        ElMessage({ message: '员工资料已更新', type: 'success', customClass: 'light-bites-message', duration: 2400 })
      } else {
        const initials = form.name.replace(/[^A-Za-z\u4e00-\u9fa5]/g, '').slice(0, 2).toUpperCase() || '新'
        const created = await createEmployee(supabase, {
          ...form,
          initials,
          avatarColor: '#dcefe3',
          portraitIndex: employees.value.length % 6,
        })
        employees.value.unshift(created)
        ElMessage({ message: '新员工已添加', type: 'success', customClass: 'light-bites-message', duration: 2400 })
      }
      dialogVisible.value = false
    } catch (e) {
      ElMessage({ message: e.message || '保存员工失败', type: 'error', customClass: 'light-bites-message', duration: 3200 })
    } finally {
      saving.value = false
    }
    return
  }
  if (editingId.value) {
    Object.assign(employees.value.find(item => item.id === editingId.value), form)
    ElMessage({ message: '员工资料已更新', type: 'success', customClass: 'light-bites-message', duration: 2400 })
  } else {
    const initials = form.name.replace(/[^A-Za-z\u4e00-\u9fa5]/g, '').slice(0, 2).toUpperCase() || '新'
    employees.value.unshift({ id: Date.now(), ...form, initials, avatarColor: '#dcefe3', portraitIndex: employees.value.length % 6 })
    ElMessage({ message: '新员工已添加', type: 'success', customClass: 'light-bites-message', duration: 2400 })
  }
  dialogVisible.value = false
}

async function handleEmployeeAction(command, employee) {
  if (command === 'edit') editEmployee(employee)
  if (command === 'schedule') ElMessage({ message: `已打开 ${employee.name} 的排班信息`, type: 'success', customClass: 'light-bites-message', duration: 2400 })
  if (command === 'status') {
    if ((employee.employmentStatus || '在职') === '离职') {
      ElMessage({ message: '离职员工不能切换在线状态', type: 'warning', customClass: 'light-bites-message', duration: 2400 })
      return
    }
    const next = employee.status === '离线' ? '在线' : '离线'
    if (useBackend && supabase) {
      try {
        const updated = await updateEmployee(supabase, employee.id, { ...employee, status: next })
        Object.assign(employee, updated)
        ElMessage({ message: `${employee.name} 已设为${next}`, type: 'success', customClass: 'light-bites-message', duration: 2400 })
      } catch (e) {
        ElMessage({ message: e.message || '更新状态失败', type: 'error', customClass: 'light-bites-message', duration: 3200 })
      }
      return
    }
    employee.status = next
    ElMessage({ message: `${employee.name} 已设为${next}`, type: 'success', customClass: 'light-bites-message', duration: 2400 })
  }
  if (command === 'employment') {
    const leaving = (employee.employmentStatus || '在职') === '在职'
    if (leaving) {
      try {
        await ElMessageBox.confirm(
          '离职后将保留员工资料和审计日志，同时停止排班与在线状态操作。',
          `确认将「${employee.name}」设为离职？`,
          { confirmButtonText: '确认离职', cancelButtonText: '取消', type: 'warning' },
        )
      } catch (error) {
        if (error === 'cancel' || error === 'close') return
        throw error
      }
    }
    const draft = {
      ...employee,
      employmentStatus: leaving ? '离职' : '在职',
      status: leaving ? '离线' : employee.status,
    }
    try {
      if (useBackend && supabase) Object.assign(employee, await updateEmployee(supabase, employee.id, draft))
      else Object.assign(employee, draft)
      ElMessage({ message: `${employee.name} 已${leaving ? '办理离职' : '恢复在职'}`, type: 'success', customClass: 'light-bites-message', duration: 2400 })
    } catch (error) {
      ElMessage({ message: error.message || '更新任职状态失败', type: 'error', customClass: 'light-bites-message', duration: 3200 })
    }
  }
}

function resetFilters() {
  draftRoleFilter.value = '全部职位'
  draftStatusFilter.value = '全部状态'
  draftStoreFilter.value = '全部门店'
}

function applyFilters() {
  roleFilter.value = draftRoleFilter.value
  statusFilter.value = draftStatusFilter.value
  storeFilter.value = draftStoreFilter.value
  filtersVisible.value = false
}

function portraitStyle(index) {
  const safeIndex = Number(index) % 6
  return {
    backgroundImage: `url(${employeePortraits})`,
    backgroundPosition: `${(safeIndex % 3) * 50}% ${Math.floor(safeIndex / 3) * 100}%`,
  }
}

function exportEmployees() {
  const rows = [['员工姓名', '邮箱', '职位', '所属门店', '状态'], ...filteredEmployees.value.map(item => [item.name, item.email, item.role, item.store, item.status])]
  const csv = `\ufeff${rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')}`
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = '员工名录.csv'
  link.click()
  URL.revokeObjectURL(url)
  ElMessage({ message: '员工名录已导出', type: 'success', customClass: 'light-bites-message', duration: 2400 })
}

async function refreshLogs() {
  if (useBackend && supabase) {
    refreshing.value = true
    try {
      logs.value = await fetchSystemLogs(supabase)
      ElMessage({ message: '系统日志已更新', type: 'success', customClass: 'light-bites-message', duration: 2400 })
    } catch (e) {
      ElMessage({ message: e.message || '刷新日志失败', type: 'error', customClass: 'light-bites-message', duration: 3200 })
    } finally {
      refreshing.value = false
    }
    return
  }
  refreshing.value = true
  window.setTimeout(() => {
    refreshing.value = false
    ElMessage({ message: '系统日志已更新', type: 'success', customClass: 'light-bites-message', duration: 2400 })
  }, 700)
}

function traceLogSource(log) {
  const routes = {
    订单: '/orders', 产品: '/products', 库存: '/inventory', 排班: '/employees',
    用户: '/members', 营销: '/marketing', 供应商: '/suppliers', 门店: '/stores',
    安全: '/', 同步: '/',
  }
  const target = routes[log.module] || '/'
  router.push(target)
  ElMessage({ message: `已从日志定位到${log.module}模块`, type: 'success', customClass: 'light-bites-message', duration: 2200 })
}
</script>

<template>
  <div class="employee-management-content" v-loading="loading || refreshing" :element-loading-text="activeTab === 'logs' ? '正在同步系统日志' : '正在同步员工数据'">
    <p v-if="loadError" class="dashboard-error" role="alert">{{ loadError }}</p>
    <section class="system-page-heading">
      <div><h1>{{ activeTab === 'employees' ? '员工管理' : '系统日志' }}</h1><p>{{ activeTab === 'employees' ? '管理您的团队并跟踪系统运行状态。' : '汇总关键业务操作，快速定位异常并追溯到来源模块。' }}</p></div>
      <div class="system-tabs" role="tablist" aria-label="系统管理视图">
        <button :class="{ active: activeTab === 'employees' }" role="tab" :aria-selected="activeTab === 'employees'" @click="changeTab('employees')">员工管理</button>
        <button :class="{ active: activeTab === 'logs' }" role="tab" :aria-selected="activeTab === 'logs'" @click="changeTab('logs')">系统日志</button>
      </div>
    </section>

    <section v-if="activeTab === 'employees'" class="system-metrics-grid" aria-label="团队概况">
      <article><span class="system-metric-icon green"><AppIcon name="users"/></span><div><small>在职员工</small><strong>{{ activeEmployeeCount }}</strong></div><img class="employee-metric-art people" src="/dashboard-assets/member-network.png" alt="" /></article>
      <article><span class="system-metric-icon blue"><AppIcon name="calendar"/></span><div><small>今日排班</small><strong>12</strong></div><img class="employee-metric-art schedule" src="/dashboard-assets/employee-schedule.png" alt="" /></article>
      <article><span class="system-metric-icon mint"><AppIcon name="check"/></span><div><small>系统健康度</small><strong>100%</strong></div><img class="employee-metric-art health" src="/dashboard-assets/employee-health.png" alt="" /></article>
      <article><span class="system-metric-icon amber"><AppIcon name="calendar"/></span><div><small>请假员工</small><strong>{{ leaveEmployeeCount }}</strong></div><img class="employee-metric-art logs" src="/dashboard-assets/employee-logs.png" alt="" /></article>
    </section>

    <section v-else class="system-metrics-grid log-metrics-grid" aria-label="日志运行概况">
      <article><span class="system-metric-icon amber"><AppIcon name="history"/></span><div><small>日志总量</small><strong>{{ logs.length }}</strong></div><img class="employee-metric-art logs" src="/dashboard-assets/employee-logs.png" alt="" /></article>
      <article><span class="system-metric-icon mint"><AppIcon name="check"/></span><div><small>操作成功率</small><strong>{{ logSuccessRate }}%</strong></div><img class="employee-metric-art health" src="/dashboard-assets/employee-health.png" alt="" /></article>
      <article class="log-alert-metric"><span class="system-metric-icon alert"><AppIcon name="warning"/></span><div><small>异常待处理</small><strong>{{ failedLogCount }}</strong></div><img class="employee-metric-art alert" src="/dashboard-assets/inventory-alert-siren.png" alt="" /></article>
      <article><span class="system-metric-icon blue"><AppIcon name="users"/></span><div><small>操作人员</small><strong>{{ logOperatorCount }}</strong></div><img class="employee-metric-art people" src="/dashboard-assets/member-network.png" alt="" /></article>
    </section>

    <section v-if="activeTab === 'employees'" class="system-table-card">
      <header class="system-panel-heading">
        <div class="system-panel-title"><h2>员工名录</h2><span>共 {{ employees.length }} 人</span></div>
        <div class="system-panel-actions">
          <div class="employee-roster-tabs" role="tablist" aria-label="员工状态"><button v-for="item in ['全部','在职','离职']" :key="item" type="button" role="tab" :aria-selected="rosterView === item" :class="{ active: rosterView === item }" @click="rosterView = item">{{ item }}</button></div>
          <el-popover v-model:visible="filtersVisible" placement="bottom-end" :width="330" trigger="click" popper-class="employee-filter-popover">
            <template #reference><el-button class="system-square-button" aria-label="筛选员工"><AppIcon name="filter"/><b v-if="filterCount">{{ filterCount }}</b></el-button></template>
            <div class="employee-filter-content"><div><strong>筛选员工</strong><button @click="resetFilters">重置</button></div><fieldset class="employee-filter-options employee-role-filter"><legend>职位</legend><button v-for="item in ['全部职位','经理','厨师长','厨师','营养师','员工','配送员','采购员']" :key="item" type="button" :class="{ active: draftRoleFilter === item }" @click="draftRoleFilter = item"><AppIcon v-if="draftRoleFilter === item" name="check"/>{{ item }}</button></fieldset><fieldset class="employee-filter-options employee-status-filter"><legend>状态</legend><button v-for="item in ['全部状态','在线','值班中','离线','请假']" :key="item" type="button" :class="{ active: draftStatusFilter === item }" @click="draftStatusFilter = item"><AppIcon v-if="draftStatusFilter === item" name="check"/>{{ item }}</button></fieldset><fieldset class="employee-filter-options employee-store-filter"><legend>门店</legend><button v-for="item in ['全部门店','中心旗舰店','总店厨房 HQ','西区熟食店','东区咖啡馆']" :key="item" type="button" :class="{ active: draftStoreFilter === item }" @click="draftStoreFilter = item"><AppIcon v-if="draftStoreFilter === item" name="check"/>{{ item }}</button></fieldset><el-button class="apply-employee-filter" @click="applyFilters">应用筛选</el-button></div>
          </el-popover>
          <el-button class="system-square-button" aria-label="导出员工名录" @click="exportEmployees"><AppIcon name="download"/></el-button>
        </div>
      </header>

      <el-table :data="pageEmployees" class="employee-table" table-layout="fixed" empty-text="暂无符合条件的员工">
        <el-table-column label="员工姓名" min-width="220"><template #default="{ row }"><div class="employee-name-cell"><span class="employee-avatar has-photo" :style="portraitStyle(row.portraitIndex)" role="img" :aria-label="`${row.name}的头像`"/><span><strong>{{ row.name }}</strong><small>{{ row.email }}</small></span></div></template></el-table-column>
        <el-table-column prop="role" label="职位" min-width="105"/>
        <el-table-column prop="store" label="所属门店" min-width="150"/>
        <el-table-column label="任职" min-width="88"><template #default="{ row }"><span class="employment-status" :class="(row.employmentStatus || '在职') === '在职' ? 'active' : 'left'">{{ row.employmentStatus || '在职' }}</span></template></el-table-column>
        <el-table-column label="状态" min-width="100"><template #default="{ row }"><span class="employee-status" :class="row.status === '在线' || row.status === '值班中' ? 'active' : row.status === '请假' ? 'leave' : 'offline'"><i/>{{ row.status }}</span></template></el-table-column>
        <el-table-column label="操作" width="72" align="left" class-name="table-op-column" label-class-name="table-op-column"><template #default="{ row }"><el-dropdown class="table-op-dropdown" trigger="click" popper-class="table-action-menu" @command="handleEmployeeAction($event,row)"><el-button class="table-more-button" circle aria-label="员工操作"><AppIcon name="more"/></el-button><template #dropdown><el-dropdown-menu><el-dropdown-item command="edit">编辑资料</el-dropdown-item><el-dropdown-item command="schedule" :disabled="row.employmentStatus === '离职'">查看排班</el-dropdown-item><el-dropdown-item command="status" :disabled="row.employmentStatus === '离职'">切换在线状态</el-dropdown-item><el-dropdown-item command="employment" divided :class="{ 'danger-text': (row.employmentStatus || '在职') === '在职' }">{{ (row.employmentStatus || '在职') === '在职' ? '办理离职' : '恢复在职' }}</el-dropdown-item></el-dropdown-menu></template></el-dropdown></template></el-table-column>
      </el-table>
      <footer class="system-table-footer"><span>{{ employeeRange }}</span><div><el-pagination v-model:current-page="employeePage" background layout="prev, next" :page-size="pageSize" :total="filteredEmployees.length"/><el-button class="add-employee-button" @click="openAdd"><AppIcon name="plus"/>添加新员工</el-button></div></footer>
    </section>

    <section v-else class="system-table-card log-card">
      <header class="system-panel-heading">
        <div class="system-panel-title"><h2>审计记录</h2><span class="log-warning"><AppIcon name="warning"/>{{ failedLogCount }} 条异常待追踪</span></div>
        <div class="system-panel-actions log-panel-actions"><div class="log-status-tabs" role="tablist" aria-label="日志状态"><button v-for="item in ['全部','成功','失败']" :key="item" type="button" role="tab" :aria-selected="logStatusView === item" :class="{ active: logStatusView === item, failed: item === '失败' }" @click="logStatusView = item">{{ item }}</button></div><el-select v-model="logModuleFilter" class="log-module-select" aria-label="日志来源模块"><el-option v-for="item in logModules" :key="item" :label="item" :value="item"/></el-select><el-select v-model="timeRange" class="log-range-select" aria-label="日志时间范围"><template #prefix><AppIcon name="calendar"/></template><el-option v-for="item in ['最近 24 小时','最近 7 天','最近 30 天']" :key="item" :label="item" :value="item"/></el-select><el-button class="system-square-button" :class="{ refreshing }" aria-label="刷新日志" @click="refreshLogs"><AppIcon name="refresh"/></el-button></div>
      </header>
      <el-table :data="pageLogs" class="employee-table log-table" table-layout="fixed" empty-text="暂无符合条件的日志">
        <el-table-column label="用户" min-width="165"><template #default="{ row }"><div class="log-user-cell"><span :class="{ system: row.initials === 'SYS' }">{{ row.initials }}</span><strong>{{ row.user }}</strong></div></template></el-table-column>
        <el-table-column prop="module" label="模块" min-width="78"><template #default="{ row }"><span class="log-module">{{ row.module }}</span></template></el-table-column>
        <el-table-column label="操作内容" min-width="190"><template #default="{ row }"><span class="log-action"><b>{{ row.action }}</b> {{ row.target }}</span></template></el-table-column>
        <el-table-column prop="ip" label="IP 地址" min-width="126"/>
        <el-table-column prop="time" label="时间戳" min-width="205"/>
        <el-table-column label="状态" width="92"><template #default="{ row }"><span class="log-status" :class="row.status === '成功' ? 'success' : 'failed'"><i/>{{ row.status }}</span></template></el-table-column>
        <el-table-column label="追踪" width="82"><template #default="{ row }"><button type="button" class="trace-log-button" @click="traceLogSource(row)">查看模块</button></template></el-table-column>
      </el-table>
      <footer class="system-table-footer"><span>{{ logRange }}</span><el-pagination v-model:current-page="logPage" background layout="prev, next" :page-size="pageSize" :total="filteredLogs.length"/></footer>
    </section>
  </div>

  <el-drawer v-model="dialogVisible" class="employee-drawer" size="540px" :with-header="false">
    <div class="modal-header"><div><h2>{{ editingId ? '编辑员工' : '添加新员工' }}</h2></div><el-button class="icon-button" circle aria-label="关闭" @click="dialogVisible = false"><AppIcon name="close"/></el-button></div>
    <el-form label-position="top" @submit.prevent="saveEmployee">
      <div class="form-row"><el-form-item label="员工姓名"><el-input v-model="form.name" placeholder="输入员工姓名"/></el-form-item><el-form-item label="工作邮箱"><el-input v-model="form.email" placeholder="name@lightbites.com"/></el-form-item></div>
      <div class="form-row"><el-form-item label="职位"><el-select v-model="form.role"><el-option v-for="item in ['经理','厨师长','厨师','营养师','员工','配送员','采购员']" :key="item" :label="item" :value="item"/></el-select></el-form-item><el-form-item label="状态"><el-select v-model="form.status"><el-option v-for="item in ['在线','值班中','离线','请假']" :key="item" :label="item" :value="item"/></el-select></el-form-item></div>
      <el-form-item label="所属门店"><el-select v-model="form.store"><el-option v-for="item in ['中心旗舰店','总店厨房 HQ','西区熟食店','东区咖啡馆']" :key="item" :label="item" :value="item"/></el-select></el-form-item>
      <div class="drawer-actions"><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" @click="saveEmployee">{{ editingId ? '保存更改' : '添加员工' }}</el-button></div>
    </el-form>
  </el-drawer>
</template>

<style scoped>
.employee-management-content { padding: 28px 32px 40px; background: radial-gradient(circle at 87% 6%,rgba(194,221,247,.38),transparent 33%),radial-gradient(circle at 56% 88%,rgba(209,238,222,.27),transparent 35%),transparent; }
.system-page-heading { min-height: 84px; align-items: center; margin-bottom: 15px; }
.system-page-heading h1 { color: #173f32; font-size: 30px; }
.system-page-heading p { margin: 8px 0 0; color: #647068; font-size: 14px; }
.system-tabs { padding: 4px; border: 1px solid rgba(255,255,255,.9); border-radius: 14px; background: rgba(255,255,255,.62); box-shadow: inset 0 0 0 1px rgba(198,220,217,.56),0 10px 24px rgba(43,78,77,.07); backdrop-filter: blur(16px); }
.system-tabs button { height: 39px; border-radius: 10px; font-size: 12.5px; }
.system-tabs button.active { background: linear-gradient(135deg,#17884d,#08743b); box-shadow: 0 6px 14px rgba(11,116,61,.22),inset 0 1px rgba(255,255,255,.24); }
.system-metrics-grid { grid-template-columns: repeat(4,minmax(0,1fr)); gap: 14px; margin-bottom: 16px; }
.system-metrics-grid article { position: relative; min-width: 0; min-height: 104px; box-sizing: border-box; overflow: hidden; gap: 11px; padding: 16px; border: 1px solid rgba(255,255,255,.9) !important; border-radius: 20px !important; background: linear-gradient(145deg,rgba(255,255,255,.82),rgba(237,247,247,.58)) !important; box-shadow: inset 0 0 0 1px rgba(199,222,218,.56),0 13px 28px rgba(47,82,80,.075) !important; backdrop-filter: blur(17px); }
.system-metrics-grid article::after { position: absolute; right: -24px; bottom: -44px; width: 122px; height: 122px; border-radius: 50%; background: rgba(177,225,210,.24); filter: blur(23px); content: ''; }
.system-metric-icon { position: relative; z-index: 2; width: 38px; height: 38px; border: 1px solid rgba(255,255,255,.7); border-radius: 11px; }
.system-metrics-grid article > div { position: relative; z-index: 2; align-self: center; }
.system-metrics-grid small { color: #526b65; font-size: 11.5px; }
.system-metrics-grid strong { color: #102d27; font-size: 24px !important; }
.employee-metric-art { position: absolute; z-index: 1; right: -1px; bottom: 2px; width: 42%; height: 92%; object-fit: contain; pointer-events: none; filter: drop-shadow(0 8px 8px rgba(40,70,64,.12)); }
.employee-metric-art.people { right: -6px; bottom: 0; width: 44%; }
.employee-metric-art.schedule { right: -3px; bottom: -3px; width: 43%; height: 102%; }
.employee-metric-art.health { right: -5px; width: 44%; height: 96%; }
.employee-metric-art.logs { right: -6px; bottom: -4px; width: 44%; height: 103%; }
.employee-metric-art.alert { right: 1px; bottom: 2px; width: 38%; height: 90%; }
.system-metric-icon.alert { color: #bd4b3e; background: #fbe8e3; }
.log-alert-metric { background: linear-gradient(145deg,rgba(255,255,255,.86),rgba(255,241,237,.68)) !important; }
.system-table-card { border: 1px solid rgba(255,255,255,.9) !important; border-radius: 20px !important; background: rgba(255,255,255,.62) !important; box-shadow: inset 0 0 0 1px rgba(199,222,218,.55),0 16px 34px rgba(45,78,77,.08) !important; backdrop-filter: blur(18px); }
.system-panel-heading { min-height: 62px; padding: 11px 16px; border-bottom-color: rgba(216,231,229,.8); }
.system-panel-title h2 { font-size: 19px; }
.system-panel-title > span:not(.log-warning) { padding: 5px 10px; color: #276d4a; background: rgba(224,243,232,.86); font-size: 11px; }
.employee-roster-tabs { display: flex; padding: 3px; border: 1px solid rgba(198,218,214,.72); border-radius: 11px; background: rgba(244,248,247,.74); }
.employee-roster-tabs button { min-width: 56px; height: 31px; padding: 0 12px; border: 0; border-radius: 8px; color: #64736f; background: transparent; font: inherit; font-size: 11.5px; font-weight: 700; cursor: pointer; }
.employee-roster-tabs button.active { color: #176d4b; background: rgba(255,255,255,.94); box-shadow: 0 3px 8px rgba(38,72,65,.08),inset 0 0 0 1px rgba(130,185,168,.26); }
.log-panel-actions { flex-wrap: nowrap; }
.log-status-tabs { display: flex; padding: 3px; border: 1px solid rgba(198,218,214,.72); border-radius: 11px; background: rgba(244,248,247,.78); }
.log-status-tabs button { min-width: 46px; height: 31px; padding: 0 10px; border: 0; border-radius: 8px; color: #64736f; background: transparent; font: inherit; font-size: 11px; font-weight: 700; cursor: pointer; }
.log-status-tabs button.active { color: #176d4b; background: rgba(255,255,255,.96); box-shadow: 0 3px 8px rgba(38,72,65,.08); }
.log-status-tabs button.failed.active { color: #b8463b; background: #fff1ee; }
.log-module-select { width: 112px; }
.log-module-select :deep(.el-select__wrapper), .log-range-select :deep(.el-select__wrapper) { min-height: 37px; border-radius: 10px; background: rgba(255,255,255,.72); box-shadow: 0 0 0 1px rgba(193,214,210,.82) inset; font-size: 11px; }
.trace-log-button { padding: 5px 0; border: 0; color: #187353; background: transparent; font: inherit; font-size: 10.5px; font-weight: 750; cursor: pointer; }
.trace-log-button:hover { color: #0d5d40; text-decoration: underline; }
.employee-table :deep(th.el-table__cell) { height: 46px !important; background: rgba(226,241,247,.64) !important; }
.employee-table :deep(td.el-table__cell) { height: 64px !important; }
.employee-table :deep(.cell) { padding-inline: 16px; }
.employee-avatar { width: 39px; height: 39px; border-radius: 11px; }
.employee-name-cell strong { font-size: 13px; }
.employee-name-cell small { font-size: 11px; }
.employee-status { padding: 5px 10px; font-size: 11px; }
.employment-status { display: inline-flex; align-items: center; min-height: 25px; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 760; }
.employment-status.active { color: #24745d; background: rgba(210,239,229,.72); }
.employment-status.left { color: #7b6e6b; background: rgba(235,230,229,.82); }
.system-table-footer { min-height: 55px; padding-block: 8px; }
.add-employee-button.el-button { height: 40px; border-radius: 11px !important; font-size: 12.5px; }
@media (max-width: 1180px) {
  .system-metrics-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
}
@media (max-width: 760px) {
  .employee-management-content { padding: 22px 16px 36px; }
  .system-page-heading { align-items: flex-start; flex-direction: column; }
  .system-metrics-grid { grid-template-columns: 1fr; }
  .system-panel-heading { align-items: flex-start; flex-direction: column; }
  .system-panel-actions { width: 100%; }
  .log-panel-actions { flex-wrap: wrap; }
  .employee-roster-tabs { flex: 1; }
  .employee-roster-tabs button { flex: 1; }
}
</style>
