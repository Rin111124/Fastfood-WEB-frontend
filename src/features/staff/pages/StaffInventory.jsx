import { useEffect, useState } from 'react'
import AdminStatusAlert from '../../../components/admin/AdminStatusAlert'
import Spinner from '../../../components/common/Spinner'
import staffApi from '../../../services/staffApi'
import { formatDateTime, formatNumber } from '../../../utils/format'

const StaffInventory = () => {
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState('info')
  const [items, setItems] = useState([])
  const [drafts, setDrafts] = useState({})

  const loadInventory = async () => {
    setLoading(true)
    setStatusMessage('')
    setStatusType('info')
    try {
      const data = await staffApi.listInventory()
      const list = Array.isArray(data) ? data : []
      setItems(list)
      const draftMap = {}
      list.forEach((item) => {
        draftMap[item.inventory_id] = {
          quantity: item.quantity ?? '',
          unit: item.unit || 'pcs',
          note: item.note || ''
        }
      })
      setDrafts(draftMap)
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
      setItems([])
      setDrafts({})
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInventory()
  }, [])

  const handleDraftChange = (inventoryId, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [inventoryId]: {
        ...prev[inventoryId],
        [field]: value
      }
    }))
  }

  const handleUpdate = async (item) => {
    const draft = drafts[item.inventory_id] || {}
    try {
      await staffApi.updateInventory({
        inventory_id: item.inventory_id,
        quantity: Number(draft.quantity || 0),
        unit: draft.unit || 'pcs',
        note: draft.note || ''
      })
      setStatusMessage('Da cap nhat ton kho')
      setStatusType('success')
      await loadInventory()
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
    }
  }

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white border-bottom-0">
        <h5 className="mb-1">Cap nhat ton kho</h5>
        <p className="text-muted mb-0">
          Dieu chinh ton kho thuc te va de lai ghi chu de quan tri vien xem xet.
        </p>
      </div>
      <div className="card-body">
        <AdminStatusAlert message={statusMessage} type={statusType} />
        {loading ? (
          <div className="text-center py-4">
            <Spinner label="Dang tai ton kho..." />
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Nguyen lieu</th>
                  <th>So luong hien tai</th>
                  <th>Cap nhat</th>
                  <th>Thong tin</th>
                  <th className="text-end">Thao tac</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const draft = drafts[item.inventory_id] || {}
                  return (
                    <tr key={item.inventory_id}>
                      <td style={{ minWidth: '16rem' }}>
                        <div className="fw-semibold">{item.name}</div>
                        <div className="text-muted small">
                          Lien ket: {item.Product?.name || 'Khong co'}
                        </div>
                      </td>
                      <td style={{ minWidth: '12rem' }}>
                        <div className="fw-semibold">
                          {formatNumber(item.quantity)} {item.unit}
                        </div>
                        <div className="text-muted small">
                          Canh bao: {item.threshold !== null ? formatNumber(item.threshold) : 'Chua thiet lap'}
                        </div>
                      </td>
                      <td style={{ minWidth: '14rem' }}>
                        <div className="input-group input-group-sm mb-2">
                          <input
                            type="number"
                            className="form-control"
                            value={draft.quantity}
                            onChange={(event) =>
                              handleDraftChange(item.inventory_id, 'quantity', event.target.value)
                            }
                          />
                          <input
                            type="text"
                            className="form-control"
                            style={{ maxWidth: '6rem' }}
                            value={draft.unit}
                            onChange={(event) =>
                              handleDraftChange(item.inventory_id, 'unit', event.target.value)
                            }
                          />
                        </div>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Ghi chu"
                          value={draft.note}
                          onChange={(event) =>
                            handleDraftChange(item.inventory_id, 'note', event.target.value)
                          }
                        />
                      </td>
                      <td>
                        <div className="text-muted small">
                          Cap nhat luc: {formatDateTime(item.updated_at || item.created_at)}
                        </div>
                        <div className="text-muted small">
                          Boi: {item.updater?.full_name || item.updater?.username || 'He thong'}
                        </div>
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleUpdate(item)}
                        >
                          Luu thay doi
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {!items.length && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-4">
                      Chua co du lieu ton kho de hien thi.
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

export default StaffInventory

