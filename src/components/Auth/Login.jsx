import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from './AuthLayout'
import { login, resendVerificationEmail } from '../../services/authService'
import { persistSession } from '../../lib/session'
import ReCAPTCHA from 'react-google-recaptcha'

const Login = () => {
  const [form, setForm] = useState({
    username: '',
    password: '',
    remember: false,
  })

  const captchaDisabled =
    String(import.meta.env.VITE_DISABLE_CAPTCHA || import.meta.env.VITE_DISABLE_LOGIN_CAPTCHA || '').toLowerCase() ===
    'true'

  const [captchaToken, setCaptchaToken] = useState('')
  const [showCaptcha, setShowCaptcha] = useState(!captchaDisabled)
  const [feedback, setFeedback] = useState({
    status: 'idle',
    message: '',
  })
  const [verificationNotice, setVerificationNotice] = useState('')
  const [resendStatus, setResendStatus] = useState({ status: 'idle', message: '' })

  const [fieldErrors, setFieldErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const siteKey = useMemo(() => (import.meta.env.VITE_RECAPTCHA_SITE_KEY || '').trim(), [])

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
    setVerificationNotice('')
    setResendStatus({ status: 'idle', message: '' })

    const usernameValue = form.username.trim()
    const passwordValue = form.password.trim()
    const clientErrors = {}

    if (!usernameValue) {
      clientErrors.username = 'Vui lòng nhập tên đăng nhập'
      clientErrors.identifier = 'Vui lòng nhập tên đăng nhập'
    }

    if (!passwordValue) {
      clientErrors.password = 'Vui lòng nhập mật khẩu'
    } else if (passwordValue.length < 8) {
      clientErrors.password = 'Mật khẩu phải có ít nhất 8 ký tự'
    }

    if (!captchaDisabled && showCaptcha && !captchaToken) {
      clientErrors.captchaToken = 'Vui lòng hoàn thành CAPTCHA trước khi đăng nhập'
    }

    if (Object.keys(clientErrors).length) {
      setFieldErrors(clientErrors)
      setFeedback({
        status: 'error',
        message: 'Vui lòng kiểm tra và sửa các trường được đánh dấu để tiếp tục.',
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await login({
        username: usernameValue,
        password: passwordValue,
        remember: form.remember,
        captchaToken: !captchaDisabled && showCaptcha ? captchaToken : undefined,
      })
      const crewLead = response?.user?.name ?? 'Team member'
      persistSession(response, form.remember)
      setFeedback({
        status: 'success',
        message: `${crewLead}, trạm QuickBite của bạn đã sẵn sàng. Đơn và bộ đếm thời gian chuẩn bị đã đồng bộ.`,
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
      if (error.requireCaptcha && !captchaDisabled) {
        setShowCaptcha(true)
        setCaptchaToken('')
      }

      if (error.emailNotVerified) {
        setVerificationNotice('Tài khoản chưa được xác thực email. Kiểm tra hộp thư hoặc gửi lại liên kết xác thực.')
      } else {
        setVerificationNotice('')
      }

      setFeedback({
        status: 'error',
        message:
          error.retryAfterSeconds && error.retryAfterSeconds > 0
            ? `${error.message} (Thu lai sau ${Math.ceil(error.retryAfterSeconds)} giay)`
            : error.message || 'Không thể đăng nhập lúc này. Vui lòng kiểm tra lại tên đăng nhập và mật khẩu.',
      })
      setFieldErrors(error.fieldErrors || {})
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendVerification = async () => {
    const identifier = form.username.trim()
    if (!identifier) {
      setResendStatus({
        status: 'error',
        message: 'Nhập email hoặc tên đăng nhập để gửi lại liên kết xác thực.',
      })
      return
    }

    setResendStatus({ status: 'loading', message: 'Đang gửi lại email xác thực...' })
    try {
      await resendVerificationEmail({ identifier })
      setResendStatus({
        status: 'success',
        message: 'Nếu thông tin hợp lệ, chúng tôi đã gửi lại email xác thực.',
      })
    } catch (error) {
      const retryText =
        typeof error.retryAfterSeconds === 'number' && error.retryAfterSeconds > 0
          ? ` Thử lại sau ${Math.ceil(error.retryAfterSeconds)} giây.`
          : ''
      setResendStatus({
        status: 'error',
        message: `${error.message || 'Không thể gửi lại email xác thực.'}${retryText}`,
      })
    }
  }

  return (
    <AuthLayout
      brand={{
        name: 'QuickBite Hub',
        abbreviation: 'QB',
        tagline: 'Fast food, vận hành nhanh hơn.',
      }}
      side={{
        badge: 'Trung tâm điều hành bếp',
        title: 'Giữ mọi đơn nóng giòn và đúng giờ',
        description:
          'Theo dõi chiên/rán, giao hàng và khách tại chỗ từ một bảng điều khiển dành riêng cho chuỗi fast food.',
        highlights: [
          'Hàng đợi đơn thời gian thực với ước tính chuẩn bị',
          'Cảnh báo nhập kho thông minh cho bánh, sốt và đồ ăn kèm',
          'Đồng bộ đối tác giao hàng với ETA từng phút',
        ],
        footnote: 'Thời gian phục vụ giảm trung bình 22% khi đội ngũ đăng nhập trước giờ cao điểm.',
      }}
    >
      <div className="mb-5 text-center text-lg-start">
        <span className="badge rounded-pill bg-light text-primary fw-semibold text-uppercase mb-3">
          Sẵn sàng ca làm
        </span>
        <h1 className="h2 fw-semibold mb-2">Đăng nhập để khởi động dây chuyền</h1>
        <p className="text-secondary mb-0">
          Xem hiệu suất qua đêm, xác nhận ca trực và chuẩn bị menu số trước khi khách đầu tiên tới.
        </p>
      </div>

      <form className="w-100" onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
          <label className="form-label" htmlFor="loginUsername">
            Tên đăng nhập
          </label>
          <input
            id="loginUsername"
            name="username"
            type="text"
            className={`form-control${fieldErrors.username || fieldErrors.identifier ? ' is-invalid' : ''}`}
            placeholder="nhap.ten.dang.nhap"
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
              Mật khẩu
            </label>
            <Link to="/forgot-password" className="btn btn-link p-0 auth-link fw-semibold">
              Quên mật khẩu
            </Link>
          </div>
          <input
            id="loginPassword"
            name="password"
            type="password"
            className={`form-control${fieldErrors.password ? ' is-invalid' : ''}`}
            placeholder="Nhập mật khẩu"
            value={form.password}
            onChange={handleChange}
            required
            minLength={8}
          />
          {fieldErrors.password && <div className="invalid-feedback">{fieldErrors.password}</div>}
          <div className="form-text small text-secondary">
            Mật khẩu cần tối thiểu 8 ký tự, nên có chữ hoa, số và ký tự đặc biệt.
          </div>
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
              Ghi nhớ đăng nhập để đặt lại nhanh
            </label>
          </div>
          <span className="small text-secondary">Đồng bộ trạng thái mỗi 30 giây</span>
        </div>

        {!captchaDisabled && showCaptcha && (
          <div className="mb-4">
            <label className="form-label" htmlFor="captchaToken">
              CAPTCHA
            </label>
            {siteKey ? (
              <div className="d-flex flex-column gap-2">
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
                {fieldErrors.captchaToken && <div className="text-danger small">{fieldErrors.captchaToken}</div>}
              </div>
            ) : (
              <>
                <input
                  id="captchaToken"
                  name="captchaToken"
                  type="text"
                  className={`form-control${fieldErrors.captchaToken ? ' is-invalid' : ''}`}
                  placeholder="Nhập mã CAPTCHA"
                  value={captchaToken}
                  onChange={(event) => setCaptchaToken(event.target.value)}
                  required
                />
                <div className="form-text small text-secondary">
                  Máy chủ yêu cầu CAPTCHA. Nhập mã từ công cụ CAPTCHA của bạn (cấu hình site key để hiển thị widget).
                </div>
                {fieldErrors.captchaToken && <div className="invalid-feedback d-block">{fieldErrors.captchaToken}</div>}
              </>
            )}
          </div>
        )}

        {feedback.status !== 'idle' && (
          <div
            className={`alert mt-0 mb-4 py-3 px-4 ${feedback.status === 'error' ? 'alert-danger border-0' : 'alert-success border-0'
              }`}
            role="alert"
          >
            {feedback.message}
          </div>
        )}

        {verificationNotice && (
          <div className="alert alert-warning border-0 py-3 px-4">
            <div className="d-flex flex-column gap-2">
              <span>{verificationNotice}</span>
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <button
                  type="button"
                  className="btn btn-outline-warning btn-sm"
                  onClick={handleResendVerification}
                  disabled={resendStatus.status === 'loading'}
                >
            {resendStatus.status === 'loading' ? 'Đang gửi...' : 'Gửi lại email xác thực'}
                </button>
                <Link className="btn btn-link btn-sm p-0 align-baseline" to="/verify-email">
                  Nhập mã xác thực thủ công
                </Link>
              </div>
              {resendStatus.message && (
                <small className={resendStatus.status === 'error' ? 'text-danger' : 'text-success'}>
                  {resendStatus.message}
                </small>
              )}
            </div>
          </div>
        )}

        <div className="d-grid gap-3">
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
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
            Đăng nhập với Google
          </button>
        </div>
      </form>

      <p className="text-secondary text-center mt-5 mb-0">
        Cần tài khoản cho cửa hàng mới?{' '}
        <Link className="auth-link fw-semibold" to="/signup">
          Đăng ký ngay
        </Link>
      </p>
    </AuthLayout>
  )
}

export default Login
