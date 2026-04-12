import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Sidebar from '../components/Sidebar'
import AddVehicleModal from './VehicleRegistration/components/AddVehicleModal'
import AddFitnessModal from './Fitness/components/AddFitnessModal'
import AddTaxModal from './Tax/components/AddTaxModal'
import AddPucModal from './Puc/components/AddPucModal'
import AddGpsModal from './Gps/components/AddGpsModal'
import AddInsuranceModal from './Insurance/components/AddInsuranceModal'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

const Home = () => {
  const navigate = useNavigate()
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false)
  const [showAddFitnessModal, setShowAddFitnessModal] = useState(false)
  const [showAddTaxModal, setShowAddTaxModal] = useState(false)
  const [showAddPucModal, setShowAddPucModal] = useState(false)
  const [showAddGpsModal, setShowAddGpsModal] = useState(false)
  const [showAddInsuranceModal, setShowAddInsuranceModal] = useState(false)

  useEffect(() => {
    fetchVehicles()
  }, [])

  const fetchVehicles = async () => {
      try {
        setLoading(true)
        setError('')

        const response = await axios.get(`${API_URL}/api/vehicle`, {
          params: {
            page: 1,
            limit: 1000,
          },
          withCredentials: true,
        })

        if (response.data?.success) {
          setVehicles(response.data.data || [])
        } else {
          setVehicles([])
          setError('Failed to load vehicles.')
        }
      } catch (err) {
        console.error('Error fetching vehicles:', err)
        setVehicles([])
        setError('Failed to fetch registered vehicles.')
      } finally {
        setLoading(false)
      }
    }

  return (
    <div className='min-h-screen bg-[radial-gradient(circle_at_top,_#eef2ff,_#f8fafc_45%,_#ffffff_100%)]'>
      <main className='pl-2 pr-4 pt-6 pb-10 lg:pl-3 lg:pr-8 lg:pt-8'>
        <section className='w-full'>
          <div className='grid grid-cols-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)]'>
            <Sidebar
              onAddVehicle={() => setShowAddVehicleModal(true)}
              onAddFitness={() => setShowAddFitnessModal(true)}
              onAddTax={() => setShowAddTaxModal(true)}
              onAddPuc={() => setShowAddPucModal(true)}
              onAddGps={() => setShowAddGpsModal(true)}
              onAddInsurance={() => setShowAddInsuranceModal(true)}
            />

            <div>
              {loading ? (
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className='h-56 animate-pulse rounded-3xl border border-slate-200 bg-white/70' />
                  ))}
                </div>
              ) : error ? (
                <div className='rounded-3xl border border-red-200 bg-red-50 px-5 py-6 text-center text-sm font-semibold text-red-600'>
                  {error}
                </div>
              ) : vehicles.length === 0 ? (
                <div className='rounded-3xl border border-slate-200 bg-white px-5 py-10 text-center'>
                  <p className='text-lg font-bold text-slate-800'>No registered vehicles found</p>
                </div>
              ) : (
                <div className='grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3'>
                  {vehicles.map((vehicle) => {
                    const vehicleNumber = (vehicle.registrationNumber || vehicle.vehicleNumber || 'N/A').toUpperCase()

                    return (
                      <article
                        key={vehicle._id}
                        onClick={() => navigate(`/vehicle/${vehicle._id}/detail`)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            navigate(`/vehicle/${vehicle._id}/detail`)
                          }
                        }}
                        role='button'
                        tabIndex={0}
                        className='group cursor-pointer overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_45px_-30px_rgba(15,23,42,0.6)] transition-transform duration-200 hover:-translate-y-1'
                      >
                        <div className='bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-5 py-4 text-white'>
                          <p className='text-[11px] font-bold uppercase tracking-[0.24em] text-slate-300'>Vehicle Card</p>
                        </div>

                        <div className='p-5'>
                          <div className='rounded-[24px] border-4 border-slate-900 bg-gradient-to-b from-amber-200 to-yellow-300 px-4 py-6 shadow-inner'>
                            <p className='text-center text-[11px] font-extrabold uppercase tracking-[0.35em] text-slate-700'>
                              Vehicle No
                            </p>
                            <div className='mt-3 text-center text-2xl font-black tracking-[0.18em] text-slate-950 md:text-3xl'>
                              {vehicleNumber}
                            </div>
                          </div>

                          <div className='mt-5 grid grid-cols-1 gap-3'>
                            <div className='rounded-2xl bg-slate-50 px-4 py-3'>
                              <p className='text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500'>Chassis No</p>
                              <p className='mt-1 break-all font-mono text-sm font-semibold text-slate-900'>
                                {vehicle.chassisNumber || 'N/A'}
                              </p>
                            </div>

                            <div className='rounded-2xl bg-slate-50 px-4 py-3'>
                              <p className='text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500'>Engine No</p>
                              <p className='mt-1 break-all font-mono text-sm font-semibold text-slate-900'>
                                {vehicle.engineNumber || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {showAddVehicleModal && (
        <AddVehicleModal
          isOpen={showAddVehicleModal}
          onClose={() => setShowAddVehicleModal(false)}
          onSuccess={() => {
            setShowAddVehicleModal(false)
            fetchVehicles()
          }}
          editData={null}
        />
      )}

      {showAddFitnessModal && (
        <AddFitnessModal
          isOpen={showAddFitnessModal}
          onClose={() => setShowAddFitnessModal(false)}
          onSubmit={() => {
            setShowAddFitnessModal(false)
          }}
        />
      )}

      {showAddTaxModal && (
        <AddTaxModal
          isOpen={showAddTaxModal}
          onClose={() => setShowAddTaxModal(false)}
          onSubmit={() => {
            setShowAddTaxModal(false)
          }}
        />
      )}

      {showAddPucModal && (
        <AddPucModal
          isOpen={showAddPucModal}
          onClose={() => setShowAddPucModal(false)}
          onSubmit={() => {
            setShowAddPucModal(false)
          }}
        />
      )}

      {showAddGpsModal && (
        <AddGpsModal
          isOpen={showAddGpsModal}
          onClose={() => setShowAddGpsModal(false)}
          onSubmit={() => {
            setShowAddGpsModal(false)
          }}
        />
      )}

      {showAddInsuranceModal && (
        <AddInsuranceModal
          isOpen={showAddInsuranceModal}
          onClose={() => setShowAddInsuranceModal(false)}
          onSubmit={() => {
            setShowAddInsuranceModal(false)
          }}
        />
      )}
    </div>
  )
}

export default Home

