import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Navbar from './components/Navbar'
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
          <Route path='/' element={<Home />} />
          <Route path='/dashboard' element={<Dashboard />} />
          <Route path='/login' element={<Login />} />
          <Route path='/setting' element={<Setting />} />
          <Route path='/vehicle' element={<VehicleRegistration />} />
          <Route path='/vehicle/:id/detail' element={<VehicleDetailPage />} />
          <Route path='/insurance' element={<Insurance />} />
          <Route path='/fitness' element={<Fitness />} />
          <Route path='/tax' element={<Tax />} />
          <Route path='/puc' element={<Puc />} />
          <Route path='/gps' element={<Gps />} />
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


