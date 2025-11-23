import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import AdminStatusAlert from '../../../components/admin/AdminStatusAlert'
import Spinner from '../../../components/common/Spinner'
import staffApi from '../../../services/staffApi'
import { formatNumber } from '../../../utils/format'

const StaffPerformance = () => {
  const outlet = useOutletContext()
  const session = outlet?.session
  const staffId = session?.user?.user_id

  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState('info')
  const [performance, setPerformance] = useState({
    completedOrders: 0,
    totalOrders: 0,
    completionRate: 0,
    rating: 'N/A'
  })

  const loadPerformance = async () => {
    setLoading(true)
    setStatusMessage('')
    setStatusType('info')
    try {
      const data = await staffApi.getPerformance(staffId)
      setPerformance(data || {})
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
      setPerformance({ completedOrders: 0, totalOrders: 0, completionRate: 0, rating: 'N/A' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPerformance()
  }, [])

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white border-bottom-0 d-flex justify-content-between align-items-center">
        <div>
          <h5 className="mb-1">Hieu suat ca nhan</h5>
          <p className="text-muted mb-0">So lieu tong ket duoc cap nhat theo thoi gian thuc.</p>
        </div>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={loadPerformance}>
          Lam moi
        </button>
      </div>
      <div className="card-body">
        <AdminStatusAlert message={statusMessage} type={statusType} />
        {loading ? (
          <div className="text-center py-4">
            <Spinner label="Dang tai so lieu hieu suat..." />
          </div>
        ) : (
          <div className="row g-4">
            <div className="col-md-3">
              <div className="border rounded-3 p-3 h-100">
                <small className="text-muted text-uppercase">Don hoan thanh</small>
                <div className="h4 fw-semibold mb-0">{formatNumber(performance.completedOrders)}</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="border rounded-3 p-3 h-100">
                <small className="text-muted text-uppercase">Tong don</small>
                <div className="h4 fw-semibold mb-0">{formatNumber(performance.totalOrders)}</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="border rounded-3 p-3 h-100">
                <small className="text-muted text-uppercase">Ti le hoan thanh</small>
                <div className="h4 fw-semibold mb-0 text-success">{performance.completionRate}%</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="border rounded-3 p-3 h-100">
                <small className="text-muted text-uppercase">Danh gia trung binh</small>
                <div className="h4 fw-semibold mb-0">{performance.rating || 'N/A'}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StaffPerformance

