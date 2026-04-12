import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Setting from './pages/Setting'
import VehicleRegistration from './pages/VehicleRegistration/VehicleRegistration'
import VehicleDetailPage from './pages/VehicleRegistration/VehicleDetailPage'
import Insurance from './pages/Insurance/Insurance'
import Fitness from './pages/Fitness/Fitness'
import Tax from './pages/Tax/Tax'
import Puc from './pages/Puc/Puc'
import Gps from './pages/Gps/Gps'

function AppContent() {
  const location = useLocation()
  const showNavbar = location.pathname !== '/login'

  return (
    <>
      <ToastContainer />
      {showNavbar && <Navbar />}
      <div className={showNavbar ? 'pt-12' : ''}>
        <Routes>
          <Route path='/login' element={<Login />} />
          <Route path='/' element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path='/dashboard' element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path='/setting' element={<ProtectedRoute><Setting /></ProtectedRoute>} />
          <Route path='/vehicle' element={<ProtectedRoute><VehicleRegistration /></ProtectedRoute>} />
          <Route path='/vehicle/:id/detail' element={<ProtectedRoute><VehicleDetailPage /></ProtectedRoute>} />
          <Route path='/insurance' element={<ProtectedRoute><Insurance /></ProtectedRoute>} />
          <Route path='/fitness' element={<ProtectedRoute><Fitness /></ProtectedRoute>} />
          <Route path='/tax' element={<ProtectedRoute><Tax /></ProtectedRoute>} />
          <Route path='/puc' element={<ProtectedRoute><Puc /></ProtectedRoute>} />
          <Route path='/gps' element={<ProtectedRoute><Gps /></ProtectedRoute>} />
        </Routes>
      </div>
    </>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </AuthProvider>
    </Router>
  )
}

export default App


