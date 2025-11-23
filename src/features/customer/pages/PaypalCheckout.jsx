import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Spinner from '../../../components/common/Spinner'
import customerApi from '../../../services/customerApi'

const PaypalCheckout = () => {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('starting')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!orderId) {
      setError('Thieu ma don hang.')
      setStatus('error')
      return
    }

    const launchPayment = async () => {
      setStatus('creating')
      try {
        const response = await customerApi.createPaypalPayment({ orderId: Number(orderId) })
        const approvalUrl =
          response?.approvalUrl || response?.data?.approvalUrl || response?.payUrl
        if (!approvalUrl) {
          throw new Error('Khong lay duoc duong dan PayPal.')
        }
        const opened = window.open(approvalUrl, '_blank', 'noopener,noreferrer')
        if (!opened) {
          window.location.href = approvalUrl
        }
        setStatus('ready')
      } catch (err) {
        setError(err?.message || 'Khong tao duoc giao dich PayPal.')
        setStatus('error')
      }
    }

    launchPayment()
  }, [orderId])

  if (status === 'starting' || status === 'creating') {
    return (
      <div className="container py-5">
        <div className="text-center">
          <Spinner label="Dang tao giao dich PayPal..." />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">{error}</div>
        <button className="btn btn-primary" onClick={() => navigate('/cart')}>
          Quay lai gio hang
        </button>
      </div>
    )
  }

  return (
    <div className="container py-5">
      <div className="alert alert-success">
        Duong dan PayPal da duoc mo trong tab moi. Neu khong thay, <button className="btn btn-link p-0" onClick={() => window.location.reload()}>tai lai</button>.
      </div>
      <div className="d-flex gap-2">
        <button className="btn btn-secondary" onClick={() => navigate('/customer')}>
          Ve trang khach hang
        </button>
        <button className="btn btn-outline-secondary" onClick={() => navigate('/orders')}>
          Xem don hang
        </button>
      </div>
    </div>
  )
}

export default PaypalCheckout
