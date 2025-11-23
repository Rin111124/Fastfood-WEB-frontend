import { useEffect, useMemo, useState } from 'react'
import AdminStatusAlert from '../../../components/admin/AdminStatusAlert'
import Spinner from '../../../components/common/Spinner'
import adminApi from '../../../services/adminApi'
import { formatDateTime } from '../../../utils/format'

const defaultSettingForm = {
  key: '',
  value: '',
  group: 'general',
  description: ''
}

const AdminSettings = () => {
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState('info')

  const [settings, setSettings] = useState([])
  const [draftSettings, setDraftSettings] = useState({})
  const [newSetting, setNewSetting] = useState(defaultSettingForm)

  const [backups, setBackups] = useState([])
  const [backupLoading, setBackupLoading] = useState(false)

  const loadSettings = async () => {
    setLoading(true)
    setStatusMessage('')
    setStatusType('info')
    try {
      const data = await adminApi.listSettings()
      const list = Array.isArray(data) ? data : []
      setSettings(list)
      const draft = {}
      list.forEach((item) => {
        draft[item.setting_id] = {
          value: item.value,
          group: item.group,
          description: item.description || ''
        }
      })
      setDraftSettings(draft)
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
      setSettings([])
      setDraftSettings({})
    } finally {
      setLoading(false)
    }
  }

  const loadBackups = async () => {
    setBackupLoading(true)
    try {
      const data = await adminApi.listBackups()
      setBackups(Array.isArray(data) ? data : [])
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
      setBackups([])
    } finally {
      setBackupLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
    loadBackups()
  }, [])

  const handleDraftChange = (settingId, field, value) => {
    setDraftSettings((prev) => ({
      ...prev,
      [settingId]: {
        ...prev[settingId],
        [field]: value
      }
    }))
  }

  const handleSaveSettings = async () => {
    const payload = settings.map((item) => ({
      key: item.key,
      value: draftSettings[item.setting_id]?.value ?? '',
      group: draftSettings[item.setting_id]?.group || item.group || 'general',
      description: draftSettings[item.setting_id]?.description || ''
    }))

    try {
      await adminApi.upsertSettings(payload)
      setStatusMessage('Da cap nhat cau hinh he thong')
      setStatusType('success')
      await loadSettings()
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
    }
  }

  const handleCreateSetting = async (event) => {
    event.preventDefault()
    if (!newSetting.key || !newSetting.value) return
    try {
      await adminApi.upsertSettings({
        key: newSetting.key.trim(),
        value: newSetting.value,
        group: newSetting.group || 'general',
        description: newSetting.description
      })
      setStatusMessage('Da them cau hinh moi')
      setStatusType('success')
      setNewSetting(defaultSettingForm)
      await loadSettings()
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
    }
  }

  const handleCreateBackup = async () => {
    try {
      setBackupLoading(true)
      await adminApi.createBackup()
      setStatusMessage('Da tao ban sao du phong moi')
      setStatusType('success')
      await loadBackups()
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
    } finally {
      setBackupLoading(false)
    }
  }

  const handleRestoreBackup = async (fileName) => {
    try {
      setBackupLoading(true)
      await adminApi.restoreBackup(fileName)
      setStatusMessage('Da khoi phuc cau hinh tu ban sao du phong')
      setStatusType('success')
      await Promise.all([loadSettings(), loadBackups()])
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
    } finally {
      setBackupLoading(false)
    }
  }

  const groupedSettings = useMemo(() => {
    const groups = {}
    settings.forEach((setting) => {
      const group = setting.group || 'general'
      if (!groups[group]) {
        groups[group] = []
      }
      groups[group].push(setting)
    })
    return groups
  }, [settings])

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h1 className="h3 mb-1">Cau hinh he thong</h1>
        <p className="text-muted mb-0">
          Cap nhat thong tin cua hang, cau hinh thanh toan, sao luu va khoi phuc du lieu.
        </p>
      </div>

      <AdminStatusAlert message={statusMessage} type={statusType} />

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom-0">
          <h5 className="mb-0">Them cau hinh moi</h5>
        </div>
        <div className="card-body">
          <form className="row g-3 align-items-end" onSubmit={handleCreateSetting}>
            <div className="col-md-3">
              <label className="form-label text-uppercase text-muted small fw-semibold">Key</label>
              <input
                type="text"
                className="form-control"
                value={newSetting.key}
                onChange={(event) => setNewSetting((prev) => ({ ...prev, key: event.target.value }))}
                required
              />
            </div>
            <div className="col-md-3">
              <label className="form-label text-uppercase text-muted small fw-semibold">Gia tri</label>
              <input
                type="text"
                className="form-control"
                value={newSetting.value}
                onChange={(event) => setNewSetting((prev) => ({ ...prev, value: event.target.value }))}
                required
              />
            </div>
            <div className="col-md-2">
              <label className="form-label text-uppercase text-muted small fw-semibold">Nhom</label>
              <input
                type="text"
                className="form-control"
                value={newSetting.group}
                onChange={(event) => setNewSetting((prev) => ({ ...prev, group: event.target.value }))}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label text-uppercase text-muted small fw-semibold">Mo ta</label>
              <input
                type="text"
                className="form-control"
                value={newSetting.description}
                onChange={(event) =>
                  setNewSetting((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </div>
            <div className="col-md-1 d-grid">
              <button type="submit" className="btn btn-dark">
                Them
              </button>
            </div>
          </form>
        </div>
      </div>

      {loading ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <Spinner label="Dang tai cau hinh he thong..." />
          </div>
        </div>
      ) : (
        Object.entries(groupedSettings).map(([group, groupSettings]) => (
          <div className="card border-0 shadow-sm" key={group}>
            <div className="card-header bg-white border-bottom-0 d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-0 text-capitalize">{group}</h5>
                <small className="text-muted">Tong {groupSettings.length} cau hinh</small>
              </div>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th style={{ width: '14rem' }}>Key</th>
                      <th>Gia tri</th>
                      <th style={{ width: '12rem' }}>Nhom</th>
                      <th>Mo ta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupSettings.map((setting) => {
                      const draft = draftSettings[setting.setting_id] || {}
                      return (
                        <tr key={setting.setting_id}>
                          <td className="fw-semibold text-uppercase">{setting.key}</td>
                          <td>
                            <input
                              type="text"
                              className="form-control"
                              value={draft.value ?? ''}
                              onChange={(event) =>
                                handleDraftChange(setting.setting_id, 'value', event.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-control"
                              value={draft.group ?? 'general'}
                              onChange={(event) =>
                                handleDraftChange(setting.setting_id, 'group', event.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-control"
                              value={draft.description ?? ''}
                              onChange={(event) =>
                                handleDraftChange(setting.setting_id, 'description', event.target.value)
                              }
                            />
                          </td>
                        </tr>
                      )
                    })}
                    {!groupSettings.length && (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-4">
                          Khong co cau hinh nao trong nhom nay.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))
      )}

      {!loading && settings.length > 0 && (
        <div className="d-flex justify-content-end">
          <button type="button" className="btn btn-primary" onClick={handleSaveSettings}>
            Luu thay doi
          </button>
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom-0 d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">Sao luu &amp; khoi phuc</h5>
            <small className="text-muted">
              Du phong cau hinh quan ly he thong. Khoi phuc se ghi de cau hinh hien tai.
            </small>
          </div>
          <button
            type="button"
            className="btn btn-outline-dark"
            disabled={backupLoading}
            onClick={handleCreateBackup}
          >
            {backupLoading ? 'Dang tao...' : 'Tao ban sao du phong'}
          </button>
        </div>
        <div className="card-body">
          {backupLoading ? (
            <div className="text-center py-4">
              <Spinner label="Dang xu ly sao luu/khoi phuc..." />
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Duong dan</th>
                    <th className="text-end">Thao tac</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((backup) => (
                    <tr key={backup.name}>
                      <td>{backup.name}</td>
                      <td className="text-muted small">{backup.path}</td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleRestoreBackup(backup.name)}
                        >
                          Khoi phuc
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!backups.length && (
                    <tr>
                      <td colSpan={3} className="text-center text-muted py-4">
                        Chua co ban sao du phong nao.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminSettings

