import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import { Bus, Eye, EyeOff } from 'lucide-react'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', password: ''
  })
  const [show, setShow]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors]   = useState({})

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    try {
      await register(form)
      toast.success('Account created! Welcome to TransportHub.')
      navigate('/')
    } catch (err) {
      const data = err.response?.data
      if (data?.errors?.length) {
        const map = {}
        data.errors.forEach(e => { map[e.field] = e.message })
        setErrors(map)
      } else {
        setErrors({ general: data?.message || 'Registration failed' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-primary-700 font-bold text-xl mb-4">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <Bus className="w-6 h-6 text-white" />
            </div>
            TransportHub
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-500 mt-1">Start booking in minutes</p>
        </div>

        <div className="card p-8">
          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">First name</label>
                <input className={errors.first_name ? 'input-error' : 'input'} value={form.first_name} onChange={set('first_name')} placeholder="Ravi" required />
                {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>}
              </div>
              <div>
                <label className="label">Last name</label>
                <input className={errors.last_name ? 'input-error' : 'input'} value={form.last_name} onChange={set('last_name')} placeholder="Sharma" required />
              </div>
            </div>

            <div>
              <label className="label">Email address</label>
              <input type="email" className={errors.email ? 'input-error' : 'input'} value={form.email} onChange={set('email')} placeholder="you@example.com" required />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="label">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
              <input type="tel" className="input" value={form.phone} onChange={set('phone')} placeholder="+91 98000 00000" />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  className={`${errors.password ? 'input-error' : 'input'} pr-10`}
                  value={form.password}
                  onChange={set('password')}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  required
                />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary btn-lg w-full">
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
