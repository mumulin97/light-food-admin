import { reactive } from 'vue'

function dateFromNow(days) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const seedSuppliers = [
  ['晨曦有机牧场', '浙江省杭州市余杭区农科园 12 号', '乳制品/有机奶', '李明诚', '138-0000-1234', '激活', 'A+', 99, 'SP-3301-0148', 18],
  ['绿野农庄配送中心', '上海市松江区新浜农产品交易中心', '新鲜蔬菜/菌菇', '王小野', '156-8888-5678', '激活', 'A+', 100, 'SP-3101-0292', 26],
  ['丰收果园贸易公司', '成都市双流区农副产品批发市场', '时令水果', '赵丰', '139-4444-9988', '停用', 'B', 82, 'SP-5101-0377', -12],
  ['原味食品有限公司', '广东省广州市天河区高新路 88 号', '调味品/半成品', '张思语', '135-2222-3333', '激活', 'A', 96, 'SP-4401-0512', 200],
  ['清源粮油贸易', '江苏省南京市江宁区粮油市场 9 号', '粮油/干货', '陈国清', '137-6666-2211', '激活', 'A', 95, 'SP-3201-0631', 365],
  ['鲜潮海产', '福建省厦门市海沧区渔港路 5 号', '冰鲜水产', '林海涛', '159-3333-7788', '激活', 'A+', 98, 'SP-3502-0744', 95],
  ['谷雨茶叶合作社', '安徽省黄山市徽州区茶园路 20 号', '茶饮/茶底', '吴春晓', '138-5555-4646', '激活', 'A', 94, 'SP-3410-0856', 140],
  ['沃田蔬菜基地', '山东省寿光市蔬菜产业园', '新鲜蔬菜/菌菇', '孙沃', '136-7777-1212', '停用', 'B', 79, 'SP-3707-0963', -40],
  ['恒诚肉业', '河南省漯河市食品工业园', '肉类/禽类', '何恒', '155-8888-3434', '激活', 'A', 93, 'SP-4111-1075', 280],
  ['甜心烘焙原料', '北京市大兴区食品物流园', '烘焙原料', '甜佳', '134-9999-5656', '激活', 'A', 92, 'SP-1101-1182', 60],
].map(([name, address, category, contact, phone, status, score, fulfillment, licenseNo, licenseDays], index) => ({
  id: index + 1,
  name,
  address,
  category,
  contact,
  phone,
  status,
  score,
  fulfillment,
  licenseNo,
  licenseExpiry: dateFromNow(licenseDays),
}))

export const supplierStore = reactive({ suppliers: seedSuppliers })

export function replaceSuppliers(rows = []) {
  supplierStore.suppliers.splice(0, supplierStore.suppliers.length, ...rows)
}
