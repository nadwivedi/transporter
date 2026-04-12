import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { validateVehicleNumberRealtime } from '../../../utils/vehicleNoCheck';
import { handleSmartDateInput, normalizeAIExtractedDate } from '../../../utils/dateFormatter';
import DocumentScannerPreview from '../../../components/DocumentScannerPreview';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const AddFitnessModal = ({ isOpen, onClose, onSubmit, prefilledVehicleNumber = '', prefilledOwnerName = '', prefilledMobileNumber = '' }) => {
  const [formData, setFormData] = useState({
    vehicleNumber: prefilledVehicleNumber,
    ownerName: prefilledOwnerName,
    partyId: '',
    validFrom: '',
    validTo: ''
  });
  const [vehicleValidation, setVehicleValidation] = useState({ isValid: false, message: '' });
  const [fetchingVehicle, setFetchingVehicle] = useState(false);
  const [vehicleError, setVehicleError] = useState('');
  const [vehicleMatches, setVehicleMatches] = useState([]);
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [selectedDropdownIndex, setSelectedDropdownIndex] = useState(0);
  const dropdownItemRefs = useRef([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scanningFile, setScanningFile] = useState(null);
  const [isExtractingFitness, setIsExtractingFitness] = useState(false);
  const isOcrUpdate = useRef(false);

  // Reset form when modal closes or when prefilled values change
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        vehicleNumber: prefilledVehicleNumber,
        ownerName: prefilledOwnerName,
        partyId: '',
        validFrom: '',
        validTo: ''
      });
      setVehicleValidation({ isValid: false, message: '' });
      setFetchingVehicle(false);
      setVehicleError('');
      setVehicleMatches([]);
      setShowVehicleDropdown(false);
      setSelectedDropdownIndex(0);
      setScanningFile(null);
      setIsExtractingFitness(false);
    }
  }, [isOpen, prefilledVehicleNumber, prefilledOwnerName, prefilledMobileNumber]);

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
  }, [isOpen, prefilledVehicleNumber, prefilledOwnerName, prefilledMobileNumber]);

  // Calculate valid to date (1 year from valid from)
  useEffect(() => {
    if (isOcrUpdate.current) return; // Prevent overwriting validTo if populated via OCR
    if (formData.validFrom) {
      // Parse DD-MM-YYYY
      const parts = formData.validFrom.split(/[/-]/); // Splits on both "/" and "-"
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        const year = parseInt(parts[2], 10);

        // Check if date is valid
        if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year > 1900) {
          const validFromDate = new Date(year, month, day);

          // Check if the date object is valid
          if (!isNaN(validFromDate.getTime())) {
            const validToDate = new Date(validFromDate);
            validToDate.setFullYear(validToDate.getFullYear() + 1);
            // Subtract 1 day
            validToDate.setDate(validToDate.getDate() - 1);

            // Format date to DD-MM-YYYY
            const newDay = String(validToDate.getDate()).padStart(2, '0');
            const newMonth = String(validToDate.getMonth() + 1).padStart(2, '0');
            const newYear = validToDate.getFullYear();

            setFormData(prev => ({
              ...prev,
              validTo: `${newDay}-${newMonth}-${newYear}`
            }));
          }
        }
      }
    }
  }, [formData.validFrom]);

  // Fetch vehicle details when registration number is entered
  useEffect(() => {
    const fetchVehicleDetails = async () => {
      const searchInput = formData.vehicleNumber.trim();

      // Only fetch if search input has at least 4 characters
      if (searchInput.length < 4) {
        setVehicleError('');
        setVehicleMatches([]);
        setShowVehicleDropdown(false);
        setSelectedDropdownIndex(0);
        return;
      }

      setFetchingVehicle(true);
      setVehicleError('');

      try {
        const response = await axios.get(`${API_URL}/api/vehicle/search/${searchInput}`, { withCredentials: true });

        if (response.data.success) {
          // Check if multiple vehicles found
          if (response.data.multiple) {
            // Show dropdown with multiple matches
            setVehicleMatches(response.data.data);
            setShowVehicleDropdown(true);
            setSelectedDropdownIndex(0); // Reset to first item
            setVehicleError('');
          } else {
            // Single match found - auto-fill including full vehicle number, mobile number, and partyId
            const vehicleData = response.data.data;
            setFormData(prev => ({
              ...prev,
              vehicleNumber: vehicleData.registrationNumber, // Replace partial input with full number
              ownerName: vehicleData.ownerName || '',
              partyId: vehicleData.partyId?._id || vehicleData.partyId || ''
            }));
            // Validate the full vehicle number
            const validation = validateVehicleNumberRealtime(vehicleData.registrationNumber);
            setVehicleValidation(validation);
            setVehicleError('');
            setVehicleMatches([]);
            setShowVehicleDropdown(false);
          }
        }
      } catch (error) {
        console.error('Error fetching vehicle details:', error);
        if (error.response && error.response.status === 404) {
          setVehicleError('No vehicles found matching the search');
        } else {
          setVehicleError('Error fetching vehicle details');
        }
        setVehicleMatches([]);
        setShowVehicleDropdown(false);
        setSelectedDropdownIndex(0);
      } finally {
        setFetchingVehicle(false);
      }
    };

    // Debounce the API call - wait 500ms after user stops typing
    const timeoutId = setTimeout(() => {
      if (formData.vehicleNumber) {
        fetchVehicleDetails();
      }
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId);
  }, [formData.vehicleNumber]);

  // Auto-scroll to selected dropdown item
  useEffect(() => {
    if (showVehicleDropdown && dropdownItemRefs.current[selectedDropdownIndex]) {
      dropdownItemRefs.current[selectedDropdownIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [selectedDropdownIndex, showVehicleDropdown]);

  // Handle vehicle selection from dropdown
  const handleVehicleSelect = (vehicle) => {
    setFormData(prev => ({
      ...prev,
      vehicleNumber: vehicle.registrationNumber,
      ownerName: vehicle.ownerName || '',
      partyId: vehicle.partyId?._id || vehicle.partyId || ''
    }));
    setShowVehicleDropdown(false);
    setVehicleMatches([]);
    setVehicleError('');
    setSelectedDropdownIndex(0);

    // Validate the selected vehicle number
    const validation = validateVehicleNumberRealtime(vehicle.registrationNumber);
    setVehicleValidation(validation);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Handle dropdown navigation
      if (showVehicleDropdown && vehicleMatches.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedDropdownIndex(prev => (prev + 1) % vehicleMatches.length);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedDropdownIndex(prev => (prev - 1 + vehicleMatches.length) % vehicleMatches.length);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          handleVehicleSelect(vehicleMatches[selectedDropdownIndex]);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setShowVehicleDropdown(false);
          setVehicleMatches([]);
        }
        return;
      }

      // Ctrl+Enter to submit
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        document.querySelector('form')?.requestSubmit();
      }
      // Escape to close
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose, showVehicleDropdown, vehicleMatches, selectedDropdownIndex]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Handle vehicle number with validation only (no enforcement)
    if (name === 'vehicleNumber') {
      // Convert to uppercase
      const upperValue = value.toUpperCase();

      // Validate in real-time (only show validation if 9 or 10 characters)
      const validation = (upperValue.length === 9 || upperValue.length === 10) ? validateVehicleNumberRealtime(upperValue) : { isValid: false, message: '' };
      setVehicleValidation(validation);

      setFormData(prev => ({
        ...prev,
        [name]: upperValue
      }));
      return;
    }

    // Handle date fields with smart validation and formatting
    if (name === 'validFrom' || name === 'validTo') {
      const formatted = handleSmartDateInput(value, formData[name] || '');
      if (formatted !== null) {
        setFormData(prev => ({
          ...prev,
          [name]: formatted
        }));
      }
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateBlur = (e) => {
    const { name, value } = e.target;

    if (!value) return; // Skip if empty

    // Remove all non-digit characters
    let digitsOnly = value.replace(/[^\d]/g, '');

    // Limit to 8 digits (DDMMYYYY)
    digitsOnly = digitsOnly.slice(0, 8);

    // Parse parts
    let day = '';
    let month = '';
    let year = '';

    if (digitsOnly.length >= 2) {
      day = digitsOnly.slice(0, 2);
      let dayNum = parseInt(day, 10);

      // Validate day: 01-31
      if (dayNum === 0) dayNum = 1;
      if (dayNum > 31) dayNum = 31;
      day = String(dayNum).padStart(2, '0');
    } else if (digitsOnly.length === 1) {
      day = '0' + digitsOnly[0];
    }

    if (digitsOnly.length >= 4) {
      month = digitsOnly.slice(2, 4);
      let monthNum = parseInt(month, 10);

      // Validate month: 01-12
      if (monthNum === 0) monthNum = 1;
      if (monthNum > 12) monthNum = 12;
      month = String(monthNum).padStart(2, '0');
    } else if (digitsOnly.length === 3) {
      month = '0' + digitsOnly[2];
    }

    if (digitsOnly.length >= 5) {
      year = digitsOnly.slice(4);

      // Auto-expand 2-digit year to 4-digit
      if (year.length === 2) {
        const yearNum = parseInt(year, 10);
        year = String(yearNum <= 50 ? 2000 + yearNum : 1900 + yearNum);
      } else if (year.length === 4) {
        // Keep as is
      } else if (year.length > 4) {
        year = year.slice(0, 4);
      }
    }

    // Format the date only if we have at least day and month
    if (day && month) {
      let formatted = `${day}-${month}`;
      if (year) {
        formatted += `-${year}`;
      }

      setFormData(prev => ({
        ...prev,
        [name]: formatted
      }));
    }
  };

  // Handle Enter key to navigate to next field instead of submitting
  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      // Get current tabIndex
      const currentTabIndex = parseInt(e.target.getAttribute('tabIndex'));

      // If we're on the last field, submit the form
      if (currentTabIndex === 4) {
        document.querySelector('form')?.requestSubmit();
        return;
      }

      // Find next input with tabIndex
      const nextTabIndex = currentTabIndex + 1;
      const nextInput = document.querySelector(`input[tabIndex="${nextTabIndex}"]`);

      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  const handleFitnessExtractionUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf') {
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
    await processExtraction(processedImageFile);
  }

  const processExtraction = async (fileToProcess) => {
    setIsExtractingFitness(true);
    const updateToast = toast.info('Analyzing document, please wait...', { autoClose: false, isLoading: true });

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64String = reader.result;
          const response = await axios.post(
            `${API_URL}/api/ocr/fitness`,
            { imageBase64: base64String },
            { withCredentials: true }
          );

          if (response.data.success && response.data.data) {
            const resultData = response.data.data;
            
            isOcrUpdate.current = true; // Block auto-calculate effect

            // Map the result properties to formData safely
            setFormData(prev => {
              const updated = { ...prev };
              Object.keys(resultData).forEach(key => {
                if (resultData[key] && Object.prototype.hasOwnProperty.call(updated, key)) {
                  if (key === 'validFrom' || key === 'validTo') {
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
            
            // Release the block after rendering
            setTimeout(() => { isOcrUpdate.current = false; }, 200);

            toast.dismiss(updateToast);
            toast.success('Fitness Details Extracted Successfully!', { position: 'top-right', autoClose: 3000 });

          } else {
            toast.dismiss(updateToast);
            toast.error('Failed to extract data correctly.', { position: 'top-right', autoClose: 3000 });
          }
        } catch (err) {
            console.error(err);
            toast.dismiss(updateToast);
            toast.error('Server error during OCR processing.', { position: 'top-right', autoClose: 3000 });
        } finally {
            setIsExtractingFitness(false);
        }
      };
      
      reader.readAsDataURL(fileToProcess);

    } catch (err) {
      toast.dismiss(updateToast);
      toast.error('Error reading the file.', { position: 'top-right', autoClose: 3000 });
      setIsExtractingFitness(false);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate vehicle number before submitting (must be 9 or 10 characters and valid format)
    if ((formData.vehicleNumber.length === 9 || formData.vehicleNumber.length === 10) && !vehicleValidation.isValid) {
      toast.error('Please enter a valid vehicle number in the format: CG04AA1234 (10 chars) or CG04G1234 (9 chars)');
      return;
    }

    // Ensure vehicle number is 9 or 10 characters for submission
    if (formData.vehicleNumber && formData.vehicleNumber.length !== 9 && formData.vehicleNumber.length !== 10) {
      toast.error('Vehicle number must be 9 or 10 characters');
      return;
    }

    const dataToSubmit = {
      vehicleNumber: formData.vehicleNumber,
      ownerName: formData.ownerName,
      partyId: formData.partyId || null,
      validFrom: formData.validFrom,
      validTo: formData.validTo
    };

    // Make API call
    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API_URL}/api/fitness`, dataToSubmit, {
        withCredentials: true
      });

      if (response.data.success) {
        toast.success('Fitness record added successfully!');

        // Call onSubmit callback to notify parent (for refresh)
        if (onSubmit) {
          await onSubmit();
        }

        setFormData({
          vehicleNumber: '',
          ownerName: '',
          partyId: '',
          validFrom: '',
          validTo: ''
        });
        setVehicleValidation({ isValid: false, message: '' });

        // Close modal
        onClose();
      }
    } catch (error) {
      console.error('Error adding fitness:', error);
      toast.error(error.response?.data?.message || 'Failed to add fitness record');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 md:p-4'>
      <div className='bg-white rounded-xl md:rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col'>
        {/* Header */}
        <div className='bg-gradient-to-r from-blue-600 to-indigo-600 p-2 md:p-3 text-white flex-shrink-0'>
          <div className='flex justify-between items-center'>
            <div>
              <h2 className='text-lg md:text-2xl font-bold'>
                Add New Fitness Certificate
              </h2>
              <p className='text-blue-100 text-xs md:text-sm mt-1'>
                Enter the details for the new fitness certificate.
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
                <p className='text-xs text-teal-600 mt-1'>Upload a Fitness Certificate (Image or PDF) to auto-fill details below.</p>
               </div>
               <div className='relative overflow-hidden'>
                <button 
                  type='button' 
                  disabled={isExtractingFitness}
                  className='relative px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg shadow-md hover:bg-teal-700 transition disabled:opacity-50 flex items-center gap-2 text-sm max-w-full'
                >
                  {isExtractingFitness ? (
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
                  disabled={isExtractingFitness}
                  onChange={handleFitnessExtractionUpload} 
                  className='absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed' 
                />
              </div>
            </div>
          </div>

          {/* Section 1: Vehicle Details */}
          <div className='bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-indigo-200 rounded-xl p-3 md:p-6 mb-4 md:mb-6'>
            <h3 className='text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2'>
              <span className='bg-indigo-600 text-white w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm'>1</span>
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
                    onKeyDown={handleInputKeyDown}
                    placeholder='e.g., CG04AA1234'
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
                    <div className='absolute z-10 w-full mt-1 bg-white border border-indigo-200 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
                      {vehicleMatches.map((vehicle, index) => (
                        <div
                          key={vehicle._id}
                          ref={(el) => (dropdownItemRefs.current[index] = el)}
                          onClick={() => handleVehicleSelect(vehicle)}
                          className={`p-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition ${
                            index === selectedDropdownIndex
                              ? 'bg-indigo-100 border-l-4 border-l-indigo-600'
                              : 'hover:bg-indigo-50'
                          }`}
                        >
                          <p className={`font-mono font-bold text-sm ${
                            index === selectedDropdownIndex ? 'text-indigo-800' : 'text-indigo-700'
                          }`}>{vehicle.registrationNumber}</p>
                          <p className='text-xs text-gray-700 mt-1'>{vehicle.ownerName}</p>
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
                  placeholder='Owner Name'
                  tabIndex="2"
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white'
                />
              </div>
            </div>
          </div>

          {/* Section 2: Validity Period */}
          <div className='bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-emerald-200 rounded-xl p-3 md:p-6 mb-4 md:mb-6'>
            <h3 className='text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2'>
              <span className='bg-emerald-600 text-white w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm'>2</span>
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
                  onKeyDown={handleInputKeyDown}
                  placeholder='DD-MM-YYYY'
                  tabIndex="3"
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white'
                  required
                />
              </div>

              {/* Valid To (Auto-calculated) */}
              <div>
                <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>
                  Valid To <span className='text-xs text-emerald-600'>(Auto-calculated)</span>
                </label>
                <input
                  type='text'
                  name='validTo'
                  value={formData.validTo}
                  onChange={handleChange}
                  onBlur={handleDateBlur}
                  onKeyDown={handleInputKeyDown}
                  placeholder='DD-MM-YYYY'
                  tabIndex="4"
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg bg-emerald-50 text-gray-700'
                />
              </div>
            </div>
          </div>

          </div>

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
                    Add Fitness
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
  );
};

export default AddFitnessModal;

