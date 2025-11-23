const normalizeName = (value = '', fallback = 'Team member') => {
  if (!value || !value.trim()) return fallback
  return value
    .trim()
    .split(/\s+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ')
}

const API_BASE_URL = (() => {
  const base = import.meta.env.VITE_API_BASE_URL || 'https://fastfood-web-backend-production.up.railway.app'
  return base.endsWith('/') ? base.slice(0, -1) : base
})()

const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 10000)

const parseJsonSafely = async (response) => {
  try {
    return await response.json()
  } catch (error) {
    console.error('Failed to parse JSON response', error)
    return null
  }
}

const fetchWithTimeout = async (url, options = {}, timeout = API_TIMEOUT_MS) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    return response
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('The QuickBite API took too long to respond. Please try again.')
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

export const login = async ({ username, password }) => {
  if (!username || !password) {
    throw new Error('Username and password are required to access the kitchen dashboard.')
  }

  const payload = {
    identifier: username,
    password,
  }

  let response
  try {
    response = await fetchWithTimeout(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch (networkError) {
    console.error('Login request failed', networkError)
    throw new Error('Cannot reach the QuickBite API. Please check your network connection.')
  }

  const body = await parseJsonSafely(response)
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
  return ['customer', 'staff'].includes(normalized) ? normalized : 'customer'
}

export const signup = async ({ username, password, fullName, email, phoneNumber, gender, role }) => {
  if (!username || !password || !fullName || !email || !phoneNumber || !gender || !role) {
    throw new Error('All fields are required so we can prep your QuickBite workspace.')
  }

  if (password.length < 8) {
    throw new Error('Passwords need at least 8 characters to keep accounts secure.')
  }

  let response
  try {
    response = await fetchWithTimeout(`${API_BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
        email,
        fullName,
        phoneNumber,
        gender: mapGenderForApi(gender),
        role: mapRoleForApi(role),
      }),
    })
  } catch (networkError) {
    console.error('Signup request failed', networkError)
    throw new Error('Cannot reach the QuickBite API. Please check your network connection.')
  }

  const body = await parseJsonSafely(response)
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
