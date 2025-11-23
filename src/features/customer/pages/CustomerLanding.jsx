import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiFetch from '../../../services/apiClient'
import '../../../styles/customerLanding.css'

const NAV_ITEMS = Object.freeze([
  { id: 'overview', label: 'Tổng quan' },
  { id: 'profile', label: 'Quản lý thông tin' },
  { id: 'history', label: 'Nhật ký hồ sơ' }
])

const FIELD_LABELS = Object.freeze({
  user_id: 'Mã người dùng',
  username: 'Tên đăng nhập',
  email: 'Email',
  role: 'Vai trò',
  status: 'Trạng thái',
  full_name: 'Họ và tên',
  phone_number: 'Số điện thoại',
  address: 'Địa chỉ',
  gender: 'Giới tính',
  created_at: 'Tạo lúc',
  updated_at: 'Cập nhật lúc',
  deleted_at: 'Xóa lúc'
})

const PROFILE_FIELDS = Object.freeze(['full_name', 'phone_number', 'address', 'gender'])

const GENDER_OPTIONS = Object.freeze([
  { value: 'unknown', label: 'Không xác định' },
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other', label: 'Khác' }
])

const GENDER_LABELS = Object.freeze({
  unknown: 'Không xác định',
  male: 'Nam',
  female: 'Nữ',
  other: 'Khác'
})

const PROFILE_DISPLAY_ORDER = Object.freeze([
  'user_id',
  'username',
  'email',
  'role',
  'status',
  'full_name',
  'phone_number',
  'address',
  'gender',
  'created_at',
  'updated_at',
  'deleted_at'
])

const createEmptyForm = () => ({
  full_name: '',
  phone_number: '',
  address: '',
  gender: 'unknown'
})

const mapProfileToForm = (profile) => ({
  full_name: profile?.full_name ?? '',
  phone_number: profile?.phone_number ?? '',
  address: profile?.address ?? '',
  gender: profile?.gender ?? 'unknown'
})

const toComparable = (field, value) => {
  if (field === 'gender') {
    const normalized = typeof value === 'string' ? value.trim() : value
    return normalized && normalized.length ? normalized : 'unknown'
  }
  if (typeof value === 'string') {
    return value.trim()
  }
  return value ?? ''
}

const toPayloadValue = (field, value) => {
  if (field === 'gender') {
    const normalized = typeof value === 'string' ? value.trim() : value
    return normalized && normalized.length ? normalized : 'unknown'
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : null
  }
  return value ?? null
}

const normalizePayload = (data) =>
  PROFILE_FIELDS.reduce((acc, field) => {
    acc[field] = toPayloadValue(field, data[field])
    return acc
  }, {})

const resolveFieldLabel = (field) => {
  if (FIELD_LABELS[field]) {
    return FIELD_LABELS[field]
  }
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

const formatDateTime = (value) => {
  if (!value) {
    return 'Chưa cập nhật'
  }
  try {
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) {
      return 'Chưa cập nhật'
    }
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date)
  } catch (error) {
    return 'Chưa cập nhật'
  }
}

const isMeaningfulGender = (value) => value && value !== 'unknown'

const hasProfileDetails = (profile) => {
  if (!profile) {
    return false
  }
  return Boolean(
    profile.full_name ||
      profile.phone_number ||
      profile.address ||
      isMeaningfulGender(profile.gender)
  )
}

const formatHistoryChange = (field, value) => {
  const label = FIELD_LABELS[field] || field
  if (value === null || value === '') {
    return `${label}: đã xóa`
  }
  if (field === 'gender') {
    return `${label}: ${GENDER_LABELS[value] || value}`
  }
  return `${label}: ${value}`
}

const describeChanges = (changes) => {
  if (!changes || !Object.keys(changes).length) {
    return 'Không có chi tiết bổ sung.'
  }
  return Object.entries(changes)
    .map(([field, value]) => formatHistoryChange(field, value))
    .join(', ')
}

const resolveSafeMessage = (error, fallback) => {
  if (!error) {
    return fallback
  }
  const message = typeof error.message === 'string' ? error.message.trim() : ''
  return message.length ? message : fallback
}

