import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { Share } from 'lucide-react'
import { toast } from 'react-toastify'
import ImageViewer from '../../components/ImageViewer'
import { getVehicleNumberParts } from '../../utils/vehicleNoCheck'
import { getDaysRemaining } from '../../utils/dateHelpers'
import { getTheme, getVehicleNumberDesign } from '../../context/ThemeContext'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

const sectionConfig = [
  {
    key: 'fitness',
    title: 'Vehicle Fitness',
    dateFromKey: 'validFrom',
    dateToKey: 'validTo',
    dateFromLabel: 'Valid From',
    dateToLabel: 'Valid To',
    accent: 'emerald',
    emptyText: 'No fitness records found for this vehicle.',
    extraFields: ['ownerName'],
  },
  {
    key: 'tax',
    title: 'Vehicle Tax',
    dateFromKey: 'taxFrom',
    dateToKey: 'taxTo',
    dateFromLabel: 'Tax From',
    dateToLabel: 'Tax To',
    accent: 'amber',
    emptyText: 'No tax records found for this vehicle.',
    extraFields: ['receiptNo', 'ownerName', 'taxAmount', 'totalAmount', 'paidAmount', 'balanceAmount'],
  },
  {
    key: 'puc',
    title: 'Vehicle PUC',
    dateFromKey: 'validFrom',
    dateToKey: 'validTo',
    dateFromLabel: 'Valid From',
    dateToLabel: 'Valid To',
    accent: 'sky',
    emptyText: 'No PUC records found for this vehicle.',
    extraFields: ['ownerName'],
  },
  {
    key: 'insurance',
    title: 'Vehicle Insurance',
    dateFromKey: 'validFrom',
    dateToKey: 'validTo',
    dateFromLabel: 'Valid From',
    dateToLabel: 'Valid To',
    accent: 'violet',
    emptyText: 'No insurance records found for this vehicle.',
    extraFields: ['policyNumber', 'policyHolderName', 'remarks'],
  },
  {
    key: 'gps',
    title: 'Vehicle GPS',
    dateFromKey: 'validFrom',
    dateToKey: 'validTo',
    dateFromLabel: 'Valid From',
    dateToLabel: 'Valid To',
    accent: 'rose',
    emptyText: 'No GPS records found for this vehicle.',
    extraFields: ['ownerName'],
  },
]

const accentClasses = {
  slate: {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    panel: 'from-slate-50 via-white to-slate-100 border-slate-200',
    soft: 'bg-slate-50 border-slate-200',
    text: 'text-slate-700',
  },
  emerald: {
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    panel: 'from-emerald-50 via-white to-emerald-100 border-emerald-200',
    soft: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
  },
  amber: {
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    panel: 'from-amber-50 via-white to-amber-100 border-amber-200',
    soft: 'bg-amber-50 border-amber-200',
    text: 'text-amber-700',
  },
  sky: {
    badge: 'bg-sky-100 text-sky-700 border-sky-200',
    panel: 'from-sky-50 via-white to-sky-100 border-sky-200',
    soft: 'bg-sky-50 border-sky-200',
    text: 'text-sky-700',
  },
  violet: {
    badge: 'bg-violet-100 text-violet-700 border-violet-200',
    panel: 'from-violet-50 via-white to-violet-100 border-violet-200',
    soft: 'bg-violet-50 border-violet-200',
    text: 'text-violet-700',
  },
  rose: {
    badge: 'bg-rose-100 text-rose-700 border-rose-200',
    panel: 'from-rose-50 via-white to-rose-100 border-rose-200',
    soft: 'bg-rose-50 border-rose-200',
    text: 'text-rose-700',
  },
}

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return 'N/A'
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return value
  return `Rs ${numeric.toLocaleString('en-IN')}`
}

