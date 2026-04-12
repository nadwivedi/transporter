import { useEffect, useState } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

const initialForm = {
  name: '',
  password: '',
  mobile: '',
}

function App() {
  const [activeSection, setActiveSection] = useState('users')
  const [users, setUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [formData, setFormData] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

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

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (message.text) setMessage({ type: '', text: '' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name || !formData.mobile || !formData.password) {
      setMessage({ type: 'error', text: 'Name, mobile, and password are required' })
      return
    }

    try {
      setSaving(true)
      const response = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to create user')
      }

      setFormData(initialForm)
      setMessage({ type: 'success', text: 'User created successfully' })
      setShowAddUserModal(false)
      fetchUsers()
    } catch (error) {
      console.error('Error creating user:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to create user' })
    } finally {
      setSaving(false)
    }
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
                      onClick={() => {
                        setFormData(initialForm)
                        setMessage({ type: '', text: '' })
                        setShowAddUserModal(true)
                      }}
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
                      <h2>Add User</h2>
                    </div>
                    <button type="button" className="icon-btn" onClick={() => setShowAddUserModal(false)}>
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
                      <button type="button" className="secondary-btn" onClick={() => setShowAddUserModal(false)}>
                        Cancel
                      </button>
                      <button type="submit" className="primary-btn" disabled={saving}>
                        {saving ? 'Creating...' : 'Create User'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <section className="hero-card">
              <p className="eyebrow">WhatsApp Section</p>
              <h1>Add WhatsApp</h1>
              <p className="hero-text">This section is reserved for WhatsApp management. I can build the actual WhatsApp form and backend flow next.</p>
            </section>

            <section className="panel whatsapp-panel">
              <div className="panel-header">
                <h2>WhatsApp Setup</h2>
              </div>
              <div className="empty-state">
                WhatsApp admin tools are not added yet. The sidebar item is ready, and this panel can be expanded next.
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

export default App
