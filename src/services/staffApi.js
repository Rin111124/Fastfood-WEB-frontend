import apiFetch from './apiClient'

const parseJson = async (response) => {
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      body?.message ||
      (response.status >= 500
        ? 'May chu dang ban. Vui long thu lai sau.'
        : 'Khong the thuc hien yeu cau. Vui long kiem tra lai.')
    const error = new Error(message)
    error.status = response.status
    throw error
  }
  return body?.data ?? null
}

const get = (url) => apiFetch(url).then(parseJson)

const post = (url, payload) =>
  apiFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload ? JSON.stringify(payload) : undefined
  }).then(parseJson)

const patch = (url, payload) =>
  apiFetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(parseJson)

export const staffApi = {
  listOrders: (params = {}) => {
    const query = new URLSearchParams()
    if (params.status && params.status !== 'all') query.set('status', params.status)
    if (params.staffId) query.set('staffId', params.staffId)
    return get(`/api/staff/orders${query.toString() ? `?${query.toString()}` : ''}`)
  },
  updateOrderStatus: (orderId, status, staffId) =>
    patch(`/api/staff/orders/${orderId}/status${staffId ? `?staffId=${staffId}` : ''}`, { status }),
  toggleProduct: (productId) => post(`/api/staff/menu/${productId}/toggle`),
  listSupportMessages: () => get('/api/staff/support/messages'),
  getSupportMetrics: () => get('/api/staff/support/metrics'),
  replySupportMessage: (messageId, payload) => post(`/api/staff/support/${messageId}/reply`, payload),
  listInventory: () => get('/api/staff/inventory'),
  updateInventory: (payload) => post('/api/staff/inventory', payload),
  getPerformance: (staffId) =>
    get(`/api/staff/performance${staffId ? `?staffId=${staffId}` : ''}`),
  listShifts: (staffId) =>
    get(`/api/staff/shifts${staffId ? `?staffId=${staffId}` : ''}`),
  getDashboard: (staffId) =>
    get(`/api/staff/dashboard${staffId ? `?staffId=${staffId}` : ''}`)
}

export default staffApi
