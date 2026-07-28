// Supabase 配置 - 与后台 Vue 项目共用同一个数据库
const config = {
  url: 'https://dnqmhtlkxureixwjdbac.supabase.co',
  anonKey: 'sb_publishable_x-m49prpVfQcxsRbqo8WUg_h6rPcvji',
  // 小程序下单时使用的默认顾客名（可后续接入微信登录替换）
  defaultCustomerName: '小程序顾客'
}

module.exports = config
