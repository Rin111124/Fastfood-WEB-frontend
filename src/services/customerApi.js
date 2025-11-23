import apiFetch from './apiClient'

const parseJson = async (response) => {
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      body?.message ||
      (response.status >= 500
        ? 'He thong dang ban. Vui long thu lai sau.'
        : 'Khong the thuc hien yeu cau. Vui long kiem tra lai.')
    const error = new Error(message)
    error.status = response.status
    throw error
  }
  return body?.data ?? null
}

const get = (url) => apiFetch(url).then(parseJson)

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

const post = (url, payload) => apiFetch(url, buildOptions('POST', payload)).then(parseJson)

const patch = (url, payload) => apiFetch(url, buildOptions('PATCH', payload)).then(parseJson)

export const customerApi = {
  getDashboard: () => get('/api/customer/dashboard'),
  listProducts: (params = {}) => {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.categoryId) query.set('categoryId', params.categoryId)
    if (params.limit) query.set('limit', params.limit)
    return get(`/api/customer/products${query.toString() ? `?${query.toString()}` : ''}`)
  },
  listNews: (params = {}) => {
    const query = new URLSearchParams()
    if (params.limit) query.set('limit', params.limit)
    if (params.search && String(params.search).trim()) {
      query.set('search', String(params.search).trim())
    }
    return get(`/api/customer/news${query.toString() ? `?${query.toString()}` : ''}`)
  },
  getProfile: () => get('/api/customer/me'),
  updateProfile: (payload) => patch('/api/customer/me', payload),
  listOrders: (params = {}) => {
    const query = new URLSearchParams()
    if (params.status && params.status !== 'all') query.set('status', params.status)
    return get(`/api/customer/orders${query.toString() ? `?${query.toString()}` : ''}`)
  },
  getOrder: (orderId) => get(`/api/customer/orders/${orderId}`),
  createOrder: (payload) => post('/api/customer/orders', payload),
  cancelOrder: (orderId) => post(`/api/customer/orders/${orderId}/cancel`, {}),
  // payments
  createVnpayPaymentUrl: (payload = {}) => post('/api/payments/vnpay/create', payload),
  createCodPayment: (orderId) => post('/api/payments/cod/create', { orderId }),
  createVietqrPayment: (payload = {}) => post('/api/payments/vietqr/create', payload),
  confirmVietqrPayment: (orderId) => post('/api/payments/vietqr/confirm', { orderId }),
  cancelVietqrPayment: (orderId, reason) => post('/api/payments/vietqr/cancel', { orderId, reason }),
  queryVietqrPayment: (orderId) => post('/api/payments/vietqr/query', { orderId }),
  createPaypalPayment: (payload = {}) => post('/api/payments/paypal/create', payload),
  createStripePaymentIntent: (payload = {}) => post('/api/payments/stripe/create-intent', payload),
  // cart
  getCart: () => get('/api/customer/cart'),
  addToCart: ({ productId, quantity } = {}) => post('/api/customer/cart/items', { productId, quantity }),
  updateCartItem: ({ productId, quantity }) => patch(`/api/customer/cart/items/${productId}`, { quantity }),
  removeCartItem: (productId) => apiFetch(`/api/customer/cart/items/${productId}`, { method: 'DELETE' }).then(parseJson),
  clearCart: () => post('/api/customer/cart/clear', {}),
  // support
  listSupportMessages: () => get('/api/customer/support/messages'),
  createSupportMessage: (message) => post('/api/customer/support/messages', { message }),
  // conversation
  getConversationMessages: () => get('/api/customer/support/conversation/messages'),
  postConversationMessage: (message) => post('/api/customer/support/conversation/messages', { message })
}

export default customerApi

