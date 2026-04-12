import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'
import Pagination from '../../components/Pagination'
import AddButton from '../../components/AddButton'
import SearchBar from '../../components/SearchBar'
import StatisticsCard from '../../components/StatisticsCard'
import { getTheme, getVehicleNumberDesign } from '../../context/ThemeContext'
import { getVehicleNumberParts } from '../../utils/vehicleNoCheck'
import AddVehicleModal from './components/AddVehicleModal'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

const VehicleRegistration = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const theme = getTheme()
  const vehicleDesign = getVehicleNumberDesign()
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editData, setEditData] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statistics, setStatistics] = useState({
    total: 0
  })
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    limit: 20
  })

  useEffect(() => {
    fetchRegistrations(1)
    fetchStatistics()
  }, [searchTerm])

  useEffect(() => {
    if (!location.state?.openAddModal) return

    setEditData(null)
    setShowModal(true)
    navigate(location.pathname, { replace: true, state: {} })
  }, [location.pathname, location.state, navigate])

  const fetchRegistrations = async (page = pagination.currentPage) => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/api/vehicle`, {
        params: {
          page,
          limit: pagination.limit,
          search: searchTerm
        },
        withCredentials: true
      })

      if (response.data.success) {
        setRegistrations(response.data.data || [])

        // Update pagination state
        if (response.data.pagination) {
          setPagination({
            currentPage: response.data.pagination.currentPage,
            totalPages: response.data.pagination.totalPages,
            totalRecords: response.data.pagination.totalRecords,
            limit: pagination.limit
          })
        }
      }
    } catch (error) {
      console.error('Error fetching registrations:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStatistics = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/vehicle/statistics`, { withCredentials: true })

      if (response.data.success) {
        setStatistics(response.data.data)
      }
    } catch (error) {
      console.error('Error fetching statistics:', error)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) {
      return
    }

    try {
      const response = await axios.delete(`${API_URL}/api/vehicle/${id}`, { withCredentials: true })

      if (response.data.success) {
        toast.success('Vehicle deleted successfully!', { position: 'top-right', autoClose: 3000 })
        fetchRegistrations()
        fetchStatistics()
      } else {
        toast.error(response.data.message || 'Failed to delete vehicle', { position: 'top-right', autoClose: 3000 })
      }
    } catch (error) {
      toast.error('Error deleting vehicle. Please try again.', { position: 'top-right', autoClose: 3000 })
      console.error('Error:', error)
    }
  }

  const handleEdit = (registration) => {
    setEditData(registration)
    setShowModal(true)
  }

  const handleCopyChassisNumber = (chassisNumber) => {
    if (!chassisNumber || chassisNumber === 'N/A') {
      toast.warning('No chassis number to copy', { position: 'top-right', autoClose: 2000 })
      return
    }

    navigator.clipboard.writeText(chassisNumber)
      .then(() => {
        toast.success('Chassis number copied to clipboard!', { position: 'top-right', autoClose: 2000 })
      })
      .catch((err) => {
        console.error('Failed to copy:', err)
        toast.error('Failed to copy chassis number', { position: 'top-right', autoClose: 2000 })
      })
  }

  const handleViewDetails = (registration) => {
    navigate(`/vehicle/${registration._id}/detail`)
  }

  const handleShare = async (registration) => {
    const shareText = `
🚗 Vehicle Details
━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Registration Number: ${registration.vehicleNumber || registration.registrationNumber || 'N/A'}
📅 Registration Date: ${registration.dateOfRegistration || 'N/A'}

👤 Owner Details:
   Name: ${registration.ownerName || 'N/A'}
   S/W/D of: ${registration.sonWifeDaughterOf || 'N/A'}

🔧 Vehicle Identification:
   Chassis No: ${registration.chassisNumber || 'N/A'}
   Engine No: ${registration.engineNumber || 'N/A'}

⚖️ Weight Information:
   Laden Weight: ${registration.ladenWeight ? `${registration.ladenWeight} kg` : 'N/A'}
   Unladen Weight: ${registration.unladenWeight ? `${registration.unladenWeight} kg` : 'N/A'}
    `.trim()

    // Check if Web Share API is available
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Vehicle Details',
          text: shareText
        })
        toast.success('Details shared successfully!', { position: 'top-right', autoClose: 2000 })
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error)
          toast.error('Failed to share details', { position: 'top-right', autoClose: 2000 })
        }
      }
    } else {
      // Fallback to copying to clipboard
      try {
        await navigator.clipboard.writeText(shareText)
        toast.success('Details copied to clipboard!', { position: 'top-right', autoClose: 2000 })
      } catch (error) {
        console.error('Error copying to clipboard:', error)
        toast.error('Failed to copy details', { position: 'top-right', autoClose: 2000 })
      }
    }
  }

  // Page change handler
  const handlePageChange = (newPage) => {
    fetchRegistrations(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Use registrations directly since filtering is done on backend
  const filteredRegistrations = registrations

  return (
    <>
      <div className='min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50 to-purple-50'>
        <div className='w-full px-3 md:px-4 lg:px-6 pt-4 lg:pt-6 pb-8'>
          {/* Statistics Cards */}
          <div className='mb-2 mt-3'>
            <div className='grid grid-cols-1 gap-2 lg:gap-3 mb-5 max-w-sm'>
              <StatisticsCard
                title='Total Vehicles'
                value={statistics.total}
                color='gray'
                icon={
                  <svg className='w-4 h-4 lg:w-6 lg:h-6 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' />
                  </svg>
                }
              />
            </div>
          </div>

          {/* Registrations Table */}
          <div className='bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden'>
            <div className='px-6 py-5 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border-b border-gray-200'>
              <div className='flex flex-col lg:flex-row gap-2 items-stretch lg:items-center'>
                {/* Search Bar */}
                <SearchBar
                  value={searchTerm}
                  onChange={(value) => setSearchTerm(value)}
                  placeholder='Search by regn no, owner, chassis...'
                  toUpperCase={true}
                />

                {/* Register Button */}
                <AddButton
                  onClick={() => {
                    setEditData(null)
                    setShowModal(true)
                  }}
                  title='Add Vehicle'
                />
              </div>

              {/* Results count */}
              <div className='mt-3 text-xs text-gray-600 font-semibold'>
                Showing {filteredRegistrations.length} of {pagination.totalRecords} records
              </div>
            </div>

            {loading ? (
              <div className='p-12 text-center'>
                <div className='text-gray-400'>
                  <svg className='animate-spin mx-auto h-8 w-8 mb-3 text-indigo-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z' />
                  </svg>
                  <p className='text-sm font-semibold text-gray-600'>Loading vehicles...</p>
                </div>
              </div>
            ) : filteredRegistrations.length === 0 ? (
              <div className='p-12 text-center'>
                <div className='text-gray-400'>
                  <svg className='mx-auto h-8 w-8 mb-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                  </svg>
                  <p className='text-sm font-semibold text-gray-600'>No vehicles found</p>
                  <p className='text-xs text-gray-500 mt-1'>Click &quot;Add Vehicle&quot; to create your first vehicle</p>
                </div>
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className='block lg:hidden'>
                  <div className='p-4 space-y-3'>
                    {filteredRegistrations.map((registration) => (
                      <div key={registration._id} className='bg-white rounded-lg shadow border border-gray-200 overflow-hidden hover:shadow-md transition-shadow'>
                        {/* Card Header with Avatar and Actions */}
                        <div className='bg-gray-50 p-3 flex items-start justify-between border-b border-gray-200'>
                          <div className='min-w-0 flex-1 mr-2'>
                            <div className='text-sm font-bold text-gray-900 mb-1'>
                              {(() => {
                                const vehicleNum = registration.vehicleNumber || registration.registrationNumber;
                                const parts = getVehicleNumberParts(vehicleNum);
                                if (!parts) {
                                  return <span className='font-mono'>{vehicleNum}</span>;
                                }
                                return (
                                  <div className={vehicleDesign.container}>
                                    <span className={vehicleDesign.stateCode}>{parts.stateCode}</span>
                                    <span className={vehicleDesign.districtCode}>{parts.districtCode}</span>
                                    <span className={vehicleDesign.series}>{parts.series}</span>
                                    <span className={vehicleDesign.last4Digits}>{parts.last4Digits}</span>
                                  </div>
                                );
                              })()}
                            </div>
                            <div className='text-xs text-gray-600 truncate'>{registration.ownerName || '-'}</div>
                          </div>

                          {/* Action Buttons */}
                          <div className='flex items-center gap-1'>
                            <button
                              onClick={() => handleViewDetails(registration)}
                              className='p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all cursor-pointer'
                              title='View'
                            >
                              <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleShare(registration)}
                              className='p-1.5 text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-all cursor-pointer'
                              title='Share'
                            >
                              <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z' />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleEdit(registration)}
                              className='p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all cursor-pointer'
                              title='Edit'
                            >
                              <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(registration._id)}
                              className='p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-all cursor-pointer'
                              title='Delete'
                            >
                              <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className='p-3 space-y-2.5'>
                          {/* Vehicle Details */}
                          <div className='flex gap-2'>
                            <div className='bg-gradient-to-br from-blue-50 to-cyan-50 p-2 rounded-lg border border-blue-200 flex-[0.6] min-w-0 relative'>
                              <div className='flex items-center justify-between mb-1'>
                                <p className='text-[10px] text-blue-600 font-semibold uppercase'>
                                  Chassis No
                                </p>
                                {registration.chassisNumber && registration.chassisNumber !== 'N/A' && (
                                  <button
                                    onClick={() => handleCopyChassisNumber(registration.chassisNumber)}
                                    className='p-0.5 text-blue-400 hover:text-indigo-600 hover:bg-indigo-100 rounded transition-all duration-200 flex-shrink-0'
                                    title='Copy Chassis Number'
                                  >
                                    <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z' />
                                    </svg>
                                  </button>
                                )}
                              </div>
                              <p className='text-[9.5px] font-mono font-semibold text-blue-900 break-all leading-tight'>{registration.chassisNumber || 'N/A'}</p>
                            </div>
                            <div className='bg-gradient-to-br from-green-50 to-emerald-50 p-2 rounded-lg border border-green-200 flex-[0.4] min-w-0'>
                              <p className='text-[10px] text-green-600 font-semibold uppercase flex items-center gap-1 mb-1'>
                                <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' />
                                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
                                </svg>
                                Engine No
                              </p>
                              <p className='text-[9px] font-mono font-semibold text-green-900 break-all leading-tight'>{registration.engineNumber || 'N/A'}</p>
                            </div>
                          </div>

                          {/* Owner Details */}
                          {registration.sonWifeDaughterOf && (
                            <div className='pt-2 border-t border-gray-100'>
                              <p className='text-[10px] text-gray-500 font-semibold uppercase'>S/W/D of</p>
                              <p className='text-xs font-semibold text-gray-700'>{registration.sonWifeDaughterOf}</p>
                            </div>
                          )}

                          {/* Weight Details */}
                          <div className='grid grid-cols-2 gap-2 pt-2 border-t border-gray-100'>
                            <div>
                              <p className='text-[10px] text-gray-500 font-semibold uppercase'>Laden Weight</p>
                              <p className='text-sm text-gray-700'>{registration.ladenWeight ? `${registration.ladenWeight} kg` : 'N/A'}</p>
                            </div>
                            <div>
                              <p className='text-[10px] text-gray-500 font-semibold uppercase'>Unladen Weight</p>
                              <p className='text-sm text-gray-700'>{registration.unladenWeight ? `${registration.unladenWeight} kg` : 'N/A'}</p>
                            </div>
                          </div>

                          {/* Registration Date */}
                          {registration.dateOfRegistration && (
                            <div className='pt-2 border-t border-gray-100'>
                              <p className='text-[10px] text-gray-500 font-semibold uppercase flex items-center gap-1'>
                                <svg className='w-3 h-3 text-indigo-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' />
                                </svg>
                                Registration Date
                              </p>
                              <p className='text-xs font-semibold text-gray-700'>{registration.dateOfRegistration}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Desktop Table View */}
                <div className='hidden lg:block overflow-x-auto'>
                  <table className='w-full'>
                  <thead className={theme.tableHeader}>
                    <tr>
                      <th className='px-4 2xl:px-6 py-3 2xl:py-4 text-left text-[10px] 2xl:text-xs font-bold text-white uppercase tracking-wide'>Registration No.</th>
                      <th className='px-4 2xl:px-6 py-3 2xl:py-4 text-left text-[10px] 2xl:text-xs font-bold text-white uppercase tracking-wide'>Chassis No.</th>
                      <th className='px-4 2xl:px-6 py-3 2xl:py-4 text-left text-[10px] 2xl:text-xs font-bold text-white uppercase tracking-wide'>Engine No.</th>
                      <th className='px-4 2xl:px-6 py-3 2xl:py-4 text-left text-[10px] 2xl:text-xs font-bold text-white uppercase tracking-wide'>Owner Name</th>
                      <th className='px-4 2xl:px-6 py-3 2xl:py-4 text-left text-[10px] 2xl:text-xs font-bold text-white uppercase tracking-wide'>Contact</th>
                      <th className='px-4 2xl:px-6 py-3 2xl:py-4 text-left text-[10px] 2xl:text-xs font-bold text-white uppercase tracking-wide'>Laden Weight</th>
                      <th className='px-4 2xl:px-6 py-3 2xl:py-4 text-left text-[10px] 2xl:text-xs font-bold text-white uppercase tracking-wide'>Unladen Weight</th>
                      <th className='px-4 2xl:px-6 py-3 2xl:py-4 text-center text-[10px] 2xl:text-xs font-bold text-white uppercase tracking-wide'>Actions</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-200'>
                    {filteredRegistrations.map((registration) => (
                      <tr key={registration._id} className='hover:bg-gradient-to-r hover:from-blue-50/50 hover:via-indigo-50/50 hover:to-purple-50/50 transition-all duration-200 group'>
                        <td className='px-4 2xl:px-6 py-3 2xl:py-4'>
                          <div>
                            <div className='mb-1'>
                              {(() => {
                                const vehicleNum = registration.vehicleNumber || registration.registrationNumber;
                                const parts = getVehicleNumberParts(vehicleNum);
                                if (!parts) {
                                  return (
                                    <div className='text-[13px] 2xl:text-[16.5px] font-semibold text-gray-900'>
                                      {vehicleNum}
                                    </div>
                                  );
                                }
                                return (
                                  <div className={vehicleDesign.container}>
                                    <svg
                                      className="w-4 h-6 mr-0.5   text-blue-800 flex-shrink-0"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                                      <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                                    </svg>

                                    <span className={vehicleDesign.stateCode}>
                                      {parts.stateCode}
                                    </span>
                                    <span className={vehicleDesign.districtCode}>
                                      {parts.districtCode}
                                    </span>
                                    <span className={vehicleDesign.series}>
                                      {parts.series}
                                    </span>
                                    <span className={vehicleDesign.last4Digits}>
                                      {parts.last4Digits}
                                    </span>
                                  </div>
                                );
                              })()}
                            </div>
                            {registration.dateOfRegistration && (
                              <div className='text-[10px] 2xl:text-xs text-gray-500'>
                                Registered: {registration.dateOfRegistration}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className='px-4 2xl:px-6 py-3 2xl:py-4'>
                          <div className='flex items-center gap-2'>
                            <div className='flex items-center gap-1 2xl:gap-1.5 bg-gradient-to-r from-blue-50 to-cyan-50 px-2 py-1 2xl:px-3 2xl:py-1.5 rounded-lg border border-blue-200'>
                              <span className='text-[11px] 2xl:text-[15.5px] font-mono font-semibold text-blue-900'>{registration.chassisNumber || 'N/A'}</span>
                            </div>
                            {registration.chassisNumber && registration.chassisNumber !== 'N/A' && (
                              <button
                                onClick={() => handleCopyChassisNumber(registration.chassisNumber)}
                                className='p-1 2xl:p-1.5 text-blue-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200 cursor-pointer'
                                title='Copy Chassis Number'
                              >
                                <svg className='w-3.5 h-3.5 2xl:w-4 2xl:h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z' />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                        <td className='px-4 2xl:px-6 py-3 2xl:py-4'>
                          <div className='flex items-center gap-1 2xl:gap-1.5 bg-gradient-to-r from-green-50 to-emerald-50 px-2 py-1 2xl:px-3 2xl:py-1.5 rounded-lg border border-green-200 w-fit'>
                            <svg className='w-3 h-3 2xl:w-3.5 2xl:h-3.5 text-green-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' />
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
                            </svg>
                            <span className='text-[11px] 2xl:text-[15px] font-mono font-semibold text-green-900'>{registration.engineNumber || 'N/A'}</span>
                          </div>
                        </td>
                        <td className='px-4 2xl:px-6 py-3 2xl:py-4'>
                          <div>
                            <div className='text-[11px] 2xl:text-sm font-semibold text-gray-900'>{registration.ownerName || 'N/A'}</div>
                            {registration.sonWifeDaughterOf && (
                              <div className='text-[10px] 2xl:text-xs text-gray-500 mt-0.5'>S/W/D of {registration.sonWifeDaughterOf}</div>
                            )}
                          </div>
                        </td>
                        <td className='px-4 2xl:px-6 py-3 2xl:py-4'>
                          <div>
                            <div className='text-[11px] 2xl:text-sm font-semibold text-gray-900'>{registration.mobileNumber || 'N/A'}</div>
                            {registration.email && (
                              <div className='text-[10px] 2xl:text-xs text-gray-500 mt-0.5'>{registration.email}</div>
                            )}
                          </div>
                        </td>
                        <td className='px-4 2xl:px-6 py-3 2xl:py-4'>
                          <span className='text-[11px] 2xl:text-sm text-gray-700'>{registration.ladenWeight ? `${registration.ladenWeight} kg` : 'N/A'}</span>
                        </td>
                        <td className='px-4 2xl:px-6 py-3 2xl:py-4'>
                          <span className='text-[11px] 2xl:text-sm text-gray-700'>{registration.unladenWeight ? `${registration.unladenWeight} kg` : 'N/A'}</span>
                        </td>
                        <td className='px-4 2xl:px-6 py-3 2xl:py-4'>
                          <div className='flex items-center justify-end gap-0.5 pr-1'>
                            <button
                              onClick={() => handleViewDetails(registration)}
                              className='p-1.5 2xl:p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200 cursor-pointer'
                              title='View Details'
                            >
                              <svg className='w-4 h-4 2xl:w-5 2xl:h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleShare(registration)}
                              className='p-1.5 2xl:p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 cursor-pointer'
                              title='Share'
                            >
                              <svg className='w-4 h-4 2xl:w-5 2xl:h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z' />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleEdit(registration)}
                              className='p-1.5 2xl:p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 cursor-pointer'
                              title='Edit'
                            >
                              <svg className='w-4 h-4 2xl:w-5 2xl:h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(registration._id)}
                              className='p-1.5 2xl:p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 cursor-pointer'
                              title='Delete'
                            >
                              <svg className='w-4 h-4 2xl:w-5 2xl:h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {!loading && filteredRegistrations.length > 0 && (
                <Pagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                  totalRecords={pagination.totalRecords}
                  itemsPerPage={pagination.limit}
                />
              )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Register/Edit Modal */}
      {showModal && (
        <AddVehicleModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false)
            setEditData(null)
          }}
          onSuccess={() => {
            fetchRegistrations()
            fetchStatistics()
          }}
          editData={editData}
        />
      )}
    </>
  )
}

export default VehicleRegistration