const formatFieldValue = (key, value) => {
  if (value === null || value === undefined || value === '') return 'N/A'

  if (key.toLowerCase().includes('amount')) {
    return formatCurrency(value)
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  return String(value)
}

const getRecordStatus = (dateToValue) => {
  if (!dateToValue) {
    return { label: 'No Date', className: 'bg-slate-100 text-slate-700 border-slate-200' }
  }

  const daysRemaining = getDaysRemaining(dateToValue)

  if (daysRemaining < 0) {
    return { label: 'Expired', className: 'bg-red-100 text-red-700 border-red-200' }
  }

  if (daysRemaining <= 15) {
    return { label: 'Expiring Soon', className: 'bg-orange-100 text-orange-700 border-orange-200' }
  }

  return { label: 'Active', className: 'bg-green-100 text-green-700 border-green-200' }
}

const renderVehicleNumber = (vehicleNumber, vehicleDesign) => {
  const parts = getVehicleNumberParts(vehicleNumber)

  if (!parts) {
    return <span className='font-mono text-2xl font-black tracking-[0.16em]'>{vehicleNumber || 'N/A'}</span>
  }

  return (
    <div className={vehicleDesign.container}>
      <span className={vehicleDesign.stateCode}>{parts.stateCode}</span>
      <span className={vehicleDesign.districtCode}>{parts.districtCode}</span>
      <span className={vehicleDesign.series}>{parts.series}</span>
      <span className={vehicleDesign.last4Digits}>{parts.last4Digits}</span>
    </div>
  )
}

const getDocumentUrl = (value) => {
  if (!value) return ''
  if (String(value).startsWith('http') || String(value).startsWith('data:')) return value
  return `${API_URL}${value}`
}

const RcPlate = ({ vehicleNumber }) => {
  const parts = getVehicleNumberParts(vehicleNumber)

  if (!parts) {
    return (
      <div className='mx-auto max-w-[320px] rounded-[26px] border-[4px] border-slate-900 bg-gradient-to-b from-amber-200 to-yellow-300 px-4 py-5 shadow-[inset_0_2px_10px_rgba(255,255,255,0.45)]'>
        <p className='text-center text-[11px] font-extrabold uppercase tracking-[0.34em] text-slate-700'>Registration No</p>
        <div className='mt-3 text-center text-2xl font-black tracking-[0.18em] text-slate-950 md:text-3xl'>{vehicleNumber || 'N/A'}</div>
      </div>
    )
  }

  return (
    <div className='mx-auto max-w-[340px] rounded-[26px] border-[4px] border-slate-900 bg-gradient-to-b from-amber-200 to-yellow-300 px-4 py-5 shadow-[inset_0_2px_10px_rgba(255,255,255,0.45)]'>
      <p className='text-center text-[11px] font-extrabold uppercase tracking-[0.34em] text-slate-700'>Registration No</p>
      <div className='mt-3 flex items-center justify-center gap-2 text-slate-950'>
        <span className='rounded-md bg-white/50 px-2 py-1 text-lg font-black tracking-[0.12em] md:text-xl'>{parts.stateCode}</span>
        <span className='rounded-md bg-white/50 px-2 py-1 text-lg font-black tracking-[0.12em] md:text-xl'>{parts.districtCode}</span>
        <span className='rounded-md bg-white/50 px-2 py-1 text-lg font-black tracking-[0.12em] md:text-xl'>{parts.series}</span>
        <span className='rounded-md bg-white/50 px-2 py-1 text-xl font-black tracking-[0.12em] md:text-2xl'>{parts.last4Digits}</span>
      </div>
    </div>
  )
}

const RecordSection = ({ title, records, dateFromKey, dateToKey, dateFromLabel, dateToLabel, accent, emptyText, extraFields }) => {
  const accentStyle = accentClasses[accent] || accentClasses.slate

  return (
    <section className={`rounded-[28px] border bg-gradient-to-br ${accentStyle.panel} shadow-[0_24px_70px_-48px_rgba(15,23,42,0.55)]`}>
      <div className='flex flex-col gap-3 border-b border-black/5 px-5 py-5 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <p className='text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500'>Related Records</p>
          <h2 className='mt-1 text-xl font-black text-slate-900'>{title}</h2>
        </div>
        <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-bold ${accentStyle.badge}`}>
          {records.length} record{records.length === 1 ? '' : 's'}
        </span>
      </div>

      {records.length === 0 ? (
        <div className='px-5 py-8 text-sm font-semibold text-slate-500'>{emptyText}</div>
      ) : (
        <div className='grid gap-4 p-5'>
          {records.map((record, index) => {
            const status = getRecordStatus(record[dateToKey])

            return (
              <article key={record._id || `${title}-${index}`} className={`rounded-3xl border ${accentStyle.soft} p-4`}>
                <div className='flex flex-col gap-3 border-b border-black/5 pb-3 sm:flex-row sm:items-start sm:justify-between'>
                  <div>
                    <p className='text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500'>Record {index + 1}</p>
                    <p className='mt-1 text-sm font-semibold text-slate-700'>
                      {record.vehicleNumber || record.policyNumber || record.receiptNo || title}
                    </p>
                  </div>
                  <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-bold ${status.className}`}>
                    {status.label}
                  </span>
                </div>

                <div className='mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4'>
                  <div className='rounded-2xl border border-white/80 bg-white/80 p-3'>
                    <p className='text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500'>{dateFromLabel}</p>
                    <p className='mt-1 text-sm font-semibold text-slate-900'>{formatFieldValue(dateFromKey, record[dateFromKey])}</p>
                  </div>
                  <div className='rounded-2xl border border-white/80 bg-white/80 p-3'>
                    <p className='text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500'>{dateToLabel}</p>
                    <p className='mt-1 text-sm font-semibold text-slate-900'>{formatFieldValue(dateToKey, record[dateToKey])}</p>
                  </div>
                  {extraFields.map((field) => (
                    <div key={field} className='rounded-2xl border border-white/80 bg-white/80 p-3'>
                      <p className='text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500'>{field.replace(/([A-Z])/g, ' $1').trim()}</p>
                      <p className='mt-1 break-words text-sm font-semibold text-slate-900'>{formatFieldValue(field, record[field])}</p>
                    </div>
                  ))}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

const VehicleDetailPage = () => {
  const { id } = useParams()
  const vehicleDesign = getVehicleNumberDesign()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [vehicleDetail, setVehicleDetail] = useState(null)
  const [showRcImageViewer, setShowRcImageViewer] = useState(false)

  useEffect(() => {
    const fetchVehicleDetail = async () => {
      try {
        setLoading(true)
        setError('')
        const response = await axios.get(`${API_URL}/api/vehicle/${id}/detail`, { withCredentials: true })

        if (response.data?.success) {
          setVehicleDetail(response.data.data)
        } else {
          setError('Failed to load vehicle details.')
        }
      } catch (fetchError) {
        console.error('Error fetching vehicle detail:', fetchError)
        setError(fetchError.response?.data?.message || 'Failed to load vehicle details.')
      } finally {
        setLoading(false)
      }
    }

    fetchVehicleDetail()
  }, [id])

  const vehicle = vehicleDetail?.vehicle
  const records = vehicleDetail?.records

  const rcFields = useMemo(() => {
    if (!vehicle) return []

    return [
      ['Registration Date', vehicle.dateOfRegistration],
      ['Owner Name', vehicle.ownerName],
      ['S/W/D Of', vehicle.sonWifeDaughterOf],
      ['Mobile Number', vehicle.mobileNumber],
      ['Email', vehicle.email],
      ['Address', vehicle.address],
      ['Chassis Number', vehicle.chassisNumber],
      ['Engine Number', vehicle.engineNumber],
      ['Maker Name', vehicle.makerName],
      ['Maker Model', vehicle.makerModel],
      ['Colour', vehicle.colour],
      ['Vehicle Class', vehicle.vehicleClass],
      ['Vehicle Type', vehicle.vehicleType],
      ['Vehicle Category', vehicle.vehicleCategory],
      ['Fuel Type', vehicle.fuelType],
      ['Body Type', vehicle.bodyType],
      ['Manufacture Year', vehicle.manufactureYear],
      ['Seating Capacity', vehicle.seatingCapacity],
      ['Laden Weight', vehicle.ladenWeight ? `${vehicle.ladenWeight} kg` : ''],
      ['Unladen Weight', vehicle.unladenWeight ? `${vehicle.unladenWeight} kg` : ''],
      ['No. Of Cylinders', vehicle.numberOfCylinders],
      ['Cubic Capacity', vehicle.cubicCapacity],
      ['Wheel Base', vehicle.wheelBase],
      ['RC Image', vehicle.rcImage],
      ['Speed Governor Image', vehicle.speedGovernorImage],
    ].filter(([, value]) => value !== null && value !== undefined && value !== '')
  }, [vehicle])

  const rcAdditionalFields = useMemo(
    () => rcFields.filter(([label]) => !['Registration Date', 'Chassis Number', 'Engine Number', 'RC Image'].includes(label)),
    [rcFields]
  )

  const relatedDocumentRows = useMemo(() => {
    if (!records) return []

    const documentConfigs = [
      { key: 'fitness', label: 'Fitness', dateFromKey: 'validFrom', dateToKey: 'validTo', documentKey: 'fitnessDocument' },
      { key: 'puc', label: 'PUC', dateFromKey: 'validFrom', dateToKey: 'validTo', documentKey: 'pucDocument' },
      { key: 'tax', label: 'Tax', dateFromKey: 'taxFrom', dateToKey: 'taxTo', documentKey: 'taxDocument' },
      { key: 'gps', label: 'GPS', dateFromKey: 'validFrom', dateToKey: 'validTo', documentKey: 'gpsDocument' },
      { key: 'insurance', label: 'Insurance', dateFromKey: 'validFrom', dateToKey: 'validTo', documentKey: 'insuranceDocument' },
    ]

    return documentConfigs.flatMap(({ key, label, dateFromKey, dateToKey, documentKey }) =>
      (records[key] || [])
        .map((record, index) => {
          const documentUrl = getDocumentUrl(record[documentKey])
          const isPdf = documentUrl
            ? documentUrl.toLowerCase().includes('.pdf') || documentUrl.startsWith('data:application/pdf')
            : false

          return {
            id: record._id || `${key}-${index}`,
            type: label,
            validFrom: record[dateFromKey] || 'N/A',
            validTo: record[dateToKey] || 'N/A',
            documentUrl,
            isPdf,
            hasDocument: Boolean(documentUrl),
          }
        })
    )
  }, [records])

  if (loading) {
    return (
      <div className='min-h-screen bg-[radial-gradient(circle_at_top,_#eff6ff,_#f8fafc_45%,_#ffffff_100%)] px-4 py-8'>
        <div className='mx-auto max-w-7xl animate-pulse space-y-5'>
          <div className='h-14 rounded-3xl bg-slate-200/80' />
          <div className='h-52 rounded-[32px] bg-slate-200/80' />
          <div className='grid grid-cols-2 gap-4 lg:grid-cols-6'>
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className='h-24 rounded-3xl bg-slate-200/80' />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !vehicle || !records) {
    return (
      <div className='min-h-screen bg-[radial-gradient(circle_at_top,_#eff6ff,_#f8fafc_45%,_#ffffff_100%)] px-4 py-8'>
        <div className='mx-auto max-w-3xl rounded-[32px] border border-red-200 bg-white p-8 text-center shadow-[0_24px_70px_-48px_rgba(15,23,42,0.55)]'>
          <p className='text-lg font-bold text-red-700'>{error || 'Vehicle detail not found.'}</p>
        </div>
      </div>
    )
  }

  const vehicleNumber = vehicle.registrationNumber || vehicle.vehicleNumber || 'N/A'
  const rcImageUrl = getDocumentUrl(vehicle.rcImage)
  const rcImageIsPdf = rcImageUrl && (rcImageUrl.toLowerCase().includes('.pdf') || rcImageUrl.startsWith('data:application/pdf'))
  const handleShareDocument = async (documentUrl, isPdf, title) => {
    if (!documentUrl) {
      toast.error('No document available to share.', { position: 'top-right', autoClose: 2500 })
      return
    }

    try {
      if (navigator.share) {
        if (documentUrl.startsWith('data:')) {
          const response = await fetch(documentUrl)
          const blob = await response.blob()
          const extension = isPdf ? 'pdf' : 'jpg'
          const mimeType = isPdf ? 'application/pdf' : (blob.type || 'image/jpeg')
          const shareFile = new File([blob], `${vehicleNumber.replace(/\s+/g, '-')}-${title.toLowerCase()}.${extension}`, { type: mimeType })

          if (navigator.canShare && navigator.canShare({ files: [shareFile] })) {
            await navigator.share({
              title: `${vehicleNumber} ${title} Document`,
              text: `${title} document for vehicle ${vehicleNumber}`,
              files: [shareFile],
            })
            return
          }
        } else {
          await navigator.share({
            title: `${vehicleNumber} ${title} Document`,
            text: `${title} document for vehicle ${vehicleNumber}`,
            url: documentUrl,
          })
          return
        }
      }

      if (!documentUrl.startsWith('data:')) {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${title} document for vehicle ${vehicleNumber}\n${documentUrl}`)}`
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
        return
      }

      toast.info('Direct sharing for this file works on browsers that support the native share option.', {
        position: 'top-right',
        autoClose: 3500,
      })
    } catch (error) {
      console.error('Error sharing document:', error)
      toast.error('Failed to share document.', { position: 'top-right', autoClose: 2500 })
    }
  }

  const handleShareRc = async () => {
    await handleShareDocument(rcImageUrl, rcImageIsPdf, 'RC')
  }

  return (
    <div className='min-h-screen bg-[radial-gradient(circle_at_top,_#eff6ff,_#f8fafc_45%,_#ffffff_100%)]'>
      <div className='mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8'>
        <section className='overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_24px_70px_-48px_rgba(15,23,42,0.55)]'>
          <div className='grid gap-6 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-5 py-6 text-white lg:grid-cols-[minmax(0,1.05fr)_360px] lg:px-8'>
            <div>
              <RcPlate vehicleNumber={vehicleNumber} />

              <div className='mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3'>
                <div className='rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur'>
                  <p className='text-[10px] font-bold uppercase tracking-[0.22em] text-slate-300'>Registration Date</p>
                  <p className='mt-1 text-sm font-semibold text-white'>{vehicle.dateOfRegistration || 'N/A'}</p>
                </div>
                <div className='rounded-2xl border border-blue-200/20 bg-blue-400/10 px-4 py-3 backdrop-blur'>
                  <p className='text-[10px] font-bold uppercase tracking-[0.22em] text-blue-100'>Chassis Number</p>
                  <p className='mt-1 break-all text-sm font-semibold text-white'>{vehicle.chassisNumber || 'N/A'}</p>
                </div>
                <div className='rounded-2xl border border-emerald-200/20 bg-emerald-400/10 px-4 py-3 backdrop-blur'>
                  <p className='text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-100'>Engine Number</p>
                  <p className='mt-1 break-all text-sm font-semibold text-white'>{vehicle.engineNumber || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className='rounded-[28px] border border-white/10 bg-white/10 p-4 backdrop-blur'>
              <p className='text-[10px] font-bold uppercase tracking-[0.22em] text-slate-300'>Uploaded RC Document</p>
              <div className='mt-3 overflow-hidden rounded-[22px] border border-white/10 bg-slate-950/30'>
                {rcImageUrl ? (
                  rcImageIsPdf ? (
                    <div className='flex min-h-[260px] flex-col items-center justify-center gap-3 p-5 text-center'>
                      <p className='text-sm font-semibold text-white'>RC PDF uploaded</p>
                      <a href={rcImageUrl} target='_blank' rel='noreferrer' className='inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-900'>
                        Open RC PDF
                      </a>
                    </div>
                  ) : (
                    <img
                      src={rcImageUrl}
                      alt='Uploaded RC document'
                      onClick={() => setShowRcImageViewer(true)}
                      className='h-[320px] w-full cursor-pointer object-contain bg-white/90'
                    />
                  )
                ) : (
                  <div className='flex min-h-[260px] items-center justify-center p-5 text-center text-sm font-semibold text-slate-300'>
                    No RC document uploaded
                  </div>
                )}
              </div>
              {rcImageUrl && (
                <button
                  type='button'
                  onClick={handleShareRc}
                  className='mt-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-900 shadow-sm transition hover:bg-slate-100'
                  title='Share RC'
                  aria-label='Share RC'
                >
                  <Share className='h-5 w-5' />
                </button>
              )}
            </div>
          </div>

          <div className='border-t border-slate-200 p-5 lg:p-6'>
            <div className='grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4'>
              {rcAdditionalFields.map(([label, value]) => (
                <div key={label} className='rounded-3xl border border-slate-200 bg-slate-50 p-4'>
                  <p className='text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500'>{label}</p>
                  <p className='mt-2 break-words text-sm font-semibold text-slate-900'>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <ImageViewer
          isOpen={showRcImageViewer}
          onClose={() => setShowRcImageViewer(false)}
          imageUrl={rcImageUrl}
          title='RC Document Image'
        />

        <section className='mt-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_70px_-48px_rgba(15,23,42,0.55)]'>
          <div className='border-b border-slate-200 px-5 py-5'>
            <h2 className='text-xl font-black text-slate-900'>Vehicle Documents</h2>
          </div>

          {relatedDocumentRows.length === 0 ? (
            <div className='px-5 py-8 text-sm font-semibold text-slate-500'>No related records found for this vehicle.</div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='min-w-full divide-y divide-slate-200'>
                <thead className='bg-slate-50'>
                  <tr>
                    <th className='px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500'>Document Type</th>
                    <th className='px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500'>Valid From</th>
                    <th className='px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500'>Valid To</th>
                    <th className='px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500'>Document Image</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-200 bg-white'>
                  {relatedDocumentRows.map((row) => (
                    <tr key={row.id} className='align-top'>
                      <td className='px-4 py-4 text-sm font-bold text-slate-900'>{row.type}</td>
                      <td className='px-4 py-4 text-sm font-bold text-emerald-700'>{row.validFrom}</td>
                      <td className='px-4 py-4 text-sm font-bold text-red-600'>{row.validTo}</td>
                      <td className='px-4 py-4'>
                        {!row.hasDocument ? (
                          <span className='text-sm font-semibold text-slate-400'>No document</span>
                        ) : row.isPdf ? (
                          <div className='flex items-center gap-2'>
                            <a
                              href={row.documentUrl}
                              target='_blank'
                              rel='noreferrer'
                              className='inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white'
                            >
                              Open PDF
                            </a>
                            <button
                              type='button'
                              onClick={() => handleShareDocument(row.documentUrl, row.isPdf, row.type)}
                              className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-900 transition hover:bg-slate-100'
                              title={`Share ${row.type}`}
                              aria-label={`Share ${row.type}`}
                            >
                              <Share className='h-4 w-4' />
                            </button>
                          </div>
                        ) : (
                          <div className='flex items-start gap-2'>
                            <a href={row.documentUrl} target='_blank' rel='noreferrer' className='block w-fit overflow-hidden rounded-2xl border border-slate-200 bg-slate-50'>
                              <img src={row.documentUrl} alt={`${row.type} document`} className='h-24 w-24 object-cover' />
                            </a>
                            <button
                              type='button'
                              onClick={() => handleShareDocument(row.documentUrl, row.isPdf, row.type)}
                              className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-900 transition hover:bg-slate-100'
                              title={`Share ${row.type}`}
                              aria-label={`Share ${row.type}`}
                            >
                              <Share className='h-4 w-4' />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default VehicleDetailPage
