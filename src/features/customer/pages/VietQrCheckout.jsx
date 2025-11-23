import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import customerApi from '../../../services/customerApi'

const VietQrCheckout = () => {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    const run = async () => {
      if (!orderId) {
        setError('Thieu ma don hang')
        setLoading(false)
        return
      }
      try {
        const payload = await customerApi.createVietqrPayment({ orderId: Number(orderId) })
        setData(payload)
      } catch (e) {
        setError(e?.message || 'Khong tao duoc QR thanh toan')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [orderId])

  const handleConfirm = async () => {
    if (!orderId) return
    setConfirming(true)
    try {
      await customerApi.confirmVietqrPayment(Number(orderId))
      alert('Da ghi nhan ban da chuyen khoan. Nhan vien se xac nhan trong giay lat!')
      navigate('/customer', { replace: true })
    } catch (e) {
      alert(e?.message || 'Khong gui duoc xac nhan, vui long thu lai')
    } finally {
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <div className="container py-5">
        <div className="text-center">Dang tao ma VietQR...</div>
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

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h4 mb-3">Thanh toan VietQR</h1>
      <div className="card border-0 shadow-sm">
        <div className="card-body text-center">
          <p className="text-muted">Quet ma QR bang ung dung Ngan hang de chuyen khoan chinh xac</p>
          <img src={data?.qrImageUrl} alt="VietQR" style={{ maxWidth: '100%', height: 'auto' }} />
          <div className="mt-3">
            <div>So tien: <strong>{Number(data?.amount || 0).toLocaleString('vi-VN')} VND</strong></div>
            <div>Noi dung: <code>{data?.addInfo}</code></div>
          </div>
          <div className="d-grid gap-2 mt-4">
            <button className="btn btn-primary" onClick={handleConfirm} disabled={confirming}>
              {confirming ? 'Dang gui xac nhan...' : 'Toi da chuyen khoan' }
            </button>
            <button className="btn btn-outline-secondary" onClick={() => navigate('/cart')}>Quay ve gio hang</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VietQrCheckout
