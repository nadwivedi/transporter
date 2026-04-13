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

const initialLoginForm = {
  email: '',
  password: '',
}

const initialWhatsAppForm = {
  displayName: '',
}

function AppSecure() {
  const [activeSection, setActiveSection] = useState('users')
  const [users, setUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [formData, setFormData] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [loginForm, setLoginForm] = useState(initialLoginForm)
  const [loginState, setLoginState] = useState({
    checking: true,
    submitting: false,
    authenticated: false,
    admin: null,
    error: '',
  })
  const [whatsAppState, setWhatsAppState] = useState({
    loading: false,
    actionLoading: false,
    sessions: [],
    activeSessionKey: '',
    selectedSessionKey: '',
    logs: [],
    logsLoading: false,
    result: '',
    error: '',
  })
  const [whatsAppForm, setWhatsAppForm] = useState(initialWhatsAppForm)

  const apiFetch = async (endpoint, options = {}) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      credentials: 'include',
      ...options,
      headers: {
        ...(options.headers || {}),
      },
    })

    let result = {}
    try {
      result = await response.json()
    } catch (_error) {
      result = {}
    }

    if (response.status === 401) {
      setLoginState((prev) => ({
        ...prev,
        checking: false,
        authenticated: false,
        admin: null,
      }))
      throw new Error('Unauthorized')
    }

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Request failed')
    }

    return result
  }

  const checkAdminAuth = async () => {
    try {
      const result = await apiFetch('/api/auth/admin/profile')
      setLoginState({
        checking: false,
        submitting: false,
        authenticated: true,
        admin: result.data?.admin || null,
        error: '',
      })
    } catch (error) {
      setLoginState((prev) => ({
        ...prev,
        checking: false,
        submitting: false,
        authenticated: false,
        admin: null,
        error: error.message === 'Unauthorized' ? '' : error.message || 'Failed to verify admin session',
      }))
    }
  }

  useEffect(() => {
    checkAdminAuth()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setMessage({ type: '', text: '' })
      const result = await apiFetch('/api/users')
      setUsers(result.data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to fetch users' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!loginState.authenticated) return
    fetchUsers()
  }, [loginState.authenticated])

  const fetchWhatsAppStatus = async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setWhatsAppState((prev) => ({ ...prev, loading: true, error: '' }))
      }

      const result = await apiFetch('/api/whatsapp/status')

      setWhatsAppState((prev) => ({
        ...prev,
        loading: false,
        sessions: result.data?.sessions || [],
        activeSessionKey: result.data?.activeSessionKey || '',
        selectedSessionKey:
          (result.data?.sessions || []).some((session) => session.sessionKey === prev.selectedSessionKey)
            ? prev.selectedSessionKey
            : (result.data?.activeSessionKey || result.data?.sessions?.[0]?.sessionKey || ''),
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

      const result = await apiFetch('/api/whatsapp/logs?limit=100')

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
    if (!loginState.authenticated || activeSection !== 'whatsapp') return undefined

    fetchWhatsAppStatus()
    fetchWhatsAppLogs()
    const intervalId = window.setInterval(() => {
      fetchWhatsAppStatus({ silent: true })
      fetchWhatsAppLogs({ silent: true })
    }, 5000)

    return () => window.clearInterval(intervalId)
  }, [activeSection, loginState.authenticated])

  const runWhatsAppAction = async (sessionKey, endpoint, successText) => {
    try {
      setWhatsAppState((prev) => ({
        ...prev,
        actionLoading: true,
        result: '',
        error: '',
      }))

      await apiFetch(`/api/whatsapp/sessions/${encodeURIComponent(sessionKey)}/${endpoint}`, {
        method: 'POST',
      })

      setWhatsAppState((prev) => ({
        ...prev,
        actionLoading: false,
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

  const createWhatsAppSession = async (e) => {
    e.preventDefault()

    if (!whatsAppForm.displayName.trim()) {
      setWhatsAppState((prev) => ({
        ...prev,
        error: 'Session name is required',
        result: '',
      }))
      return
    }

    try {
      setWhatsAppState((prev) => ({
        ...prev,
        actionLoading: true,
        error: '',
        result: '',
      }))

      const result = await apiFetch('/api/whatsapp/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: whatsAppForm.displayName.trim(),
        }),
      })

      setWhatsAppForm(initialWhatsAppForm)
      setWhatsAppState((prev) => ({
        ...prev,
        actionLoading: false,
        selectedSessionKey: result.data?.sessionKey || prev.selectedSessionKey,
        result: 'New WhatsApp session added',
      }))
      await fetchWhatsAppStatus({ silent: true })
    } catch (error) {
      console.error('Error creating WhatsApp session:', error)
      setWhatsAppState((prev) => ({
        ...prev,
        actionLoading: false,
        error: error.message || 'Failed to create WhatsApp session',
      }))
    }
  }

  const setActiveWhatsAppSession = async (sessionKey) => {
    try {
      setWhatsAppState((prev) => ({
        ...prev,
        actionLoading: true,
        error: '',
        result: '',
      }))

      await apiFetch(`/api/whatsapp/sessions/${encodeURIComponent(sessionKey)}/activate`, {
        method: 'POST',
      })

      setWhatsAppState((prev) => ({
        ...prev,
        actionLoading: false,
        result: 'Active sending session updated',
      }))
      await fetchWhatsAppStatus({ silent: true })
    } catch (error) {
      console.error('Error setting active WhatsApp session:', error)
      setWhatsAppState((prev) => ({
        ...prev,
        actionLoading: false,
        error: error.message || 'Failed to set active session',
      }))
    }
  }

  const runReminderNow = async () => {
    try {
      setWhatsAppState((prev) => ({
        ...prev,
        actionLoading: true,
        error: '',
        result: '',
      }))

      await apiFetch('/api/whatsapp/run-reminders', {
        method: 'POST',
      })

      setWhatsAppState((prev) => ({
        ...prev,
        actionLoading: false,
        result: 'Expiry reminders processed',
      }))
      await fetchWhatsAppLogs({ silent: true })
    } catch (error) {
      console.error('Error running reminders:', error)
      setWhatsAppState((prev) => ({
        ...prev,
        actionLoading: false,
        error: error.message || 'Failed to run reminders',
      }))
    }
  }

  const selectedWhatsAppSession = useMemo(
    () => whatsAppState.sessions.find((session) => session.sessionKey === whatsAppState.selectedSessionKey) || null,
    [whatsAppState.selectedSessionKey, whatsAppState.sessions]
  )

  const whatsAppStatusLabel = useMemo(() => {
    const status = selectedWhatsAppSession?.status || 'new'
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
  }, [selectedWhatsAppSession])

  const whatsAppStatusClass = useMemo(() => {
    const status = selectedWhatsAppSession?.status || 'new'
    if (status === 'authenticated') return 'status-active'
    if (status === 'qr_ready' || status === 'initializing') return 'status-pending'
    return 'status-inactive'
  }, [selectedWhatsAppSession])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    if (message.text) setMessage({ type: '', text: '' })
  }

  const handleLoginChange = (e) => {
    const { name, value } = e.target
    setLoginForm((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (loginState.error) {
      setLoginState((prev) => ({ ...prev, error: '' }))
    }
  }

  const handleWhatsAppFormChange = (e) => {
    const { value } = e.target
    setWhatsAppForm({ displayName: value })
    if (whatsAppState.error || whatsAppState.result) {
      setWhatsAppState((prev) => ({ ...prev, error: '', result: '' }))
    }
  }

  const handleLoginSubmit = async (e) => {
    e.preventDefault()

    if (!loginForm.email || !loginForm.password) {
      setLoginState((prev) => ({
        ...prev,
        error: 'Email and password are required',
      }))
      return
    }

    try {
      setLoginState((prev) => ({
        ...prev,
        submitting: true,
        error: '',
      }))

      const result = await apiFetch('/api/auth/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginForm),
      })

      if (!result.data?.admin) {
        await checkAdminAuth()
      } else {
        setLoginState({
          checking: true,
          submitting: false,
          authenticated: false,
          admin: null,
          error: '',
        })
        await checkAdminAuth()
      }
      setLoginForm(initialLoginForm)
    } catch (error) {
      console.error('Admin login error:', error)
      setLoginState((prev) => ({
        ...prev,
        submitting: false,
        error: error.message || 'Login failed',
      }))
    }
  }

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/admin/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('Admin logout error:', error)
    }

    setLoginState({
      checking: false,
      submitting: false,
      authenticated: false,
      admin: null,
      error: '',
    })
    setUsers([])
    setSearchTerm('')
    setShowAddUserModal(false)
    setIsEditMode(false)
    setFormData(initialForm)
    setWhatsAppForm(initialWhatsAppForm)
    setWhatsAppState({
      loading: false,
      actionLoading: false,
      sessions: [],
      activeSessionKey: '',
      selectedSessionKey: '',
      logs: [],
      logsLoading: false,
      result: '',
      error: '',
    })
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

      await apiFetch(isEditMode ? `/api/users/${formData._id}` : '/api/users', {
        method: isEditMode ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

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
    return [user.name, user.mobile].some((value) => String(value || '').toLowerCase().includes(query))
  })

  if (loginState.checking) {
    return (
      <div className="admin-login-shell">
        <div className="admin-login-card">
          <p className="eyebrow">Admin Panel</p>
          <h1>Checking session...</h1>
        </div>
      </div>
    )
  }

  if (!loginState.authenticated) {
    return (
      <div className="admin-login-shell">
        <form className="admin-login-card" onSubmit={handleLoginSubmit}>
          <p className="eyebrow">Admin Panel</p>
          <h1>Sign in</h1>
          <p className="section-text">Use the admin email and password created on the backend.</p>

          <label>
            <span>Email</span>
            <input type="email" name="email" value={loginForm.email} onChange={handleLoginChange} />
          </label>

          <label>
            <span>Password</span>
            <input type="password" name="password" value={loginForm.password} onChange={handleLoginChange} />
          </label>

          {loginState.error ? (
            <div className="message message-error">{loginState.error}</div>
          ) : null}

          <button type="submit" className="primary-btn" disabled={loginState.submitting}>
            {loginState.submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Admin Panel</p>
          <p className="section-text">{loginState.admin?.email || ''}</p>
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

        <button type="button" className="secondary-btn sidebar-logout" onClick={handleLogout}>
          Logout
        </button>
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
                    <button type="button" className="primary-btn small-btn" onClick={openAddUserModal}>
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
                      x
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
                  <p className="section-text">See which number is connected, whether the session is active, and add more sessions for automatic WhatsApp sending.</p>
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
                    onClick={runReminderNow}
                    disabled={whatsAppState.actionLoading}
                  >
                    Send Reminders Now
                  </button>
                </div>
              </div>

              <div className="whatsapp-create-row">
                <form className="whatsapp-create-form" onSubmit={createWhatsAppSession}>
                  <label>
                    <span>New Session Name</span>
                    <input
                      type="text"
                      value={whatsAppForm.displayName}
                      onChange={handleWhatsAppFormChange}
                      placeholder="Example: Sales Team 1"
                    />
                  </label>
                  <button type="submit" className="primary-btn small-btn" disabled={whatsAppState.actionLoading}>
                    {whatsAppState.actionLoading ? 'Please wait...' : 'Add Session'}
                  </button>
                </form>
              </div>

              <div className="whatsapp-layout">
                <div className="whatsapp-card">
                  <div className="whatsapp-card-header">
                    <div>
                      <p className="eyebrow">All Sessions</p>
                      <h3 className="subheading">Connected Accounts</h3>
                    </div>
                  </div>

                  {whatsAppState.loading ? (
                    <div className="empty-state">Loading WhatsApp status...</div>
                  ) : whatsAppState.sessions.length === 0 ? (
                    <div className="empty-state">No WhatsApp sessions found.</div>
                  ) : (
                    <div className="session-list">
                      {whatsAppState.sessions.map((session) => (
                        <button
                          type="button"
                          key={session.sessionKey}
                          className={`session-item ${whatsAppState.selectedSessionKey === session.sessionKey ? 'session-item-selected' : ''}`}
                          onClick={() => setWhatsAppState((prev) => ({ ...prev, selectedSessionKey: session.sessionKey }))}
                        >
                          <div className="session-item-top">
                            <strong>{session.displayName || session.sessionKey}</strong>
                            <span className={`status-pill ${session.status === 'authenticated' ? 'status-active' : session.status === 'qr_ready' || session.status === 'initializing' ? 'status-pending' : 'status-inactive'}`}>
                              {session.status === 'authenticated'
                                ? 'Connected'
                                : session.status === 'qr_ready'
                                  ? 'Scan QR'
                                  : session.status === 'initializing'
                                    ? 'Connecting'
                                    : session.status === 'auth_failure'
                                      ? 'Auth Failed'
                                      : session.status === 'disconnected'
                                        ? 'Disconnected'
                                        : 'Not Started'}
                            </span>
                          </div>
                          <div className="session-item-meta">
                            <span>{session.phoneNumber || 'No number connected'}</span>
                            <span>{session.isActive ? 'Active sender' : 'Inactive sender'}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="whatsapp-card">
                  <div className="whatsapp-card-header">
                    <div>
                      <p className="eyebrow">Selected Session</p>
                      <h3 className="subheading">{selectedWhatsAppSession?.displayName || 'Select a session'}</h3>
                    </div>
                    {selectedWhatsAppSession ? (
                      <span className={`status-pill ${whatsAppStatusClass}`}>{whatsAppStatusLabel}</span>
                    ) : null}
                  </div>

                  {selectedWhatsAppSession ? (
                    <div className="toolbar">
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => setActiveWhatsAppSession(selectedWhatsAppSession.sessionKey)}
                        disabled={whatsAppState.actionLoading}
                      >
                        {selectedWhatsAppSession.isActive ? 'Active Sender' : 'Set Active Sender'}
                      </button>
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => runWhatsAppAction(selectedWhatsAppSession.sessionKey, 'stop', 'WhatsApp connection stopped')}
                        disabled={whatsAppState.actionLoading}
                      >
                        Stop
                      </button>
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => runWhatsAppAction(selectedWhatsAppSession.sessionKey, 'reset', 'Saved session cleared. Scan QR again.')}
                        disabled={whatsAppState.actionLoading}
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        className="primary-btn small-btn"
                        onClick={() => runWhatsAppAction(selectedWhatsAppSession.sessionKey, 'start', 'WhatsApp session started')}
                        disabled={whatsAppState.actionLoading}
                      >
                        {whatsAppState.actionLoading ? 'Please wait...' : 'Start WhatsApp'}
                      </button>
                    </div>
                  ) : null}

                  <div className="details-grid">
                    <div className="detail-item">
                      <span>Connected Number</span>
                      <strong>{selectedWhatsAppSession?.phoneNumber || 'Not connected'}</strong>
                    </div>
                    <div className="detail-item">
                      <span>Last Connected</span>
                      <strong>{selectedWhatsAppSession?.lastConnectedAt ? new Date(selectedWhatsAppSession.lastConnectedAt).toLocaleString() : 'N/A'}</strong>
                    </div>
                    <div className="detail-item">
                      <span>Session Key</span>
                      <strong>{selectedWhatsAppSession?.sessionKey || 'N/A'}</strong>
                    </div>
                    <div className="detail-item">
                      <span>Automatic Sender</span>
                      <strong>{selectedWhatsAppSession?.isActive ? 'Yes, this session sends reminders' : 'No, reminders use another session'}</strong>
                    </div>
                    <div className="detail-item">
                      <span>Saved Session</span>
                      <strong>{selectedWhatsAppSession?.status === 'authenticated' ? 'Available' : 'Waiting for login'}</strong>
                    </div>
                    <div className="detail-item">
                      <span>Auto Reminder Rule</span>
                      <strong>7 days before, 2 days before, expiry day, 7 days after expiry</strong>
                    </div>
                  </div>

                  {selectedWhatsAppSession?.qrCodeDataUrl ? (
                    <div className="qr-panel">
                      <img src={selectedWhatsAppSession.qrCodeDataUrl} alt="WhatsApp QR Code" className="qr-image" />
                      <p className="section-text">Open WhatsApp on your phone, scan this QR, and keep this backend running.</p>
                    </div>
                  ) : null}

                  {selectedWhatsAppSession?.lastError ? (
                    <div className="message message-error">{selectedWhatsAppSession.lastError}</div>
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

export default AppSecure
