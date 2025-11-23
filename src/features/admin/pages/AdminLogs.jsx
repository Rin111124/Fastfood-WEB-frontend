import { useEffect, useState } from 'react'
import AdminStatusAlert from '../../../components/admin/AdminStatusAlert'
import Spinner from '../../../components/common/Spinner'
import adminApi from '../../../services/adminApi'
import { formatDateTime } from '../../../utils/format'

const AdminLogs = () => {
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState('info')
  const [logs, setLogs] = useState([])

  const loadLogs = async () => {
    setLoading(true)
    setStatusMessage('')
    setStatusType('info')
    try {
      const data = await adminApi.listLogs(200)
      setLogs(Array.isArray(data) ? data : [])
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <h1 className="h3 mb-1">Logs he thong</h1>
          <p className="text-muted mb-0">
            Ghi nhan hoat dong quan trong de kiem soat thay doi va truy vet su co.
          </p>
        </div>
        <button type="button" className="btn btn-outline-secondary" onClick={loadLogs}>
          Lam moi
        </button>
      </div>

      <AdminStatusAlert message={statusMessage} type={statusType} />

      {loading ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <Spinner label="Dang tai nhat ky he thong..." />
          </div>
        </div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Thoi gian</th>
                    <th>Nguoi thuc hien</th>
                    <th>Hanh dong</th>
                    <th>Tai nguyen</th>
                    <th>Chi tiet</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.log_id}>
                      <td style={{ width: '16rem' }}>{formatDateTime(log.created_at)}</td>
                      <td style={{ width: '16rem' }}>
                        {log.User?.username || log.User?.full_name || 'He thong'}
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border text-uppercase">{log.action}</span>
                      </td>
                      <td>
                        <code>{log.resource}</code>
                      </td>
                      <td>
                        {log.metadata ? (
                          <pre className="small bg-light border rounded p-2 mb-0">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        ) : (
                          <span className="text-muted small">Khong co thong tin</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!logs.length && (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-4">
                        Khong co log nao trong khoang thoi gian goi y.
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

export default AdminLogs

