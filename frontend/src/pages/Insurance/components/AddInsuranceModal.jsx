import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { getTodayDate as utilGetTodayDate, handleSmartDateInput, normalizeAIExtractedDate } from '../../../utils/dateFormatter'
import { validateVehicleNumberRealtime } from '../../../utils/vehicleNoCheck'
import DocumentScannerPreview from '../../../components/DocumentScannerPreview'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

const resolveStoredDocumentPreview = (documentPath) => {
  if (!documentPath) return null
  if (documentPath.startsWith('data:')) return documentPath
  if (documentPath.startsWith('http://') || documentPath.startsWith('https://')) return documentPath
  return `${API_URL}${documentPath}`
}

const AddInsuranceModal = ({ isOpen, onClose, onSubmit, initialData = null, isEditMode = false, prefilledVehicleNumber = '', prefilledOwnerName = '' }) => {
  const dropdownItemRefs = useRef([])
  const isOcrUpdate = useRef(false)
  const getTodayDate = () => utilGetTodayDate()
  const [formData, setFormData] = useState({
    vehicleNumber: prefilledVehicleNumber,
    policyNumber: '',
    policyHolderName: prefilledOwnerName,
    validFrom: '',
    validTo: '',
    insuranceDocument: ''
  })
  const [fetchingVehicle, setFetchingVehicle] = useState(false)
  const [vehicleError, setVehicleError] = useState('')
  const [vehicleValidation, setVehicleValidation] = useState({ isValid: false, message: '' })
  const [vehicleMatches, setVehicleMatches] = useState([])
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false)
  const [selectedDropdownIndex, setSelectedDropdownIndex] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [scanningFile, setScanningFile] = useState(null)
  const [isExtractingInsurance, setIsExtractingInsurance] = useState(false)
  const [uploadedInsuranceDocument, setUploadedInsuranceDocument] = useState(null)
  const [uploadedInsuranceFile, setUploadedInsuranceFile] = useState(null)

  useEffect(() => {
    return () => {
      if (uploadedInsuranceDocument?.revokeOnCleanup && uploadedInsuranceDocument.previewUrl) {
        URL.revokeObjectURL(uploadedInsuranceDocument.previewUrl)
      }
    }
  }, [uploadedInsuranceDocument])

  useEffect(() => {
    if (initialData && isOpen) {
      const vehicleNum = initialData.vehicleNumber || ''
      setFormData({
        vehicleNumber: vehicleNum,
        policyNumber: initialData.policyNumber || '',
        policyHolderName: initialData.policyHolderName || '',
        validFrom: initialData.validFrom || '',
        validTo: initialData.validTo || '',
        insuranceDocument: initialData.insuranceDocument || ''
      })
      setUploadedInsuranceDocument(
        initialData.insuranceDocument
          ? {
              name: 'insurance-document',
              type: initialData.insuranceDocument.startsWith('data:application/pdf') || initialData.insuranceDocument.toLowerCase().includes('.pdf') ? 'pdf' : 'image',
              previewUrl: resolveStoredDocumentPreview(initialData.insuranceDocument),
              revokeOnCleanup: false
            }
          : null
      )
      setUploadedInsuranceFile(null)
      if (vehicleNum) setVehicleValidation(validateVehicleNumberRealtime(vehicleNum))
    } else if (!isOpen) {
      setFormData({
        vehicleNumber: prefilledVehicleNumber,
        policyNumber: '',
        policyHolderName: prefilledOwnerName,
        validFrom: '',
        validTo: '',
        insuranceDocument: ''
      })
      setFetchingVehicle(false)
      setVehicleValidation({ isValid: false, message: '' })
      setVehicleError('')
      setVehicleMatches([])
      setShowVehicleDropdown(false)
      setSelectedDropdownIndex(0)
      setScanningFile(null)
      setIsExtractingInsurance(false)
      setUploadedInsuranceDocument(prev => {
        if (prev?.revokeOnCleanup && prev.previewUrl) URL.revokeObjectURL(prev.previewUrl)
        return null
      })
      setUploadedInsuranceFile(null)
    }
  }, [initialData, isOpen, prefilledVehicleNumber, prefilledOwnerName])

  useEffect(() => {
    if (isOpen && !initialData && (prefilledVehicleNumber || prefilledOwnerName)) {
      setFormData(prev => ({ ...prev, vehicleNumber: prefilledVehicleNumber, policyHolderName: prefilledOwnerName }))
      if (prefilledVehicleNumber) setVehicleValidation({ isValid: true, message: 'Vehicle number prefilled' })
    }
  }, [isOpen, prefilledVehicleNumber, prefilledOwnerName, initialData])

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
          } else {
            const vehicleData = response.data.data
            setFormData(prev => ({ ...prev, vehicleNumber: vehicleData.registrationNumber, policyHolderName: vehicleData.ownerName || prev.policyHolderName }))
            setVehicleValidation(validateVehicleNumberRealtime(vehicleData.registrationNumber))
            setVehicleMatches([])
            setShowVehicleDropdown(false)
          }
        }
      } catch (error) {
        setVehicleError(error.response?.status === 404 ? 'No vehicles found matching the search' : 'Error fetching vehicle details')
        setVehicleMatches([])
        setShowVehicleDropdown(false)
        setSelectedDropdownIndex(0)
      } finally {
        setFetchingVehicle(false)
      }
    }

    const timeoutId = setTimeout(() => {
      if (formData.vehicleNumber) fetchVehicleDetails()
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [formData.vehicleNumber])

  useEffect(() => {
    if (isOcrUpdate.current || !formData.validFrom) return
    const parts = formData.validFrom.trim().split(/[/-]/)
    if (parts.length !== 3) return
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1
    const year = parseInt(parts[2], 10)
    if ([day, month, year].some(Number.isNaN) || year <= 1900) return
    const validFromDate = new Date(year, month, day)
    if (Number.isNaN(validFromDate.getTime())) return
    if (validFromDate.getDate() !== day || validFromDate.getMonth() !== month || validFromDate.getFullYear() !== year) return
    const validToDate = new Date(validFromDate)
    validToDate.setFullYear(validToDate.getFullYear() + 1)
    validToDate.setDate(validToDate.getDate() - 1)
    const newDay = String(validToDate.getDate()).padStart(2, '0')
    const newMonth = String(validToDate.getMonth() + 1).padStart(2, '0')
    const newYear = validToDate.getFullYear()
    const formattedValidTo = `${newDay}-${newMonth}-${newYear}`
    if (formData.validTo !== formattedValidTo) {
      setFormData(prev => ({ ...prev, validTo: formattedValidTo }))
    }
  }, [formData.validFrom, formData.validTo])

  useEffect(() => {
    if (showVehicleDropdown && dropdownItemRefs.current[selectedDropdownIndex]) {
      dropdownItemRefs.current[selectedDropdownIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selectedDropdownIndex, showVehicleDropdown])

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
          if (vehicleMatches[selectedDropdownIndex]) handleVehicleSelect(vehicleMatches[selectedDropdownIndex])
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
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose, showVehicleDropdown, vehicleMatches, selectedDropdownIndex])

  const handleVehicleSelect = (vehicle) => {
    setFormData(prev => ({ ...prev, vehicleNumber: vehicle.registrationNumber, policyHolderName: vehicle.ownerName || prev.policyHolderName }))
    setShowVehicleDropdown(false)
    setVehicleMatches([])
    setVehicleError('')
    setSelectedDropdownIndex(0)
    setVehicleValidation(validateVehicleNumberRealtime(vehicle.registrationNumber))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'vehicleNumber') {
      const upperValue = value.toUpperCase()
      const validation = (upperValue.length === 9 || upperValue.length === 10) ? validateVehicleNumberRealtime(upperValue) : { isValid: false, message: '' }
      setVehicleValidation(validation)
      setFormData(prev => ({ ...prev, [name]: upperValue }))
      return
    }
    if (name === 'policyNumber') {
      setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }))
      return
    }
    if (name === 'validFrom' || name === 'validTo') {
      const formatted = handleSmartDateInput(value, formData[name] || '')
      if (formatted !== null) setFormData(prev => ({ ...prev, [name]: formatted }))
      return
    }
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const processExtraction = async (fileToProcess) => {
    setIsExtractingInsurance(true)
    const updateToast = toast.info('Analyzing insurance document, please wait...', { autoClose: false, isLoading: true })

    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        try {
          const response = await axios.post(`${API_URL}/api/ocr/insurance`, { imageBase64: reader.result }, { withCredentials: true })
          if (response.data.success && response.data.data) {
            const resultData = response.data.data
            isOcrUpdate.current = true

            setFormData(prev => {
              const updated = { ...prev }
              Object.keys(resultData).forEach((key) => {
                const value = resultData[key]
                if (!value || !Object.prototype.hasOwnProperty.call(updated, key)) return
                if (key === 'validFrom' || key === 'validTo') {
                  const normalizedStr = normalizeAIExtractedDate(value)
                  const formatted = handleSmartDateInput(normalizedStr, '')
                  if (formatted) updated[key] = formatted
                  return
                }
                if (key === 'vehicleNumber') {
                  updated[key] = value.toUpperCase().replace(/\s+/g, '')
                  return
                }
                if (key === 'policyNumber') {
                  updated[key] = value.toUpperCase()
                  return
                }
                updated[key] = value
              })

              if (resultData.vehicleNumber) {
                const normalizedVehicleNumber = resultData.vehicleNumber.toUpperCase().replace(/\s+/g, '')
                setVehicleValidation(validateVehicleNumberRealtime(normalizedVehicleNumber))
              }

              return updated
            })

            setTimeout(() => { isOcrUpdate.current = false }, 200)
            setUploadedInsuranceDocument(prev => {
              if (prev?.revokeOnCleanup && prev.previewUrl) URL.revokeObjectURL(prev.previewUrl)
              return {
                name: fileToProcess.name || 'insurance-document',
                type: fileToProcess.type === 'application/pdf' ? 'pdf' : 'image',
                previewUrl: URL.createObjectURL(fileToProcess),
                revokeOnCleanup: true
              }
            })
            toast.dismiss(updateToast)
            toast.success('Insurance details extracted successfully!', { position: 'top-right', autoClose: 3000 })
          } else {
            toast.dismiss(updateToast)
            toast.error('Failed to extract data correctly.', { position: 'top-right', autoClose: 3000 })
          }
        } catch (error) {
          console.error(error)
          toast.dismiss(updateToast)
          toast.error('Server error during OCR processing.', { position: 'top-right', autoClose: 3000 })
        } finally {
          setIsExtractingInsurance(false)
        }
      }
      reader.readAsDataURL(fileToProcess)
    } catch (error) {
      console.error(error)
      toast.dismiss(updateToast)
      toast.error('Error reading the file.', { position: 'top-right', autoClose: 3000 })
      setIsExtractingInsurance(false)
    }
  }

  const handleInsuranceExtractionUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type === 'application/pdf') {
      setUploadedInsuranceFile(file)
      e.target.value = ''
      await processExtraction(file)
      return
    }
    if (file.type.startsWith('image/')) {
      setUploadedInsuranceFile(file)
      setScanningFile(file)
      e.target.value = ''
      return
    }
    toast.error('Please upload an image or PDF file for extraction.', { position: 'top-right', autoClose: 3000 })
  }

  const handleScannerConfirm = async (processedImageFile) => {
    setScanningFile(null)
    setUploadedInsuranceFile(processedImageFile)
    await processExtraction(processedImageFile)
  }

  const handleInputKeyDown = (e) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const currentTabIndex = parseInt(e.target.getAttribute('tabIndex'), 10)
    if (currentTabIndex === 5) {
      document.querySelector('form')?.requestSubmit()
      return
    }
    const nextInput = document.querySelector(`input[tabIndex="${currentTabIndex + 1}"]`)
    if (nextInput) nextInput.focus()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!vehicleValidation.isValid && formData.vehicleNumber) {
      toast.error('Please enter a valid vehicle number in the format: CG04AA1234 (10 chars) or CG04G1234 (9 chars), no spaces')
      return
    }
    const submitData = {
      vehicleNumber: formData.vehicleNumber,
      policyNumber: formData.policyNumber,
      policyHolderName: formData.policyHolderName,
      validFrom: formData.validFrom,
      validTo: formData.validTo,
      issueDate: formData.validFrom,
      insuranceDocument: uploadedInsuranceFile ? '' : formData.insuranceDocument
    }

    if (uploadedInsuranceFile) {
      submitData.insuranceDocumentData = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(uploadedInsuranceFile)
      })
    }

    setIsSubmitting(true)
    try {
      const request = isEditMode && initialData?._id
        ? axios.put(`${API_URL}/api/insurance/${initialData._id}`, submitData, { withCredentials: true })
        : axios.post(`${API_URL}/api/insurance`, submitData, { withCredentials: true })
      const response = await request
      if (response.data.success) {
        toast.success(isEditMode ? 'Insurance updated successfully!' : 'Insurance added successfully!')
        if (onSubmit) await onSubmit()
        onClose()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save insurance')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 md:p-4'>
      <div className='bg-white rounded-xl md:rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col'>
        <div className='bg-gradient-to-r from-blue-600 to-indigo-600 p-3 md:p-4 text-white flex-shrink-0'>
          <div className='flex justify-between items-center'>
            <div>
              <h2 className='text-lg md:text-2xl font-bold'>{isEditMode ? 'Edit Insurance' : 'Add New Insurance'}</h2>
              <p className='text-blue-100 text-xs md:text-sm mt-1'>{isEditMode ? 'Update insurance record' : 'Add insurance record'}</p>
            </div>
            <button onClick={onClose} className='text-white hover:bg-white/20 rounded-lg p-1.5 md:p-2 transition cursor-pointer'>
              <svg className='w-5 h-5 md:w-6 md:h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className='flex flex-col flex-1 overflow-hidden'>
          <div className='flex-1 overflow-y-auto p-3 md:p-6'>
            <div className='mb-4 md:mb-6 p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border-2 border-dashed border-cyan-200'>
              <div className='flex flex-col sm:flex-row items-center justify-between gap-4'>
                <div>
                  <h3 className='text-sm md:text-base font-bold text-cyan-800 flex items-center gap-2'>
                    <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 10V3L4 14h7v7l9-11h-7z' />
                    </svg>
                    AI Fast Extraction
                  </h3>
                  <p className='text-xs text-cyan-700 mt-1'>Upload an insurance document in image or PDF format to auto-fill policy and validity details.</p>
                </div>
                <div className='relative overflow-hidden'>
                  <button type='button' disabled={isExtractingInsurance} className='relative px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg shadow-md hover:bg-cyan-700 transition disabled:opacity-50 flex items-center gap-2 text-sm max-w-full'>
                    {isExtractingInsurance ? 'Extracting...' : 'Upload Insurance Document'}
                  </button>
                  <input type='file' accept='image/*, application/pdf' disabled={isExtractingInsurance} onChange={handleInsuranceExtractionUpload} className='absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed' />
                </div>
              </div>
            </div>

            <div className='bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl p-3 md:p-6 mb-4 md:mb-6'>
              <h3 className='text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2'>
                <span className='bg-indigo-600 text-white w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm'>1</span>
                Policy Details
              </h3>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4'>
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Vehicle Number <span className='text-red-500'>*</span></label>
                  <div className='relative'>
                    <input type='text' name='vehicleNumber' value={formData.vehicleNumber} onChange={handleChange} onKeyDown={handleInputKeyDown} placeholder='CG04AA1234 or 4793' maxLength='10' tabIndex='1' className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:border-transparent font-mono bg-white ${formData.vehicleNumber && !vehicleValidation.isValid ? 'border-red-500 focus:ring-red-500' : formData.vehicleNumber && vehicleValidation.isValid ? 'border-green-500 focus:ring-green-500' : 'border-gray-300 focus:ring-indigo-500'}`} autoFocus required />
                    {showVehicleDropdown && vehicleMatches.length > 0 && (
                      <div className='absolute z-50 w-full mt-1 bg-white border border-indigo-300 rounded-lg shadow-xl max-h-60 overflow-y-auto'>
                        <div className='p-2 bg-indigo-50 border-b border-indigo-200 text-xs font-semibold text-indigo-800'>{vehicleMatches.length} vehicles found</div>
                        {vehicleMatches.map((vehicle, index) => (
                          <div key={vehicle._id} ref={(el) => (dropdownItemRefs.current[index] = el)} onClick={() => handleVehicleSelect(vehicle)} className={`p-3 cursor-pointer border-b border-gray-100 hover:bg-indigo-50 transition ${index === selectedDropdownIndex ? 'bg-indigo-100 border-l-4 border-l-indigo-600' : ''}`}>
                            <div className='font-mono font-bold text-indigo-700'>{vehicle.registrationNumber}</div>
                            <div className='text-xs text-gray-600 mt-1'>Owner: {vehicle.ownerName || 'N/A'}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {vehicleError && !fetchingVehicle && <p className='text-xs mt-1 text-red-600'>{vehicleError}</p>}
                  {vehicleValidation.message && !vehicleError && <p className={`text-xs mt-1 ${vehicleValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>{vehicleValidation.message}</p>}
                </div>
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Policy Number</label>
                  <input type='text' name='policyNumber' value={formData.policyNumber} onChange={handleChange} onKeyDown={handleInputKeyDown} placeholder='INS001234567' tabIndex='2' className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono bg-white' />
                </div>
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Policy Holder Name</label>
                  <input type='text' name='policyHolderName' value={formData.policyHolderName} onChange={handleChange} onKeyDown={handleInputKeyDown} placeholder='Enter policy holder name' tabIndex='3' className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white' />
                </div>
              </div>
            </div>

            <div className='bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-3 md:p-6 mb-4 md:mb-6'>
              <h3 className='text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2'>
                <span className='bg-purple-600 text-white w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm'>2</span>
                Validity Period
              </h3>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4'>
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Valid From <span className='text-red-500'>*</span></label>
                  <input type='text' name='validFrom' value={formData.validFrom} onChange={handleChange} onKeyDown={handleInputKeyDown} placeholder={getTodayDate()} tabIndex='4' className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white' required />
                  <p className='text-xs text-gray-500 mt-1'>Type 2-digit year (24) to auto-expand to 2024</p>
                </div>
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Valid To <span className='text-xs text-blue-500'>(Auto-calculated)</span></label>
                  <input type='text' name='validTo' value={formData.validTo} onChange={handleChange} onKeyDown={handleInputKeyDown} placeholder='DD-MM-YYYY' tabIndex='5' className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white' />
                  <p className='text-xs text-gray-500 mt-1'>Auto-calculated: 1 year from Valid From date minus 1 day</p>
                </div>
              </div>
            </div>

            {uploadedInsuranceDocument && (
              <div className='bg-gradient-to-r from-slate-50 to-violet-50 border-2 border-slate-200 rounded-xl p-3 md:p-6 mb-4 md:mb-6'>
                <h3 className='text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2'>
                  <span className='bg-slate-700 text-white w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm'>3</span>
                  Uploaded Insurance Document
                </h3>
                <div className='mb-3 flex items-center justify-between gap-3 rounded-lg bg-white/80 px-3 py-2 border border-slate-200'>
                  <div className='min-w-0'>
                    <p className='text-sm font-semibold text-slate-800 truncate'>{uploadedInsuranceDocument.name}</p>
                    <p className='text-xs text-slate-500'>{uploadedInsuranceDocument.type === 'pdf' ? 'PDF preview' : 'Image preview'}</p>
                  </div>
                </div>
                {uploadedInsuranceDocument.type === 'pdf' ? (
                  <iframe src={uploadedInsuranceDocument.previewUrl} title='Uploaded Insurance PDF' className='w-full h-80 rounded-xl border border-slate-200 bg-white' />
                ) : (
                  <div className='rounded-xl border border-slate-200 bg-white p-2'>
                    <img src={uploadedInsuranceDocument.previewUrl} alt='Uploaded Insurance document' className='w-full max-h-80 object-contain rounded-lg' />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className='border-t border-gray-200 p-3 md:p-4 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-3 flex-shrink-0'>
            <div className='text-xs md:text-sm text-gray-600'><kbd className='px-2 py-1 bg-gray-200 rounded text-xs font-mono'>Ctrl+Enter</kbd> to submit quickly</div>
            <div className='flex gap-2 md:gap-3 w-full md:w-auto'>
              <button type='button' onClick={onClose} className='flex-1 md:flex-none px-4 md:px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-semibold transition cursor-pointer'>Cancel</button>
              <button type='submit' disabled={isSubmitting} className='flex-1 md:flex-none px-6 md:px-8 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg font-semibold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'>{isSubmitting ? (isEditMode ? 'Updating...' : 'Adding...') : (isEditMode ? 'Update Insurance' : 'Add Insurance')}</button>
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

export default AddInsuranceModal
