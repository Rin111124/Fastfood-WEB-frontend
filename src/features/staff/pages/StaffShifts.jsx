import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import AdminStatusAlert from '../../../components/admin/AdminStatusAlert'
import Spinner from '../../../components/common/Spinner'
import staffApi from '../../../services/staffApi'
import { formatDate, formatTime } from '../../../utils/format'

const StaffShifts = () => {
  const outlet = useOutletContext()
  const session = outlet?.session
  const staffId = session?.user?.user_id

  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState('info')
  const [shifts, setShifts] = useState([])

  const loadShifts = async () => {
    setLoading(true)
    setStatusMessage('')
    setStatusType('info')
    try {
      const data = await staffApi.listShifts(staffId)
      setShifts(Array.isArray(data) ? data : [])
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
      setShifts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadShifts()
  }, [])

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white border-bottom-0 d-flex justify-content-between align-items-center">
        <div>
          <h5 className="mb-1">Lich truc</h5>
          <p className="text-muted mb-0">
            Hien thi lich lam viec voi cac ca sap toi va trang thai xac nhan.
          </p>
        </div>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={loadShifts}>
          Lam moi
        </button>
      </div>
      <div className="card-body">
        <AdminStatusAlert message={statusMessage} type={statusType} />
        {loading ? (
          <div className="text-center py-4">
            <Spinner label="Dang tai lich truc..." />
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Ngay</th>
                  <th>Thoi gian</th>
                  <th>Trang thai</th>
                  <th>Ghi chu</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((shift) => (
                  <tr key={shift.shift_id}>
                    <td>{formatDate(shift.shift_date)}</td>
                    <td>
                      {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                    </td>
                    <td>
                      <span
                        className={`badge rounded-pill px-3 py-2 text-capitalize ${
                          shift.status === 'completed'
                            ? 'bg-success-subtle text-success'
                            : shift.status === 'missed'
                            ? 'bg-danger-subtle text-danger'
                            : 'bg-warning-subtle text-warning'
                        }`}
                      >
                        {shift.status}
                      </span>
                    </td>
                    <td>{shift.note || 'Khong co ghi chu'}</td>
                  </tr>
                ))}
                {!shifts.length && (
                  <tr>
                    <td colSpan={4} className="text-center text-muted py-4">
                      Ban chua co lich lam viec nao.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default StaffShifts

