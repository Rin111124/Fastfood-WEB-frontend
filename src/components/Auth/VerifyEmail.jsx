import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import AuthLayout from './AuthLayout'
import { resendVerificationEmail, verifyEmail } from '../../services/authService'

const VerifyEmail = () => {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const tokenFromQuery = useMemo(() => (searchParams.get('token') || '').trim(), [searchParams])
  const emailFromQuery = useMemo(() => (searchParams.get('email') || '').trim(), [searchParams])
  const navigate = useNavigate()

  const [token, setToken] = useState(tokenFromQuery)
  const [identifier, setIdentifier] = useState(emailFromQuery)
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [message, setMessage] = useState(location.state?.message || '')
  const [resendStatus, setResendStatus] = useState({ status: 'idle', message: '' })

  const runVerification = async (tokenValue) => {
    const value = (tokenValue || token || '').trim()
    if (!value) {
      setStatus('error')
      setMessage('Nhap ma xac thuc duoc gui trong email.')
      return
    }

    setStatus('loading')
    setMessage('')
    try {
      await verifyEmail({ token: value })
      setStatus('success')
      setMessage('Email da duoc xac thuc thanh cong. Ban co the dang nhap ngay bay gio.')
      setResendStatus({ status: 'idle', message: '' })
    } catch (error) {
      setStatus('error')
      setMessage(error.message || 'Khong the xac thuc email. Vui long thu lai.')
    }
  }

  useEffect(() => {
    if (tokenFromQuery) {
      runVerification(tokenFromQuery)
    }
  }, [tokenFromQuery])

  const handleSubmit = async (event) => {
    event.preventDefault()
    await runVerification(token)
  }

  const handleResend = async (event) => {
    event?.preventDefault()
    const rawIdentifier = identifier.trim()
    if (!rawIdentifier) {
      setResendStatus({
        status: 'error',
        message: 'Nhap email hoac ten dang nhap de gui lai lien ket.',
      })
      return
    }

    setResendStatus({ status: 'loading', message: 'Dang gui lai email xac thuc...' })
    try {
      await resendVerificationEmail({ identifier: rawIdentifier })
      setResendStatus({
        status: 'success',
        message: 'Neu thong tin hop le, chung toi da gui lai email xac thuc.',
      })
    } catch (error) {
      const retryText =
        typeof error.retryAfterSeconds === 'number' && error.retryAfterSeconds > 0
          ? ` Thu lai sau ${Math.ceil(error.retryAfterSeconds)} giay.`
          : ''
      setResendStatus({
        status: 'error',
        message: `${error.message || 'Khong the gui lai email xac thuc.'}${retryText}`,
      })
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
        badge: 'Email verification',
        title: 'Kich hoat tai khoan cua ban',
        description:
          'Xac thuc email giup chung toi bao ve tai khoan va giu lien lac ve don hang, khuyen mai.',
        highlights: [
          'Lien ket chi co hieu luc trong thoi gian gioi han',
          'Co the yeu cau gui lai neu lien ket het han',
          'Dang nhap ngay sau khi xac thuc thanh cong',
        ],
        footnote: 'Can ho tro? Lien he doi ho tro QuickBite bat ky luc nao.',
      }}
    >
      <div className="mb-4">
        <h1 className="h2 fw-semibold mb-2">Xac thuc email</h1>
        <p className="text-secondary mb-0">
          Dán mã trong email hoặc mở liên kết xác thực để kích hoạt tài khoản của bạn.
        </p>
      </div>

      {message && status === 'idle' && (
        <div className="alert alert-info border-0" role="alert">
          {message}
        </div>
      )}

      {status !== 'idle' && (
        <div
          className={`alert border-0 ${status === 'success' ? 'alert-success' : status === 'loading' ? 'alert-info' : 'alert-danger'
            }`}
          role="alert"
        >
          {status === 'loading' ? 'Dang xac thuc, vui long cho...' : message}
        </div>
      )}

      <form className="w-100" onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label" htmlFor="token">
            Ma xac thuc
          </label>
          <input
            id="token"
            name="token"
            type="text"
            className="form-control"
            placeholder="Nhap ma tu email"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            required
          />
          <div className="form-text small text-secondary">
            Link trong email se tu dong di den trang nay va dien san ma token.
          </div>
        </div>

        <div className="d-grid gap-3">
          <button type="submit" className="btn btn-primary" disabled={status === 'loading'}>
            {status === 'loading' ? 'Dang xac thuc...' : 'Xac thuc email'}
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => navigate('/login')}
          >
            Quay lai dang nhap
          </button>
        </div>
      </form>

      <div className="mt-5 p-4 rounded-3 bg-light border">
        <h2 className="h5 fw-semibold mb-2">Khong tim thay email?</h2>
        <p className="text-secondary mb-3">
          Nhap email hoac ten dang nhap de chung toi gui lai lien ket xac thuc.
        </p>
        <form className="row g-3" onSubmit={handleResend}>
          <div className="col-12 col-md-8">
            <label className="form-label" htmlFor="identifier">
              Email hoac ten dang nhap
            </label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              className="form-control"
              placeholder="you@example.com"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              required
            />
          </div>
          <div className="col-12 col-md-4 d-flex align-items-end">
            <button
              type="submit"
              className="btn btn-outline-primary w-100"
              disabled={resendStatus.status === 'loading'}
            >
              {resendStatus.status === 'loading' ? 'Dang gui...' : 'Gui lai email'}
            </button>
          </div>
          {resendStatus.message && (
            <div className="col-12">
              <div
                className={`small ${resendStatus.status === 'error' ? 'text-danger' : 'text-success'
                  }`}
              >
                {resendStatus.message}
              </div>
            </div>
          )}
        </form>
      </div>

      <p className="text-secondary text-center mt-4 mb-0">
        Da xac thuc?{' '}
        <Link className="auth-link fw-semibold" to="/login">
          Dang nhap ngay
        </Link>
      </p>
    </AuthLayout>
  )
}

export default VerifyEmail
