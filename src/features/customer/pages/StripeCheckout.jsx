import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import customerApi from '../../../services/customerApi'

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
const stripePromise = publishableKey ? loadStripe(publishableKey) : null

const StripeCheckoutForm = ({ amount, currency, navigateTo }) => {
  const stripe = useStripe()
  const elements = useElements()
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!stripe || !elements) return
    setMessage('')
    setSubmitting(true)

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {},
      redirect: 'if_required'
    })

    if (error) {
      setMessage(error.message || 'Khong the thuc hien thanh toan.')
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      setMessage('Thanh toan thanh cong. Dang chuyen ve trang don hang...')
      setTimeout(() => {
        navigateTo('/customer', { replace: true })
      }, 1500)
    } else {
      setMessage('Dang cho he thong xac nhan thanh toan...')
    }
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <PaymentElement />
        </div>
      </div>
      <button className="btn btn-primary btn-lg" type="submit" disabled={!stripe || submitting}>
        {submitting ? 'Dang xu ly...' : `Thanh toan ${Number(amount || 0).toLocaleString('vi-VN')} ${currency || 'VND'}`}
      </button>
      {message && <div className="alert alert-info mt-2 mb-0">{message}</div>}
    </form>
  )
}

const StripeCheckout = () => {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [clientSecret, setClientSecret] = useState('')
  const [meta, setMeta] = useState({ amount: 0, currency: 'VND' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'stripe-devtools-fix'
    style.textContent = `
      [class*="StripeDevTools"],
      [class*="stripe-dev-tools"],
      [data-stripe-devtools],
      #stripe-dev-tools,
      #StripeDevTools {
        display: none !important;
      }
    `
    document.head.appendChild(style)
    return () => {
      style.remove()
    }
  }, [])

  useEffect(() => {
    const fetchIntent = async () => {
      if (!orderId) {
        setError('Thieu ma don hang')
        setLoading(false)
        return
      }
      try {
        const data = await customerApi.createStripePaymentIntent({ orderId: Number(orderId) })
        setClientSecret(data.clientSecret)
        setMeta({ amount: data.amount, currency: data.currency || 'VND' })
      } catch (err) {
        setError(err?.message || 'Khong tao duoc giao dich Stripe.')
      } finally {
        setLoading(false)
      }
    }
    fetchIntent()
  }, [orderId])

  const options = useMemo(() => {
    if (!clientSecret) return null
    return {
      clientSecret,
      appearance: { theme: 'stripe' }
    }
  }, [clientSecret])

  if (!publishableKey) {
    return (
      <div className="container py-5">
        <div className="alert alert-warning">
          Chua cau hinh `VITE_STRIPE_PUBLISHABLE_KEY`. Vui long cap nhat file .env cho frontend.
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container py-5">
        <div className="text-center">Dang tao giao dich Stripe...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">{error}</div>
      </div>
    )
  }

  if (!clientSecret || !options || !stripePromise) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">Khong the khoi tao Stripe. Vui long thu lai.</div>
      </div>
    )
  }

  return (
    <div className="container py-5" style={{ maxWidth: 600 }}>
      <h1 className="h4 mb-3">Thanh toan bang the (Stripe)</h1>
      <p className="text-muted">
        Don hang #{orderId} - So tien {Number(meta.amount || 0).toLocaleString('vi-VN')} {meta.currency}
      </p>
      <Elements stripe={stripePromise} options={options} key={clientSecret}>
        <StripeCheckoutForm amount={meta.amount} currency={meta.currency} navigateTo={navigate} />
      </Elements>
    </div>
  )
}

export default StripeCheckout
