import apiFetch from './apiClient'

const parseJson = async (response) => {
  const rawBody = await response.text()
  const contentType = response.headers.get('content-type') || ''

  let body = null
  if (rawBody) {
    try {
      body = /json/i.test(contentType) ? JSON.parse(rawBody) : null
    } catch (error) {
      const parseError = new Error('Du lieu tra ve khong dung dinh dang JSON.')
      parseError.cause = error
      throw parseError
    }
  }

  if (!response.ok) {
    const message =
      body?.message ||
      body?.error ||
      (response.status >= 500
        ? 'May chu dang ban. Vui long thu lai sau.'
        : 'Yeu cau khong hop le. Vui long kiem tra lai.')
    const error = new Error(message)
    error.status = response.status
    error.body = body
    throw error
  }

  if (!rawBody) {
    return null
  }

  if (body && Object.prototype.hasOwnProperty.call(body, 'data')) {
    return body.data
  }

  return body
}

const isFormData = (value) => typeof FormData !== 'undefined' && value instanceof FormData

const buildOptions = (method, payload) => {
  const options = { method }
  if (payload === undefined || payload === null) {
    return options
  }
  if (isFormData(payload)) {
    options.body = payload
    return options
  }
  options.headers = { 'Content-Type': 'application/json' }
  options.body = JSON.stringify(payload)
  return options
}

const request = (url, options) => apiFetch(url, options).then(parseJson)

const get = (url) => request(url)
const post = (url, payload) => request(url, buildOptions('POST', payload))
const put = (url, payload) => request(url, buildOptions('PUT', payload))
const patch = (url, payload) => request(url, buildOptions('PATCH', payload))
const del = (url, payload) => request(url, buildOptions('DELETE', payload))

