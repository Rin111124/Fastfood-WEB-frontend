import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AuthLayout from './AuthLayout'
import { requestPasswordReset } from '../../services/authService'
import ReCAPTCHA from 'react-google-recaptcha'

const ForgotPassword = () => {
  const [identifier, setIdentifier] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [feedback, setFeedback] = useState({ status: 'idle', message: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const siteKey = useMemo(() => (import.meta.env.VITE_RECAPTCHA_SITE_KEY || '').trim(), [])

  const validate = () => {
    const errors = {}
    if (!identifier.trim()) {
      errors.identifier = 'Vui long nhap email hoac ten dang nhap'
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
      const result = await requestPasswordReset({ identifier: identifier.trim(), captchaToken })
      setFeedback({
        status: 'success',
        message: 'Neu thong tin hop le, email khoi phuc da duoc gui. Vui long kiem tra hop thu (va Spam).',
      })
      if (result.resetUrl || result.token) {
        setFeedback((prev) => ({
          ...prev,
          message: `${prev.message} (Dev preview: ${result.resetUrl || result.token})`,
        }))
      }
    } catch (error) {
      setFeedback({
        status: 'error',
        message:
          error.retryAfterSeconds && error.retryAfterSeconds > 0
            ? `${error.message} (Thu lai sau ${Math.ceil(error.retryAfterSeconds)} giay)`
            : error.message || 'Khong the gui yeu cau khoi phuc. Vui long thu lai.',
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
        badge: 'Account recovery',
        title: 'Lay lai truy cap an toan',
        description:
          'Xac thuc email hoac ten dang nhap cua ban, chung toi se gui lien ket dat lai mat khau het han sau vai phut.',
        highlights: [
          'Token dat lai het han nhanh de giam rui ro',
          'Khong tiet lo tai khoan ton tai hay khong',
          'Nho kiem tra ca thu Spam/Quang cao',
        ],
        footnote: 'Mat khau moi can toi thieu 12 ky tu voi chu hoa, chu thuong, so va ky tu dac biet.',
      }}
    >
      <div className="mb-4">
        <h1 className="h3 fw-semibold mb-2">Quen mat khau</h1>
        <p className="text-secondary mb-0">
          Nhap email hoac ten dang nhap. Neu khop, chung toi se gui lien ket dat lai mat khau hop le trong 15 phut.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="w-100">
        <div className="mb-4">
          <label className="form-label" htmlFor="identifier">
            Email hoac ten dang nhap
          </label>
          <input
            id="identifier"
            name="identifier"
            type="text"
            className={`form-control${fieldErrors.identifier ? ' is-invalid' : ''}`}
            placeholder="you@example.com hoac crew.lead"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            required
          />
          {fieldErrors.identifier && <div className="invalid-feedback">{fieldErrors.identifier}</div>}
        </div>

        {siteKey && (
          <div className="mb-4">
            <label className="form-label">CAPTCHA</label>
            <ReCAPTCHA
              sitekey={siteKey}
              onChange={(token) => {
                setCaptchaToken(token || '')
                setFieldErrors((prev) => {
                  if (!prev.captchaToken) return prev
                  const next = { ...prev }
                  delete next.captchaToken
                  return next
                })
              }}
              onExpired={() => setCaptchaToken('')}
            />
            {fieldErrors.captchaToken && <div className="text-danger small mt-2">{fieldErrors.captchaToken}</div>}
          </div>
        )}

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
            {isLoading ? 'Dang gui...' : 'Gui lien ket dat lai'}
          </button>
          <Link to="/login" className="btn btn-outline-secondary">
            Quay ve dang nhap
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
}

export default ForgotPassword
