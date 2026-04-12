import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const clearAuthState = () => {
    setUser(null)
    setIsAuthenticated(false)
  }

  // Check if user is already logged in on mount
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      // Skip auth check if on login page
      if (window.location.pathname === '/login') {
        setLoading(false)
        return
      }

      // Verify token by fetching user profile
      const response = await axios.get(`${BACKEND_URL}/api/auth/profile`, {
        withCredentials: true
      })

      if (response.data.success) {
        const userData = response.data.data.user
        setUser(userData)
        setIsAuthenticated(true)
      } else {
        clearAuthState()
      }
    } catch (error) {
      console.error('Auth check error:', error)
      // Only clear auth if token is invalid (401), not on network errors
      if (error.response?.status === 401) {
        clearAuthState()
      }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      // Call backend logout endpoint to clear cookie
      await axios.post(`${BACKEND_URL}/api/auth/logout`, {}, {
        withCredentials: true
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Always clear local auth state, even if API call fails
      clearAuthState()
    }
  }


  const value = {
    user,
    setUser,
    isAuthenticated,
    setIsAuthenticated,
    loading,
    logout,
    checkAuth
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
