import { useEffect, useRef, useState } from 'react'
import { readSession } from '../../lib/session'
import { connectSocket, getSocket } from '../../lib/socket'
import { customerApi } from '../../services/customerApi'

const ChatWidget = () => {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [staffTyping, setStaffTyping] = useState(false)
  const [staffOnline, setStaffOnline] = useState(0)
  const [session, setSession] = useState(() => readSession())
  const bottomRef = useRef(null)
  const typingTimer = useRef(null)

  const QUICK_SUGGESTIONS = [
    { label: 'Giờ mở cửa', text: 'Cho mình hỏi giờ mở cửa và đóng cửa?' },
    { label: 'Menu hôm nay', text: 'Cho mình xem menu hôm nay.' },
    { label: 'Khuyến mãi', text: 'Hôm nay có khuyến mãi nào không?' },
    { label: 'Giao hàng', text: 'Phí giao hàng bao nhiêu và khu vực hỗ trợ?' },
    { label: 'Theo dõi đơn', text: 'Mình muốn kiểm tra trạng thái đơn hàng.' },
    { label: 'Địa chỉ quán', text: 'Địa chỉ/chi nhánh gần mình ở đâu?' },
    { label: 'Gặp nhân viên', text: 'Mình cần nói chuyện với nhân viên hỗ trợ.' }
  ]

  const MAIN_CHOICES = [
    { label: 'Xem thực đơn 🍔', text: '1' },
    { label: 'Khuyến mãi 🔥', text: '2' },
    { label: 'Kiểm tra đơn 🛵', text: '3' },
    { label: 'Địa chỉ & giờ 📍', text: '4' },
    { label: 'Gặp nhân viên 🧑‍💼', text: '5' }
  ]

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })

  const loadMessages = async () => {
    if (!session?.token) return
    setLoading(true)
    setError('')
    try {
      const data = await customerApi.getConversationMessages()
      setMessages(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e?.message || 'Khong the tai tin nhan')
    } finally {
      setLoading(false)
      setTimeout(scrollToBottom, 50)
    }
  }

  useEffect(() => {
    // Keep session fresh after login or tab changes
    const refresh = () => setSession(readSession())
    window.addEventListener('storage', refresh)
    window.addEventListener('focus', refresh)
    if (open) refresh()
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [open])

  useEffect(() => {
    if (!open || !session?.token) return
    loadMessages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, session?.token])

  useEffect(() => {
    if (!open || !session?.token) return
    const socket = connectSocket()
    const onReplied = () => loadMessages()
    const onTyping = (p) => {
      setStaffTyping(!!p?.typing)
      if (p?.typing) setTimeout(() => setStaffTyping(false), 1500)
    }
    const onStaffCount = (p) => setStaffOnline(Number(p?.count || 0))
    socket.on('support:replied', onReplied)
    socket.on('support:typing', onTyping)
    socket.on('presence:staff-count', onStaffCount)
    return () => {
      socket.off('support:replied', onReplied)
      socket.off('support:typing', onTyping)
      socket.off('presence:staff-count', onStaffCount)
    }
  }, [open, session?.token])

  const handleSend = async (e) => {
    e.preventDefault()
    sendMessage(draft)
  }

  const sendMessage = async (content) => {
    if (!session?.token) return
    const text = String(content || '').trim()
    if (!text) return
    try {
      setError('')
      await customerApi.postConversationMessage(text)
      await loadMessages()
      setDraft('')
      setTimeout(scrollToBottom, 50)
      const s = getSocket()
      if (s && !s.connected) connectSocket()
    } catch (e) {
      setError(e?.message || 'Khong the gui tin nhan')
    }
  }

  const emitTyping = (typing) => {
    try {
      const s = getSocket()
      if (!s?.connected) return
      s.emit('support:typing', { typing: !!typing })
    } catch {}
  }

  const renderBody = () => {
    if (!session?.token) {
      return (
        <div className="p-3 text-center text-muted" style={{ minHeight: 120 }}>
          Vui long dang nhap de chat voi nhan vien.
        </div>
      )
    }
    return (
      <div className="d-flex flex-column" style={{ height: 320 }}>
        <div className="flex-grow-1 overflow-auto p-3" style={{ background: '#f8f9fa' }}>
          {!!staffOnline && (
            <div className="small text-muted mb-2">{staffOnline} nhan vien dang online</div>
          )}
          {staffTyping && (
            <div className="small text-primary mb-2"><i className="bi bi-pencil" /> Nhan vien dang go...</div>
          )}
          {loading && <div className="text-center small text-muted">Dang tai...</div>}
          {messages.map((m, idx) => (
            <div key={m.chat_message_id || idx} className="mb-2">
              {m.sender_role === 'user' ? (
                <div className="align-self-start bg-white border rounded-3 p-2 shadow-sm" style={{ maxWidth: '85%' }}>
                  <div className="small text-muted mb-2">Ban</div>
                  <div>{m.body}</div>
                </div>
              ) : (
                <div className="align-self-end bg-primary text-white rounded-3 p-2 shadow-sm" style={{ maxWidth: '85%' }}>
                  <div className="small opacity-75 mb-2">{m.sender_role === 'bot' ? 'Tro ly' : 'Nhan vien'}</div>
                  <div>{m.body}</div>
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <form className="border-top p-2" onSubmit={handleSend}>
          {error && <div className="text-danger small mb-1">{error}</div>}
          <div className="mb-2" style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>
            {MAIN_CHOICES.map((q) => (
              <button
                key={q.label}
                type="button"
                className="btn btn-sm btn-outline-primary me-2 mb-2"
                onClick={() => sendMessage(q.text)}
                disabled={loading}
                title={q.label}
              >
                {q.label}
              </button>
            ))}
          </div>
          {/* Quick suggestions row removed */}
          <div className="input-group">
            <input
              type="text"
              className="form-control"
              placeholder="Nhap tin nhan..."
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                emitTyping(true)
                if (typingTimer.current) clearTimeout(typingTimer.current)
                typingTimer.current = setTimeout(() => emitTyping(false), 1200)
              }}
              disabled={loading}
            />
            <button type="submit" className="btn btn-primary" disabled={!draft.trim() || loading}>
              Gui
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 1050 }}>
      {!open && (
        <button className="btn btn-primary rounded-circle shadow" style={{ width: 56, height: 56 }} onClick={() => setOpen(true)}>
          <i className="bi bi-chat-dots" />
        </button>
      )}
      {open && (
        <div className="card shadow" style={{ width: 360 }}>
          <div className="card-header d-flex justify-content-between align-items-center">
            <div className="fw-semibold">Tro chuyen ho tro</div>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => setOpen(false)}>
              <i className="bi bi-x-lg" />
            </button>
          </div>
          <div className="card-body p-0">{renderBody()}</div>
        </div>
      )}
    </div>
  )
}

export default ChatWidget
