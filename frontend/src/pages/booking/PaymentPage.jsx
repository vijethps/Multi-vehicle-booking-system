import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { bookingsApi, paymentsApi } from '../../services/bookings'
import MainLayout from '../../components/layout/MainLayout'
import { LoadingOverlay } from '../../components/ui/Spinner'
import toast from 'react-hot-toast'
import { CreditCard, Shield, CheckCircle } from 'lucide-react'
const uuidv4 = () => crypto.randomUUID()

export default function PaymentPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const bookingId = searchParams.get('booking_id')
  const [paying, setPaying] = useState(false)

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingsApi.getById(bookingId).then(r => r.data.data.booking),
    enabled: !!bookingId,
  })

  const handlePay = async () => {
    setPaying(true)
    try {
      const orderRes = await paymentsApi.createOrder(bookingId)
      const { order, key } = orderRes.data.data

      if (order.is_simulation) {
        // Dev simulation: verify immediately
        const verifyRes = await paymentsApi.verify({
          gateway_order_id: order.id,
          gateway_payment_id: `sim_pay_${uuidv4().slice(0, 8)}`,
          payment_method: 'simulation',
        })
        toast.success('Payment successful!')
        navigate(`/booking/confirm?booking_id=${bookingId}`)
        return
      }

      // Real Razorpay
      const options = {
        key,
        amount: order.amount,
        currency: order.currency,
        name: 'TransportHub',
        description: `Booking ${order.booking_number}`,
        order_id: order.id,
        handler: async (response) => {
          try {
            await paymentsApi.verify({
              gateway_order_id: order.id,
              gateway_payment_id: response.razorpay_payment_id,
              gateway_signature: response.razorpay_signature,
            })
            toast.success('Payment successful!')
            navigate(`/booking/confirm?booking_id=${bookingId}`)
          } catch {
            toast.error('Payment verification failed')
          }
        },
        prefill: { email: booking?.email },
        theme: { color: '#2563eb' },
        modal: { ondismiss: () => setPaying(false) },
      }
      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed')
      setPaying(false)
    }
  }

  if (isLoading || !booking) return <MainLayout><LoadingOverlay message="Loading booking…" /></MainLayout>

  return (
    <MainLayout>
      <div className="page-container section max-w-lg mx-auto">
        <div className="card p-8">
          <div className="text-center mb-6">
            <CreditCard className="w-12 h-12 text-primary-600 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-gray-900">Complete Payment</h1>
            <p className="text-gray-500 mt-1">Booking #{booking.booking_number}</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>₹{parseFloat(booking.subtotal).toLocaleString()}</span>
            </div>
            {parseFloat(booking.driver_charge) > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Driver charge</span>
                <span>₹{parseFloat(booking.driver_charge).toLocaleString()}</span>
              </div>
            )}
            {parseFloat(booking.discount_amount) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-₹{parseFloat(booking.discount_amount).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Tax</span>
              <span>₹{parseFloat(booking.tax_amount).toLocaleString()}</span>
            </div>
            {parseFloat(booking.security_deposit) > 0 && (
              <div className="flex justify-between text-gray-500 text-xs">
                <span>Security deposit (refundable)</span>
                <span>₹{parseFloat(booking.security_deposit).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 text-base border-t pt-2">
              <span>Total Amount</span>
              <span>₹{parseFloat(booking.total_amount).toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400 mb-6 justify-center">
            <Shield className="w-4 h-4" />
            <span>Payments are processed securely. Your data is protected.</span>
          </div>

          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            🔧 <strong>Development mode:</strong> Payment is simulated. Click Pay to confirm instantly.
          </div>

          <button
            onClick={handlePay}
            disabled={paying}
            className="btn-primary btn-lg w-full"
          >
            {paying ? 'Processing…' : `Pay ₹${parseFloat(booking.total_amount).toLocaleString()}`}
          </button>
          <button onClick={() => navigate(-1)} className="btn-ghost w-full mt-2">Go back</button>
        </div>
      </div>
    </MainLayout>
  )
}
