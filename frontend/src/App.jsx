import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Home from './pages/Home'
import Login from './pages/Login'
import Setting from './pages/Setting'
import VehicleRegistration from './pages/VehicleRegistration/VehicleRegistration'
import VehicleDetailPage from './pages/VehicleRegistration/VehicleDetailPage'
import Insurance from './pages/Insurance/Insurance'
import Fitness from './pages/Fitness/Fitness'
import Tax from './pages/Tax/Tax'
import Puc from './pages/Puc/Puc'
import Gps from './pages/Gps/Gps'

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <ToastContainer />
          <Routes>
            <Route path='/' element={<Home />} />
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
        </ThemeProvider>
      </AuthProvider>
    </Router>
  )
}

export default App


