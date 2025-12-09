import { useRef, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from './AuthLayout'
import { signup } from '../../services/authService'
import ReCAPTCHA from 'react-google-recaptcha'

const Signup = () => {
  const [form, setForm] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    phoneNumber: '',
    gender: '',
    role: 'customer',
    agree: false,
  })

  const [feedback, setFeedback] = useState({
    status: 'idle',
    message: '',
  })

  const [fieldErrors, setFieldErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const submittingRef = useRef(false)
  const navigate = useNavigate()
  const captchaDisabled =
    String(import.meta.env.VITE_DISABLE_CAPTCHA || import.meta.env.VITE_DISABLE_LOGIN_CAPTCHA || '').toLowerCase() ===
    'true'
  const [captchaToken, setCaptchaToken] = useState('')
  const siteKey = useMemo(() => (import.meta.env.VITE_RECAPTCHA_SITE_KEY || '').trim(), [])

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

    console.log('[Signup] handleSubmit called', { isLoading, submitting: submittingRef.current })

    if (isLoading || submittingRef.current) {
      console.log('[Signup] Blocked: already submitting')
      return
    }

    if (!form.agree) {
      console.log('[Signup] Blocked: terms not agreed')
      setFeedback({
        status: 'error',
        message: 'Vui lòng đồng ý điều khoản dịch vụ và hướng dẫn vận hành để tiếp tục.',
      })
      return
    }

    console.log('[Signup] Starting validation and submission')
    setFeedback({ status: 'idle', message: '' })
    setFieldErrors({})

    const usernameValue = form.username.trim()
    const passwordValue = form.password.trim()
    const fullNameValue = form.fullName.trim()
    const emailValue = form.email.trim().toLowerCase()
    const phoneNumberValue = form.phoneNumber.trim()

    // ... (giữ nguyên phần validation) ...
    const clientErrors = {}

    if (!usernameValue) {
      clientErrors.username = 'Vui lòng nhập tên đăng nhập'
    } else if (usernameValue.length < 3) {
      clientErrors.username = 'Tên đăng nhập phải có ít nhất 3 ký tự'
    } else if (usernameValue.length > 100) {
      clientErrors.username = 'Tên đăng nhập không được vượt quá 100 ký tự'
    }

    if (!passwordValue) {
      clientErrors.password = 'Vui lòng nhập mật khẩu'
    } else if (passwordValue.length < 8) {
      clientErrors.password = 'Mật khẩu phải có ít nhất 8 ký tự'
    } else if (passwordValue.length > 255) {
      clientErrors.password = 'Mật khẩu không được vượt quá 255 ký tự'
    } else if (!/[A-Z]/.test(passwordValue) || !/[0-9]/.test(passwordValue) || !/[^\w\s]/.test(passwordValue)) {
      clientErrors.password = 'Cần ít nhất 1 chữ hoa, 1 số và 1 ký tự đặc biệt'
    }

    if (!fullNameValue) {
      clientErrors.fullName = 'Vui lòng nhập họ tên đầy đủ'
    } else if (fullNameValue.length < 2) {
      clientErrors.fullName = 'Họ tên phải có ít nhất 2 ký tự'
    } else if (fullNameValue.length > 120) {
      clientErrors.fullName = 'Họ tên không được vượt quá 120 ký tự'
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailValue) {
      clientErrors.email = 'Email không hợp lệ'
    } else if (emailValue.length > 150) {
      clientErrors.email = 'Email không được vượt quá 150 ký tự'
    } else if (!emailRegex.test(emailValue)) {
      clientErrors.email = 'Email không hợp lệ'
    }

    const phonePattern = /^[0-9+\-()\s]+$/
    const phoneDigits = phoneNumberValue.replace(/\D/g, '')
    if (!phoneNumberValue) {
      clientErrors.phoneNumber = 'Vui lòng nhập số điện thoại'
    } else if (phoneDigits.length < 8 || phoneDigits.length > 20) {
      clientErrors.phoneNumber = 'Số điện thoại phải có từ 8 đến 20 chữ số'
    } else if (!phonePattern.test(phoneNumberValue)) {
      clientErrors.phoneNumber = 'Số điện thoại không hợp lệ'
    } else if (phoneNumberValue.length > 20) {
      clientErrors.phoneNumber = 'Số điện thoại không được vượt quá 20 ký tự'
    }

    if (!form.gender) {
      clientErrors.gender = 'Vui lòng chọn giới tính'
    }

    if (!form.role) {
      clientErrors.role = 'Vui lòng chọn vai trò'
    }

    if (!captchaDisabled && !captchaToken) {
      clientErrors.captchaToken = 'Vui lòng hoàn thành CAPTCHA'
    }

    if (Object.keys(clientErrors).length) {
      console.log('[Signup] Validation failed', clientErrors)
      setFieldErrors(clientErrors)
      setFeedback({
        status: 'error',
        message: 'Vui lòng kiểm tra và sửa các trường được đánh dấu để tiếp tục.',
      })
      return
    }

    console.log('[Signup] Validation passed, sending request...')
    setIsLoading(true)
    submittingRef.current = true

    try {
      console.log('[Signup] Calling signup API...')
      const response = await signup({
        username: usernameValue,
        password: passwordValue,
        fullName: fullNameValue,
        email: emailValue,
        phoneNumber: phoneNumberValue,
        gender: form.gender,
        role: form.role,
        captchaToken: captchaDisabled ? undefined : captchaToken,
      })

      console.log('[Signup] API response received:', response)

      if (!response || !response.user) {
        throw new Error('Invalid response from server')
      }

      const contactName = response.user.name || fullNameValue
      const emailText = response.user.email || emailValue
      const verificationUrl = response.emailVerification?.verifyUrl
      const verificationToken = response.emailVerification?.token

      console.log('[Signup] Extracted data:', {
        contactName,
        emailText,
        verificationUrl,
        verificationToken
      })

      // Navigate to verify email page
      const query = new URLSearchParams()
      if (emailText) query.set('email', emailText)
      if (verificationToken) query.set('token', verificationToken)

      const navigationPath = `/verify-email${query.toString() ? `?${query.toString()}` : ''}`
      console.log('[Signup] Navigating to:', navigationPath)

      navigate(navigationPath, {
        replace: true,
        state: {
          email: emailText,
          message: `Đăng ký thành công, ${contactName}. Vui lòng kiểm tra ${emailText} để xác thực tài khoản.${verificationUrl ? ` (Liên kết thử nghiệm: ${verificationUrl})` : ''}`
        }
      })

      console.log('[Signup] Navigation completed')

    } catch (error) {
      console.error('[Signup] Error occurred:', error)
      console.error('[Signup] Error details:', {
        message: error.message,
        status: error.status,
        code: error.code,
        fieldErrors: error.fieldErrors,
        requiresVerification: error.requiresVerification
      })

      // Reset loading state
      setIsLoading(false)
      submittingRef.current = false

      // XỬ LÝ LỖI EMAIL_NOT_VERIFIED (409 - user exists but not verified)
      if (error.code === 'EMAIL_NOT_VERIFIED' || error.requiresVerification) {
        console.log('[Signup] User exists but not verified, redirecting to verify page')

        // Navigate to verify email page
        const query = new URLSearchParams()
        query.set('email', error.email || emailValue)
        if (error.emailVerification?.token) {
          query.set('token', error.emailVerification.token)
        }

        navigate(`/verify-email?${query.toString()}`, {
          replace: true,
          state: {
            email: error.email || emailValue,
            message: 'Tài khoản đã tồn tại nhưng chưa được xác thực. Vui lòng kiểm tra email để xác thực tài khoản.'
          }
        })
        return
      }

      // Xử lý lỗi thông thường
      setFeedback({
        status: 'error',
        message: error.message || 'Không thể tạo tài khoản lúc này. Vui lòng thử lại hoặc liên hệ hỗ trợ.',
      })

      setFieldErrors(error.fieldErrors || {})
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
        badge: 'Bộ công cụ mở cửa hàng',
        title: 'Mở quầy mới mà không bỏ lỡ nhịp nào',
        description:
          'Điều phối nhân sự bếp, menu giao hàng và gói khuyến mãi từ một “playbook” dành riêng cho fast food.',
        highlights: [
          'Đồng bộ menu tới kiosk, app và đối tác giao hàng theo thời gian thực',
          'Dự báo chuẩn bị tự điều chỉnh từ dữ liệu giờ cao điểm',
          'Lịch ca, đào tạo và checklist an toàn thực phẩm trong một màn hình',
        ],
        footnote: 'Hơn 4.000 cửa hàng giữ thời gian ra món dưới 4 phút cùng QuickBite.',
      }}
    >
      <div className="mb-5 text-center text-lg-start">
        <span className="badge rounded-pill bg-light text-primary fw-semibold text-uppercase mb-3">
          Địa điểm mới
        </span>
        <h1 className="h2 fw-semibold mb-2">Tạo tài khoản vận hành</h1>
        <p className="text-secondary mb-0">
          Đăng ký để dùng checklist khai trương, dự báo nguyên liệu và bảng điều khiển giao hàng theo khu vực.
        </p>
      </div>

      <form className="w-100" onSubmit={handleSubmit} noValidate>
        <div className="row g-4">
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="username">
            Tên đăng nhập
          </label>
            <input
              id="username"
              name="username"
              type="text"
              className={`form-control${fieldErrors.username ? ' is-invalid' : ''}`}
              placeholder="nhap.ten.dang.nhap"
              value={form.username}
              onChange={handleChange}
              required
            />
            {fieldErrors.username && <div className="invalid-feedback">{fieldErrors.username}</div>}
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="password">
              Mật khẩu
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className={`form-control${fieldErrors.password ? ' is-invalid' : ''}`}
              placeholder="Nhập mật khẩu mạnh"
              minLength={8}
              value={form.password}
              onChange={handleChange}
              required
            />
            {fieldErrors.password && <div className="invalid-feedback">{fieldErrors.password}</div>}
            <div className="form-text small text-secondary">
              Tối thiểu 8 ký tự, gồm chữ hoa, số và ký tự đặc biệt.
            </div>
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="fullName">
              Họ và tên
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              className={`form-control${fieldErrors.fullName ? ' is-invalid' : ''}`}
              placeholder="Nguyễn Thị Ánh"
              value={form.fullName}
              onChange={handleChange}
              required
            />
            {fieldErrors.fullName && <div className="invalid-feedback">{fieldErrors.fullName}</div>}
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className={`form-control${fieldErrors.email ? ' is-invalid' : ''}`}
              placeholder="ban@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
            {fieldErrors.email && <div className="invalid-feedback">{fieldErrors.email}</div>}
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="phoneNumber">
              Số điện thoại
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
              Giới tính
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
                Chọn giới tính
              </option>
              <option value="female">Nữ</option>
              <option value="male">Nam</option>
              <option value="non-binary">Khác</option>
              <option value="prefer-not">Không muốn tiết lộ</option>
            </select>
            {fieldErrors.gender && <div className="invalid-feedback d-block">{fieldErrors.gender}</div>}
          </div>

          <div className="col-12">
            <label className="form-label" htmlFor="role">
              Vai trò
            </label>
            <select
              id="role"
              name="role"
              className={`form-select${fieldErrors.role ? ' is-invalid' : ''}`}
              value={form.role}
              onChange={handleChange}
              required
            >
              <option value="customer">Khách hàng</option>
              <option value="guest">Khách</option>
            </select>
            {fieldErrors.role && <div className="invalid-feedback d-block">{fieldErrors.role}</div>}
          </div>
        </div>

        {!captchaDisabled && (
          <div className="mt-4">
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
            Tôi đồng ý với{' '}
            <button type="button" className="btn btn-link p-0 align-baseline auth-link fw-semibold">
              điều khoản dịch vụ QuickBite
            </button>{' '}
            và hướng dẫn vận hành bếp.
          </label>
        </div>

        {feedback.status !== 'idle' && (
          <div
            className={`alert mt-4 mb-0 py-3 px-4 ${feedback.status === 'error' ? 'alert-danger border-0' : 'alert-success border-0'
              }`}
            role="alert"
          >
            {feedback.message}
          </div>
        )}

        <div className="d-grid gap-3 mt-4">
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
          </button>
          <button type="button" className="btn btn-outline-secondary">
            Nhập danh sách từ Google Workspace
          </button>
        </div>
      </form>

      <p className="text-secondary text-center mt-5 mb-0">
        Đã có tài khoản QuickBite?{' '}
        <Link className="auth-link fw-semibold" to="/login">
          Đăng nhập
        </Link>
      </p>
    </AuthLayout>
  )
}

export default Signup
