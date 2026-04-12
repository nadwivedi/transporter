import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { validateVehicleNumberRealtime } from '../../../utils/vehicleNoCheck'
import { handleSmartDateInput, normalizeAIExtractedDate } from '../../../utils/dateFormatter'
import DocumentScannerPreview from '../../../components/DocumentScannerPreview'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

const AddGpsModal = ({ isOpen, onClose, onSubmit, prefilledVehicleNumber = '', prefilledOwnerName = '' }) => {
  const isOcrUpdate = useRef(false)
  const dropdownItemRefs = useRef([])
  const [formData, setFormData] = useState({
    vehicleNumber: prefilledVehicleNumber,
    ownerName: prefilledOwnerName,
    validFrom: '',
    validTo: ''
  })
  const [vehicleValidation, setVehicleValidation] = useState({ isValid: false, message: '' })
  const [fetchingVehicle, setFetchingVehicle] = useState(false)
  const [vehicleError, setVehicleError] = useState('')
  const [vehicleMatches, setVehicleMatches] = useState([])
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false)
  const [selectedDropdownIndex, setSelectedDropdownIndex] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [scanningFile, setScanningFile] = useState(null)
  const [isExtractingGps, setIsExtractingGps] = useState(false)
  const [uploadedGpsDocument, setUploadedGpsDocument] = useState(null)
  const [uploadedGpsFile, setUploadedGpsFile] = useState(null)

  useEffect(() => {
    return () => {
      if (uploadedGpsDocument?.previewUrl) URL.revokeObjectURL(uploadedGpsDocument.previewUrl)
    }
  }, [uploadedGpsDocument])

  useEffect(() => {
    if (!isOpen) {
      setFormData({ vehicleNumber: prefilledVehicleNumber, ownerName: prefilledOwnerName, validFrom: '', validTo: '' })
      setVehicleValidation({ isValid: false, message: '' })
      setFetchingVehicle(false)
      setVehicleError('')
      setVehicleMatches([])
      setShowVehicleDropdown(false)
      setSelectedDropdownIndex(0)
      setScanningFile(null)
      setIsExtractingGps(false)
      setUploadedGpsDocument(prev => {
        if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl)
        return null
      })
      setUploadedGpsFile(null)
    }
  }, [isOpen, prefilledVehicleNumber, prefilledOwnerName])

  useEffect(() => {
    if (isOpen && (prefilledVehicleNumber || prefilledOwnerName)) {
      setFormData(prev => ({ ...prev, vehicleNumber: prefilledVehicleNumber, ownerName: prefilledOwnerName }))
      if (prefilledVehicleNumber) setVehicleValidation({ isValid: true, message: 'Vehicle number prefilled' })
    }
  }, [isOpen, prefilledVehicleNumber, prefilledOwnerName])

  useEffect(() => {
    if (isOcrUpdate.current || !formData.validFrom) return
    const parts = formData.validFrom.split(/[/-]/)
    if (parts.length !== 3) return
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1
    const year = parseInt(parts[2], 10)
    if ([day, month, year].some(Number.isNaN) || year <= 1900) return
    const validFromDate = new Date(year, month, day)
    if (Number.isNaN(validFromDate.getTime())) return
    const validToDate = new Date(validFromDate)
    validToDate.setFullYear(validToDate.getFullYear() + 2)
    validToDate.setDate(validToDate.getDate() - 1)
    const newDay = String(validToDate.getDate()).padStart(2, '0')
    const newMonth = String(validToDate.getMonth() + 1).padStart(2, '0')
    const newYear = validToDate.getFullYear()
    setFormData(prev => ({ ...prev, validTo: `${newDay}-${newMonth}-${newYear}` }))
  }, [formData.validFrom])

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
            setFormData(prev => ({ ...prev, vehicleNumber: vehicleData.registrationNumber, ownerName: vehicleData.ownerName || prev.ownerName }))
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
    setFormData(prev => ({ ...prev, vehicleNumber: vehicle.registrationNumber, ownerName: vehicle.ownerName || prev.ownerName }))
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
    if (name === 'validFrom' || name === 'validTo') {
      const formatted = handleSmartDateInput(value, formData[name] || '')
      if (formatted !== null) setFormData(prev => ({ ...prev, [name]: formatted }))
      return
    }
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleDateBlur = (e) => {
    const { name, value } = e.target
    if (!value) return
    let digitsOnly = value.replace(/[^\d]/g, '').slice(0, 8)
    let day = ''
    let month = ''
    let year = ''
    if (digitsOnly.length >= 2) day = String(Math.min(Math.max(parseInt(digitsOnly.slice(0, 2), 10) || 1, 1), 31)).padStart(2, '0')
    else if (digitsOnly.length === 1) day = `0${digitsOnly[0]}`
    if (digitsOnly.length >= 4) month = String(Math.min(Math.max(parseInt(digitsOnly.slice(2, 4), 10) || 1, 1), 12)).padStart(2, '0')
    else if (digitsOnly.length === 3) month = `0${digitsOnly[2]}`
    if (digitsOnly.length >= 5) {
      year = digitsOnly.slice(4)
      if (year.length === 2) {
        const yearNum = parseInt(year, 10)
        year = String(yearNum <= 50 ? 2000 + yearNum : 1900 + yearNum)
      } else if (year.length > 4) {
        year = year.slice(0, 4)
      }
    }
    if (day && month) {
      let formatted = `${day}-${month}`
      if (year) formatted += `-${year}`
      setFormData(prev => ({ ...prev, [name]: formatted }))
    }
  }

  const processExtraction = async (fileToProcess) => {
    setIsExtractingGps(true)
    const updateToast = toast.info('Analyzing GPS document, please wait...', { autoClose: false, isLoading: true })
    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        try {
          const response = await axios.post(`${API_URL}/api/ocr/gps`, { imageBase64: reader.result }, { withCredentials: true })
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
                updated[key] = value.toUpperCase()
              })
              if (resultData.vehicleNumber) {
                const normalizedVehicleNumber = resultData.vehicleNumber.toUpperCase().replace(/\s+/g, '')
                setVehicleValidation(validateVehicleNumberRealtime(normalizedVehicleNumber))
              }
              return updated
            })
            setTimeout(() => { isOcrUpdate.current = false }, 200)
            setUploadedGpsDocument(prev => {
              if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl)
              return {
                name: fileToProcess.name || 'gps-document',
                type: fileToProcess.type === 'application/pdf' ? 'pdf' : 'image',
                previewUrl: URL.createObjectURL(fileToProcess)
              }
            })
            toast.dismiss(updateToast)
            toast.success('GPS details extracted successfully!', { position: 'top-right', autoClose: 3000 })
          } else {
            toast.dismiss(updateToast)
            toast.error('Failed to extract data correctly.', { position: 'top-right', autoClose: 3000 })
          }
        } catch {
          toast.dismiss(updateToast)
          toast.error('Server error during OCR processing.', { position: 'top-right', autoClose: 3000 })
        } finally {
          setIsExtractingGps(false)
        }
      }
      reader.readAsDataURL(fileToProcess)
    } catch {
      toast.dismiss(updateToast)
      toast.error('Error reading the file.', { position: 'top-right', autoClose: 3000 })
      setIsExtractingGps(false)
    }
  }

  const handleGpsExtractionUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type === 'application/pdf') {
      setUploadedGpsFile(file)
      e.target.value = ''
      await processExtraction(file)
      return
    }
    if (file.type.startsWith('image/')) {
      setScanningFile(file)
      e.target.value = ''
      return
    }
    toast.error('Please upload an image or PDF file for extraction.', { position: 'top-right', autoClose: 3000 })
  }

  const handleScannerConfirm = async (processedImageFile) => {
    setScanningFile(null)
    setUploadedGpsFile(processedImageFile)
    await processExtraction(processedImageFile)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if ((formData.vehicleNumber.length === 9 || formData.vehicleNumber.length === 10) && !vehicleValidation.isValid) {
      toast.error('Please enter a valid vehicle number in the format: CG04AA1234 (10 chars) or CG04G1234 (9 chars)')
      return
    }
    if (formData.vehicleNumber && formData.vehicleNumber.length !== 9 && formData.vehicleNumber.length !== 10) {
      toast.error('Vehicle number must be 9 or 10 characters')
      return
    }

    setIsSubmitting(true)
    try {
      let gpsDocumentData = ''
      if (uploadedGpsFile) {
        gpsDocumentData = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(uploadedGpsFile)
        })
      }
      const dataToSubmit = {
        vehicleNumber: formData.vehicleNumber,
        ownerName: formData.ownerName,
        validFrom: formData.validFrom,
        validTo: formData.validTo,
        gpsDocumentData
      }
      const response = await axios.post(`${API_URL}/api/gps`, dataToSubmit, { withCredentials: true })
      if (response.data.success) {
        toast.success('GPS record added successfully!')
        if (onSubmit) onSubmit()
        onClose()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add GPS record')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {scanningFile && <DocumentScannerPreview file={scanningFile} onCancel={() => setScanningFile(null)} onConfirm={handleScannerConfirm} />}
      <div className='fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 md:p-4'>
        <div className='bg-white rounded-xl md:rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col'>
          <div className='bg-gradient-to-r from-blue-600 to-cyan-600 p-2 md:p-3 text-white flex-shrink-0'>
            <div className='flex justify-between items-center'>
              <div>
                <h2 className='text-lg md:text-2xl font-bold'>Add New GPS Tracking</h2>
                <p className='text-blue-100 text-xs md:text-sm mt-1'>Add GPS tracking system record</p>
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
                    <p className='text-xs text-cyan-700 mt-1'>Upload a GPS document in image or PDF format to auto-fill vehicle number, owner name, valid from, and valid to.</p>
                  </div>
                  <div className='relative overflow-hidden'>
                    <button type='button' disabled={isExtractingGps} className='relative px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg shadow-md hover:bg-cyan-700 transition disabled:opacity-50 flex items-center gap-2 text-sm max-w-full'>
                      {isExtractingGps ? 'Extracting...' : 'Upload GPS Document'}
                    </button>
                    <input type='file' accept='image/*, application/pdf' disabled={isExtractingGps} onChange={handleGpsExtractionUpload} className='absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed' />
                  </div>
                </div>
              </div>

              <div className='bg-gradient-to-r from-blue-100 to-cyan-100 border-2 border-cyan-200 rounded-xl p-3 md:p-6 mb-4 md:mb-6'>
                <h3 className='text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2'>
                  <span className='bg-cyan-600 text-white w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm'>1</span>
                  Vehicle Details
                </h3>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4'>
                  <div>
                    <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Vehicle Number <span className='text-red-500'>*</span></label>
                    <div className='relative'>
                      <input type='text' name='vehicleNumber' value={formData.vehicleNumber} onChange={handleChange} placeholder='CG04AA1234 or 4793' maxLength='10' className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent font-mono bg-white ${formData.vehicleNumber && !vehicleValidation.isValid ? 'border-red-500 focus:ring-red-500' : formData.vehicleNumber && vehicleValidation.isValid ? 'border-green-500 focus:ring-green-500' : 'border-gray-300 focus:ring-cyan-500'}`} required autoFocus />
                      {showVehicleDropdown && vehicleMatches.length > 0 && (
                        <div className='absolute z-50 w-full mt-1 bg-white border border-cyan-300 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
                          {vehicleMatches.map((vehicle, index) => (
                            <div key={vehicle._id} ref={(el) => (dropdownItemRefs.current[index] = el)} onClick={() => handleVehicleSelect(vehicle)} className={`px-4 py-3 cursor-pointer transition-colors ${index === selectedDropdownIndex ? 'bg-cyan-100 border-l-4 border-cyan-500' : 'hover:bg-cyan-50 border-l-4 border-transparent'}`}>
                              <div className='font-mono font-bold text-gray-900'>{vehicle.registrationNumber}</div>
                              <div className='text-sm text-gray-600'>{vehicle.ownerName}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {vehicleValidation.message && !fetchingVehicle && <p className={`text-xs mt-1 ${vehicleValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>{vehicleValidation.message}</p>}
                    {vehicleError && <p className='text-xs text-amber-600 mt-1'>{vehicleError}</p>}
                  </div>
                  <div>
                    <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Owner Name</label>
                    <input type='text' name='ownerName' value={formData.ownerName} onChange={handleChange} placeholder='Enter owner name' className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white' />
                  </div>
                </div>
              </div>

              <div className='bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-3 md:p-6 mb-4 md:mb-6'>
                <h3 className='text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2'>
                  <span className='bg-indigo-600 text-white w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm'>2</span>
                  Validity Period
                </h3>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4'>
                  <div>
                    <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Valid From <span className='text-red-500'>*</span></label>
                    <input type='text' name='validFrom' value={formData.validFrom} onChange={handleChange} onBlur={handleDateBlur} placeholder='DD-MM-YYYY' className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white' required />
                  </div>
                  <div>
                    <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Valid To <span className='text-xs text-blue-500'>(Auto-calculated - 2 Years)</span></label>
                    <input type='text' name='validTo' value={formData.validTo} onChange={handleChange} onBlur={handleDateBlur} placeholder='DD-MM-YYYY' className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white' />
                  </div>
                </div>
              </div>

              {uploadedGpsDocument && (
                <div className='bg-gradient-to-r from-slate-50 to-cyan-50 border-2 border-slate-200 rounded-xl p-3 md:p-6'>
                  <h3 className='text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2'>
                    <span className='bg-slate-700 text-white w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm'>3</span>
                    Uploaded GPS Document
                  </h3>
                  <div className='mb-3 flex items-center justify-between gap-3 rounded-lg bg-white/80 px-3 py-2 border border-slate-200'>
                    <div className='min-w-0'>
                      <p className='text-sm font-semibold text-slate-800 truncate'>{uploadedGpsDocument.name}</p>
                      <p className='text-xs text-slate-500'>{uploadedGpsDocument.type === 'pdf' ? 'PDF preview' : 'Image preview'}</p>
                    </div>
                  </div>
                  {uploadedGpsDocument.type === 'pdf' ? (
                    <iframe src={uploadedGpsDocument.previewUrl} title='Uploaded GPS PDF' className='w-full h-80 rounded-xl border border-slate-200 bg-white' />
                  ) : (
                    <div className='rounded-xl border border-slate-200 bg-white p-2'>
                      <img src={uploadedGpsDocument.previewUrl} alt='Uploaded GPS document' className='w-full max-h-80 object-contain rounded-lg' />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className='border-t border-gray-200 p-3 md:p-4 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-3 flex-shrink-0'>
              <div className='text-xs md:text-sm text-gray-600'><kbd className='px-2 py-1 bg-gray-200 rounded text-xs font-mono'>Ctrl+Enter</kbd> to submit quickly</div>
              <div className='flex gap-2 md:gap-3 w-full md:w-auto'>
                <button type='button' onClick={onClose} className='flex-1 md:flex-none px-4 md:px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-semibold transition cursor-pointer'>Cancel</button>
                <button type='submit' disabled={isSubmitting} className='flex-1 md:flex-none px-6 md:px-8 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'>{isSubmitting ? 'Adding...' : 'Add GPS'}</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

export default AddGpsModal
