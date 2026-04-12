import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

const Login = () => {
  const navigate = useNavigate()
  const { setUser, setIsAuthenticated, isAuthenticated, loading: authLoading } = useAuth()
  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Redirect to home if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, authLoading, navigate])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.identifier || !formData.password) {
      setError('Please enter email/mobile and password')
      return
    }

    setLoading(true)

    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        identifier: formData.identifier,
        password: formData.password
      }, {
        withCredentials: true
      })

      if (response.data.success) {
        // Update auth context
        setUser(response.data.data.user)
        setIsAuthenticated(true)

        // Redirect to home/dashboard
        navigate('/')
      } else {
        setError(response.data.message || 'Login failed')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Show loading spinner while checking authentication
  if (authLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 flex items-center justify-center p-4'>
        <div className='bg-white rounded-2xl shadow-2xl p-8'>
          <div className='flex flex-col items-center justify-center'>
            <svg className='animate-spin h-12 w-12 text-blue-600 mb-4' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
              <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
              <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
            </svg>
            <p className='text-gray-600 font-semibold'>Checking authentication...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 flex items-center justify-center p-4'>
      <div className='w-full max-w-md'>
        {/* Login Card */}
        <div className='bg-white rounded-2xl shadow-2xl p-8'>
          {/* Logo/Header */}
          <div className='text-center mb-8'>
            <div className='w-20 h-20 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg'>
              <svg className='w-10 h-10 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' />
              </svg>
            </div>
            <h1 className='text-3xl font-black text-gray-800 mb-2'>RTO Login</h1>
            <p className='text-gray-500 text-sm'>Sign in to access your account</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className='mb-6 p-4 bg-red-50 border border-red-200 rounded-lg'>
              <div className='flex items-center gap-2'>
                <svg className='w-5 h-5 text-red-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                </svg>
                <p className='text-sm text-red-800'>{error}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className='space-y-6'>
            <div>
              <label className='block text-sm font-bold text-gray-700 mb-2'>
                Email or Mobile Number
              </label>
              <div className='relative'>
                <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                  <svg className='w-5 h-5 text-gray-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' />
                  </svg>
                </div>
                <input
                  type='text'
                  name='identifier'
                  value={formData.identifier}
                  onChange={handleChange}
                  placeholder='Enter email or mobile number'
                  className='w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
                  disabled={loading}
                />
              </div>
              <p className='mt-1 text-xs text-gray-500'>Use your registered email or 10-digit mobile number</p>
            </div>

            <div>
              <label className='block text-sm font-bold text-gray-700 mb-2'>
                Password
              </label>
              <div className='relative'>
                <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                  <svg className='w-5 h-5 text-gray-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' />
                  </svg>
                </div>
                <input
                  type='password'
                  name='password'
                  value={formData.password}
                  onChange={handleChange}
                  placeholder='Enter your password'
                  className='w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type='submit'
              disabled={loading}
              className='w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-lg font-bold hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'
            >
              {loading ? (
                <div className='flex items-center justify-center gap-2'>
                  <svg className='animate-spin h-5 w-5 text-white' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
                    <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                    <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                  </svg>
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className='mt-8 text-center'>
            <p className='text-xs text-gray-400'>
              RTO Management System
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
