import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { handleDateBlur as utilHandleDateBlur, handleSmartDateInput, normalizeAIExtractedDate } from '../../../utils/dateFormatter'
import { validateVehicleNumberRealtime } from '../../../utils/vehicleNoCheck'
import DocumentScannerPreview from '../../../components/DocumentScannerPreview'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

const AddTaxModal = ({ isOpen, onClose, onSubmit, prefilledVehicleNumber = '', prefilledOwnerName = '', prefilledMobileNumber = '' }) => {
  const [fetchingVehicle, setFetchingVehicle] = useState(false)
  const [vehicleError, setVehicleError] = useState('')
  const [dateError, setDateError] = useState({ taxFrom: '', taxTo: '' })
  const [vehicleValidation, setVehicleValidation] = useState({ isValid: false, message: '' })
  const [vehicleMatches, setVehicleMatches] = useState([])
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false)
  const [selectedDropdownIndex, setSelectedDropdownIndex] = useState(0)
  const dropdownItemRefs = useRef([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [scanningFile, setScanningFile] = useState(null)
  const [isExtractingTax, setIsExtractingTax] = useState(false)
  const [uploadedTaxDocument, setUploadedTaxDocument] = useState(null)
  const [uploadedTaxFile, setUploadedTaxFile] = useState(null)

  const [formData, setFormData] = useState({
    receiptNo: '',
    vehicleNumber: prefilledVehicleNumber,
    ownerName: prefilledOwnerName,
    partyId: '',
    taxAmount: '',
    taxFrom: '',
    taxTo: ''
  })
  const [taxPeriod, setTaxPeriod] = useState('Q1') // Q1=3mo, Q2=6mo, Q3=9mo, Q4=12mo

  useEffect(() => {
    return () => {
      if (uploadedTaxDocument?.previewUrl) URL.revokeObjectURL(uploadedTaxDocument.previewUrl)
    }
  }, [uploadedTaxDocument])

  // Validate date and check if it's valid
  const isValidDate = (day, month, year) => {
    // Basic range checks
    if (day < 1 || day > 31) return false
    if (month < 1 || month > 12) return false
    if (year < 1900 || year > 2100) return false

    // Check days in month
    const daysInMonth = new Date(year, month, 0).getDate()
    return day <= daysInMonth
  }

  // Reset form when modal closes or when prefilled values change
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        receiptNo: '',
        vehicleNumber: prefilledVehicleNumber,
        ownerName: prefilledOwnerName,
        partyId: '',
        taxAmount: '',
        taxFrom: '',
        taxTo: ''
      })
      setTaxPeriod('Q1') // Reset to Q1
      setDateError({ taxFrom: '', taxTo: '' })
      setVehicleError('')
      setFetchingVehicle(false)
      setVehicleMatches([])
      setShowVehicleDropdown(false)
      setSelectedDropdownIndex(0)
      setScanningFile(null)
      setIsExtractingTax(false)
      setUploadedTaxDocument(prev => {
        if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl)
        return null
      })
      setUploadedTaxFile(null)
    }
  }, [isOpen, prefilledVehicleNumber, prefilledOwnerName, prefilledMobileNumber])

  // Set prefilled values when modal opens
  useEffect(() => {
    if (isOpen && (prefilledVehicleNumber || prefilledOwnerName || prefilledMobileNumber)) {
      setFormData(prev => ({
        ...prev,
        vehicleNumber: prefilledVehicleNumber,
        ownerName: prefilledOwnerName
      }));
      // Mark vehicle as valid if prefilled
      if (prefilledVehicleNumber) {
        setVehicleValidation({ isValid: true, message: 'Vehicle number prefilled' });
      }
    }
  }, [isOpen, prefilledVehicleNumber, prefilledOwnerName, prefilledMobileNumber])

  // Fetch vehicle details when registration number is entered
  useEffect(() => {
    const fetchVehicleDetails = async () => {
      const searchInput = formData.vehicleNumber.trim()

      // Only fetch if search input has at least 4 characters
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
        const response = await axios.get(`${API_URL}/api/vehicle/search/${searchInput}`,{withCredentials:true})

        if (response.data.success) {
          // Check if multiple vehicles found
          if (response.data.multiple) {
            // Show dropdown with multiple matches
            setVehicleMatches(response.data.data)
            setShowVehicleDropdown(true)
            setSelectedDropdownIndex(0) // Reset to first item
            setVehicleError('')
          } else {
            // Single match found - auto-fill including full vehicle number, owner name, mobile number, and partyId
            const vehicleData = response.data.data
            setFormData(prev => ({
              ...prev,
              vehicleNumber: vehicleData.registrationNumber, // Replace partial input with full number
              ownerName: vehicleData.ownerName || prev.ownerName,
              partyId: vehicleData.partyId?._id || vehicleData.partyId || ''
            }))
            // Validate the full vehicle number
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

    // Debounce the API call - wait 500ms after user stops typing
    const timeoutId = setTimeout(() => {
      if (formData.vehicleNumber) {
        fetchVehicleDetails()
      }
    }, 500) // Wait 500ms after user stops typing

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

  // Handle vehicle selection from dropdown
  const handleVehicleSelect = (vehicle) => {
    setFormData(prev => ({
      ...prev,
      vehicleNumber: vehicle.registrationNumber,
      ownerName: vehicle.ownerName || prev.ownerName,
      partyId: vehicle.partyId?._id || vehicle.partyId || ''
    }))
    setShowVehicleDropdown(false)
    setVehicleMatches([])
    setVehicleError('')
    setSelectedDropdownIndex(0)

    // Validate the selected vehicle number
    const validation = validateVehicleNumberRealtime(vehicle.registrationNumber)
    setVehicleValidation(validation)
  }

  // Calculate tax to date based on selected quarter period
  useEffect(() => {
    if (formData.taxFrom) {
      // Parse DD-MM-YYYY or DD/MM/YYYY format
      const parts = formData.taxFrom.split(/[/-]/)
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10)
        const month = parseInt(parts[1], 10) - 1 // Month is 0-indexed
        const year = parseInt(parts[2], 10)

        // Check if date is valid
        if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year > 1900) {
          const taxFromDate = new Date(year, month, day)

          // Check if the date object is valid
          if (!isNaN(taxFromDate.getTime())) {
            const taxToDate = new Date(taxFromDate)

            // Calculate based on selected quarter
            const monthsToAdd = {
              'Q1': 3,
              'Q2': 6,
              'Q3': 9,
              'Q4': 12
            }

            taxToDate.setMonth(taxToDate.getMonth() + monthsToAdd[taxPeriod])
            // Subtract 1 day
            taxToDate.setDate(taxToDate.getDate() - 1)

            // Format date to DD-MM-YYYY
            const newDay = String(taxToDate.getDate()).padStart(2, '0')
            const newMonth = String(taxToDate.getMonth() + 1).padStart(2, '0')
            const newYear = taxToDate.getFullYear()

            setFormData(prev => ({
              ...prev,
              taxTo: `${newDay}-${newMonth}-${newYear}`
            }))
          }
        }
      }
    }
  }, [formData.taxFrom, taxPeriod])

  // Keyboard shortcuts and dropdown navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Handle dropdown navigation
      if (showVehicleDropdown && vehicleMatches.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSelectedDropdownIndex(prev =>
            prev < vehicleMatches.length - 1 ? prev + 1 : 0
          )
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSelectedDropdownIndex(prev =>
            prev > 0 ? prev - 1 : vehicleMatches.length - 1
          )
          return
        }
        if (e.key === 'Enter') {
          e.preventDefault()
          if (vehicleMatches[selectedDropdownIndex]) {
            handleVehicleSelect(vehicleMatches[selectedDropdownIndex])
          }
          return
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          setShowVehicleDropdown(false)
          setVehicleMatches([])
          setSelectedDropdownIndex(0)
          return
        }
      }

      // Ctrl+Enter to submit (only when dropdown is not showing)
      if (!showVehicleDropdown && (e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        document.querySelector('form')?.requestSubmit()
      }
      // Escape to close modal (only when dropdown is not showing)
      if (!showVehicleDropdown && e.key === 'Escape') {
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

    // Handle vehicle number with validation only (no enforcement)
    if (name === 'vehicleNumber') {
      // Convert to uppercase
      const upperValue = value.toUpperCase()

      // Validate in real-time (only show validation if 9 or 10 characters)
      const validation = (upperValue.length === 9 || upperValue.length === 10) ? validateVehicleNumberRealtime(upperValue) : { isValid: false, message: '' }
      setVehicleValidation(validation)

      setFormData(prev => ({
        ...prev,
        [name]: upperValue
      }))
      return
    }

    // Remove dashes from receipt number to store as uppercase
    if (name === 'receiptNo') {
      const cleanedValue = value.replace(/-/g, '').toUpperCase()
      setFormData(prev => ({
        ...prev,
        [name]: cleanedValue
      }))
      return
    }

    // Handle taxAmount field (optional, no special zero handling)
    if (name === 'taxAmount') {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
      return
    }

    // Handle date fields with smart validation and formatting
    if (name === 'taxFrom' || name === 'taxTo') {
      const formatted = handleSmartDateInput(value, formData[name] || '')
      if (formatted !== null) {
        setFormData(prev => ({
          ...prev,
          [name]: formatted
        }))
      }
      return
    }

    // Convert owner name to uppercase
    const uppercaseFields = ['ownerName']
    const finalValue = uppercaseFields.includes(name) ? value.toUpperCase() : value

    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }))
  }

  const handleDateBlur = (e) => {
    const { name, value } = e.target

    // Only format date fields
    if (name === 'taxFrom' || name === 'taxTo') {
      if (!value.trim()) {
        setDateError(prev => ({ ...prev, [name]: '' }))
        return
      }

      const parts = value.split(/[/-]/)

      // Only format if we have a complete date with 3 parts
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        let day = parseInt(parts[0], 10)
        let month = parseInt(parts[1], 10)
        let year = parseInt(parts[2], 10)

        // Auto-expand 2-digit year to 4-digit (only when exactly 2 digits)
        if (parts[2].length === 2 && /^\d{2}$/.test(parts[2])) {
          // Convert 2-digit year to 4-digit (00-50 → 2000-2050, 51-99 → 1951-1999)
          year = year <= 50 ? 2000 + year : 1900 + year
        }

        // Validate the date
        if (!isValidDate(day, month, year)) {
          setDateError(prev => ({
            ...prev,
            [name]: `Invalid date. ${month === 2 ? 'February' : month === 4 || month === 6 || month === 9 || month === 11 ? 'This month' : 'This month'} ${
              month === 2 ? 'has max 28/29 days' : month === 4 || month === 6 || month === 9 || month === 11 ? 'has max 30 days' : 'has max 31 days'
            }`
          }))
          // Clear the invalid date
          setFormData(prev => ({
            ...prev,
            [name]: ''
          }))
          return
        }

        // Clear error if date is valid
        setDateError(prev => ({ ...prev, [name]: '' }))

        // Normalize to DD-MM-YYYY format (if year is 4 digits or was expanded)
        if (year.toString().length === 4) {
          const formattedDay = String(day).padStart(2, '0')
          const formattedMonth = String(month).padStart(2, '0')
          const formattedValue = `${formattedDay}-${formattedMonth}-${year}`
          setFormData(prev => ({
            ...prev,
            [name]: formattedValue
          }))
        }
      } else {
        setDateError(prev => ({ ...prev, [name]: 'Please enter date in DD-MM-YYYY or DD/MM/YYYY format' }))
      }
    }
  }

  // Handle Enter key to navigate to next field instead of submitting
  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()

      // Get current tabIndex
      const currentTabIndex = parseInt(e.target.getAttribute('tabIndex'))

      // If we're on the last field (taxAmount = tabIndex 6), submit the form
      if (currentTabIndex === 6) {
        document.querySelector('form')?.requestSubmit()
        return
      }

      // Find next input with tabIndex
      const nextTabIndex = currentTabIndex + 1
      const nextInput = document.querySelector(`input[tabIndex="${nextTabIndex}"]`)

      if (nextInput) {
        nextInput.focus()
      }
    }
  }

  const handleTaxExtractionUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf') {
       setUploadedTaxFile(file);
       setUploadedTaxDocument(prev => {
         if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
         return { name: file.name, type: 'pdf', previewUrl: URL.createObjectURL(file) };
       });
       // Direct upload to backend for parsing
       e.target.value = '';
       await processExtraction(file);
    } else if (file.type.startsWith('image/')) {
       // Send to scanner preview
       setScanningFile(file);
       e.target.value = '';
    } else {
       toast.error('Please upload an image or PDF file for extraction.', { position: 'top-right', autoClose: 3000 });
       return;
    }
  }

  const handleScannerConfirm = async (processedImageFile) => {
    setScanningFile(null);
    setUploadedTaxFile(processedImageFile);
    setUploadedTaxDocument(prev => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return { name: processedImageFile.name || 'tax-document.jpg', type: 'image', previewUrl: URL.createObjectURL(processedImageFile) };
    });
    await processExtraction(processedImageFile);
  }

  const processExtraction = async (fileToProcess) => {
    setIsExtractingTax(true);
    const updateToast = toast.info('Analyzing document, please wait...', { autoClose: false, isLoading: true });

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64String = reader.result;
          const response = await axios.post(
            `${API_URL}/api/ocr/tax`,
            { imageBase64: base64String },
            { withCredentials: true }
          );

          if (response.data.success && response.data.data) {
            const resultData = response.data.data;
            
            // Map the result properties to formData safely
            setFormData(prev => {
              const updated = { ...prev };
              Object.keys(resultData).forEach(key => {
                if (resultData[key] && Object.prototype.hasOwnProperty.call(updated, key)) {
                  if (key === 'taxFrom' || key === 'taxTo') {
                      const normalizedStr = normalizeAIExtractedDate(resultData[key]);
                      const formatted = handleSmartDateInput(normalizedStr, '');
                      if (formatted) updated[key] = formatted;
                  } else {
                      updated[key] = resultData[key].toUpperCase();
                  }
                }
              });

              // Trigger vehicle validation if registrationNumber changes
              if (resultData.vehicleNumber) {
                 const validation = validateVehicleNumberRealtime(resultData.vehicleNumber);
                 setVehicleValidation(validation);
              }
              
              return updated;
            });
            
            toast.dismiss(updateToast);
            toast.success('Tax Details Extracted Successfully!', { position: 'top-right', autoClose: 3000 });

          } else {
            toast.dismiss(updateToast);
            toast.error('Failed to extract data correctly.', { position: 'top-right', autoClose: 3000 });
          }
        } catch (err) {
            console.error(err);
            toast.dismiss(updateToast);
            toast.error('Server error during OCR processing.', { position: 'top-right', autoClose: 3000 });
        } finally {
            setIsExtractingTax(false);
        }
      };
      
      reader.readAsDataURL(fileToProcess);

    } catch (err) {
      toast.dismiss(updateToast);
      toast.error('Error reading the file.', { position: 'top-right', autoClose: 3000 });
      setIsExtractingTax(false);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate vehicle number before submitting (must be 9 or 10 characters and valid format)
    if ((formData.vehicleNumber.length === 9 || formData.vehicleNumber.length === 10) && !vehicleValidation.isValid) {
      toast.error('Please enter a valid vehicle number in the format: CG04AA1234 (10 chars) or CG04G1234 (9 chars)')
      return
    }

    // Ensure vehicle number is 9 or 10 characters for submission
    if (formData.vehicleNumber && formData.vehicleNumber.length !== 9 && formData.vehicleNumber.length !== 10) {
      toast.error('Vehicle number must be 9 or 10 characters')
      return
    }

    const dataToSubmit = {
      receiptNo: formData.receiptNo,
      vehicleNumber: formData.vehicleNumber,
      ownerName: formData.ownerName,
      taxFrom: formData.taxFrom,
      taxTo: formData.taxTo,
      taxAmount: formData.taxAmount ? parseFloat(formData.taxAmount) : undefined
    }

    // Make API call
    setIsSubmitting(true)
    try {
      if (uploadedTaxFile) {
        dataToSubmit.taxDocumentData = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(uploadedTaxFile)
        })
      }
      const response = await axios.post(`${API_URL}/api/tax`, dataToSubmit, {
        withCredentials: true
      })

      if (response.data.success) {
        toast.success('Tax record added successfully!')

        // Call onSubmit callback to notify parent (for refresh)
        if (onSubmit) {
          onSubmit()
        }

        // Close modal
        onClose()
      }
    } catch (error) {
      console.error('Error adding tax:', error)
      toast.error(error.response?.data?.message || 'Failed to add tax record')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-black/60  z-50 flex items-center justify-center p-2 md:p-4'>
      <div className='bg-white rounded-xl md:rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col'>
        {/* Header */}
        <div className='bg-gradient-to-r from-blue-600 to-indigo-600 p-2 md:p-3 text-white flex-shrink-0'>
          <div className='flex justify-between items-center'>
            <div>
              <h2 className='text-lg md:text-2xl font-bold'>
                Add New Tax Record
              </h2>
              <p className='text-blue-100 text-xs md:text-sm mt-1'>
                Quarterly vehicle tax payment record (3 months)
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
            {/* AI Fast Extraction Section */}
            <div className='mb-4 md:mb-6 p-4 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl border-2 border-dashed border-teal-200'>
              <div className='flex flex-col sm:flex-row items-center justify-between gap-4'>
                <div>
                  <h3 className='text-sm md:text-base font-bold text-teal-800 flex items-center gap-2'>
                      <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 10V3L4 14h7v7l9-11h-7z' />
                      </svg>
                      AI Fast Extraction
                  </h3>
                  <p className='text-xs text-teal-600 mt-1'>Upload a Tax receipt (Image or PDF) to auto-fill details below.</p>
                 </div>
                 <div className='relative overflow-hidden'>
                  <button 
                    type='button' 
                    disabled={isExtractingTax}
                    className='relative px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg shadow-md hover:bg-teal-700 transition disabled:opacity-50 flex items-center gap-2 text-sm max-w-full'
                  >
                    {isExtractingTax ? (
                      <>
                        <svg className='animate-spin h-4 w-4 text-white' fill='none' viewBox='0 0 24 24'>
                           <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                           <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                        </svg>
                        Extracting...
                      </>
                    ) : (
                      <>
                        <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12'/>
                        </svg>
                        Upload Document
                      </>
                    )}
                  </button>
                  <input 
                    type='file' 
                    accept='image/*, application/pdf' 
                    disabled={isExtractingTax}
                    onChange={handleTaxExtractionUpload} 
                    className='absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed' 
                  />
                </div>
              </div>
            </div>

            {/* Section 1: Vehicle & Receipt Details */}
            <div className='bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-indigo-200 rounded-xl p-3 md:p-6 mb-4 md:mb-6'>
              <h3 className='text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2'>
                <span className='bg-indigo-600 text-white w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm'>1</span>
                Vehicle & Receipt Details
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
                      onKeyDown={handleInputKeyDown}
                      placeholder='CG04AA1234'
                      maxLength='10'
                      tabIndex="1"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent font-mono bg-white ${
                        formData.vehicleNumber && !vehicleValidation.isValid
                          ? 'border-red-500 focus:ring-red-500'
                          : formData.vehicleNumber && vehicleValidation.isValid
                          ? 'border-green-500 focus:ring-green-500'
                          : 'border-gray-300 focus:ring-indigo-500'
                      }`}
                      required
                      autoFocus
                    />
                    {fetchingVehicle && (
                      <div className='absolute right-3 top-2.5'>
                        <svg className='animate-spin h-5 w-5 text-indigo-500' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
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
                      <div className='absolute z-50 w-full mt-1 bg-white border border-indigo-300 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
                        <div className='p-2 bg-indigo-50 border-b border-indigo-200'>
                          <p className='text-xs font-semibold text-indigo-700'>
                            {vehicleMatches.length} vehicles found - Use ↑↓ arrows to navigate, Enter to select
                          </p>
                        </div>
                        {vehicleMatches.map((vehicle, index) => (
                          <div
                            key={vehicle._id || index}
                            ref={(el) => (dropdownItemRefs.current[index] = el)}
                            onClick={() => handleVehicleSelect(vehicle)}
                            className={`p-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition ${
                              index === selectedDropdownIndex
                                ? 'bg-indigo-100 border-l-4 border-l-indigo-600'
                                : 'hover:bg-indigo-50'
                            }`}
                          >
                            <div className='flex justify-between items-start'>
                              <div>
                                <p className={`font-mono font-bold text-sm ${
                                  index === selectedDropdownIndex ? 'text-indigo-800' : 'text-indigo-700'
                                }`}>
                                  {vehicle.registrationNumber}
                                </p>
                                <p className='text-xs text-gray-700 mt-1'>
                                  {vehicle.ownerName || 'N/A'}
                                </p>
                                {vehicle.chassisNumber && (
                                  <p className='text-xs text-gray-500 mt-0.5'>
                                    Chassis: {vehicle.chassisNumber}
                                  </p>
                                )}
                              </div>
                              <svg className={`w-5 h-5 ${
                                index === selectedDropdownIndex ? 'text-indigo-600' : 'text-indigo-400'
                              }`} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                              </svg>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {vehicleValidation.message && !fetchingVehicle && !showVehicleDropdown && (
                    <p className={`text-xs mt-1 ${vehicleValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                      {vehicleValidation.message}
                    </p>
                  )}
                  {vehicleError && (
                    <p className='text-xs text-amber-600 mt-1'>{vehicleError}</p>
                  )}
                  {!vehicleError && !fetchingVehicle && formData.vehicleNumber && formData.ownerName && vehicleValidation.isValid && !showVehicleDropdown && (
                    <p className='text-xs text-green-600 mt-1'>✓ Vehicle found - Owner name auto-filled</p>
                  )}
                 
                </div>

                {/* Receipt Number */}
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>
                    Receipt Number
                  </label>
                  <input
                    type='text'
                    name='receiptNo'
                    value={formData.receiptNo}
                    onChange={handleChange}
                    onKeyDown={handleInputKeyDown}
                    placeholder='RCP001'
                    tabIndex="2"
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono uppercase bg-white'
                  />
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
                    onKeyDown={handleInputKeyDown}
                    placeholder='Enter owner name'
                    tabIndex="3"
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white'
                  />
                </div>

              </div>
            </div>

            {/* Section 2: Tax Period */}
            <div className='bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-3 md:p-6 mb-4 md:mb-6'>
              <h3 className='text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2'>
                <span className='bg-purple-600 text-white w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm'>2</span>
                Tax Period
              </h3>

              {/* Quarter Selection */}
              <div className='mb-4'>
                <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-2'>
                  Select Tax Period <span className='text-red-500'>*</span>
                </label>
                <div className='grid grid-cols-4 gap-2'>
                  <button
                    type='button'
                    onClick={() => setTaxPeriod('Q1')}
                    className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all cursor-pointer ${
                      taxPeriod === 'Q1'
                        ? 'bg-purple-600 text-white shadow-lg ring-2 ring-purple-300'
                        : 'bg-white text-gray-700 border-2 border-purple-200 hover:border-purple-400'
                    }`}
                  >
                    Q1
                    <span className='block text-[10px] font-normal mt-0.5'>3 Months</span>
                  </button>
                  <button
                    type='button'
                    onClick={() => setTaxPeriod('Q2')}
                    className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all cursor-pointer ${
                      taxPeriod === 'Q2'
                        ? 'bg-purple-600 text-white shadow-lg ring-2 ring-purple-300'
                        : 'bg-white text-gray-700 border-2 border-purple-200 hover:border-purple-400'
                    }`}
                  >
                    Q2
                    <span className='block text-[10px] font-normal mt-0.5'>6 Months</span>
                  </button>
                  <button
                    type='button'
                    onClick={() => setTaxPeriod('Q3')}
                    className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all cursor-pointer ${
                      taxPeriod === 'Q3'
                        ? 'bg-purple-600 text-white shadow-lg ring-2 ring-purple-300'
                        : 'bg-white text-gray-700 border-2 border-purple-200 hover:border-purple-400'
                    }`}
                  >
                    Q3
                    <span className='block text-[10px] font-normal mt-0.5'>9 Months</span>
                  </button>
                  <button
                    type='button'
                    onClick={() => setTaxPeriod('Q4')}
                    className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all cursor-pointer ${
                      taxPeriod === 'Q4'
                        ? 'bg-purple-600 text-white shadow-lg ring-2 ring-purple-300'
                        : 'bg-white text-gray-700 border-2 border-purple-200 hover:border-purple-400'
                    }`}
                  >
                    Q4
                    <span className='block text-[10px] font-normal mt-0.5'>12 Months</span>
                  </button>
                </div>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4'>
                {/* Tax From */}
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>
                    Tax From <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='text'
                    name='taxFrom'
                    value={formData.taxFrom}
                    onChange={handleChange}
                    onBlur={handleDateBlur}
                    onKeyDown={handleInputKeyDown}
                    placeholder='DD-MM-YYYY'
                    tabIndex="4"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      dateError.taxFrom ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
                    }`}
                    required
                  />
                  {dateError.taxFrom && (
                    <p className='text-xs text-red-600 mt-1 flex items-center gap-1'>
                      <svg className='w-3 h-3' fill='currentColor' viewBox='0 0 20 20'>
                        <path fillRule='evenodd' d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z' clipRule='evenodd' />
                      </svg>
                      {dateError.taxFrom}
                    </p>
                  )}
                </div>

                {/* Tax To (Auto-calculated) */}
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>
                    Tax To <span className='text-xs text-blue-500'>(Auto-calculated)</span>
                  </label>
                  <input
                    type='text'
                    name='taxTo'
                    value={formData.taxTo}
                    onChange={handleChange}
                    onBlur={handleDateBlur}
                    onKeyDown={handleInputKeyDown}
                    placeholder='DD-MM-YYYY'
                    tabIndex="5"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white ${
                      dateError.taxTo ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {dateError.taxTo && (
                    <p className='text-xs text-red-600 mt-1 flex items-center gap-1'>
                      <svg className='w-3 h-3' fill='currentColor' viewBox='0 0 20 20'>
                        <path fillRule='evenodd' d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z' clipRule='evenodd' />
                      </svg>
                      {dateError.taxTo}
                    </p>
                  )}
                </div>

                {/* Tax Amount (Optional) */}
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>
                    Tax Amount (₹) <span className='text-xs text-gray-500'>(Optional)</span>
                  </label>
                  <input
                    type='number'
                    name='taxAmount'
                    value={formData.taxAmount}
                    onChange={handleChange}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={handleInputKeyDown}
                    placeholder=''
                    tabIndex="6"
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-semibold bg-white'
                  />
                </div>
              </div>
            </div>

            {uploadedTaxDocument && (
              <div className='bg-gradient-to-r from-slate-50 to-indigo-50 border-2 border-slate-200 rounded-xl p-3 md:p-6 mb-4 md:mb-6'>
                <h3 className='text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2'>
                  <span className='bg-slate-700 text-white w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm'>3</span>
                  Uploaded Tax Document
                </h3>
                <div className='mb-3 flex items-center justify-between gap-3 rounded-lg bg-white/80 px-3 py-2 border border-slate-200'>
                  <div className='min-w-0'>
                    <p className='text-sm font-semibold text-slate-800 truncate'>{uploadedTaxDocument.name}</p>
                    <p className='text-xs text-slate-500'>{uploadedTaxDocument.type === 'pdf' ? 'PDF preview' : 'Image preview'}</p>
                  </div>
                </div>
                {uploadedTaxDocument.type === 'pdf' ? (
                  <iframe src={uploadedTaxDocument.previewUrl} title='Uploaded Tax PDF' className='w-full h-80 rounded-xl border border-slate-200 bg-white' />
                ) : (
                  <div className='rounded-xl border border-slate-200 bg-white p-2'>
                    <img src={uploadedTaxDocument.previewUrl} alt='Uploaded Tax document' className='w-full max-h-80 object-contain rounded-lg' />
                  </div>
                )}
              </div>
            )}
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
                disabled={isSubmitting}
                className='flex-1 md:flex-none px-6 md:px-8 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg font-semibold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {isSubmitting ? (
                  <>
                    <svg className='animate-spin h-5 w-5 text-white' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
                      <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                      <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                    </svg>
                    Adding...
                  </>
                ) : (
                  <>
                    <svg className='w-4 h-4 md:w-5 md:h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
                    </svg>
                    Add Tax Record
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
      {scanningFile && (
        <DocumentScannerPreview
          file={scanningFile}
          onCancel={() => setScanningFile(null)}
          onConfirm={handleScannerConfirm}
        />
      )}
    </div>
  )
}

export default AddTaxModal

