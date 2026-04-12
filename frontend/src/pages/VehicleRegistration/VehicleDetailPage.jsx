import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'
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
  const theme = getTheme()
  const vehicleDesign = getVehicleNumberDesign()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [vehicleDetail, setVehicleDetail] = useState(null)

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
          <Link to='/vehicle' className='mt-5 inline-flex items-center rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white'>
            Back To Vehicle List
          </Link>
        </div>
      </div>
    )
  }

  const vehicleNumber = vehicle.registrationNumber || vehicle.vehicleNumber || 'N/A'

  return (
    <div className='min-h-screen bg-[radial-gradient(circle_at_top,_#eff6ff,_#f8fafc_45%,_#ffffff_100%)]'>
      <div className='mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8'>
        <div className='mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          <div>
            <p className='text-[11px] font-bold uppercase tracking-[0.26em] text-slate-500'>Vehicle Detail Page</p>
            <h1 className='mt-1 text-3xl font-black text-slate-900'>All records for one vehicle</h1>
          </div>
          <Link to='/vehicle' className={`inline-flex w-fit items-center rounded-full px-5 py-3 text-sm font-bold text-white shadow-lg ${theme.navbar}`}>
            Back To Vehicle List
          </Link>
        </div>

        <section className='overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_24px_70px_-48px_rgba(15,23,42,0.55)]'>
          <div className='bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 px-5 py-6 text-white lg:px-8'>
            <div className='flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between'>
              <div>
                <p className='text-[11px] font-bold uppercase tracking-[0.26em] text-slate-300'>Vehicle RC Overview</p>
                <div className='mt-4'>
                  {renderVehicleNumber(vehicleNumber, vehicleDesign)}
                </div>
              </div>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
                <div className='rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur'>
                  <p className='text-[10px] font-bold uppercase tracking-[0.22em] text-slate-300'>Owner</p>
                  <p className='mt-1 text-sm font-semibold text-white'>{vehicle.ownerName || 'N/A'}</p>
                </div>
                <div className='rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur'>
                  <p className='text-[10px] font-bold uppercase tracking-[0.22em] text-slate-300'>Chassis</p>
                  <p className='mt-1 break-all text-sm font-semibold text-white'>{vehicle.chassisNumber || 'N/A'}</p>
                </div>
                <div className='rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur'>
                  <p className='text-[10px] font-bold uppercase tracking-[0.22em] text-slate-300'>Engine</p>
                  <p className='mt-1 break-all text-sm font-semibold text-white'>{vehicle.engineNumber || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className='border-t border-slate-200 p-5 lg:p-6'>
            <div className='mb-4 flex items-center justify-between'>
              <div>
                <p className='text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500'>Primary Record</p>
                <h2 className='mt-1 text-2xl font-black text-slate-900'>Vehicle RC</h2>
              </div>
              <span className='inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700'>
                {rcFields.length} fields
              </span>
            </div>

            <div className='grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4'>
              {rcFields.map(([label, value]) => (
                <div key={label} className='rounded-3xl border border-slate-200 bg-slate-50 p-4'>
                  <p className='text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500'>{label}</p>
                  <p className='mt-2 break-words text-sm font-semibold text-slate-900'>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className='mt-6 grid gap-6'>
          {sectionConfig.map((section) => (
            <RecordSection
              key={section.key}
              title={section.title}
              records={records[section.key] || []}
              dateFromKey={section.dateFromKey}
              dateToKey={section.dateToKey}
              dateFromLabel={section.dateFromLabel}
              dateToLabel={section.dateToLabel}
              accent={section.accent}
              emptyText={section.emptyText}
              extraFields={section.extraFields}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default VehicleDetailPage
