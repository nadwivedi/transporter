import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { validateVehicleNumberRealtime } from '../../../utils/vehicleNoCheck'
import { handlePaymentCalculation } from '../../../utils/paymentValidation'
import { handleSmartDateInput } from '../../../utils/dateFormatter'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

const EditPucModal = ({ isOpen, onClose, onSubmit, puc }) => {
  const [formData, setFormData] = useState({
    vehicleNumber: '',
    ownerName: '',
    mobileNumber: '',
    validFrom: '',
    validTo: '',
    totalFee: '',
    paid: '',
    balance: ''
  })
  const [vehicleValidation, setVehicleValidation] = useState({ isValid: false, message: '' })
  const [paidExceedsTotal, setPaidExceedsTotal] = useState(false)
  const [fetchingVehicle, setFetchingVehicle] = useState(false)
  const [vehicleError, setVehicleError] = useState('')
  const [vehicleMatches, setVehicleMatches] = useState([])
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false)
  const [selectedDropdownIndex, setSelectedDropdownIndex] = useState(0)
  const dropdownItemRefs = useRef([])

  // Populate form when puc record changes
  useEffect(() => {
    if (puc) {
      setFormData({
        vehicleNumber: puc.vehicleNumber || '',
        ownerName: puc.ownerName || '',
        mobileNumber: puc.mobileNumber || '',
        validFrom: puc.validFrom || '',
        validTo: puc.validTo || '',
        totalFee: puc.totalFee?.toString() || '0',
        paid: puc.paid?.toString() || '0',
        balance: puc.balance?.toString() || '0'
      })

      if (puc.vehicleNumber) {
        const validation = validateVehicleNumberRealtime(puc.vehicleNumber)
        setVehicleValidation(validation)
      }
    }
  }, [puc])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        vehicleNumber: '',
        mobileNumber: '',
        validFrom: '',
        validTo: '',
        totalFee: '',
        paid: '',
        balance: ''
      })
      setPaidExceedsTotal(false)
      setVehicleValidation({ isValid: false, message: '' })
      setFetchingVehicle(false)
      setVehicleError('')
      setVehicleMatches([])
      setShowVehicleDropdown(false)
      setSelectedDropdownIndex(0)
    }
  }, [isOpen])

  // Calculate valid to date (6 months from valid from for PUC)
  useEffect(() => {
    if (formData.validFrom) {
      const parts = formData.validFrom.split(/[/-]/)
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10)
        const month = parseInt(parts[1], 10) - 1
        const year = parseInt(parts[2], 10)

        if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year > 1900) {
          const validFromDate = new Date(year, month, day)

          if (!isNaN(validFromDate.getTime())) {
            const validToDate = new Date(validFromDate)
            validToDate.setMonth(validToDate.getMonth() + 6) // PUC is valid for 6 months
            validToDate.setDate(validToDate.getDate() - 1)

            const newDay = String(validToDate.getDate()).padStart(2, '0')
            const newMonth = String(validToDate.getMonth() + 1).padStart(2, '0')
            const newYear = validToDate.getFullYear()

            setFormData(prev => ({
              ...prev,
              validTo: `${newDay}-${newMonth}-${newYear}`
            }))
          }
        }
      }
    }
  }, [formData.validFrom])

  // Fetch vehicle details when registration number is entered
  useEffect(() => {
    const fetchVehicleDetails = async () => {
      const searchInput = formData.vehicleNumber.trim()

      if (searchInput.length < 4) {
        setVehicleError('')
        setVehicleMatches([])
        setShowVehicleDropdown(false)
        setSelectedDropdownIndex(0)
        return
      }

      setFetchingVehicle(true)
      setVehicleError('')

      try {
        const response = await axios.get(`${API_URL}/api/vehicle/search/${searchInput}`, { withCredentials: true })

        if (response.data.success) {
          if (response.data.multiple) {
            setVehicleMatches(response.data.data)
            setShowVehicleDropdown(true)
            setSelectedDropdownIndex(0)
            setVehicleError('')
          } else {
            const vehicleData = response.data.data
            setFormData(prev => ({
              ...prev,
              vehicleNumber: vehicleData.registrationNumber,
              mobileNumber: vehicleData.mobileNumber || prev.mobileNumber
            }))
            const validation = validateVehicleNumberRealtime(vehicleData.registrationNumber)
            setVehicleValidation(validation)
            setVehicleError('')
            setVehicleMatches([])
            setShowVehicleDropdown(false)
          }
        }
      } catch (error) {
        console.error('Error fetching vehicle details:', error)
        if (error.response && error.response.status === 404) {
          setVehicleError('No vehicles found matching the search')
        } else {
          setVehicleError('Error fetching vehicle details')
        }
        setVehicleMatches([])
        setShowVehicleDropdown(false)
        setSelectedDropdownIndex(0)
      } finally {
        setFetchingVehicle(false)
      }
    }

    const timeoutId = setTimeout(() => {
      if (formData.vehicleNumber) {
        fetchVehicleDetails()
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [formData.vehicleNumber])

  // Auto-scroll to selected dropdown item
  useEffect(() => {
    if (showVehicleDropdown && dropdownItemRefs.current[selectedDropdownIndex]) {
      dropdownItemRefs.current[selectedDropdownIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      })
    }
  }, [selectedDropdownIndex, showVehicleDropdown])

  const handleVehicleSelect = (vehicle) => {
    setFormData(prev => ({
      ...prev,
      vehicleNumber: vehicle.registrationNumber,
      mobileNumber: vehicle.mobileNumber || prev.mobileNumber
    }))
    setShowVehicleDropdown(false)
    setVehicleMatches([])
    setVehicleError('')
    setSelectedDropdownIndex(0)

    const validation = validateVehicleNumberRealtime(vehicle.registrationNumber)
    setVehicleValidation(validation)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showVehicleDropdown && vehicleMatches.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSelectedDropdownIndex(prev => (prev + 1) % vehicleMatches.length)
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSelectedDropdownIndex(prev => (prev - 1 + vehicleMatches.length) % vehicleMatches.length)
        } else if (e.key === 'Enter') {
          e.preventDefault()
          handleVehicleSelect(vehicleMatches[selectedDropdownIndex])
        } else if (e.key === 'Escape') {
          e.preventDefault()
          setShowVehicleDropdown(false)
          setVehicleMatches([])
        }
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        document.querySelector('form')?.requestSubmit()
      }
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose, showVehicleDropdown, vehicleMatches, selectedDropdownIndex])

  const handleChange = (e) => {
    const { name, value } = e.target

    if (name === 'vehicleNumber') {
      const upperValue = value.toUpperCase()
      const validation = (upperValue.length === 9 || upperValue.length === 10) ? validateVehicleNumberRealtime(upperValue) : { isValid: false, message: '' }
      setVehicleValidation(validation)

      setFormData(prev => ({
        ...prev,
        [name]: upperValue
      }))
      return
    }

    if (name === 'totalFee' || name === 'paid') {
      setFormData(prev => {
        const paymentResult = handlePaymentCalculation(name, value, prev)
        setPaidExceedsTotal(paymentResult.paidExceedsTotal)

        return {
          ...prev,
          [name]: name === 'paid' ? paymentResult.paid : value,
          totalFee: name === 'totalFee' ? value : prev.totalFee,
          paid: name === 'paid' ? paymentResult.paid : prev.paid,
          balance: paymentResult.balance
        }
      })
      return
    }

    if (name === 'validFrom' || name === 'validTo') {
      const formatted = handleSmartDateInput(value, formData[name] || '')
      if (formatted !== null) {
        setFormData(prev => ({
          ...prev,
          [name]: formatted
        }))
      }
      return
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleDateBlur = (e) => {
    const { name, value } = e.target
    if (!value) return

    let digitsOnly = value.replace(/[^\d]/g, '')
    digitsOnly = digitsOnly.slice(0, 8)

    let day = ''
    let month = ''
    let year = ''

    if (digitsOnly.length >= 2) {
      day = digitsOnly.slice(0, 2)
      let dayNum = parseInt(day, 10)
      if (dayNum === 0) dayNum = 1
      if (dayNum > 31) dayNum = 31
      day = String(dayNum).padStart(2, '0')
    } else if (digitsOnly.length === 1) {
      day = '0' + digitsOnly[0]
    }

    if (digitsOnly.length >= 4) {
      month = digitsOnly.slice(2, 4)
      let monthNum = parseInt(month, 10)
      if (monthNum === 0) monthNum = 1
      if (monthNum > 12) monthNum = 12
      month = String(monthNum).padStart(2, '0')
    } else if (digitsOnly.length === 3) {
      month = '0' + digitsOnly[2]
    }

    if (digitsOnly.length >= 5) {
      year = digitsOnly.slice(4)
      if (year.length === 2) {
        const yearNum = parseInt(year, 10)
        year = String(yearNum <= 50 ? 2000 + yearNum : 1900 + yearNum)
      } else if (year.length === 4) {
        // Keep as is
      } else if (year.length > 4) {
        year = year.slice(0, 4)
      }
    }

    if (day && month) {
      let formatted = `${day}-${month}`
      if (year) {
        formatted += `-${year}`
      }

      setFormData(prev => ({
        ...prev,
        [name]: formatted
      }))
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if ((formData.vehicleNumber.length === 9 || formData.vehicleNumber.length === 10) && !vehicleValidation.isValid) {
      alert('Please enter a valid vehicle number in the format: CG04AA1234 (10 chars) or CG04G1234 (9 chars)')
      return
    }

    if (formData.vehicleNumber && formData.vehicleNumber.length !== 9 && formData.vehicleNumber.length !== 10) {
      alert('Vehicle number must be 9 or 10 characters')
      return
    }

    if (paidExceedsTotal) {
      alert('Paid amount cannot be more than the total fee!')
      return
    }

    if (onSubmit) {
      onSubmit(formData)
    }
    setFormData({
      vehicleNumber: '',
      mobileNumber: '',
      validFrom: '',
      validTo: '',
      totalFee: '',
      paid: '',
      balance: ''
    })
    setVehicleValidation({ isValid: false, message: '' })
    setPaidExceedsTotal(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 md:p-4'>
      <div className='bg-white rounded-xl md:rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col'>
        {/* Header */}
        <div className='bg-gradient-to-r from-green-600 to-emerald-600 p-2 md:p-3 text-white flex-shrink-0'>
          <div className='flex justify-between items-center'>
            <div>
              <h2 className='text-lg md:text-2xl font-bold'>
                Edit PUC Certificate
              </h2>
              <p className='text-green-100 text-xs md:text-sm mt-1'>
                Update PUC certificate details
              </p>
            </div>
            <button
              onClick={onClose}
              className='text-white hover:bg-white/20 rounded-lg p-1.5 md:p-2 transition cursor-pointer'
            >
              <svg className='w-5 h-5 md:w-6 md:h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
              </svg>
            </button>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className='flex flex-col flex-1 overflow-hidden'>
          <div className='flex-1 overflow-y-auto p-3 md:p-6'>
            {/* Section 1: Vehicle Details */}
            <div className='bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-emerald-200 rounded-xl p-3 md:p-6 mb-4 md:mb-6'>
              <h3 className='text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2'>
                <span className='bg-emerald-600 text-white w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm'>1</span>
                Vehicle Details
              </h3>

              <div className='grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4'>
                {/* Vehicle Number */}
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>
                    Vehicle Number <span className='text-red-500'>*</span>
                  </label>
                  <div className='relative'>
                    <input
                      type='text'
                      name='vehicleNumber'
                      value={formData.vehicleNumber}
                      onChange={handleChange}
                      placeholder='CG04AA1234 or 4793'
                      maxLength='10'
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent font-mono ${
                        formData.vehicleNumber && !vehicleValidation.isValid
                          ? 'border-red-500 focus:ring-red-500'
                          : formData.vehicleNumber && vehicleValidation.isValid
                          ? 'border-green-500 focus:ring-green-500'
                          : 'border-gray-300 focus:ring-emerald-500'
                      }`}
                      required
                      autoFocus
                    />
                    {fetchingVehicle && (
                      <div className='absolute right-3 top-2.5'>
                        <svg className='animate-spin h-5 w-5 text-emerald-500' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
                          <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                          <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                        </svg>
                      </div>
                    )}
                    {!fetchingVehicle && vehicleValidation.isValid && formData.vehicleNumber && !showVehicleDropdown && (
                      <div className='absolute right-3 top-2.5'>
                        <svg className='h-5 w-5 text-green-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
                        </svg>
                      </div>
                    )}

                    {/* Dropdown for multiple vehicle matches */}
                    {showVehicleDropdown && vehicleMatches.length > 0 && (
                      <div className='absolute z-50 w-full mt-1 bg-white border border-emerald-300 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
                        {vehicleMatches.map((vehicle, index) => (
                          <div
                            key={vehicle._id}
                            ref={(el) => (dropdownItemRefs.current[index] = el)}
                            onClick={() => handleVehicleSelect(vehicle)}
                            className={`px-4 py-3 cursor-pointer transition-colors ${
                              index === selectedDropdownIndex
                                ? 'bg-emerald-100 border-l-4 border-emerald-500'
                                : 'hover:bg-emerald-50 border-l-4 border-transparent'
                            }`}
                          >
                            <div className='flex items-center justify-between'>
                              <div>
                                <p className='font-mono font-bold text-gray-900'>{vehicle.registrationNumber}</p>
                                <p className='text-sm text-gray-600'>{vehicle.ownerName}</p>
                              </div>
                              {index === selectedDropdownIndex && (
                                <svg className='w-5 h-5 text-emerald-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                                </svg>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {vehicleValidation.message && !fetchingVehicle && (
                    <p className={`text-xs mt-1 ${vehicleValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                      {vehicleValidation.message}
                    </p>
                  )}
                  {vehicleError && (
                    <p className='text-xs text-amber-600 mt-1'>{vehicleError}</p>
                  )}
                  {!vehicleError && !fetchingVehicle && formData.vehicleNumber && vehicleValidation.isValid && !showVehicleDropdown && (
                    <p className='text-xs text-green-600 mt-1'>✓ Vehicle found - Details verified</p>
                  )}
                  <p className='text-xs mt-1 text-gray-500'>
                    Search by: Full number (CG04AA1234), Series (AA4793), or Last 4 digits (4793)
                  </p>
                </div>

                {/* Owner Name */}
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>
                    Owner Name
                  </label>
                  <input
                    type='text'
                    name='ownerName'
                    value={formData.ownerName}
                    onChange={handleChange}
                    placeholder='Enter owner name'
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
                  />
                </div>

                {/* Mobile Number */}
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>
                    Mobile Number
                  </label>
                  <input
                    type='tel'
                    name='mobileNumber'
                    value={formData.mobileNumber}
                    onChange={handleChange}
                    placeholder='10-digit number'
                    maxLength='10'
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Validity Period */}
            <div className='bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-indigo-200 rounded-xl p-3 md:p-6 mb-4 md:mb-6'>
              <h3 className='text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2'>
                <span className='bg-indigo-600 text-white w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm'>2</span>
                Validity Period
              </h3>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4'>
                {/* Valid From */}
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>
                    Valid From <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='text'
                    name='validFrom'
                    value={formData.validFrom}
                    onChange={handleChange}
                    onBlur={handleDateBlur}
                    placeholder='DD-MM-YYYY (e.g., 24-01-2025)'
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                    required
                  />
                </div>

                {/* Valid To (Auto-calculated) */}
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>
                    Valid To <span className='text-xs text-blue-500'>(Auto-calculated - 6 Months)</span>
                  </label>
                  <input
                    type='text'
                    name='validTo'
                    value={formData.validTo}
                    onChange={handleChange}
                    onBlur={handleDateBlur}
                    placeholder='DD-MM-YYYY (auto-calculated)'
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-indigo-50/50'
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Payment Information */}
            <div className='bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-3 md:p-6 mb-4 md:mb-6'>
              <h3 className='text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2'>
                <span className='bg-purple-600 text-white w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm'>3</span>
                Payment Information
              </h3>

              <div className='grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4'>
                {/* Total Fee */}
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>
                    Total Fee (₹) <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='number'
                    name='totalFee'
                    value={formData.totalFee}
                    onChange={handleChange}
                    placeholder=''
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-semibold'
                    required
                  />
                </div>

                {/* Paid Amount */}
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>
                    Paid (₹) <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='number'
                    name='paid'
                    value={formData.paid}
                    onChange={handleChange}
                    placeholder=''
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 font-semibold ${
                      paidExceedsTotal
                        ? 'border-red-500 focus:ring-red-500 bg-red-50'
                        : 'border-gray-300 focus:ring-purple-500 focus:border-transparent'
                    }`}
                    required
                  />
                  {paidExceedsTotal && (
                    <p className='text-xs mt-1 text-red-600 font-semibold'>
                      Paid amount cannot exceed total fee!
                    </p>
                  )}
                </div>

                {/* Balance (Auto-calculated) */}
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>
                    Balance (₹) <span className='text-xs text-gray-500'>(Auto)</span>
                  </label>
                  <input
                    type='number'
                    name='balance'
                    value={formData.balance}
                    readOnly
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg bg-purple-50 font-semibold text-gray-700'
                  />
                </div>
              </div>

              {/* Payment Status Indicator */}
              {parseFloat(formData.balance) > 0 && parseFloat(formData.paid) > 0 && (
                <div className='mt-3 bg-amber-50 border-l-4 border-amber-500 p-2 md:p-3 rounded'>
                  <p className='text-xs md:text-sm font-semibold text-amber-700 flex items-center gap-1'>
                    <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' />
                    </svg>
                    Partial Payment - Balance: ₹{formData.balance}
                  </p>
                </div>
              )}
              {parseFloat(formData.balance) === 0 && parseFloat(formData.totalFee) > 0 && (
                <div className='mt-3 bg-green-50 border-l-4 border-green-500 p-2 md:p-3 rounded'>
                  <p className='text-xs md:text-sm font-semibold text-green-700 flex items-center gap-1'>
                    <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' />
                    </svg>
                    Fully Paid
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className='border-t border-gray-200 p-3 md:p-4 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-3 flex-shrink-0'>
            <div className='text-xs md:text-sm text-gray-600'>
              <kbd className='px-2 py-1 bg-gray-200 rounded text-xs font-mono'>Ctrl+Enter</kbd> to submit quickly
            </div>

            <div className='flex gap-2 md:gap-3 w-full md:w-auto'>
              <button
                type='button'
                onClick={onClose}
                className='flex-1 md:flex-none px-4 md:px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-semibold transition cursor-pointer'
              >
                Cancel
              </button>

              <button
                type='submit'
                className='flex-1 md:flex-none px-6 md:px-8 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg font-semibold transition flex items-center justify-center gap-2 cursor-pointer'
              >
                <svg className='w-4 h-4 md:w-5 md:h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
                </svg>
                Update PUC
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditPucModal

