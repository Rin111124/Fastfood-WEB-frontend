import { useCallback, useEffect, useMemo, useState } from "react"
import clsx from "clsx"
import AdminStatusAlert from "../../../components/admin/AdminStatusAlert"
import Spinner from "../../../components/common/Spinner"
import adminApi from "../../../services/adminApi"

const ROLE_OPTIONS = [
  { value: "admin", label: "Administrator" },
  { value: "staff", label: "Staff" },
  { value: "customer", label: "Customer" },
  { value: "shipper", label: "Shipper" }
]

const ROLE_BADGE_CLASS = {
  admin: "bg-primary-subtle text-primary",
  staff: "bg-warning-subtle text-warning",
  customer: "bg-info-subtle text-info",
  shipper: "bg-success-subtle text-success"
}

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "locked", label: "Locked" },
  { value: "suspended", label: "Suspended" }
]

const STATUS_BADGE_CLASS = {
  active: "bg-success-subtle text-success",
  locked: "bg-danger-subtle text-danger",
  suspended: "bg-secondary-subtle text-secondary"
}

const STATUS_FILTER_OPTIONS = [{ value: "all", label: "All statuses" }, ...STATUS_OPTIONS, { value: "deleted", label: "Deleted" }]

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^[0-9+().\-\s]{8,20}$/

const DEFAULT_CREATE_FORM = {
  username: "",
  email: "",
  password: "",
  role: "staff",
  status: "active",
  full_name: "",
  phone_number: "",
  address: "",
  gender: "unknown"
}

const DEFAULT_EDIT_FORM = {
  email: "",
  role: "customer",
  status: "active",
  full_name: "",
  phone_number: "",
  address: "",
  gender: "unknown",
  password: ""
}

const formatDateTime = (value) => {
  if (!value) return "N/A"
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value))
  } catch (error) {
    return String(value)
  }
}

