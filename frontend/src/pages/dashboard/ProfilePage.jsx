import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/axios'
import MainLayout from '../../components/layout/MainLayout'
import toast from 'react-hot-toast'
import { User, Lock, Save, Eye, EyeOff } from 'lucide-react'

export default function ProfilePage() {
  const { user, login } = useAuth()

  const [profile, setProfile] = useState({
    first_name: user?.first_name || '',
    last_name:  user?.last_name  || '',
    phone:      user?.phone      || '',
  })
  const [saving, setSaving] = useState(false)

  const [pwd, setPwd] = useState({ current_password: '', new_password: '', confirm: '' })
  const [showPwd, setShowPwd] = useState({ current: false, new: false })
  const [changingPwd, setChangingPwd] = useState(false)

  const handleProfileSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put('/auth/profile', profile)
      toast.success('Profile updated successfully')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (pwd.new_password !== pwd.confirm) {
      toast.error('New passwords do not match')
      return
    }
    setChangingPwd(true)
    try {
      await api.put('/auth/change-password', {
        current_password: pwd.current_password,
        new_password: pwd.new_password,
      })
      toast.success('Password changed successfully')
      setPwd({ current_password: '', new_password: '', confirm: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password')
    } finally {
      setChangingPwd(false)
    }
  }

  return (
    <MainLayout>
      <div className="page-container section max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Profile & Settings</h1>

        {/* Profile info */}
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-primary-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
          </div>

          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">First Name</label>
                <input
                  className="input"
                  value={profile.first_name}
                  onChange={e => setProfile(p => ({ ...p, first_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Last Name</label>
                <input
                  className="input"
                  value={profile.last_name}
                  onChange={e => setProfile(p => ({ ...p, last_name: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Email Address</label>
              <input
                className="input bg-gray-50 cursor-not-allowed"
                value={user?.email || ''}
                disabled
                title="Email cannot be changed"
              />
              <p className="text-xs text-gray-400 mt-1">Email address cannot be changed</p>
            </div>

            <div>
              <label className="label">Phone Number</label>
              <input
                type="tel"
                className="input"
                value={profile.phone}
                onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                placeholder="+91 98000 00000"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="badge-blue capitalize">{user?.role}</span>
                <span>Account role</span>
              </div>
              <button type="submit" disabled={saving} className="btn-primary ml-auto">
                <Save className="w-4 h-4" />
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Change password */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Lock className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="label">Current Password</label>
              <div className="relative">
                <input
                  type={showPwd.current ? 'text' : 'password'}
                  className="input pr-10"
                  value={pwd.current_password}
                  onChange={e => setPwd(p => ({ ...p, current_password: e.target.value }))}
                  required
                  placeholder="Enter current password"
                />
                <button type="button" onClick={() => setShowPwd(s => ({ ...s, current: !s.current }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPwd.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label">New Password</label>
              <div className="relative">
                <input
                  type={showPwd.new ? 'text' : 'password'}
                  className="input pr-10"
                  value={pwd.new_password}
                  onChange={e => setPwd(p => ({ ...p, new_password: e.target.value }))}
                  required
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                />
                <button type="button" onClick={() => setShowPwd(s => ({ ...s, new: !s.new }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPwd.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label">Confirm New Password</label>
              <input
                type="password"
                className={`input ${pwd.confirm && pwd.confirm !== pwd.new_password ? 'input-error' : ''}`}
                value={pwd.confirm}
                onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))}
                required
                placeholder="Repeat new password"
              />
              {pwd.confirm && pwd.confirm !== pwd.new_password && (
                <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={changingPwd || (pwd.confirm && pwd.confirm !== pwd.new_password)}
              className="btn-primary"
            >
              <Lock className="w-4 h-4" />
              {changingPwd ? 'Changing…' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </MainLayout>
  )
}
