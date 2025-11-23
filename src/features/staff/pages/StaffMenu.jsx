import { useEffect, useState } from 'react'
import AdminStatusAlert from '../../../components/admin/AdminStatusAlert'
import Spinner from '../../../components/common/Spinner'
import staffApi from '../../../services/staffApi'
import apiFetch from '../../../services/apiClient'
import { formatCurrency } from '../../../utils/format'

const StaffMenu = () => {
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState('info')
  const [products, setProducts] = useState([])

  const loadProducts = async () => {
    setLoading(true)
    setStatusMessage('')
    setStatusType('info')
    try {
      const response = await apiFetch('/api/customer/products?limit=100')
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(body?.message || 'Khong the tai danh sach mon an')
      }
      setProducts(Array.isArray(body?.data) ? body.data : [])
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const handleToggle = async (productId) => {
    try {
      await staffApi.toggleProduct(productId)
      setStatusMessage('Da cap nhat trang thai mon an')
      setStatusType('success')
      await loadProducts()
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
    }
  }

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white border-bottom-0">
        <h5 className="mb-1">Tinh trang mon an</h5>
        <p className="text-muted mb-0">
          Cap nhat nhanh trang thai con/het cua cac mon ban chay trong ca lam viec.
        </p>
      </div>
      <div className="card-body">
        <AdminStatusAlert message={statusMessage} type={statusType} />
        {loading ? (
          <div className="text-center py-4">
            <Spinner label="Dang tai danh sach mon an..." />
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Mon an</th>
                  <th>Gia</th>
                  <th>Loai</th>
                  <th className="text-end">Trang thai</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.product_id}>
                    <td style={{ minWidth: '18rem' }}>
                      <div className="fw-semibold">{product.name}</div>
                      <div className="text-muted small">{product.description || 'Chua co mo ta'}</div>
                    </td>
                    <td>{formatCurrency(product.price)}</td>
                    <td>
                      <span className="badge bg-light text-dark border text-capitalize">{product.food_type}</span>
                    </td>
                    <td className="text-end" style={{ width: '14rem' }}>
                      <button
                        type="button"
                        className={`btn btn-sm ${
                          product.is_active ? 'btn-outline-danger' : 'btn-outline-success'
                        }`}
                        onClick={() => handleToggle(product.product_id)}
                      >
                        {product.is_active ? 'Danh dau het hang' : 'Mo ban lai'}
                      </button>
                    </td>
                  </tr>
                ))}
                {!products.length && (
                  <tr>
                    <td colSpan={4} className="text-center text-muted py-4">
                      Khong co mon an nao.
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

export default StaffMenu

