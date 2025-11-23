import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Spinner from '../../../components/common/Spinner'
import customerApi from '../../../services/customerApi'

const VnpayCheckout = () => {
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
        const payload = await customerApi.createVnpayPaymentUrl({ orderId: Number(orderId) })
        const payUrl = payload?.payUrl
        if (!payUrl) {
          throw new Error('Khong lay duoc duong dan thanh toan VNPAY.')
        }
        const opened = window.open(payUrl, '_blank', 'noopener,noreferrer')
        if (!opened) {
          window.location.href = payUrl
        }
        setStatus('ready')
      } catch (err) {
        setError(err?.message || 'Khong tao duoc giao dich VNPAY.')
        setStatus('error')
      }
    }

    launchPayment()
  }, [orderId])

  if (status === 'starting' || status === 'creating') {
    return (
      <div className="container py-5">
        <div className="text-center">
          <Spinner label="Dang tao duong dan VNPAY..." />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">{error}</div>
        <div className="d-flex gap-2">
          <button className="btn btn-primary" onClick={() => navigate('/cart')}>
            Quay lai gio hang
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-5">
      <div className="alert alert-success">
        Duong dan VNPAY da duoc mo trong tab moi. Neu khong thay, <button className="btn btn-link p-0" onClick={() => window.location.reload()}>tai lai</button>.
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

export default VnpayCheckout