const normalizeOptional = (value) => {
  if (value === null || value === undefined) return null
  const trimmed = String(value).trim()
  return trimmed ? trimmed : null
}
const AdminUsers = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")
  const [statusType, setStatusType] = useState("info")
  const [filters, setFilters] = useState({ search: "", role: "all", status: "all" })
  const [createForm, setCreateForm] = useState(DEFAULT_CREATE_FORM)
  const [createErrors, setCreateErrors] = useState({})
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [editForm, setEditForm] = useState(DEFAULT_EDIT_FORM)
  const [editErrors, setEditErrors] = useState({})
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [actionInFlight, setActionInFlight] = useState(null)

  const showStatus = (message, type = "info", autoDismiss = false) => {
    setStatusMessage(message)
    setStatusType(type)
    if (autoDismiss) {
      setTimeout(() => {
        setStatusMessage("")
        setStatusType("info")
      }, 3500)
    }
  }

  const resetStatus = () => {
    setStatusMessage("")
    setStatusType("info")
  }

  const loadUsers = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    try {
      const data = await adminApi.listUsers()
      setUsers(Array.isArray(data) ? data : [])
      if (!silent) resetStatus()
    } catch (error) {
      showStatus(error.message || "Unable to load users.", "error")
      setUsers([])
    } finally {
      if (silent) setRefreshing(false)
      else setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  useEffect(() => {
    if (!selectedUser) {
      setEditForm(DEFAULT_EDIT_FORM)
      setEditErrors({})
      return
    }
    setEditForm({
      email: selectedUser.email || "",
      role: (selectedUser.role || "customer").toLowerCase(),
      status: (selectedUser.status || "active").toLowerCase(),
      full_name: selectedUser.full_name || "",
      phone_number: selectedUser.phone_number || "",
      address: selectedUser.address || "",
      gender: (selectedUser.gender || "unknown").toLowerCase(),
      password: ""
    })
    setEditErrors({})
  }, [selectedUser])
  const filteredUsers = useMemo(() => {
    const list = Array.isArray(users) ? [...users] : []
    const keyword = filters.search.trim().toLowerCase()
    return list
      .filter((user) => {
        const normalizedRole = (user.role || "").toLowerCase()
        const normalizedStatus = (user.status || "").toLowerCase()
        const isDeleted = Boolean(user.deleted_at)

        if (filters.role !== "all" && normalizedRole !== filters.role) return false
        if (filters.status !== "all") {
          if (filters.status === "deleted") {
            if (!isDeleted) return false
          } else {
            if (isDeleted || normalizedStatus !== filters.status) return false
          }
        }
        if (keyword) {
          const haystack = [user.username, user.full_name, user.email, user.phone_number]
            .filter(Boolean)
            .map((value) => String(value).toLowerCase())
          if (!haystack.some((value) => value.includes(keyword))) return false
        }
        return true
      })
      .sort((a, b) => {
        const tsA = a?.created_at ? new Date(a.created_at).getTime() : 0
        const tsB = b?.created_at ? new Date(b.created_at).getTime() : 0
        return tsB - tsA
      })
  }, [users, filters])

  const handleFilterChange = (event) => {
    const { name, value } = event.target
    setFilters((previous) => ({
      ...previous,
      [name]: name === "search" ? value : value.toLowerCase()
    }))
  }

  const handleSearchSubmit = (event) => {
    event.preventDefault()
  }

  const handleCreateChange = (event) => {
    const { name, value } = event.target
    setCreateForm((previous) => ({
      ...previous,
      [name]: value
    }))
    if (createErrors[name]) {
      setCreateErrors((previous) => {
        const next = { ...previous }
        delete next[name]
        return next
      })
    }
  }

  const validateCreateForm = () => {
    const errors = {}
    if (!createForm.username.trim()) errors.username = "Please provide a username."
    if (!createForm.email.trim()) errors.email = "Email is required."
    else if (!EMAIL_REGEX.test(createForm.email.trim())) errors.email = "Email format looks invalid."
    if (!createForm.password.trim()) errors.password = "Password is required."
    else if (createForm.password.trim().length < 8) errors.password = "Password must be at least 8 characters."
    if (createForm.phone_number && !PHONE_REGEX.test(createForm.phone_number.trim())) {
      errors.phone_number = "Phone number appears invalid."
    }
    return errors
  }

  const handleCreateSubmit = async (event) => {
    event.preventDefault()
    const errors = validateCreateForm()
    if (Object.keys(errors).length) {
      setCreateErrors(errors)
      showStatus("Please review highlighted fields.", "error")
      return
    }
    setCreateSubmitting(true)
    try {
      const payload = {
        username: createForm.username.trim(),
        email: createForm.email.trim().toLowerCase(),
        password: createForm.password.trim(),
        role: createForm.role,
        status: createForm.status,
        full_name: normalizeOptional(createForm.full_name),
        phone_number: normalizeOptional(createForm.phone_number),
        address: normalizeOptional(createForm.address),
        gender: createForm.gender || "unknown"
      }
      await adminApi.createUser(payload)
      showStatus("User created successfully.", "success", true)
      setCreateForm(DEFAULT_CREATE_FORM)
      setCreateErrors({})
      await loadUsers({ silent: true })
      setSelectedUser(null)
    } catch (error) {
      showStatus(error.message || "Unable to create user.", "error")
    } finally {
      setCreateSubmitting(false)
    }
  }

  const handleSelectUser = (user) => {
    setSelectedUser(user)
    resetStatus()
  }

  const handleCancelEdit = () => {
    setSelectedUser(null)
    resetStatus()
  }

  const handleEditChange = (event) => {
    const { name, value } = event.target
    setEditForm((previous) => ({
      ...previous,
      [name]: value
    }))
    if (editErrors[name]) {
      setEditErrors((previous) => {
        const next = { ...previous }
        delete next[name]
        return next
      })
    }
  }

  const validateEditForm = () => {
    const errors = {}
    if (!editForm.email.trim()) errors.email = "Email is required."
    else if (!EMAIL_REGEX.test(editForm.email.trim())) errors.email = "Email format looks invalid."
    if (editForm.phone_number && !PHONE_REGEX.test(editForm.phone_number.trim())) {
      errors.phone_number = "Phone number appears invalid."
    }
    if (editForm.password && editForm.password.trim() && editForm.password.trim().length < 8) {
      errors.password = "New password must be at least 8 characters."
    }
    return errors
  }

  const handleEditSubmit = async (event) => {
    event.preventDefault()
    if (!selectedUser) return
    const errors = validateEditForm()
    if (Object.keys(errors).length) {
      setEditErrors(errors)
      showStatus("Please review highlighted fields.", "error")
      return
    }
    setEditSubmitting(true)
    try {
      const payload = {
        email: editForm.email.trim().toLowerCase(),
        role: editForm.role,
        status: editForm.status,
        full_name: normalizeOptional(editForm.full_name),
        phone_number: normalizeOptional(editForm.phone_number),
        address: normalizeOptional(editForm.address),
        gender: editForm.gender || "unknown"
      }
      if (editForm.password && editForm.password.trim()) {
        payload.password = editForm.password.trim()
      }
      await adminApi.updateUser(selectedUser.user_id, payload)
      showStatus("User updated successfully.", "success", true)
      await loadUsers({ silent: true })
      setEditForm((previous) => ({ ...previous, password: "" }))
    } catch (error) {
      showStatus(error.message || "Unable to update user.", "error")
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleDeleteUser = async (user) => {
    if (!user) return
    if (!window.confirm("Move this user to the recycle bin?")) return
    setActionInFlight(user.user_id)
    try {
      await adminApi.deleteUser(user.user_id, { force: false })
      showStatus("User moved to recycle bin.", "success", true)
      await loadUsers({ silent: true })
      if (selectedUser?.user_id === user.user_id) {
        handleCancelEdit()
      }
    } catch (error) {
      showStatus(error.message || "Unable to delete user.", "error")
    } finally {
      setActionInFlight(null)
    }
  }

  const handleRestoreUser = async (user) => {
    if (!user) return
    setActionInFlight(user.user_id)
    try {
      await adminApi.restoreUser(user.user_id)
      showStatus("User restored successfully.", "success", true)
      await loadUsers({ silent: true })
    } catch (error) {
      showStatus(error.message || "Unable to restore user.", "error")
    } finally {
      setActionInFlight(null)
    }
  }

  const handleSetStatus = async (user, status) => {
    if (!user || user.deleted_at) return
    if ((user.status || "").toLowerCase() === status) return
    setActionInFlight(user.user_id)
    try {
      await adminApi.setUserStatus(user.user_id, status)
      showStatus("Status updated successfully.", "success", true)
      await loadUsers({ silent: true })
    } catch (error) {
      showStatus(error.message || "Unable to update status.", "error")
    } finally {
      setActionInFlight(null)
    }
  }

  const handleRefresh = () => {
    loadUsers({ silent: true })
  }
  return (
    <div className="pb-4">
      <div className="mb-3">
        <AdminStatusAlert message={statusMessage} type={statusType} />
      </div>

      <div className="row g-4">
        <div className="col-12 col-xl-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white border-0 pb-0">
              <p className="text-uppercase text-muted small mb-1">Account tools</p>
              <h5 className="mb-0">{selectedUser ? 'Edit user' : 'Create user'}</h5>
            </div>
            <div className="card-body">
              {selectedUser ? (
                <div className="alert alert-light border d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <span className="fw-semibold">{selectedUser.username}</span>
                    <span className="text-muted ms-2">({selectedUser.email})</span>
                  </div>
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={handleCancelEdit}>
                    <i className="bi bi-person-plus me-1" />
                    Create new
                  </button>
                </div>
              ) : (
                <p className="text-muted small mb-3">
                  Fill in the form below to add a new account. Select a row from the user list to edit instead.
                </p>
              )}

              {!selectedUser ? (
                <form onSubmit={handleCreateSubmit} noValidate>
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label" htmlFor="createUsername">Username</label>
                      <input
                        id="createUsername"
                        name="username"
                        type="text"
                        className={clsx('form-control', createErrors.username && 'is-invalid')}
                        placeholder="fatfood.admin"
                        value={createForm.username}
                        onChange={handleCreateChange}
                        required
                      />
                      {createErrors.username && <div className="invalid-feedback">{createErrors.username}</div>}
                    </div>
                    <div className="col-12">
                      <label className="form-label" htmlFor="createEmail">Email</label>
                      <input
                        id="createEmail"
                        name="email"
                        type="email"
                        className={clsx('form-control', createErrors.email && 'is-invalid')}
                        placeholder="admin@example.com"
                        value={createForm.email}
                        onChange={handleCreateChange}
                        required
                      />
                      {createErrors.email && <div className="invalid-feedback">{createErrors.email}</div>}
                    </div>
                    <div className="col-12">
                      <label className="form-label" htmlFor="createPassword">Password</label>
                      <input
                        id="createPassword"
                        name="password"
                        type="password"
                        className={clsx('form-control', createErrors.password && 'is-invalid')}
                        placeholder="Minimum 8 characters"
                        value={createForm.password}
                        onChange={handleCreateChange}
                        required
                        minLength={8}
                      />
                      {createErrors.password && <div className="invalid-feedback">{createErrors.password}</div>}
                    </div>
                    <div className="col-6">
                      <label className="form-label" htmlFor="createRole">Role</label>
                      <select
                        id="createRole"
                        name="role"
                        className="form-select"
                        value={createForm.role}
                        onChange={handleCreateChange}
                      >
                        {ROLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label" htmlFor="createStatus">Status</label>
                      <select
                        id="createStatus"
                        name="status"
                        className="form-select"
                        value={createForm.status}
                        onChange={handleCreateChange}
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label" htmlFor="createFullName">Full name</label>
                      <input
                        id="createFullName"
                        name="full_name"
                        type="text"
                        className="form-control"
                        placeholder="Nguyen Van A"
                        value={createForm.full_name}
                        onChange={handleCreateChange}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label" htmlFor="createPhone">Phone number</label>
                      <input
                        id="createPhone"
                        name="phone_number"
                        type="tel"
                        className={clsx('form-control', createErrors.phone_number && 'is-invalid')}
                        placeholder="+84 912 345 678"
                        value={createForm.phone_number}
                        onChange={handleCreateChange}
                      />
                      {createErrors.phone_number && <div className="invalid-feedback">{createErrors.phone_number}</div>}
                    </div>
                    <div className="col-12">
                      <label className="form-label" htmlFor="createAddress">Address</label>
                      <textarea
                        id="createAddress"
                        name="address"
                        className="form-control"
                        rows="2"
                        placeholder="Street, district, city"
                        value={createForm.address}
                        onChange={handleCreateChange}
                      />
                    </div>
                    <div className="col-12 d-grid">
                      <button type="submit" className="btn btn-primary" disabled={createSubmitting}>
                        {createSubmitting && (
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                        )}
                        Create user
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleEditSubmit} noValidate>
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label" htmlFor="editEmail">Email</label>
                      <input
                        id="editEmail"
                        name="email"
                        type="email"
                        className={clsx('form-control', editErrors.email && 'is-invalid')}
                        value={editForm.email}
                        onChange={handleEditChange}
                        required
                      />
                      {editErrors.email && <div className="invalid-feedback">{editErrors.email}</div>}
                    </div>
                    <div className="col-6">
                      <label className="form-label" htmlFor="editRole">Role</label>
                      <select
                        id="editRole"
                        name="role"
                        className="form-select"
                        value={editForm.role}
                        onChange={handleEditChange}
                      >
                        {ROLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label" htmlFor="editStatus">Status</label>
                      <select
                        id="editStatus"
                        name="status"
                        className="form-select"
                        value={editForm.status}
                        onChange={handleEditChange}
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label" htmlFor="editFullName">Full name</label>
                      <input
                        id="editFullName"
                        name="full_name"
                        type="text"
                        className="form-control"
                        value={editForm.full_name}
                        onChange={handleEditChange}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label" htmlFor="editPhone">Phone number</label>
                      <input
                        id="editPhone"
                        name="phone_number"
                        type="tel"
                        className={clsx('form-control', editErrors.phone_number && 'is-invalid')}
                        value={editForm.phone_number}
                        onChange={handleEditChange}
                      />
                      {editErrors.phone_number && <div className="invalid-feedback">{editErrors.phone_number}</div>}
                    </div>
                    <div className="col-12">
                      <label className="form-label" htmlFor="editAddress">Address</label>
                      <textarea
                        id="editAddress"
                        name="address"
                        className="form-control"
                        rows="2"
                        value={editForm.address}
                        onChange={handleEditChange}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label" htmlFor="editPassword">Reset password</label>
                      <input
                        id="editPassword"
                        name="password"
                        type="password"
                        className={clsx('form-control', editErrors.password && 'is-invalid')}
                        placeholder="Leave blank to keep current password"
                        value={editForm.password}
                        onChange={handleEditChange}
                        minLength={8}
                      />
                      {editErrors.password && <div className="invalid-feedback">{editErrors.password}</div>}
                    </div>
                    <div className="col-12 d-grid">
                      <button type="submit" className="btn btn-primary" disabled={editSubmitting}>
                        {editSubmitting && (
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                        )}
                        Save changes
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-8">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white border-0 pb-0">
              <div className="d-flex flex-column flex-xl-row gap-3 align-items-xl-center">
                <div>
                  <p className="text-uppercase text-muted small mb-1">Directory</p>
                  <h5 className="mb-0">System users</h5>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm ms-xl-auto"
                  onClick={handleRefresh}
                  disabled={loading && !users.length}
                >
                  <i className="bi bi-arrow-clockwise me-2" />
                  Refresh
                  {refreshing && (
                    <span className="spinner-border spinner-border-sm ms-2" role="status" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
            <div className="card-body">
              <form className="row g-3 align-items-end mb-4" onSubmit={handleSearchSubmit}>
                <div className="col-12 col-lg-6">
                  <label className="form-label" htmlFor="filterSearch">Search</label>
                  <div className="position-relative">
                    <i className="bi bi-search position-absolute text-muted" style={{ top: "11px", left: "12px" }} />
                    <input
                      id="filterSearch"
                      name="search"
                      type="search"
                      className="form-control ps-5"
                      placeholder="Name, email or phone"
                      value={filters.search}
                      onChange={handleFilterChange}
                    />
                  </div>
                </div>
                <div className="col-6 col-lg-3">
                  <label className="form-label" htmlFor="filterRole">Role</label>
                  <select
                    id="filterRole"
                    name="role"
                    className="form-select"
                    value={filters.role}
                    onChange={handleFilterChange}
                  >
                    <option value="all">All roles</option>
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-6 col-lg-3">
                  <label className="form-label" htmlFor="filterStatus">Status</label>
                  <select
                    id="filterStatus"
                    name="status"
                    className="form-select"
                    value={filters.status}
                    onChange={handleFilterChange}
                  >
                    {STATUS_FILTER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </form>

              {loading ? (
                <Spinner message="Loading users..." />
              ) : filteredUsers.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <i className="bi bi-people display-6 d-block mb-3" />
                  No users match the current filters.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="table-light">
                      <tr>
                        <th scope="col">Account</th>
                        <th scope="col">Contact</th>
                        <th scope="col">Role</th>
                        <th scope="col">Status</th>
                        <th scope="col">Created</th>
                        <th scope="col" className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => {
                        const isDeleted = Boolean(user.deleted_at)
                        const normalizedRole = (user.role || '').toLowerCase()
                        const normalizedStatus = (user.status || '').toLowerCase()
                        return (
                          <tr key={user.user_id} className={clsx(isDeleted && 'opacity-75')}>
                            <td>
                              <div className="fw-semibold text-capitalize">{user.username}</div>
                              <div className="text-muted small">{user.full_name || 'Full name not provided'}</div>
                              {isDeleted && (
                                <span className="badge rounded-pill bg-dark text-white mt-2">Deleted</span>
                              )}
                            </td>
                            <td>
                              <div>{user.email || 'No email on file'}</div>
                              <div className="text-muted small">{user.phone_number || 'No phone number'}</div>
                            </td>
                            <td>
                              <span className={clsx('badge rounded-pill', ROLE_BADGE_CLASS[normalizedRole] || 'bg-secondary-subtle text-secondary')}>
                                {ROLE_OPTIONS.find((option) => option.value === normalizedRole)?.label || 'Unknown'}
                              </span>
                            </td>
                            <td>
                              {!isDeleted ? (
                                <span className={clsx('badge rounded-pill', STATUS_BADGE_CLASS[normalizedStatus] || 'bg-secondary-subtle text-secondary')}>
                                  {STATUS_OPTIONS.find((option) => option.value === normalizedStatus)?.label || 'Unknown'}
                                </span>
                              ) : (
                                <span className="badge rounded-pill bg-dark text-white">Deleted</span>
                              )}
                            </td>
                            <td className="text-muted small">
                              <div>{formatDateTime(user.created_at)}</div>
                              <div>Updated: {formatDateTime(user.updated_at)}</div>
                            </td>
                            <td>
                              <div className="d-flex flex-wrap justify-content-end gap-2">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => handleSelectUser(user)}
                                  disabled={actionInFlight === user.user_id}
                                >
                                  <i className="bi bi-pencil-square me-1" />
                                  Edit
                                </button>
                                <div className="dropdown">
                                  <button
                                    className="btn btn-sm btn-outline-secondary dropdown-toggle"
                                    type="button"
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                    disabled={actionInFlight === user.user_id}
                                  >
                                    Actions
                                  </button>
                                  <ul className="dropdown-menu dropdown-menu-end shadow-sm">
                                    <li>
                                      <button
                                        type="button"
                                        className="dropdown-item"
                                        onClick={() => handleSetStatus(user, 'active')}
                                        disabled={isDeleted || (user.status || '').toLowerCase() === 'active'}
                                      >
                                        <i className="bi bi-check-circle me-2" />
                                        Mark as active
                                      </button>
                                    </li>
                                    <li>
                                      <button
                                        type="button"
                                        className="dropdown-item"
                                        onClick={() => handleSetStatus(user, 'locked')}
                                        disabled={isDeleted || (user.status || '').toLowerCase() === 'locked'}
                                      >
                                        <i className="bi bi-shield-lock me-2" />
                                        Lock account
                                      </button>
                                    </li>
                                    <li>
                                      <hr className="dropdown-divider" />
                                    </li>
                                    {!isDeleted ? (
                                      <li>
                                        <button
                                          type="button"
                                          className="dropdown-item text-danger"
                                          onClick={() => handleDeleteUser(user)}
                                        >
                                          <i className="bi bi-trash me-2" />
                                          Delete
                                        </button>
                                      </li>
                                    ) : (
                                      <li>
                                        <button
                                          type="button"
                                          className="dropdown-item"
                                          onClick={() => handleRestoreUser(user)}
                                        >
                                          <i className="bi bi-arrow-counterclockwise me-2" />
                                          Restore
                                        </button>
                                      </li>
                                    )}
                                  </ul>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminUsers

