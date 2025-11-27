import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuthLayout from './AuthLayout'
import { resetPassword } from '../../services/authService'

const passwordMeetsRules = (value) => {
  const hasUpper = /[A-Z]/.test(value)
  const hasLower = /[a-z]/.test(value)
  const hasNumber = /[0-9]/.test(value)
  const hasSymbol = /[^A-Za-z0-9]/.test(value)
  return value.length >= 12 && hasUpper && hasLower && hasNumber && hasSymbol && !/(.)\1{3,}/.test(value)
}

const ResetPassword = () => {
  const [searchParams] = useSearchParams()
  const initialToken = useMemo(() => searchParams.get('token') || '', [searchParams])
  const [token, setToken] = useState(initialToken)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [feedback, setFeedback] = useState({ status: 'idle', message: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const validate = () => {
    const errors = {}
    const trimmedToken = token.trim()
    const trimmedPassword = password.trim()
    const trimmedConfirm = confirm.trim()

    if (!trimmedToken) {
      errors.token = 'Token khoi phuc khong duoc de trong'
    }

    if (!trimmedPassword) {
      errors.password = 'Vui long nhap mat khau moi'
    } else if (!passwordMeetsRules(trimmedPassword)) {
      errors.password =
        'Mat khau phai co it nhat 12 ky tu, bao gom chu hoa, chu thuong, so, ky tu dac biet va khong lap lai qua 4 lan.'
    }

    if (!trimmedConfirm) {
      errors.confirm = 'Vui long nhap lai mat khau'
    } else if (trimmedPassword !== trimmedConfirm) {
      errors.confirm = 'Mat khau nhap lai khong khop'
    }

    return errors
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFeedback({ status: 'idle', message: '' })
    const errors = validate()
    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      setFeedback({ status: 'error', message: 'Please correct the highlighted fields to continue.' })
      return
    }

    setIsLoading(true)
    setFieldErrors({})

    try {
      await resetPassword({ token: token.trim(), password: password.trim() })
      setFeedback({ status: 'success', message: 'Dat lai mat khau thanh cong. Hay dang nhap lai.' })
      setTimeout(() => navigate('/login', { replace: true }), 1200)
    } catch (error) {
      setFeedback({
        status: 'error',
        message: error.message || 'Khong the dat lai mat khau. Vui long thu lai.',
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
        badge: 'Reset password',
        title: 'Dat lai mat khau an toan',
        description:
          'Su dung token da duoc gui qua email. Mat khau moi can it nhat 12 ky tu va co day du chu hoa, chu thuong, so va ky tu dac biet.',
        highlights: [
          'Token het han nhanh de bao ve tai khoan',
          'Mat khau duoc bam bang bcrypt tren server',
          'Dang nhap lai ngay sau khi dat lai',
        ],
        footnote: 'Neu token het han, yeu cau lai tu trang quen mat khau.',
      }}
    >
      <div className="mb-4">
        <h1 className="h3 fw-semibold mb-2">Nhap token va mat khau moi</h1>
        <p className="text-secondary mb-0">Neu token cua ban het han, vui long yeu cau lai tu trang Quen mat khau.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="w-100">
        <div className="mb-4">
          <label className="form-label" htmlFor="token">
            Token khoi phuc
          </label>
          <input
            id="token"
            name="token"
            type="text"
            className={`form-control${fieldErrors.token ? ' is-invalid' : ''}`}
            placeholder="Ma token trong email"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            required
          />
          {fieldErrors.token && <div className="invalid-feedback">{fieldErrors.token}</div>}
        </div>

        <div className="mb-4">
          <label className="form-label" htmlFor="password">
            Mat khau moi
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className={`form-control${fieldErrors.password ? ' is-invalid' : ''}`}
            placeholder="Nhap mat khau moi"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={12}
          />
          {fieldErrors.password && <div className="invalid-feedback">{fieldErrors.password}</div>}
          <div className="form-text small text-secondary">
            Can chu hoa, chu thuong, so, ky tu dac biet va khong lap lai 1 ky tu qua 4 lan.
          </div>
        </div>

        <div className="mb-4">
          <label className="form-label" htmlFor="confirm">
            Nhap lai mat khau moi
          </label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            className={`form-control${fieldErrors.confirm ? ' is-invalid' : ''}`}
            placeholder="Nhap lai mat khau"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
            minLength={12}
          />
          {fieldErrors.confirm && <div className="invalid-feedback">{fieldErrors.confirm}</div>}
        </div>

        {feedback.status !== 'idle' && (
          <div
            className={`alert mt-0 mb-4 py-3 px-4 ${
              feedback.status === 'error' ? 'alert-danger border-0' : 'alert-success border-0'
            }`}
            role="alert"
          >
            {feedback.message}
          </div>
        )}

        <div className="d-grid gap-3">
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? 'Dang xu ly...' : 'Cap nhat mat khau'}
          </button>
          <Link to="/forgot-password" className="btn btn-outline-secondary">
            Quay ve quen mat khau
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
}

export default ResetPassword
