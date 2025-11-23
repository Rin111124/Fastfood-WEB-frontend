import { useState } from 'react'
import { resolveAssetUrl } from '../../services/apiClient'

const NewsForm = ({ initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    content: initialData?.content || '',
    imageFile: null
  })
  const [previewUrl, setPreviewUrl] = useState(initialData?.image_url ? resolveAssetUrl(initialData.image_url) : '')

  const handleImageChange = (event) => {
    const file = event.target.files?.[0]
    if (file) {
      setFormData(prev => ({ ...prev, imageFile: file }))
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const data = new FormData()
    data.append('title', formData.title.trim())
    data.append('content', formData.content.trim())
    if (formData.imageFile) {
      data.append('image', formData.imageFile)
    }
    onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit} className="row g-3">
      <div className="col-12">
        <label className="form-label">Tiêu đề</label>
        <input
          type="text"
          className="form-control"
          value={formData.title}
          onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
          required
        />
      </div>

      <div className="col-12">
        <label className="form-label">Nội dung</label>
        <textarea
          className="form-control"
          rows={4}
          value={formData.content}
          onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
          required
        />
      </div>

      <div className="col-12">
        <label className="form-label">Hình ảnh</label>
        <input
          type="file"
          className="form-control"
          accept="image/*"
          onChange={handleImageChange}
        />
        {previewUrl && (
          <img
            src={previewUrl}
            alt="Preview"
            className="mt-2 img-fluid rounded"
            style={{ maxHeight: '200px' }}
          />
        )}
      </div>

      <div className="col-12 d-flex justify-content-end gap-2">
        <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>
          Hủy
        </button>
        <button type="submit" className="btn btn-primary">
          {initialData ? 'Cập nhật' : 'Thêm mới'}
        </button>
      </div>
    </form>
  )
}

export default NewsForm