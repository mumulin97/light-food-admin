<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AppIcon from './AppIcon.vue'
import employeePortraits from '../assets/employee-portraits.png'

const props = defineProps({
  query: { type: String, default: '' },
  initialTab: { type: String, default: 'employees' },
})
const emit = defineEmits(['tab-change'])

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
].map(([name, email, role, store, status, initials, avatarColor], index) => ({ id: index + 1, name, email, role, store, status, initials, avatarColor, portraitIndex: index % 6 }))

const logs = ref([
  { id: 1, initials: 'SJ', user: '萨拉·詹宁斯', module: '订单', action: '创建', target: '订单号 #8841', ip: '192.168.1.45', time: '2023年10月24日 - 14:22:10', status: '成功' },
  { id: 2, initials: 'DM', user: '陈大卫', module: '产品', action: '编辑', target: 'SKU: LB-99', ip: '192.168.1.102', time: '2023年10月24日 - 14:15:04', status: '成功' },
  { id: 3, initials: 'SJ', user: '萨拉·詹宁斯', module: '用户', action: '删除', target: '访客: ID#20', ip: '192.168.1.45', time: '2023年10月24日 - 13:58:22', status: '失败' },
  { id: 4, initials: 'SYS', user: '系统 内核', module: '安全', action: '认证', target: '密钥续期', ip: '127.0.0.1', time: '2023年10月24日 - 13:45:00', status: '成功' },
  { id: 5, initials: 'MS', user: '马库斯·索恩', module: '库存', action: '调整', target: '牛油果库存 -12', ip: '192.168.1.21', time: '2023年10月24日 - 12:38:17', status: '成功' },
  { id: 6, initials: 'AT', user: '艾娃·托马斯', module: '排班', action: '发布', target: '西区本周排班', ip: '192.168.1.77', time: '2023年10月24日 - 11:50:08', status: '成功' },
  { id: 7, initials: 'SYS', user: '系统 内核', module: '同步', action: '同步', target: '门店设备 #03', ip: '127.0.0.1', time: '2023年10月24日 - 10:42:51', status: '失败' },
  { id: 8, initials: 'LX', user: '林晓雯', module: '产品', action: '创建', target: '低卡夏日套餐', ip: '192.168.1.63', time: '2023年10月24日 - 09:26:30', status: '成功' },
])

const employees = ref(seedEmployees)
const activeTab = ref(props.initialTab)
const employeePage = ref(1)
const logPage = ref(1)
const pageSize = 4
const filtersVisible = ref(false)
const refreshing = ref(false)
const dialogVisible = ref(false)
const editingId = ref(null)
const roleFilter = ref('全部职位')
const statusFilter = ref('全部状态')
const storeFilter = ref('全部门店')
const draftRoleFilter = ref('全部职位')
const draftStatusFilter = ref('全部状态')
const draftStoreFilter = ref('全部门店')
const timeRange = ref('最近 24 小时')
const form = reactive({ name: '', email: '', role: '员工', store: '中心旗舰店', status: '在线' })

const filteredEmployees = computed(() => {
  const keyword = props.query.trim().toLowerCase()
  return employees.value.filter(item => {
    const queryMatched = !keyword || [item.name, item.email, item.role, item.store, item.status].some(value => value.toLowerCase().includes(keyword))
    return queryMatched && (roleFilter.value === '全部职位' || item.role === roleFilter.value) && (statusFilter.value === '全部状态' || item.status === statusFilter.value) && (storeFilter.value === '全部门店' || item.store === storeFilter.value)
  })
})

const filteredLogs = computed(() => {
  const keyword = props.query.trim().toLowerCase()
  return logs.value.filter(item => !keyword || [item.user, item.module, item.action, item.target, item.ip, item.status].some(value => value.toLowerCase().includes(keyword)))
})

const pageEmployees = computed(() => filteredEmployees.value.slice((employeePage.value - 1) * pageSize, employeePage.value * pageSize))
const pageLogs = computed(() => filteredLogs.value.slice((logPage.value - 1) * pageSize, logPage.value * pageSize))
const employeeRange = computed(() => filteredEmployees.value.length ? `显示 ${Math.min((employeePage.value - 1) * pageSize + 1, filteredEmployees.value.length)}–${Math.min(employeePage.value * pageSize, filteredEmployees.value.length)} / ${filteredEmployees.value.length} 名员工` : '没有符合条件的员工')
const logRange = computed(() => filteredLogs.value.length ? `显示 ${Math.min((logPage.value - 1) * pageSize + 1, filteredLogs.value.length)}–${Math.min(logPage.value * pageSize, filteredLogs.value.length)} / ${filteredLogs.value.length} 条日志` : '没有符合条件的日志')
const filterCount = computed(() => [roleFilter.value !== '全部职位', statusFilter.value !== '全部状态', storeFilter.value !== '全部门店'].filter(Boolean).length)

