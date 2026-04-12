import { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

const initialForm = {
  name: '',
  loginId: '',
  password: '',
  mobile: '',
}

const AdminPanel = () => {
  const [users, setUsers] = useState([])
  const [formData, setFormData] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/api/users`)
      if (response.data.success) {
        setUsers(response.data.data || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to fetch users')
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
      [name]: name === 'loginId' ? value.toLowerCase() : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name || !formData.loginId || !formData.password) {
      toast.error('Name, login ID, and password are required')
      return
    }

    try {
      setSaving(true)
      const response = await axios.post(`${API_URL}/api/users`, formData)
      if (response.data.success) {
        toast.success('User created successfully')
        setFormData(initialForm)
        fetchUsers()
      }
    } catch (error) {
      console.error('Error creating user:', error)
      toast.error(error.response?.data?.message || 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-100 via-white to-cyan-50 px-4 py-6'>
      <div className='mx-auto max-w-7xl space-y-6'>
        <section className='rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.55)]'>
          <p className='text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500'>Admin Panel</p>
          <h1 className='mt-2 text-3xl font-black text-slate-900'>User Login Management</h1>
          <p className='mt-2 text-sm font-medium text-slate-600'>Create login ID and password for users and view all existing users.</p>
        </section>

        <div className='grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]'>
          <section className='rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.55)]'>
            <h2 className='text-lg font-black text-slate-900'>Create User</h2>
            <form onSubmit={handleSubmit} className='mt-5 space-y-4'>
              <div>
                <label className='mb-1 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500'>Name</label>
                <input name='name' value={formData.name} onChange={handleChange} className='w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium outline-none focus:border-cyan-500' />
              </div>
              <div>
                <label className='mb-1 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500'>Login ID</label>
                <input name='loginId' value={formData.loginId} onChange={handleChange} className='w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium outline-none focus:border-cyan-500' />
              </div>
              <div>
                <label className='mb-1 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500'>Password</label>
                <input type='password' name='password' value={formData.password} onChange={handleChange} className='w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium outline-none focus:border-cyan-500' />
              </div>
              <div>
                <label className='mb-1 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500'>Mobile</label>
                <input name='mobile' value={formData.mobile} onChange={handleChange} className='w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium outline-none focus:border-cyan-500' />
              </div>
              <button type='submit' disabled={saving} className='w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60'>
                {saving ? 'Creating...' : 'Create User'}
              </button>
            </form>
          </section>

          <section className='rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_70px_-48px_rgba(15,23,42,0.55)]'>
            <div className='flex items-center justify-between border-b border-slate-200 px-5 py-4'>
              <h2 className='text-lg font-black text-slate-900'>All Users</h2>
              <button type='button' onClick={fetchUsers} className='rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50'>
                Refresh
              </button>
            </div>
            {loading ? (
              <div className='px-5 py-8 text-sm font-semibold text-slate-500'>Loading users...</div>
            ) : users.length === 0 ? (
              <div className='px-5 py-8 text-sm font-semibold text-slate-500'>No users found.</div>
            ) : (
              <div className='overflow-x-auto'>
                <table className='min-w-full divide-y divide-slate-200'>
                  <thead className='bg-slate-50'>
                    <tr>
                      <th className='px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500'>Name</th>
                      <th className='px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500'>Login ID</th>
                      <th className='px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500'>Mobile</th>
                      <th className='px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500'>Status</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-slate-200 bg-white'>
                    {users.map((user) => (
                      <tr key={user._id}>
                        <td className='px-4 py-4 text-sm font-bold text-slate-900'>{user.name || 'N/A'}</td>
                        <td className='px-4 py-4 text-sm font-semibold text-cyan-700'>{user.loginId || 'N/A'}</td>
                        <td className='px-4 py-4 text-sm text-slate-700'>{user.mobile || 'N/A'}</td>
                        <td className='px-4 py-4'>
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${user.isActive ? 'border-emerald-200 bg-emerald-100 text-emerald-700' : 'border-red-200 bg-red-100 text-red-700'}`}>
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
      </div>
    </div>
  )
}

export default AdminPanel
