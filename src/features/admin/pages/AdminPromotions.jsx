import { useEffect, useMemo, useState } from 'react'
import AdminStatusAlert from '../../../components/admin/AdminStatusAlert'
import Spinner from '../../../components/common/Spinner'
import adminApi from '../../../services/adminApi'
import { formatCurrency, formatDateTime } from '../../../utils/format'

const defaultForm = {
  code: '',
  name: '',
  discount_type: 'percentage',
  discount_value: '10',
  max_discount_value: '',
  min_order_amount: '',
  max_usage: '',
  start_date: '',
  end_date: '',
  applicable_roles: 'customer',
  description: '',
  is_active: true
}

const parseNumber = (value) => {
  if (value === '' || value === null || typeof value === 'undefined') return null
  const number = Number(value)
  return Number.isNaN(number) ? null : number
}

const parseRoles = (input) =>
  String(input || '')
    .split(',')
    .map((role) => role.trim().toLowerCase())
    .filter(Boolean)

const AdminPromotions = () => {
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState('info')

  const [promotions, setPromotions] = useState([])
  const [form, setForm] = useState(defaultForm)
  const [editingPromotion, setEditingPromotion] = useState(null)

  const resetStatus = () => {
    setStatusMessage('')
    setStatusType('info')
  }

  const loadPromotions = async () => {
    setLoading(true)
    resetStatus()
    try {
      const data = await adminApi.listPromotions()
      setPromotions(Array.isArray(data) ? data : [])
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
      setPromotions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPromotions()
  }, [])

  const handleCreate = async (event) => {
    event.preventDefault()
    try {
      await adminApi.createPromotion({
        code: form.code.trim(),
        name: form.name.trim(),
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value || 0),
        max_discount_value: parseNumber(form.max_discount_value),
        min_order_amount: parseNumber(form.min_order_amount),
        max_usage: parseNumber(form.max_usage),
        start_date: form.start_date,
        end_date: form.end_date,
        applicable_roles: parseRoles(form.applicable_roles),
        description: form.description,
        is_active: Boolean(form.is_active)
      })
      setStatusMessage('Da tao chuong trinh khuyen mai moi')
      setStatusType('success')
      setForm(defaultForm)
      await loadPromotions()
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
    }
  }

  const handleUpdate = async (event) => {
    event.preventDefault()
    if (!editingPromotion?.promotion_id) return
    try {
      await adminApi.updatePromotion(editingPromotion.promotion_id, {
        code: editingPromotion.code.trim(),
        name: editingPromotion.name.trim(),
        discount_type: editingPromotion.discount_type,
        discount_value: Number(editingPromotion.discount_value || 0),
        max_discount_value: parseNumber(editingPromotion.max_discount_value),
        min_order_amount: parseNumber(editingPromotion.min_order_amount),
        max_usage: parseNumber(editingPromotion.max_usage),
        start_date: editingPromotion.start_date,
        end_date: editingPromotion.end_date,
        applicable_roles: parseRoles(editingPromotion.applicable_roles),
        description: editingPromotion.description,
        is_active: Boolean(editingPromotion.is_active)
      })
      setStatusMessage('Da cap nhat khuyen mai')
      setStatusType('success')
      setEditingPromotion(null)
      await loadPromotions()
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
    }
  }

  const handleToggle = async (promotionId) => {
    try {
      await adminApi.togglePromotion(promotionId)
      setStatusMessage('Da thay doi trang thai khuyen mai')
      setStatusType('success')
      await loadPromotions()
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
    }
  }

  const activePromotions = useMemo(
    () => promotions.filter((promotion) => promotion.is_active),
    [promotions]
  )

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h1 className="h3 mb-1">Quan ly khuyen mai</h1>
        <p className="text-muted mb-0">
          Tao ma giam gia, cau hinh dieu kien ap dung va theo doi so luong su dung.
        </p>
      </div>

      <AdminStatusAlert message={statusMessage} type={statusType} />

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom-0">
          <h5 className="mb-0">Tao chuong trinh khuyen mai</h5>
        </div>
        <div className="card-body">
          <form className="row g-3" onSubmit={handleCreate}>
            <div className="col-md-2">
              <label className="form-label fw-semibold text-uppercase text-muted small">Ma</label>
              <input
                type="text"
                className="form-control"
                value={form.code}
                onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-semibold text-uppercase text-muted small">Ten chuong trinh</label>
              <input
                type="text"
                className="form-control"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </div>
            <div className="col-md-2">
              <label className="form-label fw-semibold text-uppercase text-muted small">Loai giam</label>
              <select
                className="form-select"
                value={form.discount_type}
                onChange={(event) => setForm((prev) => ({ ...prev, discount_type: event.target.value }))}
              >
                <option value="percentage">Phan tram</option>
                <option value="fixed">So tien</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label fw-semibold text-uppercase text-muted small">
                Gia tri giam
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                className="form-control"
                value={form.discount_value}
                onChange={(event) => setForm((prev) => ({ ...prev, discount_value: event.target.value }))}
                required
              />
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="promo-active"
                  checked={form.is_active}
                  onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                />
                <label className="form-check-label" htmlFor="promo-active">
                  Kich hoat ngay
                </label>
              </div>
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold text-uppercase text-muted small">Ngay bat dau</label>
              <input
                type="datetime-local"
                className="form-control"
                value={form.start_date}
                onChange={(event) => setForm((prev) => ({ ...prev, start_date: event.target.value }))}
                required
              />
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold text-uppercase text-muted small">Ngay ket thuc</label>
              <input
                type="datetime-local"
                className="form-control"
                value={form.end_date}
                onChange={(event) => setForm((prev) => ({ ...prev, end_date: event.target.value }))}
                required
              />
            </div>
            <div className="col-md-2">
              <label className="form-label fw-semibold text-uppercase text-muted small">
                Don toi thieu (VND)
              </label>
              <input
                type="number"
                className="form-control"
                value={form.min_order_amount}
                onChange={(event) => setForm((prev) => ({ ...prev, min_order_amount: event.target.value }))}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label fw-semibold text-uppercase text-muted small">
                Giam toi da (VND)
              </label>
              <input
                type="number"
                className="form-control"
                value={form.max_discount_value}
                onChange={(event) => setForm((prev) => ({ ...prev, max_discount_value: event.target.value }))}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label fw-semibold text-uppercase text-muted small">So lan su dung</label>
              <input
                type="number"
                className="form-control"
                value={form.max_usage}
                onChange={(event) => setForm((prev) => ({ ...prev, max_usage: event.target.value }))}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold text-uppercase text-muted small">
                Doi tuong ap dung (vd: customer,staff)
              </label>
              <input
                type="text"
                className="form-control"
                value={form.applicable_roles}
                onChange={(event) => setForm((prev) => ({ ...prev, applicable_roles: event.target.value }))}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold text-uppercase text-muted small">Mo ta</label>
              <input
                type="text"
                className="form-control"
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>
            <div className="col-12 d-flex justify-content-end">
              <button type="submit" className="btn btn-dark">
                Tao khuyen mai
              </button>
            </div>
          </form>
        </div>
      </div>

      {loading ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <Spinner label="Dang tai danh sach khuyen mai..." />
          </div>
        </div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-bottom-0 d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
            <div>
              <h5 className="mb-1">Chuong trinh khuyen mai</h5>
              <p className="text-muted small mb-0">Theo doi trang thai va so lieu su dung thuc te.</p>
            </div>
            <span className="badge bg-success-subtle text-success">{activePromotions.length} dang hoat dong</span>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Ma</th>
                    <th>Thong tin</th>
                    <th>Gia tri</th>
                    <th>Dieu kien</th>
                    <th>Trang thai</th>
                    <th className="text-end">Thao tac</th>
                  </tr>
                </thead>
                <tbody>
                  {promotions.map((promotion) => {
                    const isEditing = editingPromotion?.promotion_id === promotion.promotion_id
                    const usageInfo =
                      promotion.max_usage !== null && typeof promotion.max_usage !== 'undefined'
                        ? `${promotion.usage_count || 0}/${promotion.max_usage}`
                        : `${promotion.usage_count || 0}`
                    return (
                      <tr key={promotion.promotion_id}>
                        <td>
                          {isEditing ? (
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={editingPromotion.code}
                              onChange={(event) =>
                                setEditingPromotion((prev) => ({ ...prev, code: event.target.value }))
                              }
                              required
                            />
                          ) : (
                            <span className="badge bg-dark text-white px-3 py-2">{promotion.code}</span>
                          )}
                        </td>
                        <td style={{ minWidth: '18rem' }}>
                          {isEditing ? (
                            <>
                              <input
                                type="text"
                                className="form-control form-control-sm mb-2"
                                value={editingPromotion.name}
                                onChange={(event) =>
                                  setEditingPromotion((prev) => ({ ...prev, name: event.target.value }))
                                }
                                required
                              />
                              <textarea
                                className="form-control form-control-sm"
                                rows={2}
                                value={editingPromotion.description || ''}
                                onChange={(event) =>
                                  setEditingPromotion((prev) => ({
                                    ...prev,
                                    description: event.target.value
                                  }))
                                }
                              />
                            </>
                          ) : (
                            <div>
                              <div className="fw-semibold">{promotion.name}</div>
                              <div className="text-muted small">{promotion.description || 'Chua co mo ta'}</div>
                            </div>
                          )}
                          <div className="text-muted small mt-2">
                            Hieu luc: {formatDateTime(promotion.start_date)} - {formatDateTime(promotion.end_date)}
                          </div>
                        </td>
                        <td style={{ minWidth: '14rem' }}>
                          {isEditing ? (
                            <div className="row g-2">
                              <div className="col-6">
                                <select
                                  className="form-select form-select-sm"
                                  value={editingPromotion.discount_type}
                                  onChange={(event) =>
                                    setEditingPromotion((prev) => ({
                                      ...prev,
                                      discount_type: event.target.value
                                    }))
                                  }
                                >
                                  <option value="percentage">Phan tram</option>
                                  <option value="fixed">So tien</option>
                                </select>
                              </div>
                              <div className="col-6">
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  value={editingPromotion.discount_value}
                                  onChange={(event) =>
                                    setEditingPromotion((prev) => ({
                                      ...prev,
                                      discount_value: event.target.value
                                    }))
                                  }
                                />
                              </div>
                              <div className="col-6">
                                <input
                                  type="number"
                                  placeholder="Giam toi da"
                                  className="form-control form-control-sm"
                                  value={editingPromotion.max_discount_value ?? ''}
                                  onChange={(event) =>
                                    setEditingPromotion((prev) => ({
                                      ...prev,
                                      max_discount_value: event.target.value
                                    }))
                                  }
                                />
                              </div>
                              <div className="col-6">
                                <input
                                  type="number"
                                  placeholder="Don toi thieu"
                                  className="form-control form-control-sm"
                                  value={editingPromotion.min_order_amount ?? ''}
                                  onChange={(event) =>
                                    setEditingPromotion((prev) => ({
                                      ...prev,
                                      min_order_amount: event.target.value
                                    }))
                                  }
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="small">
                              <div>
                                Loai:{' '}
                                <span className="fw-semibold text-capitalize">{promotion.discount_type}</span>
                              </div>
                              <div>
                                Gia tri:{' '}
                                {promotion.discount_type === 'percentage'
                                  ? `${promotion.discount_value}%`
                                  : formatCurrency(promotion.discount_value)}
                              </div>
                              {promotion.max_discount_value && (
                                <div>Giam toi da: {formatCurrency(promotion.max_discount_value)}</div>
                              )}
                              {promotion.min_order_amount && (
                                <div>Don toi thieu: {formatCurrency(promotion.min_order_amount)}</div>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ minWidth: '12rem' }}>
                          {isEditing ? (
                            <div className="row g-2">
                              <div className="col-6">
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  placeholder="So lan"
                                  value={editingPromotion.max_usage ?? ''}
                                  onChange={(event) =>
                                    setEditingPromotion((prev) => ({
                                      ...prev,
                                      max_usage: event.target.value
                                    }))
                                  }
                                />
                              </div>
                              <div className="col-6">
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  placeholder="Vai tro"
                                  value={editingPromotion.applicable_roles}
                                  onChange={(event) =>
                                    setEditingPromotion((prev) => ({
                                      ...prev,
                                      applicable_roles: event.target.value
                                    }))
                                  }
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="small">
                              <div>Su dung: {usageInfo}</div>
                              <div className="text-muted">
                                Vai tro: {Array.isArray(promotion.applicable_roles)
                                  ? promotion.applicable_roles.join(', ')
                                  : 'Tat ca'}
                              </div>
                            </div>
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <div className="form-check form-switch">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={Boolean(editingPromotion.is_active)}
                                onChange={(event) =>
                                  setEditingPromotion((prev) => ({
                                    ...prev,
                                    is_active: event.target.checked
                                  }))
                                }
                              />
                            </div>
                          ) : (
                            <span
                              className={`badge rounded-pill px-3 py-2 ${
                                promotion.is_active
                                  ? 'bg-success-subtle text-success'
                                  : 'bg-secondary-subtle text-secondary'
                              }`}
                            >
                              {promotion.is_active ? 'Dang hoat dong' : 'Tam dung'}
                            </span>
                          )}
                        </td>
                        <td className="text-end" style={{ width: '13rem' }}>
                          {isEditing ? (
                            <div className="d-flex gap-2 justify-content-end">
                              <button type="button" className="btn btn-sm btn-success" onClick={handleUpdate}>
                                Luu
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => setEditingPromotion(null)}
                              >
                                Huy
                              </button>
                            </div>
                          ) : (
                            <div className="d-flex gap-2 justify-content-end">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={() =>
                                  setEditingPromotion({
                                    ...promotion,
                                    max_discount_value:
                                      promotion.max_discount_value ?? '',
                                    min_order_amount: promotion.min_order_amount ?? '',
                                    max_usage: promotion.max_usage ?? '',
                                    applicable_roles: Array.isArray(promotion.applicable_roles)
                                      ? promotion.applicable_roles.join(',')
                                      : ''
                                  })
                                }
                              >
                                Chinh sua
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-warning"
                                onClick={() => handleToggle(promotion.promotion_id)}
                              >
                                {promotion.is_active ? 'Ngung' : 'Mo'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {!promotions.length && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">
                        Chua co chuong trinh khuyen mai nao.
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

export default AdminPromotions

