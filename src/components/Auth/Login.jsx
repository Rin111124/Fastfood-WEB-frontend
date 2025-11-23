import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from './AuthLayout'
import { login } from '../../services/authService'
import { persistSession } from '../../lib/session'

const Login = () => {
  const [form, setForm] = useState({
    username: '',
    password: '',
    remember: false,
  })

  const [feedback, setFeedback] = useState({
    status: 'idle',
    message: '',
  })

  const [fieldErrors, setFieldErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (event) => {
    const { name, type, checked, value } = event.target
    setForm((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }))
    setFieldErrors((previous) => {
      if (!previous || Object.keys(previous).length === 0) {
        return previous
      }
      const next = { ...previous }
      let changed = false
      if (name === 'username') {
        if ('username' in next) {
          delete next.username
          changed = true
        }
        if ('identifier' in next) {
          delete next.identifier
          changed = true
        }
      }
      if (name === 'password' && 'password' in next) {
        delete next.password
        changed = true
      }
      return changed ? next : previous
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFeedback({ status: 'idle', message: '' })
    setFieldErrors({})

    const usernameValue = form.username.trim()
    const passwordValue = form.password.trim()
    const clientErrors = {}

    if (!usernameValue) {
      clientErrors.username = 'Vui long nhap ten dang nhap'
      clientErrors.identifier = 'Vui long nhap ten dang nhap'
    }

    if (!passwordValue) {
      clientErrors.password = 'Vui long nhap mat khau'
    } else if (passwordValue.length < 8) {
      clientErrors.password = 'Mat khau phai co it nhat 8 ky tu'
    }

    if (Object.keys(clientErrors).length) {
      setFieldErrors(clientErrors)
      setFeedback({
        status: 'error',
        message: 'Please correct the highlighted fields to continue.',
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await login({
        username: usernameValue,
        password: passwordValue,
        remember: form.remember,
      })
      const crewLead = response?.user?.name ?? 'Team member'
      persistSession(response, form.remember)
      setFeedback({
        status: 'success',
        message: `${crewLead}, your QuickBite station is online. Orders and prep timers are synced.`,
      })
      setFieldErrors({})
      const role = response?.user?.role
      let destination = '/dashboard'
      if (role === 'customer') {
        destination = '/'
      } else if (role === 'admin') {
        destination = '/admin'
      } else if (role === 'staff') {
        destination = '/staff'
      }
      navigate(destination, { replace: true, state: response })
    } catch (error) {
      setFeedback({
        status: 'error',
        message: error.message || 'Unable to sign in right now. Please double-check your username and password.',
      })
      setFieldErrors(error.fieldErrors || {})
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      brand={{
        name: 'QuickBite Hub',
        abbreviation: 'QB',
        tagline: 'Fast food, faster ops.',
      }}
      side={{
        badge: 'Kitchen Command Center',
        title: 'Keep every order crisp, hot, and on time',
        description:
          'Track fryer timers, delivery drivers, and dine-in demand from a single dashboard purpose-built for fast food franchises.',
        highlights: [
          'Real-time order queue with prep-time targeting',
          'Smart restock alerts for buns, sauces, and sides',
          'Delivery partner sync with minute-by-minute ETAs',
        ],
        footnote: 'Average service time drops 22% when teams log in before the lunch rush.',
      }}
    >
      <div className="mb-5 text-center text-lg-start">
        <span className="badge rounded-pill bg-light text-primary fw-semibold text-uppercase mb-3">
          Shift ready
        </span>
        <h1 className="h2 fw-semibold mb-2">Log in to fire up the line</h1>
        <p className="text-secondary mb-0">
          Review overnight performance, confirm staffing, and prep digital menus before the first guest arrives.
        </p>
      </div>

      <form className="w-100" onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
          <label className="form-label" htmlFor="loginUsername">
            Username
          </label>
          <input
            id="loginUsername"
            name="username"
            type="text"
            className={`form-control${fieldErrors.username || fieldErrors.identifier ? ' is-invalid' : ''}`}
            placeholder="crew.lead"
            value={form.username}
            onChange={handleChange}
            required
          />
          {(fieldErrors.username || fieldErrors.identifier) && (
            <div className="invalid-feedback">
              {fieldErrors.username || fieldErrors.identifier}
            </div>
          )}
        </div>

        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center">
            <label className="form-label mb-0" htmlFor="loginPassword">
              Password
            </label>
            <button type="button" className="btn btn-link p-0 auth-link fw-semibold">
              Reset access
            </button>
          </div>
          <input
            id="loginPassword"
            name="password"
            type="password"
            className={`form-control${fieldErrors.password ? ' is-invalid' : ''}`}
            placeholder="Enter your kitchen passcode"
            value={form.password}
            onChange={handleChange}
            required
            minLength={8}
          />
          {fieldErrors.password && <div className="invalid-feedback">{fieldErrors.password}</div>}
        </div>

        <div className="d-flex align-items-center justify-content-between mb-4">
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="remember"
              name="remember"
              checked={form.remember}
              onChange={handleChange}
            />
            <label className="form-check-label ms-2 small" htmlFor="remember">
              Keep me signed in for rapid reorders
            </label>
          </div>
          <span className="small text-secondary">Delivery lanes sync every 30 seconds</span>
        </div>

        {feedback.status !== 'idle' && (
          <div
            className={`alert mt-0 mb-4 py-3 px-4 ${feedback.status === 'error' ? 'alert-danger border-0' : 'alert-success border-0'
              }`}
            role="alert"
          >
            {feedback.message}
          </div>
        )}

        <div className="d-grid gap-3">
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
          <button type="button" className="btn btn-outline-secondary">
            <span className="me-2" aria-hidden="true">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M19.6 10.227c0-.68-.055-1.365-.174-2.036H10v3.86h5.408a4.623 4.623 0 0 1-2.01 3.037v2.52h3.24c1.901-1.747 2.962-4.323 2.962-7.381Z"
                  fill="#4285F4"
                />
                <path
                  d="M10 20c2.682 0 4.938-.884 6.586-2.392l-3.24-2.52c-.9.612-2.056.963-3.346.963-2.568 0-4.742-1.732-5.52-4.06H1.14v2.57A9.998 9.998 0 0 0 10 20Z"
                  fill="#34A853"
                />
                <path
                  d="M4.48 11.991A5.99 5.99 0 0 1 4.16 10c0-.69.122-1.357.318-1.991V5.438H1.14A10.003 10.003 0 0 0 0 10c0 1.623.39 3.167 1.14 4.562l3.34-2.571Z"
                  fill="#FBBC05"
                />
                <path
                  d="M10 3.958c1.461 0 2.773.502 3.807 1.48l2.854-2.854C14.93.96 12.682 0 10 0A9.998 9.998 0 0 0 1.14 5.438l3.34 2.571C5.258 5.63 7.432 3.958 10 3.958Z"
                  fill="#EA4335"
                />
              </svg>
            </span>
            Sign in with Google
          </button>
        </div>
      </form>

      <p className="text-secondary text-center mt-5 mb-0">
        Need an account for a new outlet?{' '}
        <Link className="auth-link fw-semibold" to="/signup">
          Start a franchise seat
        </Link>
      </p>
    </AuthLayout>
  )
}

export default Login
