import { useEffect, useState } from 'react'
import AdminStatusAlert from '../../../components/admin/AdminStatusAlert'
import Spinner from '../../../components/common/Spinner'
import adminApi from '../../../services/adminApi'
import { formatDateTime, formatNumber } from '../../../utils/format'

const defaultForm = {
  inventory_id: null,
  name: '',
  product_id: '',
  quantity: '',
  unit: 'pcs',
  threshold: '',
  note: ''
}

const AdminInventory = () => {
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState('info')
  const [items, setItems] = useState([])
  const [form, setForm] = useState(defaultForm)

  const loadInventory = async () => {
    setLoading(true)
    setStatusMessage('')
    setStatusType('info')
    try {
      const data = await adminApi.listInventory()
      setItems(Array.isArray(data) ? data : [])
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInventory()
  }, [])

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      await adminApi.upsertInventoryItem({
        inventory_id: form.inventory_id ? Number(form.inventory_id) : undefined,
        name: form.name.trim(),
        product_id: form.product_id ? Number(form.product_id) : undefined,
        quantity: Number(form.quantity || 0),
        unit: form.unit || 'pcs',
        threshold: form.threshold !== '' ? Number(form.threshold) : null,
        note: form.note || ''
      })
      setStatusMessage(form.inventory_id ? 'Da cap nhat ton kho' : 'Da them muc ton kho moi')
      setStatusType('success')
      setForm(defaultForm)
      await loadInventory()
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
    }
  }

  const handleEdit = (item) => {
    setForm({
      inventory_id: item.inventory_id,
      name: item.name || '',
      product_id: item.product_id ? String(item.product_id) : '',
      quantity: item.quantity ?? '',
      unit: item.unit || 'pcs',
      threshold: item.threshold ?? '',
      note: item.note || ''
    })
  }

  const handleReset = () => {
    setForm(defaultForm)
  }

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h1 className="h3 mb-1">Quan ly ton kho</h1>
        <p className="text-muted mb-0">
          Theo doi nguyen lieu, cap nhat so luong ton va lap ke hoach bo sung kip thoi.
        </p>
      </div>

      <AdminStatusAlert message={statusMessage} type={statusType} />

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom-0">
          <h5 className="mb-0">{form.inventory_id ? 'Cap nhat nguyen lieu' : 'Them nguyen lieu moi'}</h5>
        </div>
        <div className="card-body">
          <form className="row g-3" onSubmit={handleSubmit}>
            <div className="col-md-4">
              <label className="form-label fw-semibold text-uppercase text-muted small">Ten nguyen lieu</label>
              <input
                type="text"
                className="form-control"
                value={form.name}
                onChange={(event) => handleFormChange('name', event.target.value)}
                required
              />
            </div>
            <div className="col-md-2">
              <label className="form-label fw-semibold text-uppercase text-muted small">San pham lien ket</label>
              <input
                type="number"
                className="form-control"
                value={form.product_id}
                placeholder="product_id"
                onChange={(event) => handleFormChange('product_id', event.target.value)}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label fw-semibold text-uppercase text-muted small">So luong</label>
              <input
                type="number"
                className="form-control"
                value={form.quantity}
                min="0"
                onChange={(event) => handleFormChange('quantity', event.target.value)}
                required
              />
            </div>
            <div className="col-md-2">
              <label className="form-label fw-semibold text-uppercase text-muted small">Don vi</label>
              <input
                type="text"
                className="form-control"
                value={form.unit}
                onChange={(event) => handleFormChange('unit', event.target.value)}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label fw-semibold text-uppercase text-muted small">Nguong canh bao</label>
              <input
                type="number"
                className="form-control"
                value={form.threshold}
                min="0"
                onChange={(event) => handleFormChange('threshold', event.target.value)}
              />
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
            <div className="col-12 d-flex gap-2 justify-content-end">
              <button type="button" className="btn btn-outline-secondary" onClick={handleReset}>
                Huy
              </button>
              <button type="submit" className="btn btn-dark">
                {form.inventory_id ? 'Cap nhat' : 'Them moi'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {loading ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <Spinner label="Dang tai danh sach ton kho..." />
          </div>
        </div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-bottom-0">
            <h5 className="mb-0">Bang ton kho</h5>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Ten nguyen lieu</th>
                    <th>So luong</th>
                    <th>San pham lien quan</th>
                    <th>Cap nhat</th>
                    <th className="text-end">Thao tac</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.inventory_id}>
                      <td>
                        <div className="fw-semibold">{item.name}</div>
                        <div className="text-muted small">{item.note || 'Không co ghi chu'}</div>
                      </td>
                      <td style={{ minWidth: '12rem' }}>
                        <div className="fw-semibold">
                          {formatNumber(item.quantity)} {item.unit}
                        </div>
                        <div className="text-muted small">
                          Nguong canh bao: {item.threshold !== null ? formatNumber(item.threshold) : 'Chua thiet lap'}
                        </div>
                      </td>
                      <td>
                        {item.Product?.name ? (
                          <span className="badge bg-light text-dark border">{item.Product.name}</span>
                        ) : (
                          <span className="text-muted small">Khong lien ket</span>
                        )}
                      </td>
                      <td style={{ minWidth: '13rem' }}>
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
                          onClick={() => handleEdit(item)}
                        >
                          Chinh sua
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!items.length && (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-4">
                        Chua co du lieu ton kho.
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

export default AdminInventory

