import { useEffect, useState } from 'react'
import { connectSocket } from '../../../lib/socket'
import AdminStatusAlert from '../../../components/admin/AdminStatusAlert'
import Spinner from '../../../components/common/Spinner'
import staffApi from '../../../services/staffApi'
import { formatDateTime } from '../../../utils/format'

const StaffSupport = () => {
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState('info')
  const [messages, setMessages] = useState([])
  const [draftReplies, setDraftReplies] = useState({})
  const [typingMap, setTypingMap] = useState({})

  const loadMessages = async () => {
    setLoading(true)
    setStatusMessage('')
    setStatusType('info')
    try {
      const data = await staffApi.listSupportMessages()
      setMessages(Array.isArray(data) ? data : [])
      const draft = {}
      ;(Array.isArray(data) ? data : []).forEach((message) => {
        draft[message.message_id] = message.reply || ''
      })
      setDraftReplies(draft)
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
      setMessages([])
      setDraftReplies({})
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMessages()
  }, [])

  useEffect(() => {
    const socket = connectSocket()
    const onNew = (payload) => setMessages((prev) => [payload, ...prev])
    const onReplied = (payload) => setMessages((prev) => prev.map((m) => (m.message_id === payload.message_id ? { ...m, ...payload } : m)))
    const onTyping = (p) => {
      const userId = p?.user_id
      if (!userId) return
      setTypingMap((prev) => ({ ...prev, [userId]: !!p?.typing }))
      if (p?.typing) setTimeout(() => setTypingMap((prev) => ({ ...prev, [userId]: false })), 1500)
    }
    socket.on('support:new', onNew)
    socket.on('support:replied', onReplied)
    socket.on('support:typing', onTyping)
    return () => {
      socket.off('support:new', onNew)
      socket.off('support:replied', onReplied)
      socket.off('support:typing', onTyping)
    }
  }, [])

  const handleReplyChange = (messageId, value) => {
    setDraftReplies((prev) => ({ ...prev, [messageId]: value }))
  }

  const handleReplySubmit = async (event, messageId) => {
    event.preventDefault()
    try {
      await staffApi.replySupportMessage(messageId, { reply: draftReplies[messageId] || '' })
      setStatusMessage('Da gui phan hoi cho khach hang')
      setStatusType('success')
      await loadMessages()
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
    }
  }

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white border-bottom-0">
        <h5 className="mb-1">Ho tro khach hang</h5>
        <p className="text-muted mb-0">
          Tra loi cac tin nhan tu khach hang va ghi nhan van de can ho tro.
        </p>
      </div>
      <div className="card-body">
        <AdminStatusAlert message={statusMessage} type={statusType} />
        {loading ? (
          <div className="text-center py-4">
            <Spinner label="Dang tai tin nhan ho tro..." />
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {Object.values(typingMap).some(Boolean) && (
              <div className="alert alert-info py-2">
                Co khach dang go tin nhan...
              </div>
            )}
            {messages.map((message) => (
              <div key={message.message_id} className="border rounded-3 p-3">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <div className="fw-semibold">
                      {message.User?.full_name || message.User?.username || 'Khach hang'}
                    </div>
                    <small className="text-muted">Gui luc: {formatDateTime(message.sent_at)}</small>
                  </div>
                  <span className="badge bg-light text-dark border text-uppercase">{message.channel}</span>
                </div>
                <p className="mb-3">{message.message}</p>
                <form className="d-flex flex-column gap-2" onSubmit={(event) => handleReplySubmit(event, message.message_id)}>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Nhap cau tra loi cho khach hang..."
                    value={draftReplies[message.message_id] ?? ''}
                    onChange={(event) => {
                      handleReplyChange(message.message_id, event.target.value)
                      try {
                        const s = connectSocket()
                        s.emit('support:typing', { user_id: message.user_id, typing: true })
                        setTimeout(() => s.emit('support:typing', { user_id: message.user_id, typing: false }), 1200)
                      } catch {}
                    }}
                  />
                  <div className="d-flex justify-content-end gap-2">
                    <button type="submit" className="btn btn-sm btn-primary">
                      Gui phan hoi
                    </button>
                  </div>
                </form>
              </div>
            ))}
            {!messages.length && (
              <div className="text-center text-muted py-4">
                Khong co tin nhan ho tro nao tu khach hang.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default StaffSupport

