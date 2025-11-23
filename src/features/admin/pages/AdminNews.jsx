import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AdminStatusAlert from '../../../components/admin/AdminStatusAlert'
import Spinner from '../../../components/common/Spinner'
import adminApi from '../../../services/adminApi'
import { resolveAssetUrl } from '../../../services/apiClient'
import { formatDateTime } from '../../../utils/format'

const buildEmptyForm = () => ({
  title: '',
  content: '',
  imageFile: null
})

const DetailModal = ({ item, onClose }) => {
  if (!item) return null

  return (
    <>
      <div className="modal fade show" style={{ display: 'block' }} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title mb-0">{item.title}</h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <div className="text-muted small mb-3">Cap nhat luc: {item.displayDate}</div>
              {item.image && (
                <img
                  src={item.image}
                  alt={item.title}
                  className="img-fluid rounded border mb-4"
                  style={{ maxHeight: 320, objectFit: 'cover', width: '100%' }}
                />
              )}
              <p className="mb-0" style={{ whiteSpace: 'pre-line' }}>
                {item.content}
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-primary" onClick={onClose}>
                Dong
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  )
}

const AdminNews = () => {
  const [newsList, setNewsList] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState('info')
  const [newsForm, setNewsForm] = useState(() => buildEmptyForm())
  const [editingNews, setEditingNews] = useState(null)
  const [selectedNews, setSelectedNews] = useState(null)
  const [createPreviewUrl, setCreatePreviewUrl] = useState('')
  const [editPreviewUrl, setEditPreviewUrl] = useState('')

  const createImageInputRef = useRef(null)
  const editImageInputRef = useRef(null)

  const resetStatus = useCallback(() => {
    setStatusMessage('')
    setStatusType('info')
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim())
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  const loadNews = useCallback(
    async (searchValue) => {
      setLoading(true)
      resetStatus()

      try {
        const data = await adminApi.listNews({
          search: searchValue ? searchValue : undefined
        })

        if (!Array.isArray(data)) {
          throw new Error('Du lieu tin tuc khong hop le.')
        }

        setNewsList(data)
      } catch (error) {
        console.error('Failed to load news:', error)
        setStatusMessage(error.message || 'Khong the tai danh sach tin tuc. Vui long thu lai sau.')
        setStatusType('error')
        setNewsList([])
      } finally {
        setLoading(false)
      }
    },
    [resetStatus]
  )

  useEffect(() => {
    loadNews(debouncedSearch)
  }, [loadNews, debouncedSearch])

  useEffect(() => {
    if (!newsForm.imageFile) {
      setCreatePreviewUrl('')
      return
    }
    const preview = URL.createObjectURL(newsForm.imageFile)
    setCreatePreviewUrl(preview)
    return () => URL.revokeObjectURL(preview)
  }, [newsForm.imageFile])

  useEffect(() => {
    if (!editingNews) {
      setEditPreviewUrl('')
      return
    }

    if (editingNews.imageFile) {
      const preview = URL.createObjectURL(editingNews.imageFile)
      setEditPreviewUrl(preview)
      return () => URL.revokeObjectURL(preview)
    }

    setEditPreviewUrl(editingNews.image || '')
  }, [editingNews])

  const handleCreateImageChange = (event) => {
    const file = event.target.files?.[0] || null
    setNewsForm((previous) => ({ ...previous, imageFile: file }))
  }

  const handleEditImageChange = (event) => {
    const file = event.target.files?.[0] || null
    setEditingNews((previous) =>
      previous
        ? {
            ...previous,
            imageFile: file,
            removeImage: false
          }
        : previous
    )
  }

  const handleNewsFormSubmit = async (event) => {
    event.preventDefault()
    resetStatus()

    const title = newsForm.title.trim()
    const content = newsForm.content.trim()
    if (!title || !content) {
      setStatusMessage('Vui long nhap day du tieu de va noi dung.')
      setStatusType('error')
      return
    }

    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('content', content)
      if (newsForm.imageFile) {
        formData.append('image', newsForm.imageFile)
      }

      await adminApi.createNews(formData)
      setStatusMessage('Da them tin tuc moi.')
      setStatusType('success')
      setNewsForm(buildEmptyForm())
      setCreatePreviewUrl('')
      if (createImageInputRef.current) {
        createImageInputRef.current.value = ''
      }
      await loadNews(debouncedSearch)
    } catch (error) {
      console.error('Failed to create news:', error)
      setStatusMessage(error.message || 'Khong the tao tin tuc moi.')
      setStatusType('error')
    }
  }

  const startEditNews = (item) => {
    setEditingNews({
      ...item,
      imageFile: null,
      removeImage: false
    })
    setEditPreviewUrl(item.image || '')
    if (editImageInputRef.current) {
      editImageInputRef.current.value = ''
    }
    resetStatus()
  }

  const cancelEdit = () => {
    setEditingNews(null)
    setEditPreviewUrl('')
    if (editImageInputRef.current) {
      editImageInputRef.current.value = ''
    }
  }

  const handleUpdateNews = async (event) => {
    event.preventDefault()
    if (!editingNews?.news_id) {
      setStatusMessage('Khong xac dinh duoc tin tuc can cap nhat.')
      setStatusType('error')
      return
    }

    const title = editingNews.title.trim()
    const content = editingNews.content.trim()
    if (!title || !content) {
      setStatusMessage('Vui long nhap day du tieu de va noi dung.')
      setStatusType('error')
      return
    }

    resetStatus()

    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('content', content)
      if (editingNews.imageFile) {
        formData.append('image', editingNews.imageFile)
      }
      if (editingNews.removeImage) {
        formData.append('removeImage', 'true')
      }

      await adminApi.updateNews(editingNews.news_id, formData)
      setStatusMessage('Da cap nhat tin tuc.')
      setStatusType('success')
      cancelEdit()
      await loadNews(debouncedSearch)
    } catch (error) {
      console.error('Failed to update news:', error)
      setStatusMessage(error.message || 'Khong the cap nhat tin tuc.')
      setStatusType('error')
    }
  }

  const handleDeleteNews = async (newsId) => {
    const target = computedNews.find((item) => item.news_id === newsId)
    if (!target) {
      setStatusMessage('Khong tim thay tin tuc can xoa.')
      setStatusType('error')
      return
    }

    const confirmed = window.confirm(`Ban co chac chan muon xoa tin tuc "${target.title}"?`)
    if (!confirmed) {
      return
    }

    resetStatus()
    setStatusMessage('Dang xoa tin tuc...')
    setStatusType('info')

    try {
      await adminApi.deleteNews(newsId)
      setStatusMessage('Da xoa tin tuc.')
      setStatusType('success')
      if (editingNews?.news_id === newsId) {
        cancelEdit()
      }
      await loadNews(debouncedSearch)
    } catch (error) {
      console.error('Failed to delete news:', error)
      setStatusMessage(error.message || 'Khong the xoa tin tuc.')
      setStatusType('error')
    }
  }

  useEffect(() => {
    if (!selectedNews) return
    const stillExists = newsList.some((item) => item.news_id === selectedNews.news_id)
    if (!stillExists) {
      setSelectedNews(null)
    }
  }, [newsList, selectedNews])

  const computedNews = useMemo(
    () =>
      newsList.map((item) => {
        const rawImage =
          typeof item.image === 'string' && item.image.trim()
            ? item.image.trim()
            : typeof item.image_url === 'string' && item.image_url.trim()
            ? item.image_url.trim()
            : null

        const normalizedImage =
          rawImage && rawImage.startsWith('data:')
            ? rawImage
            : rawImage
            ? resolveAssetUrl(rawImage)
            : null

        return {
          ...item,
          image: normalizedImage,
          displayDate: formatDateTime(item.updated_at || item.created_at),
          key: item.news_id
        }
      }),
    [newsList]
  )

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h1 className="h3 mb-1">Tin tuc & bai viet</h1>
        <p className="text-muted mb-0">
          Quan ly cac bai viet hien thi tren trang chu. Double click vao mot dong de xem chi tiet.
        </p>
      </div>

      <AdminStatusAlert message={statusMessage} type={statusType} />

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom-0">
          <h5 className="mb-1">Tao tin moi</h5>
          <p className="text-muted small mb-0">Dang tai bai viet kem hinh anh de thu hut khach hang.</p>
        </div>
        <div className="card-body">
          <form className="row g-3" onSubmit={handleNewsFormSubmit}>
            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold">Tieu de</label>
              <input
                type="text"
                className="form-control"
                value={newsForm.title}
                onChange={(event) => setNewsForm((previous) => ({ ...previous, title: event.target.value }))}
                required
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold">Hinh anh noi bat</label>
              <input
                type="file"
                accept="image/*"
                className="form-control"
                onChange={handleCreateImageChange}
                ref={createImageInputRef}
              />
              {createPreviewUrl && (
                <img
                  src={createPreviewUrl}
                  alt="Xem truoc tin tuc"
                  className="img-fluid rounded border mt-2"
                  style={{ maxHeight: 160, objectFit: 'cover' }}
                />
              )}
            </div>
            <div className="col-12">
              <label className="form-label fw-semibold">Noi dung</label>
              <textarea
                className="form-control"
                rows={4}
                value={newsForm.content}
                onChange={(event) => setNewsForm((previous) => ({ ...previous, content: event.target.value }))}
                required
              />
            </div>
            <div className="col-12 d-flex justify-content-end">
              <button type="submit" className="btn btn-primary">
                Dang tin
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom-0">
          <div className="d-flex flex-column flex-md-row gap-3 align-items-md-center justify-content-between">
            <div>
              <h5 className="mb-1">Danh sach tin tuc</h5>
              <p className="text-muted small mb-0">Tim kiem theo tieu de hoac noi dung bai viet.</p>
            </div>
            <div className="w-100 w-md-auto" style={{ maxWidth: 320 }}>
              <input
                type="search"
                className="form-control"
                placeholder="Tim kiem tin tuc..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="py-5 text-center">
              <Spinner label="Dang tai tin tuc..." />
            </div>
          ) : !computedNews.length ? (
            <div className="text-center text-muted py-4">Chua co tin tuc nao duoc dang.</div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th style={{ width: '28%' }}>Tieu de</th>
                    <th>Noi dung</th>
                    <th style={{ width: '18%' }}>Hinh anh</th>
                    <th style={{ width: '14%' }}>Cap nhat</th>
                    <th className="text-end" style={{ width: '14%' }}>
                      Hanh dong
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {computedNews.map((item) => (
                    <tr
                      key={item.key}
                      className={editingNews?.news_id === item.news_id ? 'table-warning-subtle' : ''}
                      onDoubleClick={() => setSelectedNews(item)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div className="fw-semibold">{item.title}</div>
                      </td>
                      <td>
                        <p className="mb-0 text-muted" style={{ whiteSpace: 'pre-line', maxHeight: '5.5em', overflow: 'hidden' }}>
                          {item.content}
                        </p>
                      </td>
                      <td>
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.title}
                            className="img-fluid rounded border"
                            style={{ maxHeight: 120, objectFit: 'cover' }}
                          />
                        ) : (
                          <span className="text-muted small">Chua co anh</span>
                        )}
                      </td>
                      <td>
                        <span className="text-muted small">{item.displayDate}</span>
                      </td>
                      <td className="text-end">
                        <div className="d-flex gap-2 justify-content-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => startEditNews(item)}
                          >
                            Chinh sua
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDeleteNews(item.news_id)}
                          >
                            Xoa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {editingNews && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-bottom-0 d-flex justify-content-between align-items-center">
            <div>
              <h5 className="mb-1">Chinh sua tin tuc</h5>
              <p className="text-muted small mb-0">Cap nhat noi dung va hinh anh tin tuc da chon.</p>
            </div>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={cancelEdit}>
              Huy chinh sua
            </button>
          </div>
          <div className="card-body">
            <form className="row g-3" onSubmit={handleUpdateNews}>
              <div className="col-12 col-md-6">
                <label className="form-label fw-semibold">Tieu de</label>
                <input
                  type="text"
                  className="form-control"
                  value={editingNews.title}
                  onChange={(event) =>
                    setEditingNews((previous) =>
                      previous ? { ...previous, title: event.target.value } : previous
                    )
                  }
                  required
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label fw-semibold">Hinh anh</label>
                <input
                  type="file"
                  accept="image/*"
                  className="form-control"
                  onChange={handleEditImageChange}
                  ref={editImageInputRef}
                />
                {(editPreviewUrl || (editingNews.image && !editingNews.removeImage)) && (
                  <img
                    src={editPreviewUrl || editingNews.image}
                    alt={editingNews.title}
                    className="img-fluid rounded border mt-2"
                    style={{ maxHeight: 160, objectFit: 'cover' }}
                  />
                )}
                <div className="form-check mt-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="removeNewsImage"
                    checked={Boolean(editingNews.removeImage)}
                    onChange={(event) =>
                      setEditingNews((previous) =>
                        previous
                          ? {
                              ...previous,
                              removeImage: event.target.checked,
                              imageFile: event.target.checked ? null : previous.imageFile
                            }
                          : previous
                      )
                    }
                    disabled={Boolean(editingNews.imageFile)}
                  />
                  <label className="form-check-label small" htmlFor="removeNewsImage">
                    Xoa hinh anh hien tai
                  </label>
                </div>
              </div>
              <div className="col-12">
                <label className="form-label fw-semibold">Noi dung</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={editingNews.content}
                  onChange={(event) =>
                    setEditingNews((previous) =>
                      previous ? { ...previous, content: event.target.value } : previous
                    )
                  }
                  required
                />
              </div>
              <div className="col-12 d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-outline-secondary" onClick={cancelEdit}>
                  Huy
                </button>
                <button type="submit" className="btn btn-primary">
                  Luu thay doi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DetailModal item={selectedNews} onClose={() => setSelectedNews(null)} />
    </div>
  )
}

export default AdminNews

