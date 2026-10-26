// Redirects to payment — checkout is handled inline in vehicle/seat pages
import { useNavigate } from 'react-router-dom'
import MainLayout from '../../components/layout/MainLayout'
import { useEffect } from 'react'

export default function BookingCheckout() {
  const navigate = useNavigate()
  useEffect(() => { navigate('/vehicles') }, [])
  return <MainLayout><div className="page-container py-20 text-center text-gray-400">Redirecting…</div></MainLayout>
}