watch(() => props.initialTab, value => { activeTab.value = value })
watch([roleFilter, statusFilter, storeFilter, () => props.query], () => { employeePage.value = 1; logPage.value = 1 })
watch(filtersVisible, value => {
  if (!value) return
  draftRoleFilter.value = roleFilter.value
  draftStatusFilter.value = statusFilter.value
  draftStoreFilter.value = storeFilter.value
})

function changeTab(tab) {
  activeTab.value = tab
  emit('tab-change', tab)
}

function openAdd() {
  editingId.value = null
  Object.assign(form, { name: '', email: '', role: '员工', store: '中心旗舰店', status: '在线' })
  dialogVisible.value = true
}

function editEmployee(employee) {
  editingId.value = employee.id
  Object.assign(form, employee)
  dialogVisible.value = true
}

function saveEmployee() {
  if (!form.name.trim() || !form.email.includes('@')) {
    ElMessage({ message: '请填写员工姓名和有效邮箱', type: 'warning', customClass: 'light-bites-message', duration: 2400 })
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

function handleEmployeeAction(command, employee) {
  if (command === 'edit') editEmployee(employee)
  if (command === 'schedule') ElMessage({ message: `已打开 ${employee.name} 的排班信息`, type: 'success', customClass: 'light-bites-message', duration: 2400 })
  if (command === 'status') {
    employee.status = employee.status === '离线' ? '在线' : '离线'
    ElMessage({ message: `${employee.name} 已设为${employee.status}`, type: 'success', customClass: 'light-bites-message', duration: 2400 })
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

function refreshLogs() {
  refreshing.value = true
  window.setTimeout(() => {
    refreshing.value = false
    ElMessage({ message: '系统日志已更新', type: 'success', customClass: 'light-bites-message', duration: 2400 })
  }, 700)
}
</script>

<template>
  <div class="employee-management-content">
    <section class="system-page-heading">
      <div><h1>{{ activeTab === 'employees' ? '员工管理' : '系统日志' }}</h1><p>管理您的团队并跟踪系统运行状态。</p></div>
      <div class="system-tabs" role="tablist" aria-label="系统管理视图">
        <button :class="{ active: activeTab === 'employees' }" role="tab" :aria-selected="activeTab === 'employees'" @click="changeTab('employees')">员工管理</button>
        <button :class="{ active: activeTab === 'logs' }" role="tab" :aria-selected="activeTab === 'logs'" @click="changeTab('logs')">系统日志</button>
      </div>
    </section>

    <section class="system-metrics-grid" aria-label="系统概况">
      <article><span class="system-metric-icon green"><AppIcon name="users"/></span><div><small>活跃员工</small><strong>24</strong></div></article>
      <article><span class="system-metric-icon blue"><AppIcon name="calendar"/></span><div><small>今日排班</small><strong>12</strong></div></article>
      <article><span class="system-metric-icon mint"><AppIcon name="check"/></span><div><small>系统健康度</small><strong>100%</strong></div></article>
      <article><span class="system-metric-icon amber"><AppIcon name="history"/></span><div><small>24h日志数</small><strong>1,204</strong></div></article>
    </section>

    <section v-if="activeTab === 'employees'" class="system-table-card">
      <header class="system-panel-heading">
        <div class="system-panel-title"><h2>员工名录</h2><span>共 {{ employees.length }} 人</span></div>
        <div class="system-panel-actions">
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
        <el-table-column label="状态" min-width="100"><template #default="{ row }"><span class="employee-status" :class="row.status === '在线' || row.status === '值班中' ? 'active' : row.status === '请假' ? 'leave' : 'offline'"><i/>{{ row.status }}</span></template></el-table-column>
        <el-table-column label="操作" width="62" align="center"><template #default="{ row }"><el-dropdown trigger="click" popper-class="employee-action-menu" @command="handleEmployeeAction($event,row)"><el-button class="employee-more-button" circle aria-label="员工操作"><AppIcon name="more"/></el-button><template #dropdown><el-dropdown-menu><el-dropdown-item command="edit">编辑资料</el-dropdown-item><el-dropdown-item command="schedule">查看排班</el-dropdown-item><el-dropdown-item command="status">切换在线状态</el-dropdown-item></el-dropdown-menu></template></el-dropdown></template></el-table-column>
      </el-table>
      <footer class="system-table-footer"><span>{{ employeeRange }}</span><div><el-pagination v-model:current-page="employeePage" background layout="prev, next" :page-size="pageSize" :total="filteredEmployees.length"/><el-button class="add-employee-button" @click="openAdd"><AppIcon name="plus"/>添加新员工</el-button></div></footer>
    </section>

    <section v-else class="system-table-card log-card">
      <header class="system-panel-heading">
        <div class="system-panel-title"><h2>系统日志</h2><span class="log-warning"><AppIcon name="warning"/>今日有 2 条异常</span></div>
        <div class="system-panel-actions"><el-select v-model="timeRange" class="log-range-select" aria-label="日志时间范围"><template #prefix><AppIcon name="calendar"/></template><el-option v-for="item in ['最近 24 小时','最近 7 天','最近 30 天']" :key="item" :label="item" :value="item"/></el-select><el-button class="system-square-button" :class="{ refreshing }" aria-label="刷新日志" @click="refreshLogs"><AppIcon name="refresh"/></el-button></div>
      </header>
      <el-table :data="pageLogs" class="employee-table log-table" table-layout="fixed" empty-text="暂无符合条件的日志">
        <el-table-column label="用户" min-width="165"><template #default="{ row }"><div class="log-user-cell"><span :class="{ system: row.initials === 'SYS' }">{{ row.initials }}</span><strong>{{ row.user }}</strong></div></template></el-table-column>
        <el-table-column prop="module" label="模块" min-width="78"><template #default="{ row }"><span class="log-module">{{ row.module }}</span></template></el-table-column>
        <el-table-column label="操作内容" min-width="190"><template #default="{ row }"><span class="log-action"><b>{{ row.action }}</b> {{ row.target }}</span></template></el-table-column>
        <el-table-column prop="ip" label="IP 地址" min-width="126"/>
        <el-table-column prop="time" label="时间戳" min-width="205"/>
        <el-table-column label="状态" width="92"><template #default="{ row }"><span class="log-status" :class="row.status === '成功' ? 'success' : 'failed'"><i/>{{ row.status }}</span></template></el-table-column>
      </el-table>
      <footer class="system-table-footer"><span>{{ logRange }}</span><el-pagination v-model:current-page="logPage" background layout="prev, next" :page-size="pageSize" :total="filteredLogs.length"/></footer>
    </section>
  </div>

  <el-drawer v-model="dialogVisible" class="employee-drawer" size="540px" :with-header="false">
    <div class="modal-header"><div><span class="eyebrow">团队档案</span><h2>{{ editingId ? '编辑员工' : '添加新员工' }}</h2></div><el-button class="icon-button" circle aria-label="关闭" @click="dialogVisible = false"><AppIcon name="close"/></el-button></div>
    <el-form label-position="top" @submit.prevent="saveEmployee">
      <div class="form-row"><el-form-item label="员工姓名"><el-input v-model="form.name" placeholder="输入员工姓名"/></el-form-item><el-form-item label="工作邮箱"><el-input v-model="form.email" placeholder="name@lightbites.com"/></el-form-item></div>
      <div class="form-row"><el-form-item label="职位"><el-select v-model="form.role"><el-option v-for="item in ['经理','厨师长','厨师','营养师','员工','配送员','采购员']" :key="item" :label="item" :value="item"/></el-select></el-form-item><el-form-item label="状态"><el-select v-model="form.status"><el-option v-for="item in ['在线','值班中','离线','请假']" :key="item" :label="item" :value="item"/></el-select></el-form-item></div>
      <el-form-item label="所属门店"><el-select v-model="form.store"><el-option v-for="item in ['中心旗舰店','总店厨房 HQ','西区熟食店','东区咖啡馆']" :key="item" :label="item" :value="item"/></el-select></el-form-item>
      <div class="drawer-actions"><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" @click="saveEmployee">{{ editingId ? '保存更改' : '添加员工' }}</el-button></div>
    </el-form>
  </el-drawer>
</template>
