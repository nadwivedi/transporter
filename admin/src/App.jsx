import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

const initialForm = {
  _id: '',
  name: '',
  password: '',
  mobile: '',
  isActive: true,
}

function App() {
  const [activeSection, setActiveSection] = useState('users')
  const [users, setUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [formData, setFormData] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [whatsAppState, setWhatsAppState] = useState({
    loading: false,
    actionLoading: false,
    data: null,
    logs: [],
    logsLoading: false,
    result: '',
    error: '',
  })

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/api/users`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch users')
      }

      setUsers(result.data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to fetch users' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchWhatsAppStatus = async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setWhatsAppState((prev) => ({ ...prev, loading: true, error: '' }))
      }

      const response = await fetch(`${API_URL}/api/whatsapp/status`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch WhatsApp status')
      }

      setWhatsAppState((prev) => ({
        ...prev,
        loading: false,
        data: result.data || null,
      }))
    } catch (error) {
      console.error('Error fetching WhatsApp status:', error)
      setWhatsAppState((prev) => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to fetch WhatsApp status',
      }))
    }
  }

  const fetchWhatsAppLogs = async ({ silent = false } = {}) => {
    try {
      setWhatsAppState((prev) => ({
        ...prev,
        logsLoading: !silent,
      }))

      const response = await fetch(`${API_URL}/api/whatsapp/logs?limit=100`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch reminder logs')
      }

      setWhatsAppState((prev) => ({
        ...prev,
        logsLoading: false,
        logs: result.data || [],
      }))
    } catch (error) {
      console.error('Error fetching reminder logs:', error)
      setWhatsAppState((prev) => ({
        ...prev,
        logsLoading: false,
        error: error.message || 'Failed to fetch reminder logs',
      }))
    }
  }

  useEffect(() => {
    if (activeSection !== 'whatsapp') return undefined

    fetchWhatsAppStatus()
    fetchWhatsAppLogs()
    const intervalId = window.setInterval(() => {
      fetchWhatsAppStatus({ silent: true })
      fetchWhatsAppLogs({ silent: true })
    }, 5000)

    return () => window.clearInterval(intervalId)
  }, [activeSection])

  const runWhatsAppAction = async (endpoint, successText) => {
    try {
      setWhatsAppState((prev) => ({
        ...prev,
        actionLoading: true,
        result: '',
        error: '',
      }))

      const response = await fetch(`${API_URL}/api/whatsapp/${endpoint}`, {
        method: 'POST',
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'WhatsApp action failed')
      }

      setWhatsAppState((prev) => ({
        ...prev,
        actionLoading: false,
        data: result.data || prev.data,
        result: successText,
      }))

      await fetchWhatsAppStatus({ silent: true })
      await fetchWhatsAppLogs({ silent: true })
    } catch (error) {
      console.error(`Error during WhatsApp action ${endpoint}:`, error)
      setWhatsAppState((prev) => ({
        ...prev,
        actionLoading: false,
        error: error.message || 'WhatsApp action failed',
      }))
    }
  }

  const whatsAppStatusLabel = useMemo(() => {
    const status = whatsAppState.data?.status || 'new'
    switch (status) {
      case 'authenticated':
        return 'Connected'
      case 'qr_ready':
        return 'Scan QR'
      case 'initializing':
        return 'Connecting'
      case 'auth_failure':
        return 'Auth Failed'
      case 'disconnected':
        return 'Disconnected'
      default:
        return 'Not Started'
    }
  }, [whatsAppState.data])

  const whatsAppStatusClass = useMemo(() => {
    const status = whatsAppState.data?.status || 'new'
    if (status === 'authenticated') return 'status-active'
    if (status === 'qr_ready' || status === 'initializing') return 'status-pending'
    return 'status-inactive'
  }, [whatsAppState.data])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    if (message.text) setMessage({ type: '', text: '' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name || !formData.mobile || (!isEditMode && !formData.password)) {
      setMessage({ type: 'error', text: isEditMode ? 'Name and mobile are required' : 'Name, mobile, and password are required' })
      return
    }

    try {
      setSaving(true)
      const payload = {
        name: formData.name,
        mobile: formData.mobile,
        isActive: formData.isActive,
      }

      if (formData.password) {
        payload.password = formData.password
      }

      const response = await fetch(isEditMode ? `${API_URL}/api/users/${formData._id}` : `${API_URL}/api/users`, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || (isEditMode ? 'Failed to update user' : 'Failed to create user'))
      }

      setFormData(initialForm)
      setMessage({ type: 'success', text: isEditMode ? 'User updated successfully' : 'User created successfully' })
      setShowAddUserModal(false)
      setIsEditMode(false)
      fetchUsers()
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} user:`, error)
      setMessage({ type: 'error', text: error.message || (isEditMode ? 'Failed to update user' : 'Failed to create user') })
    } finally {
      setSaving(false)
    }
  }

  const openAddUserModal = () => {
    setFormData(initialForm)
    setMessage({ type: '', text: '' })
    setIsEditMode(false)
    setShowAddUserModal(true)
  }

  const openEditUserModal = (user) => {
    setFormData({
      _id: user._id,
      name: user.name || '',
      password: '',
      mobile: user.mobile || '',
      isActive: user.isActive !== false,
    })
    setMessage({ type: '', text: '' })
    setIsEditMode(true)
    setShowAddUserModal(true)
  }

  const closeUserModal = () => {
    setShowAddUserModal(false)
    setIsEditMode(false)
    setFormData(initialForm)
    setMessage({ type: '', text: '' })
  }

  const filteredUsers = users.filter((user) => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return true
    return [user.name, user.mobile].some((value) =>
      String(value || '').toLowerCase().includes(query)
    )
  })

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Admin Panel</p>
        </div>

        <nav className="sidebar-nav">
          <button
            type="button"
            onClick={() => setActiveSection('users')}
            className={`sidebar-link ${activeSection === 'users' ? 'sidebar-link-active' : ''}`}
          >
            User
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('whatsapp')}
            className={`sidebar-link ${activeSection === 'whatsapp' ? 'sidebar-link-active' : ''}`}
          >
            Add WhatsApp
          </button>
        </nav>
      </aside>

      <div className="content-area">
        {activeSection === 'users' ? (
          <>
            <div className="panel-grid">
              <section className="panel panel-full">
                <div className="panel-header panel-header-row">
                  <h2>All Users</h2>
                  <div className="toolbar">
                    <div className="search-box">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search user"
                      />
                    </div>
                    <button type="button" className="secondary-btn" onClick={fetchUsers}>Refresh</button>
                    <button
                      type="button"
                      className="primary-btn small-btn"
                      onClick={openAddUserModal}
                    >
                      Add User
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="empty-state">Loading users...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="empty-state">No users found.</div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Mobile</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((user) => (
                          <tr key={user._id}>
                            <td>{user.name || 'N/A'}</td>
                            <td>{user.mobile || 'N/A'}</td>
                            <td>
                              <span className={`status-pill ${user.isActive ? 'status-active' : 'status-inactive'}`}>
                                {user.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              <button type="button" className="secondary-btn table-btn" onClick={() => openEditUserModal(user)}>
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>

            {showAddUserModal ? (
              <div className="modal-overlay">
                <div className="modal-card">
                  <div className="modal-header">
                    <div>
                      <p className="eyebrow">User Popup</p>
                      <h2>{isEditMode ? 'Edit User' : 'Add User'}</h2>
                    </div>
                    <button type="button" className="icon-btn" onClick={closeUserModal}>
                      ×
                    </button>
                  </div>

                  <form className="user-form" onSubmit={handleSubmit}>
                    <label>
                      <span>Name</span>
                      <input name="name" value={formData.name} onChange={handleChange} />
                    </label>

                    <label>
                      <span>Password</span>
                      <input type="password" name="password" value={formData.password} onChange={handleChange} />
                    </label>

                    {isEditMode ? (
                      <label className="toggle-row">
                        <span>Active User</span>
                        <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} />
                      </label>
                    ) : null}

                    <label>
                      <span>Mobile</span>
                      <input name="mobile" value={formData.mobile} onChange={handleChange} />
                    </label>

                    {message.text ? (
                      <div className={`message ${message.type === 'error' ? 'message-error' : 'message-success'}`}>
                        {message.text}
                      </div>
                    ) : null}

                    <div className="modal-actions">
                      <button type="button" className="secondary-btn" onClick={closeUserModal}>
                        Cancel
                      </button>
                      <button type="submit" className="primary-btn" disabled={saving}>
                        {saving ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save User' : 'Create User')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <section className="panel panel-full">
              <div className="panel-header panel-header-row">
                <div>
                  <h2>WhatsApp Setup</h2>
                  <p className="section-text">Scan once from admin. The backend will reuse the saved session and send expiry reminders automatically.</p>
                </div>
                <div className="toolbar">
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => {
                      fetchWhatsAppStatus()
                      fetchWhatsAppLogs()
                    }}
                    disabled={whatsAppState.loading || whatsAppState.actionLoading}
                  >
                    Refresh
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => runWhatsAppAction('run-reminders', 'Expiry reminders processed')}
                    disabled={whatsAppState.actionLoading}
                  >
                    Send Reminders Now
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => runWhatsAppAction('stop', 'WhatsApp connection stopped')}
                    disabled={whatsAppState.actionLoading}
                  >
                    Stop
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => runWhatsAppAction('reset', 'Saved session cleared. Scan QR again.')}
                    disabled={whatsAppState.actionLoading}
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    className="primary-btn small-btn"
                    onClick={() => runWhatsAppAction('start', 'WhatsApp session started')}
                    disabled={whatsAppState.actionLoading}
                  >
                    {whatsAppState.actionLoading ? 'Please wait...' : 'Start WhatsApp'}
                  </button>
                </div>
              </div>

              <div className="whatsapp-layout">
                <div className="whatsapp-card">
                  <div className="whatsapp-card-header">
                    <span className={`status-pill ${whatsAppStatusClass}`}>{whatsAppStatusLabel}</span>
                  </div>

                  {whatsAppState.loading ? (
                    <div className="empty-state">Loading WhatsApp status...</div>
                  ) : whatsAppState.data?.qrCodeDataUrl ? (
                    <div className="qr-panel">
                      <img src={whatsAppState.data.qrCodeDataUrl} alt="WhatsApp QR Code" className="qr-image" />
                      <p className="section-text">Open WhatsApp on your phone, scan this QR, and keep this backend running.</p>
                    </div>
                  ) : (
                    <div className="empty-state">
                      {whatsAppState.data?.status === 'authenticated'
                        ? 'WhatsApp is already connected on this backend.'
                        : 'Click Start WhatsApp to generate a QR code.'}
                    </div>
                  )}
                </div>

                <div className="whatsapp-card">
                  <div className="details-grid">
                    <div className="detail-item">
                      <span>Phone</span>
                      <strong>{whatsAppState.data?.phoneNumber || 'Not connected'}</strong>
                    </div>
                    <div className="detail-item">
                      <span>Last Connected</span>
                      <strong>{whatsAppState.data?.lastConnectedAt ? new Date(whatsAppState.data.lastConnectedAt).toLocaleString() : 'N/A'}</strong>
                    </div>
                    <div className="detail-item">
                      <span>Saved Session</span>
                      <strong>{whatsAppState.data?.status === 'authenticated' ? 'Available' : 'Waiting for login'}</strong>
                    </div>
                    <div className="detail-item">
                      <span>Auto Reminder Rule</span>
                      <strong>7 days before, 2 days before, expiry day, 7 days after expiry</strong>
                    </div>
                  </div>

                  {whatsAppState.data?.lastError ? (
                    <div className="message message-error">{whatsAppState.data.lastError}</div>
                  ) : null}
                  {whatsAppState.error ? (
                    <div className="message message-error">{whatsAppState.error}</div>
                  ) : null}
                  {whatsAppState.result ? (
                    <div className="message message-success">{whatsAppState.result}</div>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="panel panel-full">
              <div className="panel-header panel-header-row">
                <div>
                  <h2>Reminder Logs</h2>
                  <p className="section-text">Shows both sent and failed reminders for the 4 fixed alert stages.</p>
                </div>
              </div>

              {whatsAppState.logsLoading ? (
                <div className="empty-state">Loading reminder logs...</div>
              ) : whatsAppState.logs.length === 0 ? (
                <div className="empty-state">No reminder logs found yet.</div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Vehicle No</th>
                        <th>Mobile</th>
                        <th>Expiry</th>
                        <th>Alert</th>
                        <th>Status</th>
                        <th>Updated</th>
                        <th>Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {whatsAppState.logs.map((log) => (
                        <tr key={log._id}>
                          <td>{log.recordType || 'N/A'}</td>
                          <td>{log.vehicleNumber || 'N/A'}</td>
                          <td>{log.mobileNumber || 'N/A'}</td>
                          <td>{log.expiryDate || 'N/A'}</td>
                          <td>{log.alertLabel || log.alertStage || 'N/A'}</td>
                          <td>
                            <span className={`status-pill ${log.status === 'sent' ? 'status-active' : 'status-inactive'}`}>
                              {log.status === 'sent' ? 'Sent' : 'Failed'}
                            </span>
                          </td>
                          <td>{log.updatedAt ? new Date(log.updatedAt).toLocaleString() : 'N/A'}</td>
                          <td>{log.error || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}

export default App
