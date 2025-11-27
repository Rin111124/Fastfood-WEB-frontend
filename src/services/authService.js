import apiFetch from './apiClient'

const normalizeName = (value = '', fallback = 'Team member') => {
  if (!value || !value.trim()) return fallback
  return value
    .trim()
    .split(/\s+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ')
}

const parseJsonSafely = async (response) => {
  try {
    return await response.json()
  } catch (error) {
    console.error('Failed to parse JSON response', error)
    return null
  }
}

const requestJson = async (path, payload, method = 'POST') => {
  const response = await apiFetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  const body = await parseJsonSafely(response)
  return { response, body }
}

export const login = async ({ username, password, captchaToken }) => {
  if (!username || !password) {
    throw new Error('Username and password are required to access the kitchen dashboard.')
  }

  const payload = {
    identifier: username,
    password,
    ...(captchaToken ? { captchaToken } : {}),
  }

  let response
  let body
  try {
    const result = await requestJson('/api/auth/login', payload)
    response = result.response
    body = result.body
  } catch (networkError) {
    console.error('Login request failed', networkError)
    throw new Error('Cannot reach the QuickBite API. Please check your network connection.')
  }

  if (!response.ok) {
    const message =
      body?.message ||
      (response.status >= 500
        ? 'The kitchen systems are down for maintenance. Please try again shortly.'
        : 'Unable to sign in with the provided credentials.')
    const error = new Error(message)
    if (body?.errors && typeof body.errors === 'object') {
      error.fieldErrors = body.errors
    }
    if (body?.requireCaptcha) {
      error.requireCaptcha = true
    }
    if (typeof body?.retryAfterSeconds === 'number') {
      error.retryAfterSeconds = body.retryAfterSeconds
    }
    error.status = response.status
    throw error
  }

  const data = body?.data
  if (!data?.accessToken || !data?.user) {
    throw new Error('Login response is missing required data. Please contact support.')
  }

  const user = data.user
  return {
    token: data.accessToken,
    tokenType: data.tokenType || 'Bearer',
    expiresIn: data.expiresIn,
    user: {
      id: user.user_id,
      username: user.username,
      email: user.email,
      role: user.role,
      name: normalizeName(user.full_name || user.username),
      raw: user,
    },
  }
}

const mapGenderForApi = (gender) => {
  if (!gender) return 'unknown'
  const normalized = gender.trim().toLowerCase()
  switch (normalized) {
    case 'male':
    case 'nam':
      return 'male'
    case 'female':
    case 'nu':
      return 'female'
    case 'non-binary':
    case 'nonbinary':
    case 'khac':
      return 'other'
    case 'prefer-not':
    case 'prefer_not':
    case 'prefer not':
      return 'unknown'
    default:
      return ['male', 'female', 'other', 'unknown'].includes(normalized) ? normalized : 'other'
  }
}

const mapRoleForApi = (role) => {
  if (!role) return 'customer'
  const normalized = role.trim().toLowerCase()
  return ['customer', 'guest', 'staff'].includes(normalized) ? normalized : 'customer'
}

export const signup = async ({ username, password, fullName, email, phoneNumber, gender, role }) => {
  if (!username || !password || !fullName || !email || !phoneNumber || !gender || !role) {
    throw new Error('All fields are required so we can prep your QuickBite workspace.')
  }

  if (password.length < 8) {
    throw new Error('Passwords need at least 8 characters.')
  }
  if (!/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^\w\s]/.test(password)) {
    throw new Error('Password must include at least one uppercase letter, one number, and one special character.')
  }

  let response
  let body
  try {
    const result = await requestJson('/api/auth/signup', {
      username,
      password,
      email,
      fullName,
      phoneNumber,
      gender: mapGenderForApi(gender),
      role: mapRoleForApi(role),
    })
    response = result.response
    body = result.body
  } catch (networkError) {
    console.error('Signup request failed', networkError)
    throw new Error('Cannot reach the QuickBite API. Please check your network connection.')
  }

  if (!response.ok) {
    const message =
      body?.message ||
      (response.status >= 500
        ? 'We are preparing the signup kitchen tools. Please try again shortly.'
        : 'We could not create your account right now. Please verify your details.')
    const error = new Error(message)
    if (body?.errors && typeof body.errors === 'object') {
      error.fieldErrors = body.errors
    }
    throw error
  }

  const data = body?.data
  if (!data?.user) {
    throw new Error('Signup response is missing required data. Please contact support.')
  }

  const registeredUser = data.user
  return {
    token: data.accessToken,
    tokenType: data.tokenType || 'Bearer',
    expiresIn: data.expiresIn,
    user: {
      id: registeredUser.user_id,
      username: registeredUser.username,
      email: registeredUser.email,
      role: registeredUser.role,
      name: normalizeName(registeredUser.full_name || registeredUser.username, fullName),
      raw: registeredUser,
    },
  }
}

export const requestPasswordReset = async ({ identifier, captchaToken }) => {
  const payload = {
    identifier,
    ...(captchaToken ? { captchaToken } : {}),
  }

  let response
  let body
  try {
    const result = await requestJson('/api/auth/forgot-password', payload)
    response = result.response
    body = result.body
  } catch (networkError) {
    console.error('Forgot password request failed', networkError)
    throw new Error('Cannot reach the QuickBite API. Please check your network connection.')
  }

  if (!response.ok) {
    const message =
      body?.message ||
      (response.status >= 500
        ? 'Reset services are temporarily unavailable. Please try again shortly.'
        : 'Unable to process your reset request. Please verify your details.')
    const error = new Error(message)
    if (body?.errors && typeof body.errors === 'object') {
      error.fieldErrors = body.errors
    }
    if (typeof body?.retryAfterSeconds === 'number') {
      error.retryAfterSeconds = body.retryAfterSeconds
    }
    throw error
  }

  return {
    success: true,
    requireCaptcha: Boolean(body?.requireCaptcha),
    token: body?.token,
    resetUrl: body?.resetUrl,
  }
}

export const resetPassword = async ({ token, password }) => {
  let response
  let body
  try {
    const result = await requestJson('/api/auth/reset-password', { token, password })
    response = result.response
    body = result.body
  } catch (networkError) {
    console.error('Reset password request failed', networkError)
    throw new Error('Cannot reach the QuickBite API. Please check your network connection.')
  }

  if (!response.ok) {
    const message =
      body?.message ||
      (response.status >= 500
        ? 'Reset services are temporarily unavailable. Please try again shortly.'
        : 'Unable to reset your password. Please verify your token and try again.')
    const error = new Error(message)
    if (body?.errors && typeof body.errors === 'object') {
      error.fieldErrors = body.errors
    }
    throw error
  }

  return { success: true }
}
