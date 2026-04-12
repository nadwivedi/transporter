import { Link, useLocation } from 'react-router-dom'
import { getTheme } from '../context/ThemeContext'

const menuItems = [
  { name: 'Manage Vehicle', path: '/' },
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Setting', path: '/setting' },
]

const Navbar = () => {
  const location = useLocation()
  const theme = getTheme()

  const isActive = (path) => location.pathname === path

  return (
    <nav className={`fixed top-0 left-0 right-0 ${theme.navbar} text-white shadow-lg z-50`}>
      <div className='mx-auto flex h-12 max-w-screen-2xl items-center justify-center px-2 sm:px-4'>
        <div className='flex w-full items-center justify-center gap-1 overflow-x-auto scrollbar-hide sm:gap-2'>
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 sm:px-4 sm:text-sm ${
                isActive(item.path)
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}

export default Navbar