const CustomerLanding = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [profile, setProfile] = useState(null)
  const [formMode, setFormMode] = useState('view')
  const [formState, setFormState] = useState(createEmptyForm)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState(null)
  const [history, setHistory] = useState([])

  const historyCounter = useRef(0)

  useEffect(() => {
    document.title = 'FatFood | Khách hàng'
  }, [])

  const appendHistory = useCallback((action, changes) => {
    historyCounter.current += 1
    const timestamp = new Date()
    setHistory((prev) => {
      const entry = {
        id: `entry-${timestamp.getTime()}-${historyCounter.current}`,
        action,
        summary: describeChanges(changes),
        timestamp: timestamp.toISOString()
      }
      return [entry, ...prev].slice(0, 15)
    })
  }, [])

  const loadProfile = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setStatus({ type: 'info', message: 'Đang tải thông tin khách hàng...' })
      }
      setLoading(true)
      try {
        const response = await apiFetch('/api/customer/me', { credentials: 'include' })
        const payload = await response.json()
        if (!payload?.success) {
        throw new Error(payload?.message || 'Không thể tải hồ sơ khách hàng.')
        }
        const data = payload.data || null
        setProfile(data)
        setFormMode('view')
        if (!silent) {
        setStatus({ type: 'success', message: 'Đã đồng bộ hồ sơ mới nhất.' })
        } else {
          setStatus((prev) => (prev?.type === 'error' ? prev : null))
        }
      } catch (error) {
        console.error('Failed to fetch customer profile', error)
        setStatus({
          type: 'error',
          message: resolveSafeMessage(error, 'Không thể tải hồ sơ khách hàng. Vui lòng thử lại sau.')
        })
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    loadProfile({ silent: true })
  }, [loadProfile])

  useEffect(() => {
    if (!profile) {
      if (formMode !== 'create') {
        setFormState(createEmptyForm())
      }
      return
    }
    if (formMode === 'create') {
      return
    }
    setFormState(mapProfileToForm(profile))
  }, [profile, formMode])

  const baselineForm = useMemo(() => mapProfileToForm(profile), [profile])

  const diff = useMemo(() => {
    if (!profile) {
      return {}
    }
    return PROFILE_FIELDS.reduce((acc, field) => {
      const currentValue = toComparable(field, formState[field])
      const baselineValue = toComparable(field, baselineForm[field])
      if (currentValue !== baselineValue) {
        acc[field] = toPayloadValue(field, formState[field])
      }
      return acc
    }, {})
  }, [formState, baselineForm, profile])

  const isDirty = useMemo(() => Object.keys(diff).length > 0, [diff])

  const profileHasDetails = hasProfileDetails(profile)

  const formatProfileValue = useCallback((key, value) => {
    if (value === null || typeof value === 'undefined') {
      return 'Chưa cập nhật'
    }
    if (key === 'gender') {
      return GENDER_LABELS[value] || value
    }
    if (key.endsWith('_at') || key.endsWith('_date') || key.endsWith('_time')) {
      return formatDateTime(value)
    }
      if (typeof value === 'boolean') {
        return value ? 'Có' : 'Không'
    }
    if (typeof value === 'number') {
      return String(value)
    }
      if (typeof value === 'string' && value.trim().length === 0) {
        return 'Chưa cập nhật'
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2)
      } catch (error) {
        return String(value)
      }
    }
    if (typeof value === 'string') {
      return value
    }
    return String(value)
  }, [])

  const fullProfileEntries = useMemo(() => {
    if (!profile) {
      return []
    }
    const entries = Object.entries(profile).map(([key, value]) => ({
      key,
      label: resolveFieldLabel(key),
      value: formatProfileValue(key, value)
    }))

    const orderMap = PROFILE_DISPLAY_ORDER.reduce((acc, field, index) => {
      acc[field] = index
      return acc
    }, {})

    return entries
      .sort((a, b) => {
        const orderA = Number.isInteger(orderMap[a.key]) ? orderMap[a.key] : Number.MAX_SAFE_INTEGER
        const orderB = Number.isInteger(orderMap[b.key]) ? orderMap[b.key] : Number.MAX_SAFE_INTEGER
        if (orderA !== orderB) {
          return orderA - orderB
        }
        return a.label.localeCompare(b.label)
      })
  }, [profile, formatProfileValue])

  const greetingName = useMemo(() => {
    const name = typeof profile?.full_name === 'string' ? profile.full_name.trim() : ''
    if (name.length) {
      return name
    }
    if (typeof profile?.username === 'string') {
      return profile.username
    }
    return 'Khach hang'
  }, [profile])

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId)
  }, [])

  const handleGoBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }, [navigate])

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormState((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const handleStartCreate = () => {
    setFormMode('create')
    setFormState(createEmptyForm())
    setActiveTab('profile')
    setStatus(null)
  }

  const handleStartEdit = () => {
    setFormMode('edit')
    setFormState(baselineForm)
    setActiveTab('profile')
    setStatus(null)
  }

  const handleCancelForm = () => {
    setFormMode('view')
    setFormState(baselineForm)
    setStatus(null)
  }

  const handleResetForm = () => {
    setFormState(baselineForm)
  }

  const handleRefresh = useCallback(() => {
    if (processing) {
      return
    }
    loadProfile({ silent: false })
  }, [loadProfile, processing])

  const handleCreateSubmit = async (event) => {
    event.preventDefault()
    if (processing) {
      return
    }
    const payload = normalizePayload(formState)
    const meaningful =
      Boolean(payload.full_name) ||
      Boolean(payload.phone_number) ||
      Boolean(payload.address) ||
      isMeaningfulGender(payload.gender)

    if (!meaningful) {
      setStatus({
        type: 'error',
        message: 'Vui long nhap it nhat mot truong thong tin.'
      })
      return
    }

    setProcessing(true)
    setStatus({ type: 'info', message: 'Đang tạo thông tin người dùng...' })
    try {
      const response = await apiFetch('/api/customer/me', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const payloadJson = await response.json()
      if (!payloadJson?.success) {
        throw new Error(payloadJson?.message || 'Không thể tạo thông tin người dùng.')
      }
      const nextProfile = payloadJson.data || null
      setProfile(nextProfile)
      setFormMode('view')
      setStatus({ type: 'success', message: 'Da tao thong tin nguoi dung.' })

      const loggedChanges = Object.fromEntries(
        Object.entries(payload).filter(([field, value]) =>
          field === 'gender' ? isMeaningfulGender(value) : value !== null
        )
      )
      appendHistory('Tao moi', loggedChanges)
      setActiveTab('overview')
    } catch (error) {
      console.error('Failed to create customer profile', error)
      setStatus({
        type: 'error',
        message: resolveSafeMessage(error, 'Không thể tạo thông tin người dùng. Vui lòng thử lại sau.')
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleUpdateSubmit = async (event) => {
    event.preventDefault()
    if (processing) {
      return
    }
    if (!isDirty) {
      setStatus({ type: 'info', message: 'Không có thay đổi nào cần lưu.' })
      return
    }

    setProcessing(true)
    setStatus({ type: 'info', message: 'Đang cập nhật thông tin người dùng...' })
    try {
      const response = await apiFetch('/api/customer/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(diff)
      })
      const payloadJson = await response.json()
      if (!payloadJson?.success) {
        throw new Error(payloadJson?.message || 'Không thể cập nhật thông tin người dùng.')
      }
      const nextProfile = payloadJson.data || null
      setProfile(nextProfile)
      setFormMode('view')
      setStatus({ type: 'success', message: 'Da cap nhat thong tin nguoi dung.' })
      appendHistory('Cap nhat', diff)
    } catch (error) {
      console.error('Failed to update customer profile', error)
      setStatus({
        type: 'error',
        message: resolveSafeMessage(error, 'Không thể cập nhật thông tin người dùng. Vui lòng thử lại sau.')
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleDeleteProfile = async () => {
    if (processing || !profileHasDetails) {
      return
    }
    const confirmed = window.confirm('Bạn chắc chắn muốn xóa thông tin liên lạc?')
    if (!confirmed) {
      return
    }

    setProcessing(true)
    setStatus({ type: 'info', message: 'Đang xóa thông tin người dùng...' })
    try {
      const response = await apiFetch('/api/customer/me', {
        method: 'DELETE',
        credentials: 'include'
      })
      const payloadJson = await response.json()
      if (!payloadJson?.success) {
        throw new Error(payloadJson?.message || 'Không thể xóa thông tin người dùng.')
      }
      const nextProfile = payloadJson.data || null
      setProfile(nextProfile)
      setFormMode('view')
      setActiveTab('overview')
      setStatus({ type: 'success', message: 'Đã xóa thông tin người dùng.' })
      appendHistory('Xoa', {
        full_name: null,
        phone_number: null,
        address: null,
        gender: 'unknown'
      })
    } catch (error) {
      console.error('Failed to delete customer profile', error)
      setStatus({
        type: 'error',
        message: resolveSafeMessage(error, 'Không thể xóa thông tin người dùng. Vui lòng thử lại sau.')
      })
    } finally {
      setProcessing(false)
    }
  }

  const accountSummary = useMemo(() => fullProfileEntries, [fullProfileEntries])

  const contactSummary = useMemo(() => {
    const mapped = mapProfileToForm(profile)
    return [
      { label: 'Họ tên', value: mapped.full_name || 'Chưa cập nhật' },
      { label: 'Số điện thoại', value: mapped.phone_number || 'Chưa cập nhật' },
      { label: 'Địa chỉ', value: mapped.address || 'Chưa cập nhật' },
      { label: 'Giới tính', value: GENDER_LABELS[mapped.gender] || 'Không xác định' }
    ]
  }, [profile])

  const latestHistory = history[0] || null

  const resolvedStatus = status && status.message ? status : null

  const isCreateMode = formMode === 'create'
  const isEditMode = formMode === 'edit'

  return (
    <div className="customer-page">
      <header className="customer-taskbar">
        <div className="customer-taskbar__layout">
          <div className="customer-taskbar__brand">FatFood Customer</div>
          <nav className="customer-taskbar__nav" aria-label="Dieu huong khach hang">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`customer-taskbar__link${activeTab === item.id ? ' is-active' : ''}`}
                onClick={() => handleTabChange(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="customer-taskbar__meta">
            <button
              type="button"
              className="customer-btn customer-btn--ghost customer-taskbar__back"
              onClick={handleGoBack}
              aria-label="Quay lại trang trước"
              title="Quay lại"
            >
              <span aria-hidden="true">←</span>
            </button>
            <span className="customer-taskbar__user">{greetingName}</span>
              <button
                type="button"
                className="customer-btn customer-btn--ghost customer-taskbar__refresh"
                onClick={handleRefresh}
                disabled={loading || processing}
              >
                {loading ? 'Đang tải...' : 'Đồng bộ'}
              </button>
            </div>
        </div>
      </header>

      <main className="customer-content">
        {resolvedStatus && (
          <div className={`customer-status customer-status--${resolvedStatus.type}`}>
            {resolvedStatus.message}
          </div>
        )}

        <section
          id="overview"
          className={`customer-section${activeTab === 'overview' ? ' is-active' : ''}`}
          hidden={activeTab !== 'overview'}
        >
          <div className="customer-section__header">
              <div>
                <p className="customer-section__eyebrow">Trang khách hàng</p>
                <h1 className="customer-section__title">Xin chào, {greetingName}</h1>
                <p className="customer-section__subtitle">
                  Quản lý thông tin cá nhân, kiểm tra trạng thái tài khoản và theo dõi hoạt động gần đây.
                </p>
              </div>
            <div className="customer-section__actions">
              <button
                type="button"
                className="customer-btn customer-btn--primary"
                onClick={() => setActiveTab('profile')}
                disabled={processing}
              >
                Quản lý thông tin
              </button>
            </div>
          </div>

          {loading && (
            <div className="customer-placeholder">Đang tải dữ liệu tài khoản...</div>
          )}

          {!loading && (
            <div className="customer-grid">
               <article className="customer-card">
                 <div className="customer-card__header">
                   <h2 className="customer-card__title">Thông tin người dùng</h2>
                   <span className="customer-chip">
                     {profile?.status ? profile.status : 'Chưa cập nhật'}
                   </span>
                 </div>
                 <dl className="customer-definition">
                   {accountSummary.length === 0 ? (
                     <div className="customer-definition__row">
                       <dt>Thông tin</dt>
                       <dd>Chưa có dữ liệu người dùng.</dd>
                     </div>
                   ) : (
                     accountSummary.map((item) => (
                       <div key={item.key} className="customer-definition__row">
                         <dt>{item.label}</dt>
                         <dd>{item.value || 'Chưa cập nhật'}</dd>
                       </div>
                     ))
                   )}
                 </dl>
               </article>

               <article className="customer-card">
                 <div className="customer-card__header">
                   <h2 className="customer-card__title">Thông tin liên lạc</h2>
                   <span className={`customer-chip${profileHasDetails ? ' customer-chip--success' : ''}`}>
                     {profileHasDetails ? 'Đã cập nhật' : 'Chưa cập nhật'}
                   </span>
                 </div>
                 <dl className="customer-definition">
                   {contactSummary.map((item) => (
                     <div key={item.label} className="customer-definition__row">
                       <dt>{item.label}</dt>
                       <dd>{item.value}</dd>
                     </div>
                   ))}
                 </dl>
               </article>

               <article className="customer-card customer-card--activity">
                 <div className="customer-card__header">
                   <h2 className="customer-card__title">Hoạt động gần đây</h2>
                 </div>
                 {latestHistory ? (
                   <div className="customer-activity__preview">
                     <p className="customer-activity__action">{latestHistory.action}</p>
                     <p className="customer-activity__time">{formatDateTime(latestHistory.timestamp)}</p>
                     <p className="customer-activity__summary">{latestHistory.summary}</p>
                     <button
                       type="button"
                       className="customer-btn customer-btn--ghost"
                       onClick={() => setActiveTab('history')}
                     >
                       Xem nhật ký
                     </button>
                   </div>
                 ) : (
                   <p className="customer-empty">
                     Chưa có hoạt động nào trong phiên làm việc này.
                   </p>
                 )}
               </article>
            </div>
          )}
        </section>

        <section
          id="profile"
          className={`customer-section${activeTab === 'profile' ? ' is-active' : ''}`}
          hidden={activeTab !== 'profile'}
        >
          <div className="customer-section__header">
              <div>
                <p className="customer-section__eyebrow">Quản lý hồ sơ</p>
                <h2 className="customer-section__title">Thông tin người dùng</h2>
                <p className="customer-section__subtitle">
                  Cập nhật thông tin liên lạc để chúng tôi có thể hỗ trợ bạn tốt nhất.
                </p>
              </div>
            <div className="customer-section__actions">
              {formMode === 'view' && !profileHasDetails && (
                <button
                  type="button"
                  className="customer-btn customer-btn--primary"
                  onClick={handleStartCreate}
                  disabled={processing}
                >
                  Tạo hồ sơ
                </button>
              )}
              {formMode === 'view' && profileHasDetails && (
                <>
                  <button
                    type="button"
                    className="customer-btn customer-btn--ghost"
                    onClick={handleStartEdit}
                    disabled={processing}
                  >
                    Chỉnh sửa
                  </button>
                  <button
                    type="button"
                    className="customer-btn customer-btn--danger"
                    onClick={handleDeleteProfile}
                    disabled={processing}
                  >
                    Xóa thông tin
                  </button>
                </>
              )}
            </div>
          </div>

          <article className="customer-card">
            <div className="customer-card__header">
              <h3 className="customer-card__title">Thong tin hien tai</h3>
            </div>
            <dl className="customer-definition">
              {contactSummary.map((item) => (
                <div key={item.label} className="customer-definition__row">
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          </article>

          <article className="customer-card customer-card--form">
              {formMode === 'view' ? (
                <p className="customer-note">
                  Chọn &quot;Tạo hồ sơ&quot; nếu bạn chưa có thông tin hoặc &quot;Chỉnh sửa&quot; để cập nhật trường đã có.
                </p>
            ) : (
              <form
                className="customer-form"
                onSubmit={isCreateMode ? handleCreateSubmit : handleUpdateSubmit}
                noValidate
              >
                <div className="customer-form__fields">
                  <div className="customer-form__field">
                    <label htmlFor="full_name">Ho va ten</label>
                    <input
                      id="full_name"
                      name="full_name"
                      value={formState.full_name}
                      onChange={handleInputChange}
                      placeholder="Nhap ho ten day du"
                      disabled={processing}
                      autoComplete="name"
                    />
                  </div>

                  <div className="customer-form__field">
                    <label htmlFor="phone_number">So dien thoai</label>
                    <input
                      id="phone_number"
                      name="phone_number"
                      value={formState.phone_number}
                      onChange={handleInputChange}
                      placeholder="Nhap so dien thoai lien he"
                      disabled={processing}
                      autoComplete="tel"
                    />
                  </div>

                  <div className="customer-form__field">
                    <label htmlFor="gender">Gioi tinh</label>
                    <select
                      id="gender"
                      name="gender"
                      value={formState.gender}
                      onChange={handleInputChange}
                      disabled={processing}
                    >
                      {GENDER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="customer-form__field customer-form__field--full">
                    <label htmlFor="address">Dia chi</label>
                    <textarea
                      id="address"
                      name="address"
                      rows={3}
                      value={formState.address}
                      onChange={handleInputChange}
                      placeholder="Nhap dia chi giao hang chi tiet"
                      disabled={processing}
                    />
                  </div>
                </div>

                <div className="customer-form__actions">
                  <button
                    type="submit"
                    className="customer-btn customer-btn--primary"
                    disabled={processing || (isEditMode && !isDirty)}
                  >
                    {processing ? 'Đang xử lý...' : isCreateMode ? 'Tạo thông tin' : 'Lưu thay đổi'}
                  </button>
                  <button
                    type="button"
                    className="customer-btn customer-btn--ghost"
                    onClick={handleCancelForm}
                    disabled={processing}
                  >
                    Hủy
                  </button>
                  {isEditMode && (
                    <button
                      type="button"
                      className="customer-btn customer-btn--ghost"
                      onClick={handleResetForm}
                      disabled={processing || !isDirty}
                    >
                      Khôi phục giá trị
                    </button>
                  )}
                  {profileHasDetails && (
                      <button
                        type="button"
                        className="customer-btn customer-btn--danger"
                        onClick={handleDeleteProfile}
                        disabled={processing}
                      >
                        Xóa thông tin
                      </button>
                  )}
                </div>
              </form>
            )}
          </article>
        </section>

        <section
          id="history"
          className={`customer-section${activeTab === 'history' ? ' is-active' : ''}`}
          hidden={activeTab !== 'history'}
        >
          <div className="customer-section__header">
            <div>
              <p className="customer-section__eyebrow">Nhat ky</p>
              <h2 className="customer-section__title">Hoat dong ho so</h2>
              <p className="customer-section__subtitle">
                Du lieu chi luu trong phien lam viec hien tai de bao ve quyen rieng tu cua ban.
              </p>
            </div>
          </div>

          <article className="customer-card customer-card--history">
            {history.length === 0 ? (
                <p className="customer-empty">
                  Chưa có hoạt động nào được ghi nhận. Cập nhật hồ sơ để xem lại lịch sử thay đổi.
                </p>
            ) : (
              <ul className="customer-history__list">
                {history.map((entry) => (
                  <li key={entry.id} className="customer-history__item">
                    <div className="customer-history__meta">
                      <span className="customer-history__action">{entry.action}</span>
                      <span className="customer-history__time">{formatDateTime(entry.timestamp)}</span>
                    </div>
                    <p className="customer-history__summary">{entry.summary}</p>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>
      </main>
    </div>
  )
}

export default CustomerLanding