export const adminApi = {
  listUsers: (params = {}) => {
    const query = new URLSearchParams()
    if (params.limit) query.set('limit', params.limit)
    const queryString = query.toString()
    return get(`/api/admin/users${queryString ? `?${queryString}` : ''}`)
  },
  createUser: (payload) => post('/api/admin/users', payload),
  updateUser: (userId, payload) => put(`/api/admin/users/${userId}`, payload),
  setUserStatus: (userId, status) => patch(`/api/admin/users/${userId}/status`, { status }),
  deleteUser: (userId, options = {}) => del(`/api/admin/users/${userId}`, options),
  restoreUser: (userId) => post(`/api/admin/users/${userId}/restore`),
  resetUserPassword: (userId) => post(`/api/admin/users/${userId}/reset-password`),
  sendResetPasswordEmail: (userId) => post(`/api/admin/users/${userId}/send-reset-email`),

  listStaff: (limit = 100) => get(`/api/admin/staff?limit=${limit}`),

  listCategories: () => get('/api/admin/categories'),
  createCategory: (payload) => post('/api/admin/categories', payload),
  updateCategory: (categoryId, payload) => put(`/api/admin/categories/${categoryId}`, payload),
  deleteCategory: (categoryId) => del(`/api/admin/categories/${categoryId}`),

  listProducts: (params = {}) => {
    const query = new URLSearchParams()
    if (params.includeInactive === false) query.set('includeInactive', 'false')
    if (params.includeDeleted === true) query.set('includeDeleted', 'true')
    const queryString = query.toString()
    return get(`/api/admin/products${queryString ? `?${queryString}` : ''}`)
  },
  createProduct: (payload) => post('/api/admin/products', payload),
  updateProduct: (productId, payload) => put(`/api/admin/products/${productId}`, payload),
  setProductAvailability: (productId, payload = {}) =>
    patch(`/api/admin/products/${productId}/availability`, payload),
  toggleProduct: (productId) => patch(`/api/admin/products/${productId}/availability`, {}),
  deleteProduct: (productId) => del(`/api/admin/products/${productId}`),

  listNews: (params = {}) => {
    const query = new URLSearchParams()
    if (params.includeDeleted === true) query.set('includeDeleted', 'true')
    if (params.limit) query.set('limit', params.limit)
    if (params.search && String(params.search).trim()) {
      query.set('search', String(params.search).trim())
    }
    const queryString = query.toString()
    return get(`/api/admin/news${queryString ? `?${queryString}` : ''}`)
  },
  createNews: (payload) => {
    let body = payload
    if (!isFormData(body)) {
      body = new FormData()
      Object.entries(payload || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          body.append(key, value)
        }
      })
    }
    return post('/api/admin/news', body)
  },
  updateNews: (newsId, payload) => {
    let body = payload
    if (!isFormData(body)) {
      body = new FormData()
      Object.entries(payload || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          body.append(key, value)
        }
      })
    }
    return put(`/api/admin/news/${newsId}`, body)
  },
  deleteNews: (newsId, options = {}) =>
    del(`/api/admin/news/${newsId}`, options.force ? { force: true } : undefined),

  listProductOptions: (params = {}) => {
    if (typeof params === 'number' || typeof params === 'string') {
      const query = params ? `?productId=${params}` : ''
      return get(`/api/admin/product-options${query}`)
    }
    const query = new URLSearchParams()
    if (params.productId) query.set('productId', params.productId)
    if (params.includeDeleted === true) query.set('includeDeleted', 'true')
    if (params.includeInactive === false) query.set('includeInactive', 'false')
    const queryString = query.toString()
    return get(`/api/admin/product-options${queryString ? `?${queryString}` : ''}`)
  },
  createProductOption: (payload) => post('/api/admin/product-options', payload),
  updateProductOption: (optionId, payload) => put(`/api/admin/product-options/${optionId}`, payload),
  setProductOptionAvailability: (optionId, payload = {}) =>
    patch(`/api/admin/product-options/${optionId}/availability`, payload),
  toggleProductOption: (optionId) => patch(`/api/admin/product-options/${optionId}/availability`, {}),
  deleteProductOption: (optionId) => del(`/api/admin/product-options/${optionId}`),

  listOrders: (params = {}) => {
    const query = new URLSearchParams()
    if (params.status && params.status !== 'all') query.set('status', params.status)
    if (params.limit) query.set('limit', params.limit)
    if (params.search) query.set('search', params.search)
    const queryString = query.toString()
    return get(`/api/admin/orders${queryString ? `?${queryString}` : ''}`)
  },
  assignOrder: (orderId, payload) => post(`/api/admin/orders/${orderId}/assign`, payload),
  updateOrderStatus: (orderId, status) => patch(`/api/admin/orders/${orderId}/status`, { status }),
  refundOrder: (orderId, payload = {}) => post(`/api/admin/orders/${orderId}/refund`, payload),

  listPayments: (params = {}) => {
    const query = new URLSearchParams()
    if (params.status && params.status !== 'all') query.set('status', params.status)
    if (params.provider && params.provider !== 'all') query.set('provider', params.provider)
    if (params.limit) query.set('limit', params.limit)
    const qs = query.toString()
    return get(`/api/admin/payments${qs ? `?${qs}` : ''}`)
  },

  listPromotions: () => get('/api/admin/promotions'),
  createPromotion: (payload) => post('/api/admin/promotions', payload),
  updatePromotion: (promotionId, payload) => put(`/api/admin/promotions/${promotionId}`, payload),
  togglePromotion: (promotionId) => post(`/api/admin/promotions/${promotionId}/toggle`),

  getReportOverview: () => get('/api/admin/reports/overview'),

  listSettings: () => get('/api/admin/settings'),
  upsertSettings: (entries) => post('/api/admin/settings', Array.isArray(entries) ? entries : [entries]),

  listLogs: (limit = 100) => get(`/api/admin/logs?limit=${limit}`),

  listInventory: () => get('/api/admin/inventory'),
  upsertInventoryItem: (payload) => post('/api/admin/inventory', payload),

  listBackups: () => get('/api/admin/backups'),
  createBackup: () => post('/api/admin/backups'),
  restoreBackup: (fileName) => post(`/api/admin/backups/${encodeURIComponent(fileName)}/restore`),

  listShifts: () => get('/api/admin/shifts'),
  scheduleShift: (payload) => post('/api/admin/shifts', payload)
  ,
  updatePaymentStatus: (paymentId, status) => patch(`/api/admin/payments/${paymentId}/status`, { status })
}

export default adminApi
