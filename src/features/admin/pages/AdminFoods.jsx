
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AdminStatusAlert from '../../../components/admin/AdminStatusAlert'
import Spinner from '../../../components/common/Spinner'
import adminApi from '../../../services/adminApi'
import { resolveAssetUrl } from '../../../services/apiClient'
import { formatCurrency } from '../../../utils/format'

const FOOD_TYPES = [
  { value: 'burger', label: 'Burger' },
  { value: 'pizza', label: 'Pizza' },
  { value: 'drink', label: 'Do uong' },
  { value: 'snack', label: 'An nhanh' },
  { value: 'combo', label: 'Combo' },
  { value: 'dessert', label: 'Trang mieng' },
  { value: 'other', label: 'Khac' }
]

const defaultCategoryForm = { category_name: '', description: '' }
const defaultProductForm = {
  name: '',
  description: '',
  food_type: 'other',
  price: '',
  category_id: '',
  imageFile: null
}
const defaultOptionForm = {
  product_id: '',
  group_name: '',
  option_name: '',
  price_adjustment: '0',
  is_required: false,
  min_select: '',
  max_select: '',
  sort_order: '0'
}

const formatDateTime = (value) => {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
}

const toInputDateTimeLocal = (value) => {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (num) => String(num).padStart(2, '0')
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const AdminFoods = () => {
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState('info')

  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [options, setOptions] = useState([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [productFilters, setProductFilters] = useState({ includeInactive: true })
  const [optionFilters, setOptionFilters] = useState({ includeInactive: true, includeDeleted: false })
  const [pauseDialog, setPauseDialog] = useState({ open: false, product: null, reason: '', resumeAt: '' })

  const [categoryForm, setCategoryForm] = useState(defaultCategoryForm)
  const [productForm, setProductForm] = useState(defaultProductForm)
  const [optionForm, setOptionForm] = useState(defaultOptionForm)

  const [editingCategory, setEditingCategory] = useState(null)
  const [editingProduct, setEditingProduct] = useState(null)
  const [editingOption, setEditingOption] = useState(null)
  const [productPreviewUrl, setProductPreviewUrl] = useState('')
  const [editPreviewUrl, setEditPreviewUrl] = useState('')
  const productImageInputRef = useRef(null)
  const editImageInputRef = useRef(null)
  const selectedProductIdRef = useRef('')

  useEffect(() => {
    selectedProductIdRef.current = selectedProductId
  }, [selectedProductId])

  useEffect(() => {
    if (!productForm.imageFile) {
      setProductPreviewUrl('')
      return
    }
    const nextUrl = URL.createObjectURL(productForm.imageFile)
    setProductPreviewUrl(nextUrl)
    return () => {
      URL.revokeObjectURL(nextUrl)
    }
  }, [productForm.imageFile])

  useEffect(() => {
    if (!editingProduct?.imageFile) {
      setEditPreviewUrl('')
      return
    }
    const nextUrl = URL.createObjectURL(editingProduct.imageFile)
    setEditPreviewUrl(nextUrl)
    return () => {
      URL.revokeObjectURL(nextUrl)
    }
  }, [editingProduct?.imageFile])

  const resetStatus = () => {
    setStatusMessage('')
    setStatusType('info')
  }

  const getProductImage = useCallback((item) => {
    if (!item) return ''
    const candidateImage =
      typeof item.image === 'string' && item.image.trim().length ? item.image.trim() : null
    const candidateUrl =
      typeof item.image_url === 'string' && item.image_url.trim().length ? item.image_url.trim() : null

    if (candidateImage) {
      return candidateImage.startsWith('data:') ? candidateImage : resolveAssetUrl(candidateImage)
    }

    if (candidateUrl) {
      return candidateUrl.startsWith('data:') ? candidateUrl : resolveAssetUrl(candidateUrl)
    }

    return ''
  }, [])

  const resetProductFormState = (preserveCategoryId = '') => {
    setProductForm({
      ...defaultProductForm,
      category_id: preserveCategoryId
    })
    if (productImageInputRef.current) {
      productImageInputRef.current.value = ''
    }
  }

  const clearEditingState = () => {
    setEditingProduct(null)
    if (editImageInputRef.current) {
      editImageInputRef.current.value = ''
    }
  }

  const handleNewProductImageChange = (event) => {
    const file = event.target.files && event.target.files[0] ? event.target.files[0] : null
    setProductForm((prev) => ({ ...prev, imageFile: file }))
  }

  const handleEditProductImageChange = (event) => {
    const file = event.target.files && event.target.files[0] ? event.target.files[0] : null
    setEditingProduct((prev) => (prev ? { ...prev, imageFile: file, removeImage: false } : prev))
  }

  const refreshProducts = useCallback(
    async ({ focusProductId } = {}) => {
      setLoading(true)
      resetStatus()
      try {
        const [categoryData, productData] = await Promise.all([
          adminApi.listCategories(),
          adminApi.listProducts({ includeInactive: productFilters.includeInactive })
        ])

        setCategories(Array.isArray(categoryData) ? categoryData : [])
        const productList = Array.isArray(productData) ? productData : []
        setProducts(productList)

        const desiredProductId =
          focusProductId !== undefined && focusProductId !== null && focusProductId !== ''
            ? String(focusProductId)
            : selectedProductIdRef.current

        let nextSelectedId = ''
        if (
          desiredProductId &&
          productList.some((item) => String(item.product_id) === String(desiredProductId))
        ) {
          nextSelectedId = String(desiredProductId)
        } else if (productList[0]?.product_id) {
          nextSelectedId = String(productList[0].product_id)
        }

        if (nextSelectedId !== selectedProductIdRef.current) {
          setSelectedProductId(nextSelectedId)
        } else if (!nextSelectedId) {
          setSelectedProductId('')
        }

        if (!nextSelectedId) {
          setOptions([])
        }
      } catch (error) {
        setStatusMessage(error.message)
        setStatusType('error')
      } finally {
        setLoading(false)
      }
    },
    [productFilters.includeInactive]
  )

  const loadOptions = useCallback(
    async (productId) => {
      if (!productId) {
        setOptions([])
        return
      }
      setOptionsLoading(true)
      try {
        const data = await adminApi.listProductOptions({
          productId,
          includeInactive: optionFilters.includeInactive,
          includeDeleted: optionFilters.includeDeleted
        })
        setOptions(Array.isArray(data) ? data : [])
      } catch (error) {
        setStatusMessage(error.message)
        setStatusType('error')
        setOptions([])
      } finally {
        setOptionsLoading(false)
      }
    },
    [optionFilters.includeInactive, optionFilters.includeDeleted]
  )

  useEffect(() => {
    refreshProducts()
  }, [refreshProducts])

  useEffect(() => {
    if (selectedProductId) {
      loadOptions(selectedProductId)
    } else {
      setOptions([])
    }
  }, [selectedProductId, loadOptions])

  useEffect(() => {
    setOptionForm((prev) => ({
      ...prev,
      product_id: selectedProductId || ''
    }))
  }, [selectedProductId])

  const selectedProduct = useMemo(
    () => products.find((product) => String(product.product_id) === String(selectedProductId)) || null,
    [products, selectedProductId]
  )

  const handleCategoryFormSubmit = async (event) => {
    event.preventDefault()
    try {
      await adminApi.createCategory(categoryForm)
      setCategoryForm(defaultCategoryForm)
      setStatusMessage('Da tao danh muc moi')
      setStatusType('success')
      await refreshProducts()
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
    }
  }

  const handleCategoryUpdate = async (event) => {
    event.preventDefault()
    if (!editingCategory?.category_id) return
    try {
      await adminApi.updateCategory(editingCategory.category_id, {
        category_name: editingCategory.category_name,
        description: editingCategory.description
      })
      setStatusMessage('Cap nhat danh muc thanh cong')
      setStatusType('success')
      setEditingCategory(null)
      await refreshProducts()
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
    }
  }

  const handleCategoryDelete = async (categoryId) => {
    if (!categoryId) return
    try {
      await adminApi.deleteCategory(categoryId)
      setStatusMessage('Da xoa danh muc')
      setStatusType('success')
      await refreshProducts()
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
    }
  }

  const handleProductFormSubmit = async (event) => {
    event.preventDefault()
    try {
      const formData = new FormData()
      formData.append('name', productForm.name.trim())
      if (productForm.description) {
        formData.append('description', productForm.description.trim())
      }
      formData.append('food_type', productForm.food_type)
      formData.append('price', productForm.price || '0')
      if (productForm.category_id) {
        formData.append('category_id', productForm.category_id)
      }
      if (productForm.imageFile) {
        formData.append('image', productForm.imageFile)
      }
      const created = await adminApi.createProduct(formData)
      setStatusMessage('Da them mon an moi')
      setStatusType('success')
      resetProductFormState(productForm.category_id)
      await refreshProducts({ focusProductId: created?.product_id })
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
    }
  }

  const handleProductUpdate = async (event) => {
    event.preventDefault()
    if (!editingProduct?.product_id) return
    try {
      const formData = new FormData()
      formData.append('name', editingProduct.name.trim())
      if (editingProduct.description) {
        formData.append('description', editingProduct.description.trim())
      }
      formData.append('food_type', editingProduct.food_type)
      formData.append('price', editingProduct.price || '0')
      if (editingProduct.category_id) {
        formData.append('category_id', editingProduct.category_id)
      }
      formData.append('is_active', editingProduct.is_active ? 'true' : 'false')
      if (editingProduct.imageFile) {
        formData.append('image', editingProduct.imageFile)
      } else if (editingProduct.removeImage) {
        formData.append('removeImage', 'true')
      }
      await adminApi.updateProduct(editingProduct.product_id, formData)
      setStatusMessage('Cap nhat mon an thanh cong')
      setStatusType('success')
      const focusId = editingProduct.product_id
      clearEditingState()
      await refreshProducts({ focusProductId: focusId })
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
    }
  }

  const handleResumeProduct = async (productId) => {
    try {
      await adminApi.setProductAvailability(productId, { is_active: true })
      setStatusMessage('Da mo ban mon an')
      setStatusType('success')
      await refreshProducts({ focusProductId: productId })
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
    }
  }

  const openPauseDialogForProduct = (product) => {
    if (!product) return
    setPauseDialog({
      open: true,
      product,
      reason: product.pause_reason || '',
      resumeAt: toInputDateTimeLocal(product.resume_at)
    })
  }

  const closePauseDialog = () => {
    setPauseDialog({ open: false, product: null, reason: '', resumeAt: '' })
  }

  const handlePauseSubmit = async (event) => {
    event.preventDefault()
    if (!pauseDialog.product?.product_id) return
    try {
      await adminApi.setProductAvailability(pauseDialog.product.product_id, {
        is_active: false,
        pause_reason: pauseDialog.reason.trim() || null,
        resume_at: pauseDialog.resumeAt ? new Date(pauseDialog.resumeAt).toISOString() : null
      })
      setStatusMessage('Da tam dung mon an')
      setStatusType('success')
      const focusId = pauseDialog.product.product_id
      closePauseDialog()
      await refreshProducts({ focusProductId: focusId })
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
    }
  }

  const handleProductDelete = async (productId) => {
    try {
      await adminApi.deleteProduct(productId)
      setStatusMessage('Da xoa mon an')
      setStatusType('success')
      await refreshProducts()
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
    }
  }

  const handleOptionFormSubmit = async (event) => {
    event.preventDefault()
    if (!selectedProductId) {
      setStatusMessage('Vui long chon mon an truoc khi them tuy chon.')
      setStatusType('error')
      return
    }
    try {
      const payload = {
        ...optionForm,
        product_id: Number(selectedProductId),
        price_adjustment: Number(optionForm.price_adjustment || 0),
        min_select: optionForm.min_select ? Number(optionForm.min_select) : null,
        max_select: optionForm.max_select ? Number(optionForm.max_select) : null,
        sort_order: Number(optionForm.sort_order || 0)
      }
      await adminApi.createProductOption(payload)
      setStatusMessage('Da them tuy chon moi')
      setStatusType('success')
      setOptionForm({
        ...defaultOptionForm,
        product_id: selectedProductId
      })
      await loadOptions(selectedProductId)
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
    }
  }

  const handleOptionUpdate = async (event) => {
    event.preventDefault()
    if (!editingOption?.option_id) return
    try {
      const payload = {
        product_id: Number(editingOption.product_id),
        group_name: editingOption.group_name,
        option_name: editingOption.option_name,
        price_adjustment: Number(editingOption.price_adjustment || 0),
        is_required: Boolean(editingOption.is_required),
        min_select: editingOption.min_select ? Number(editingOption.min_select) : null,
        max_select: editingOption.max_select ? Number(editingOption.max_select) : null,
        sort_order: Number(editingOption.sort_order || 0)
      }
      await adminApi.updateProductOption(editingOption.option_id, payload)
      setStatusMessage('Cap nhat tuy chon thanh cong')
      setStatusType('success')
      setEditingOption(null)
      await loadOptions(selectedProductId)
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
    }
  }

  const handleOptionAvailabilityToggle = async (option) => {
    if (!option?.option_id) return
    try {
      await adminApi.setProductOptionAvailability(option.option_id, { is_active: !option.is_active })
      setStatusMessage(option.is_active ? 'Da tam dung tuy chon' : 'Da mo lai tuy chon')
      setStatusType('success')
      await loadOptions(selectedProductId)
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
    }
  }

  const handleOptionDelete = async (optionId) => {
    try {
      await adminApi.deleteProductOption(optionId)
      setStatusMessage('Da xoa tuy chon')
      setStatusType('success')
      await loadOptions(selectedProductId)
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
    }
  }

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h1 className="h3 mb-1">Quan ly thuc don</h1>
        <p className="text-muted mb-0">
          Dong bo danh muc, mon an va tuy chon topping tu he thong backend.
        </p>
      </div>

      <AdminStatusAlert message={statusMessage} type={statusType} />

      {loading ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <Spinner label="Dang tai du lieu thuc don..." />
          </div>
        </div>
      ) : (
        <>
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom-0">
              <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 align-items-lg-center">
                <div>
                  <h5 className="mb-1">Danh muc mon an</h5>
                  <p className="text-muted small mb-0">Tao, cap nhat hoac xoa danh muc de to chuc thuc don.</p>
                </div>
              </div>
            </div>
            <div className="card-body">
              <form className="row g-3 mb-4" onSubmit={handleCategoryFormSubmit}>
                <div className="col-md-4">
                  <label className="form-label fw-semibold">Ten danh muc</label>
                  <input
                    type="text"
                    className="form-control"
                    value={categoryForm.category_name}
                    required
                    onChange={(event) =>
                      setCategoryForm((prev) => ({ ...prev, category_name: event.target.value }))
                    }
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Mo ta</label>
                  <input
                    type="text"
                    className="form-control"
                    value={categoryForm.description}
                    onChange={(event) =>
                      setCategoryForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                  />
                </div>
                <div className="col-md-2 d-grid align-items-end">
                  <button type="submit" className="btn btn-primary">
                    Them danh muc
                  </button>
                </div>
              </form>

              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th style={{ width: '16rem' }}>Ten</th>
                      <th>Mo ta</th>
                      <th className="text-end" style={{ width: '12rem' }}>
                        Thao tac
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category) => (
                      <tr key={category.category_id}>
                        <td>
                          {editingCategory?.category_id === category.category_id ? (
                            <input
                              type="text"
                              className="form-control"
                              value={editingCategory.category_name}
                              onChange={(event) =>
                                setEditingCategory((prev) => ({
                                  ...prev,
                                  category_name: event.target.value
                                }))
                              }
                              required
                            />
                          ) : (
                            <span className="fw-semibold text-uppercase">{category.category_name}</span>
                          )}
                        </td>
                        <td>
                          {editingCategory?.category_id === category.category_id ? (
                            <input
                              type="text"
                              className="form-control"
                              value={editingCategory.description || ''}
                              onChange={(event) =>
                                setEditingCategory((prev) => ({
                                  ...prev,
                                  description: event.target.value
                                }))
                              }
                            />
                          ) : (
                            <span className="text-muted">{category.description || 'Chua co mo ta'}</span>
                          )}
                        </td>
                        <td className="text-end">
                          {editingCategory?.category_id === category.category_id ? (
                            <div className="d-flex gap-2 justify-content-end">
                              <button type="button" className="btn btn-sm btn-success" onClick={handleCategoryUpdate}>
                                Luu
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => setEditingCategory(null)}
                              >
                                Huy
                              </button>
                            </div>
                          ) : (
                            <div className="d-flex gap-2 justify-content-end">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => setEditingCategory(category)}
                              >
                                Chinh sua
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleCategoryDelete(category.category_id)}
                              >
                                Xoa
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {!categories.length && (
                      <tr>
                        <td colSpan={3} className="text-center text-muted py-4">
                          Chua co danh muc nao.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom-0">
              <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
                <div>
                  <h5 className="mb-1">Quan ly mon an</h5>
                  <p className="text-muted small mb-0">Them moi, chinh sua gia va dieu chinh trang thai phuc vu.</p>
                </div>
                <div className="d-flex gap-3 align-items-center">
                  <div className="form-check form-switch m-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="filterIncludeInactiveProducts"
                      checked={productFilters.includeInactive}
                      onChange={(event) =>
                        setProductFilters((prev) => ({ ...prev, includeInactive: event.target.checked }))
                      }
                    />
                    <label className="form-check-label small text-muted" htmlFor="filterIncludeInactiveProducts">
                      Hien ca mon dang tam dung
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div className="card-body">
              <form className="row g-3 mb-4" onSubmit={handleProductFormSubmit}>
                <div className="col-md-3">
                  <label className="form-label fw-semibold">Ten mon</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={productForm.name}
                    onChange={(event) =>
                      setProductForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label fw-semibold">Danh muc</label>
                  <select
                    className="form-select"
                    value={productForm.category_id}
                    onChange={(event) =>
                      setProductForm((prev) => ({ ...prev, category_id: event.target.value }))
                    }
                    required
                  >
                    <option value="">-- Chon danh muc --</option>
                    {categories.map((category) => (
                      <option key={category.category_id} value={category.category_id}>
                        {category.category_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label fw-semibold">Loai mon</label>
                  <select
                    className="form-select"
                    value={productForm.food_type}
                    onChange={(event) =>
                      setProductForm((prev) => ({ ...prev, food_type: event.target.value }))
                    }
                  >
                    {FOOD_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label fw-semibold">Gia ban (VND)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    className="form-control"
                    value={productForm.price}
                    onChange={(event) =>
                      setProductForm((prev) => ({ ...prev, price: event.target.value }))
                    }
                    required
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label fw-semibold">Hinh anh</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="form-control"
                    ref={productImageInputRef}
                    onChange={handleNewProductImageChange}
                  />
                  {productPreviewUrl ? (
                    <img
                      src={productPreviewUrl}
                      alt="Xem truoc mon an"
                      className="img-fluid rounded border mt-2"
                      style={{ maxHeight: '120px', objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="form-text mt-2">Chua chon hinh anh.</div>
                  )}
                  <div className="form-text">Dung luong toi da 5MB. Ho tro PNG, JPG, WEBP va GIF.</div>
                </div>
                <div className="col-12">
                  <label className="form-label fw-semibold">Mo ta ngan</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={productForm.description}
                    onChange={(event) =>
                      setProductForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                  />
                </div>
                <div className="col-12 d-flex justify-content-end">
                  <button type="submit" className="btn btn-dark">
                    Them mon an
                  </button>
                </div>
              </form>

              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>Mon an</th>
                      <th>Danh muc</th>
                      <th>Loai</th>
                      <th>Gia</th>
                      <th>Trang thai</th>
                      <th className="text-end">Thao tac</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => {
                      const categoryName =
                        categories.find((category) => category.category_id === product.category_id)?.category_name ||
                        'Khac'
                      const isEditing = editingProduct?.product_id === product.product_id
                      const isSelected = String(selectedProductId) === String(product.product_id)
                      const rowClass = !product.is_active ? 'table-warning-subtle' : ''
                      const resolvedEditingImageUrl = isEditing ? getProductImage(editingProduct) : ''
                      return (
                        <tr key={product.product_id} className={rowClass}>
                          <td style={{ minWidth: '16rem' }}>
                            {isEditing ? (
                              <>
                                <input
                                  type="text"
                                  className="form-control mb-2"
                                  value={editingProduct.name}
                                  onChange={(event) =>
                                    setEditingProduct((prev) => ({ ...prev, name: event.target.value }))
                                  }
                                  required
                                />
                                <textarea
                                  className="form-control"
                                  rows={2}
                                  value={editingProduct.description || ''}
                                  onChange={(event) =>
                                    setEditingProduct((prev) => ({ ...prev, description: event.target.value }))
                                  }
                                />
                                <div className="mt-2">
                                  <label className="form-label small fw-semibold mb-1">Hinh anh moi</label>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="form-control form-control-sm"
                                    ref={editImageInputRef}
                                    onChange={handleEditProductImageChange}
                                  />
                                  {(editPreviewUrl || resolvedEditingImageUrl) && (
                                    <img
                                      src={editPreviewUrl || resolvedEditingImageUrl}
                                      alt="Xem truoc hinh anh"
                                      className="img-fluid rounded border mt-2"
                                      style={{ maxHeight: '120px', objectFit: 'cover' }}
                                    />
                                  )}
                                  {!editPreviewUrl && resolvedEditingImageUrl && (
                                    <div className="form-text mt-2">
                                      <a
                                        href={resolvedEditingImageUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-decoration-none"
                                      >
                                        Xem hinh hien co
                                      </a>
                                    </div>
                                  )}
                                  {!editPreviewUrl && !resolvedEditingImageUrl && (
                                    <div className="form-text">Chua co hinh anh</div>
                                  )}
                                  <div className="form-text">Chon file moi de thay the anh hien co.</div>
                                  <div className="form-check mt-2">
                                    <input
                                      className="form-check-input"
                                      type="checkbox"
                                      id={`removeProductImage-${product.product_id}`}
                                      checked={Boolean(editingProduct.removeImage)}
                                      onChange={(event) =>
                                        setEditingProduct((prev) =>
                                          prev
                                            ? {
                                              ...prev,
                                              removeImage: event.target.checked,
                                              imageFile: event.target.checked ? null : prev.imageFile
                                            }
                                            : prev
                                        )
                                      }
                                      disabled={Boolean(editingProduct.imageFile)}
                                    />
                                    <label
                                      className="form-check-label small"
                                      htmlFor={`removeProductImage-${product.product_id}`}
                                    >
                                      Xoa hinh anh hien tai
                                    </label>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div>
                                <div className="fw-semibold">{product.name}</div>
                                <div className="text-muted small">{product.description || 'Chua co mo ta'}</div>
                              </div>
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <select
                                className="form-select"
                                value={editingProduct.category_id || ''}
                                onChange={(event) =>
                                  setEditingProduct((prev) => ({
                                    ...prev,
                                    category_id: event.target.value
                                  }))
                                }
                                required
                              >
                                <option value="">-- Chon danh muc --</option>
                                {categories.map((category) => (
                                  <option key={category.category_id} value={category.category_id}>
                                    {category.category_name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="badge bg-light text-dark border">{categoryName}</span>
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <select
                                className="form-select"
                                value={editingProduct.food_type || 'other'}
                                onChange={(event) =>
                                  setEditingProduct((prev) => ({ ...prev, food_type: event.target.value }))
                                }
                              >
                                {FOOD_TYPES.map((type) => (
                                  <option key={type.value} value={type.value}>
                                    {type.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-muted text-capitalize">{product.food_type}</span>
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <input
                                type="number"
                                className="form-control"
                                value={editingProduct.price}
                                min="0"
                                step="1000"
                                onChange={(event) =>
                                  setEditingProduct((prev) => ({ ...prev, price: event.target.value }))
                                }
                              />
                            ) : (
                              <span className="fw-semibold">{formatCurrency(product.price)}</span>
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <select
                                className="form-select"
                                value={editingProduct.is_active ? 'true' : 'false'}
                                onChange={(event) =>
                                  setEditingProduct((prev) => ({
                                    ...prev,
                                    is_active: event.target.value === 'true'
                                  }))
                                }
                              >
                                <option value="true">Dang phuc vu</option>
                                <option value="false">Tam dung</option>
                              </select>
                            ) : (
                              <div>
                                <span
                                  className={`badge rounded-pill px-3 py-2 ${product.is_active
                                      ? 'bg-success-subtle text-success'
                                      : 'bg-secondary-subtle text-secondary'
                                    }`}
                                >
                                  {product.is_active ? 'Dang phuc vu' : 'Tam dung'}
                                </span>
                                {!product.is_active && (
                                  <div className="text-muted small mt-1">
                                    {product.pause_reason ? `Ly do: ${product.pause_reason}` : 'Tam dung tam thoi'}
                                    {product.resume_at ? ` • Du kien mo lai: ${formatDateTime(product.resume_at)}` : ''}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="text-end" style={{ width: '15rem' }}>
                            {isEditing ? (
                              <div className="d-flex gap-2 justify-content-end">
                                <button type="button" className="btn btn-sm btn-success" onClick={handleProductUpdate}>
                                  Luu
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={clearEditingState}
                                >
                                  Huy
                                </button>
                              </div>
                            ) : (
                              <div className="d-flex gap-2 justify-content-end">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => {
                                    setEditingProduct({
                                      ...product,
                                      price: Number(product.price || 0),
                                      category_id: product.category_id ? String(product.category_id) : '',
                                      is_active: Boolean(product.is_active),
                                      imageFile: null,
                                      removeImage: false
                                    })
                                    if (editImageInputRef.current) {
                                      editImageInputRef.current.value = ''
                                    }
                                  }}
                                >
                                  Chinh sua
                                </button>
                                {product.is_active ? (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-warning"
                                    onClick={() => openPauseDialogForProduct(product)}
                                  >
                                    Tam dung
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-success"
                                    onClick={() => handleResumeProduct(product.product_id)}
                                  >
                                    Mo ban
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleProductDelete(product.product_id)}
                                >
                                  Xoa
                                </button>
                                <button
                                  type="button"
                                  className={`btn btn-sm ${isSelected
                                      ? 'btn-dark'
                                      : 'btn-outline-dark'
                                    }`}
                                  onClick={() => setSelectedProductId(String(product.product_id))}
                                >
                                  Tuy chon
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    {!products.length && (
                      <tr>
                        <td colSpan={6} className="text-center text-muted py-4">
                          Chua co mon an nao.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom-0 d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
              <div>
                <h5 className="mb-1">Tuy chon kem theo</h5>
                <p className="text-muted small mb-0">
                  Sua cac tuy chon topping, size va gia tang/giam cho mon an.
                </p>
              </div>
              <div className="d-flex flex-column flex-sm-row align-items-sm-center gap-3 w-100 justify-content-sm-end">
                <div className="d-flex gap-2 align-items-center">
                  <span className="text-muted small">Mon an dang chon:</span>
                  <select
                    className="form-select"
                    style={{ width: '16rem' }}
                    value={selectedProductId}
                    onChange={(event) => setSelectedProductId(event.target.value)}
                  >
                    {products.map((product) => (
                      <option key={product.product_id} value={product.product_id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                  {selectedProduct && !selectedProduct.is_active && (
                    <span className="badge bg-warning-subtle text-warning">Dang tam dung</span>
                  )}
                </div>
                <div className="d-flex flex-wrap gap-3">
                  <div className="form-check form-switch m-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="optionIncludeInactive"
                      checked={optionFilters.includeInactive}
                      onChange={(event) =>
                        setOptionFilters((prev) => ({ ...prev, includeInactive: event.target.checked }))
                      }
                    />
                    <label className="form-check-label small text-muted" htmlFor="optionIncludeInactive">
                      Hien tuy chon tam dung
                    </label>
                  </div>
                  <div className="form-check form-switch m-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="optionIncludeDeleted"
                      checked={optionFilters.includeDeleted}
                      onChange={(event) =>
                        setOptionFilters((prev) => ({ ...prev, includeDeleted: event.target.checked }))
                      }
                    />
                    <label className="form-check-label small text-muted" htmlFor="optionIncludeDeleted">
                      Hien tuy chon da xoa
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div className="card-body">
              <form className="row g-3 mb-4" onSubmit={handleOptionFormSubmit}>
                <div className="col-md-3">
                  <label className="form-label fw-semibold">Nhom tuy chon</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={optionForm.group_name}
                    onChange={(event) =>
                      setOptionForm((prev) => ({ ...prev, group_name: event.target.value }))
                    }
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label fw-semibold">Ten tuy chon</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={optionForm.option_name}
                    onChange={(event) =>
                      setOptionForm((prev) => ({ ...prev, option_name: event.target.value }))
                    }
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label fw-semibold">Gia dieu chinh</label>
                  <input
                    type="number"
                    className="form-control"
                    step="1000"
                    value={optionForm.price_adjustment}
                    onChange={(event) =>
                      setOptionForm((prev) => ({ ...prev, price_adjustment: event.target.value }))
                    }
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label fw-semibold">Thu tu</label>
                  <input
                    type="number"
                    className="form-control"
                    value={optionForm.sort_order}
                    onChange={(event) =>
                      setOptionForm((prev) => ({ ...prev, sort_order: event.target.value }))
                    }
                  />
                </div>
                <div className="col-md-2 d-flex align-items-end">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="option-required"
                      checked={optionForm.is_required}
                      onChange={(event) =>
                        setOptionForm((prev) => ({ ...prev, is_required: event.target.checked }))
                      }
                    />
                    <label className="form-check-label" htmlFor="option-required">
                      Bat buoc
                    </label>
                  </div>
                </div>
                <div className="col-md-2">
                  <label className="form-label fw-semibold">Chon toi thieu</label>
                  <input
                    type="number"
                    className="form-control"
                    value={optionForm.min_select}
                    onChange={(event) =>
                      setOptionForm((prev) => ({ ...prev, min_select: event.target.value }))
                    }
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label fw-semibold">Chon toi da</label>
                  <input
                    type="number"
                    className="form-control"
                    value={optionForm.max_select}
                    onChange={(event) =>
                      setOptionForm((prev) => ({ ...prev, max_select: event.target.value }))
                    }
                  />
                </div>
                <div className="col-12 d-flex justify-content-end">
                  <button type="submit" className="btn btn-outline-dark" disabled={!selectedProductId}>
                    Them tuy chon
                  </button>
                </div>
              </form>

              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>Nhom</th>
                      <th>Tuy chon</th>
                      <th>Gia dieu chinh</th>
                      <th>Bat buoc</th>
                      <th>Gioi han</th>
                      <th>Trang thai</th>
                      <th className="text-end">Thao tac</th>
                    </tr>
                  </thead>
                  <tbody>
                    {optionsLoading ? (
                      <tr>
                        <td colSpan={7} className="text-center py-4">
                          <Spinner label="Dang tai danh sach tuy chon..." />
                        </td>
                      </tr>
                    ) : options.length ? (
                      options.map((option) => {
                        const isEditing = editingOption?.option_id === option.option_id
                        const rowClass = option.is_active ? '' : 'table-warning-subtle'
                        return (
                          <tr key={option.option_id} className={rowClass}>
                            <td style={{ minWidth: '14rem' }}>
                              {isEditing ? (
                                <input
                                  type="text"
                                  className="form-control"
                                  value={editingOption.group_name}
                                  onChange={(event) =>
                                    setEditingOption((prev) => ({ ...prev, group_name: event.target.value }))
                                  }
                                  required
                                />
                              ) : (
                                <span className="fw-semibold">{option.group_name}</span>
                              )}
                            </td>
                            <td style={{ minWidth: '12rem' }}>
                              {isEditing ? (
                                <input
                                  type="text"
                                  className="form-control"
                                  value={editingOption.option_name}
                                  onChange={(event) =>
                                    setEditingOption((prev) => ({ ...prev, option_name: event.target.value }))
                                  }
                                  required
                                />
                              ) : (
                                <span>{option.option_name}</span>
                              )}
                            </td>
                            <td style={{ width: '10rem' }}>
                              {isEditing ? (
                                <input
                                  type="number"
                                  className="form-control"
                                  value={editingOption.price_adjustment}
                                  step="1000"
                                  onChange={(event) =>
                                    setEditingOption((prev) => ({
                                      ...prev,
                                      price_adjustment: event.target.value
                                    }))
                                  }
                                />
                              ) : (
                                <span>{formatCurrency(option.price_adjustment || 0)}</span>
                              )}
                            </td>
                            <td>
                              {isEditing ? (
                                <div className="form-check form-switch">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={Boolean(editingOption.is_required)}
                                    onChange={(event) =>
                                      setEditingOption((prev) => ({
                                        ...prev,
                                        is_required: event.target.checked
                                      }))
                                    }
                                  />
                                </div>
                              ) : (
                                <span
                                  className={`badge rounded-pill px-3 py-2 ${option.is_required ? 'bg-danger-subtle text-danger' : 'bg-light text-muted border'
                                    }`}
                                >
                                  {option.is_required ? 'Bat buoc' : 'Tuy chon'}
                                </span>
                              )}
                            </td>
                            <td>
                              {isEditing ? (
                                <div className="d-flex gap-2">
                                  <input
                                    type="number"
                                    className="form-control"
                                    value={editingOption.min_select || ''}
                                    placeholder="Min"
                                    onChange={(event) =>
                                      setEditingOption((prev) => ({
                                        ...prev,
                                        min_select: event.target.value
                                      }))
                                    }
                                  />
                                  <input
                                    type="number"
                                    className="form-control"
                                    value={editingOption.max_select || ''}
                                    placeholder="Max"
                                    onChange={(event) =>
                                      setEditingOption((prev) => ({
                                        ...prev,
                                        max_select: event.target.value
                                      }))
                                    }
                                  />
                                </div>
                              ) : (
                                <span className="text-muted small">
                                  {option.min_select ?? 0} - {option.max_select ?? 'Khong gioi han'}
                                </span>
                              )}
                            </td>
                            <td>
                              <span
                                className={`badge rounded-pill px-3 py-2 ${option.is_active
                                    ? 'bg-success-subtle text-success'
                                    : 'bg-secondary-subtle text-secondary'
                                  }`}
                              >
                                {option.is_active ? 'Dang su dung' : 'Tam dung'}
                              </span>
                            </td>
                            <td className="text-end" style={{ width: '18rem' }}>
                              {isEditing ? (
                                <div className="d-flex gap-2 justify-content-end">
                                  <button type="button" className="btn btn-sm btn-success" onClick={handleOptionUpdate}>
                                    Luu
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={() => setEditingOption(null)}
                                  >
                                    Huy
                                  </button>
                                </div>
                              ) : (
                                <div className="d-flex gap-2 justify-content-end">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={() => setEditingOption(option)}
                                  >
                                    Chinh sua
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-warning"
                                    onClick={() => handleOptionAvailabilityToggle(option)}
                                  >
                                    {option.is_active ? 'Tam dung' : 'Mo lai'}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => handleOptionDelete(option.option_id)}
                                  >
                                    Xoa
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="text-center text-muted py-4">
                          {selectedProductId
                            ? 'Chua co tuy chon nao cho mon an nay.'
                            : 'Hay chon mot mon an de xem tuy chon.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default AdminFoods



