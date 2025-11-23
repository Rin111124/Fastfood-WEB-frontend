import { useEffect, useRef, useState } from 'react'
import AdminStatusAlert from '../../../components/admin/AdminStatusAlert'
import Spinner from '../../../components/common/Spinner'
import adminApi from '../../../services/adminApi'
import { formatCurrency, formatDateTime } from '../../../utils/format'

const PROVIDERS = ['all', 'vnpay', 'momo', 'paypal', 'cod']
const STATUSES = ['all', 'initiated', 'success', 'failed', 'refunded']

const AdminPayments = () => {
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState('info')

  const [payments, setPayments] = useState([])
  const [filters, setFilters] = useState({ provider: 'all', status: 'all' })

  const resetStatus = () => {
    setStatusMessage('')
    setStatusType('info')
  }

  const loadPayments = async () => {
    setLoading(true)
    resetStatus()
    try {
      const data = await adminApi.listPayments({ provider: filters.provider, status: filters.status, limit: 100 })
      setPayments(Array.isArray(data) ? data : [])
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
      setPayments([])
    } finally {
      setLoading(false)
    }
  }

  const hasLoadedRef = useRef(false)

  useEffect(() => {
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true
    loadPayments()
  }, [])

  const handleFilterChange = (event) => {
    const { name, value } = event.target
    setFilters((prev) => ({ ...prev, [name]: value }))
  }

  const handleFilterSubmit = async (event) => {
    event.preventDefault()
    await loadPayments()
  }

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h1 className="h3 mb-1">Giao dich thanh toan</h1>
        <p className="text-muted mb-0">Theo doi giao dich, trang thai va doi soat VNPAY.</p>
      </div>

      <AdminStatusAlert message={statusMessage} type={statusType} />

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <form className="row gy-3 gx-3 align-items-end" onSubmit={handleFilterSubmit}>
            <div className="col-md-3">
              <label className="form-label fw-semibold text-uppercase text-muted small">Nha cung cap</label>
              <select className="form-select" name="provider" value={filters.provider} onChange={handleFilterChange}>
                {PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold text-uppercase text-muted small">Trang thai</label>
              <select className="form-select" name="status" value={filters.status} onChange={handleFilterChange}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2 d-grid">
              <button type="submit" className="btn btn-dark">
                Tai danh sach
              </button>
            </div>
            <div className="col-md-2 d-grid">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => {
                  setFilters({ provider: 'all', status: 'all' })
                  loadPayments()
                }}
              >
                Dat lai loc
              </button>
            </div>
          </form>
        </div>
      </div>

      {loading ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <Spinner label="Dang tai danh sach giao dich..." />
          </div>
        </div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-bottom-0 d-flex justify-content-between align-items-center">
            <div>
              <h5 className="mb-1">Danh sach giao dich</h5>
              <p className="text-muted small mb-0">Hien thi toi da 100 giao dich gan nhat.</p>
            </div>
            <span className="badge bg-warning-subtle text-warning">{payments.length} giao dich</span>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Order</th>
                    <th>Nguoi dung</th>
                    <th>Nha cung cap</th>
                    <th>So tien</th>
                    <th>Ma tham chieu</th>
                    <th>Trang thai</th>
                    <th>Thoi gian</th>
                    <th className="text-end">Thao tac</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => {
                    const order = p.Order || {}
                    const user = order.User || {}
                    return (
                      <tr key={p.payment_id}>
                        <td>#{p.payment_id}</td>
                        <td>#{order.order_id || '-'} ({order.status || '-'})</td>
                        <td>{user.full_name || user.username || '-'}</td>
                        <td className="text-uppercase">{p.provider}</td>
                        <td>{formatCurrency(p.amount, p.currency || 'VND')}</td>
                        <td><code>{p.txn_ref}</code></td>
                        <td>
                          <span
                            className={
                              p.status === 'success'
                                ? 'badge bg-success-subtle text-success'
                                : p.status === 'failed'
                                ? 'badge bg-danger-subtle text-danger'
                                : p.status === 'refunded'
                                ? 'badge bg-secondary-subtle text-secondary'
                                : 'badge bg-warning-subtle text-warning'
                            }
                          >
                            {p.status}
                          </span>
                        </td>
                        <td>{formatDateTime(p.created_at || p.createdAt)}</td>
                        <td className="text-end">
                          <div className="btn-group">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success"
                              disabled={p.status === 'success'}
                              onClick={async () => {
                                try {
                                  await adminApi.updatePaymentStatus(p.payment_id, 'success')
                                  setStatusMessage(`Da danh dau thanh cong giao dich #${p.payment_id}`)
                                  setStatusType('success')
                                  await loadPayments()
                                } catch (e) {
                                  setStatusMessage(e.message)
                                  setStatusType('error')
                                }
                              }}
                            >
                              Danh dau thanh cong
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              disabled={p.status === 'failed'}
                              onClick={async () => {
                                try {
                                  await adminApi.updatePaymentStatus(p.payment_id, 'failed')
                                  setStatusMessage(`Da danh dau that bai giao dich #${p.payment_id}`)
                                  setStatusType('success')
                                  await loadPayments()
                                } catch (e) {
                                  setStatusMessage(e.message)
                                  setStatusType('error')
                                }
                              }}
                            >
                              Danh dau that bai
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPayments
