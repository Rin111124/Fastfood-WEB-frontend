import { useEffect, useState } from 'react'
import AdminStatusAlert from '../../../components/admin/AdminStatusAlert'
import Spinner from '../../../components/common/Spinner'
import adminApi from '../../../services/adminApi'
import { formatDate, formatTime } from '../../../utils/format'

const defaultForm = {
  staff_id: '',
  shift_date: '',
  start_time: '',
  end_time: '',
  status: 'scheduled',
  note: ''
}

const AdminShifts = () => {
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState('info')

  const [staff, setStaff] = useState([])
  const [shifts, setShifts] = useState([])
  const [form, setForm] = useState(defaultForm)

  const loadData = async () => {
    setLoading(true)
    setStatusMessage('')
    setStatusType('info')
    try {
      const [staffData, shiftData] = await Promise.all([
        adminApi.listStaff(200),
        adminApi.listShifts()
      ])
      setStaff(Array.isArray(staffData) ? staffData : [])
      setShifts(Array.isArray(shiftData) ? shiftData : [])
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
      setStaff([])
      setShifts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      await adminApi.scheduleShift({
        staff_id: Number(form.staff_id),
        shift_date: form.shift_date,
        start_time: form.start_time,
        end_time: form.end_time,
        status: form.status,
        note: form.note
      })
      setStatusMessage('Da lap lich lam viec moi')
      setStatusType('success')
      setForm(defaultForm)
      await loadData()
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
    }
  }

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h1 className="h3 mb-1">Lich lam viec</h1>
        <p className="text-muted mb-0">
          Sap xep ca lam viec cho nhan vien va shipper, dam bao phong ban du nhan su.
        </p>
      </div>

      <AdminStatusAlert message={statusMessage} type={statusType} />

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom-0">
          <h5 className="mb-0">Lap ca lam viec</h5>
        </div>
        <div className="card-body">
          <form className="row g-3" onSubmit={handleSubmit}>
            <div className="col-md-3">
              <label className="form-label fw-semibold text-uppercase text-muted small">Nhan vien</label>
              <select
                className="form-select"
                value={form.staff_id}
                onChange={(event) => handleFormChange('staff_id', event.target.value)}
                required
              >
                <option value="">-- Chon nhan vien --</option>
                {staff.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.full_name || member.username || member.user_id}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold text-uppercase text-muted small">Ngay lam viec</label>
              <input
                type="date"
                className="form-control"
                value={form.shift_date}
                onChange={(event) => handleFormChange('shift_date', event.target.value)}
                required
              />
            </div>
            <div className="col-md-2">
              <label className="form-label fw-semibold text-uppercase text-muted small">Bat dau</label>
              <input
                type="time"
                className="form-control"
                value={form.start_time}
                onChange={(event) => handleFormChange('start_time', event.target.value)}
                required
              />
            </div>
            <div className="col-md-2">
              <label className="form-label fw-semibold text-uppercase text-muted small">Ket thuc</label>
              <input
                type="time"
                className="form-control"
                value={form.end_time}
                onChange={(event) => handleFormChange('end_time', event.target.value)}
                required
              />
            </div>
            <div className="col-md-2">
              <label className="form-label fw-semibold text-uppercase text-muted small">Trang thai</label>
              <select
                className="form-select"
                value={form.status}
                onChange={(event) => handleFormChange('status', event.target.value)}
              >
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="missed">Missed</option>
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold text-uppercase text-muted small">Ghi chu</label>
              <input
                type="text"
                className="form-control"
                value={form.note}
                onChange={(event) => handleFormChange('note', event.target.value)}
              />
            </div>
            <div className="col-12 d-flex justify-content-end">
              <button type="submit" className="btn btn-dark">
                Lap lich
              </button>
            </div>
          </form>
        </div>
      </div>

      {loading ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <Spinner label="Dang tai lich lam viec..." />
          </div>
        </div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-bottom-0">
            <h5 className="mb-0">Danh sach ca lam viec</h5>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Nhan vien</th>
                    <th>Ngay</th>
                    <th>Thoi gian</th>
                    <th>Trang thai</th>
                    <th>Ghi chu</th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.map((shift) => (
                    <tr key={shift.shift_id}>
                      <td style={{ minWidth: '16rem' }}>
                        <div className="fw-semibold">
                          {shift.staff?.full_name || shift.staff?.username || shift.staff_id}
                        </div>
                        <div className="text-muted small">ID: {shift.staff_id}</div>
                      </td>
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
                      <td colSpan={5} className="text-center text-muted py-4">
                        Chua co lich lam viec nao duoc lap.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminShifts

