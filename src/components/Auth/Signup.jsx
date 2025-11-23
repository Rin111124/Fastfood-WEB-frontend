import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from './AuthLayout'
import { signup } from '../../services/authService'

const Signup = () => {
  const [form, setForm] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    phoneNumber: '',
    gender: '',
    role: 'staff',
    agree: false,
  })

  const [feedback, setFeedback] = useState({
    status: 'idle',
    message: '',
  })

  const [fieldErrors, setFieldErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target
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
      const clear = (key) => {
        if (Object.prototype.hasOwnProperty.call(next, key)) {
          delete next[key]
          changed = true
        }
      }
      switch (name) {
        case 'username':
          clear('username')
          break
        case 'password':
          clear('password')
          break
        case 'fullName':
          clear('fullName')
          break
        case 'email':
          clear('email')
          break
        case 'phoneNumber':
          clear('phoneNumber')
          break
        case 'gender':
          clear('gender')
          break
        case 'role':
          clear('role')
          break
        case 'address':
          clear('address')
          break
        default:
          break
      }
      return changed ? next : previous
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!form.agree) {
      setFeedback({
        status: 'error',
        message: 'Please acknowledge the QuickBite service terms and kitchen guidelines to continue.',
      })
      return
    }

    setFeedback({ status: 'idle', message: '' })
    setFieldErrors({})

    const usernameValue = form.username.trim()
    const passwordValue = form.password.trim()
    const fullNameValue = form.fullName.trim()
    const emailValue = form.email.trim().toLowerCase()
    const phoneNumberValue = form.phoneNumber.trim()

    const clientErrors = {}

    if (!usernameValue) {
      clientErrors.username = 'Vui long nhap ten dang nhap'
    } else if (usernameValue.length < 3) {
      clientErrors.username = 'Ten dang nhap phai co it nhat 3 ky tu'
    } else if (usernameValue.length > 100) {
      clientErrors.username = 'Ten dang nhap khong duoc vuot qua 100 ky tu'
    }

    if (!passwordValue) {
      clientErrors.password = 'Vui long nhap mat khau'
    } else if (passwordValue.length < 8) {
      clientErrors.password = 'Mat khau phai co it nhat 8 ky tu'
    } else if (passwordValue.length > 255) {
      clientErrors.password = 'Mat khau khong duoc vuot qua 255 ky tu'
    }

    if (!fullNameValue) {
      clientErrors.fullName = 'Vui long nhap ho ten day du'
    } else if (fullNameValue.length < 2) {
      clientErrors.fullName = 'Ho ten phai co it nhat 2 ky tu'
    } else if (fullNameValue.length > 120) {
      clientErrors.fullName = 'Ho ten khong duoc vuot qua 120 ky tu'
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailValue) {
      clientErrors.email = 'Email khong hop le'
    } else if (emailValue.length > 150) {
      clientErrors.email = 'Email khong duoc vuot qua 150 ky tu'
    } else if (!emailRegex.test(emailValue)) {
      clientErrors.email = 'Email khong hop le'
    }

    const phonePattern = /^[0-9+\-()\s]+$/
    const phoneDigits = phoneNumberValue.replace(/\D/g, '')
    if (!phoneNumberValue) {
      clientErrors.phoneNumber = 'Vui long nhap so dien thoai'
    } else if (phoneDigits.length < 8 || phoneDigits.length > 20) {
      clientErrors.phoneNumber = 'So dien thoai phai co tu 8 den 20 chu so'
    } else if (!phonePattern.test(phoneNumberValue)) {
      clientErrors.phoneNumber = 'So dien thoai khong hop le'
    } else if (phoneNumberValue.length > 20) {
      clientErrors.phoneNumber = 'So dien thoai khong duoc vuot qua 20 ky tu'
    }

    if (!form.gender) {
      clientErrors.gender = 'Vui long chon gioi tinh'
    }

    if (!form.role) {
      clientErrors.role = 'Vui long chon vai tro'
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
      const response = await signup({
        username: usernameValue,
        password: passwordValue,
        fullName: fullNameValue,
        email: emailValue,
        phoneNumber: phoneNumberValue,
        gender: form.gender,
        role: form.role,
      })
      const contactName = response?.user?.name ?? fullNameValue
      setFeedback({
        status: 'success',
        message: `Welcome aboard, ${contactName}! Our onboarding team will help you open doors and sync your menus within minutes.`,
      })
      setFieldErrors({})
      setTimeout(() => {
        navigate('/login', { replace: true, state: { username: usernameValue } })
      }, 1200)
    } catch (error) {
      setFeedback({
        status: 'error',
        message: error.message || 'We could not create your account right now. Please try again or contact support.',
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
        badge: 'Store Launch Suite',
        title: 'Spin up a new counter without missing a beat',
        description:
          'Coordinate kitchen staffing, delivery menus, and promotional bundles from one playbook designed for fast casual teams.',
        highlights: [
          'Menu sync to kiosks, apps, and delivery partners in real time',
          'Prep projections auto-adjusted from historical rush data',
          'Staff scheduling, training, and food safety checklists in one view',
        ],
        footnote: 'Join more than 4,000 storefronts staying under 4-minute ticket times with QuickBite.',
      }}
    >
      <div className="mb-5 text-center text-lg-start">
        <span className="badge rounded-pill bg-light text-primary fw-semibold text-uppercase mb-3">
          New location
        </span>
        <h1 className="h2 fw-semibold mb-2">Create your operator account</h1>
        <p className="text-secondary mb-0">
          Register to access launch checklists, supply forecasts, and delivery dashboards tailored for your region.
        </p>
      </div>

      <form className="w-100" onSubmit={handleSubmit} noValidate>
        <div className="row g-4">
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              className={`form-control${fieldErrors.username ? ' is-invalid' : ''}`}
              placeholder="store.manager"
              value={form.username}
              onChange={handleChange}
              required
            />
            {fieldErrors.username && <div className="invalid-feedback">{fieldErrors.username}</div>}
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className={`form-control${fieldErrors.password ? ' is-invalid' : ''}`}
              placeholder="Create a secure passphrase"
              minLength={8}
              value={form.password}
              onChange={handleChange}
              required
            />
            {fieldErrors.password && <div className="invalid-feedback">{fieldErrors.password}</div>}
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="fullName">
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              className={`form-control${fieldErrors.fullName ? ' is-invalid' : ''}`}
              placeholder="Nguyen Thi Anh"
              value={form.fullName}
              onChange={handleChange}
              required
            />
            {fieldErrors.fullName && <div className="invalid-feedback">{fieldErrors.fullName}</div>}
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="email">
              Work email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className={`form-control${fieldErrors.email ? ' is-invalid' : ''}`}
              placeholder="you@quickbitepartners.com"
              value={form.email}
              onChange={handleChange}
              required
            />
            {fieldErrors.email && <div className="invalid-feedback">{fieldErrors.email}</div>}
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="phoneNumber">
              Phone number
            </label>
            <input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              className={`form-control${fieldErrors.phoneNumber ? ' is-invalid' : ''}`}
              placeholder="+84 912 345 678"
              value={form.phoneNumber}
              onChange={handleChange}
              required
            />
            {fieldErrors.phoneNumber && <div className="invalid-feedback">{fieldErrors.phoneNumber}</div>}
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="gender">
              Gender
            </label>
            <select
              id="gender"
              name="gender"
              className={`form-select${fieldErrors.gender ? ' is-invalid' : ''}`}
              value={form.gender}
              onChange={handleChange}
              required
            >
              <option value="" disabled>
                Select gender
              </option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="non-binary">Non-binary</option>
              <option value="prefer-not">Prefer not to say</option>
            </select>
            {fieldErrors.gender && <div className="invalid-feedback d-block">{fieldErrors.gender}</div>}
          </div>

          <div className="col-12">
            <label className="form-label" htmlFor="role">
              Access level
            </label>
            <select
              id="role"
              name="role"
              className={`form-select${fieldErrors.role ? ' is-invalid' : ''}`}
              value={form.role}
              onChange={handleChange}
              required
            >
              <option value="staff">Staff</option>
              <option value="customer">Customer</option>
            </select>
            {fieldErrors.role && <div className="invalid-feedback d-block">{fieldErrors.role}</div>}
          </div>
        </div>

        <div className="form-check mt-4">
          <input
            className="form-check-input"
            type="checkbox"
            id="agree"
            name="agree"
            checked={form.agree}
            onChange={handleChange}
            required
          />
          <label className="form-check-label ms-2 small" htmlFor="agree">
            I agree to the{' '}
            <button type="button" className="btn btn-link p-0 align-baseline auth-link fw-semibold">
              QuickBite service terms
            </button>{' '}
            and kitchen operations guidelines.
          </label>
        </div>

        {feedback.status !== 'idle' && (
          <div
            className={`alert mt-4 mb-0 py-3 px-4 ${
              feedback.status === 'error' ? 'alert-danger border-0' : 'alert-success border-0'
            }`}
            role="alert"
          >
            {feedback.message}
          </div>
        )}

        <div className="d-grid gap-3 mt-4">
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>
          <button type="button" className="btn btn-outline-secondary">
            Import team from Google Workspace
          </button>
        </div>
      </form>

      <p className="text-secondary text-center mt-5 mb-0">
        Already have a QuickBite login?{' '}
        <Link className="auth-link fw-semibold" to="/login">
          Sign in instead
        </Link>
      </p>
    </AuthLayout>
  )
}

export default Signup
