import clsx from 'clsx'

export default function Spinner({ size = 'md', className }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10', xl: 'w-16 h-16' }
  return (
    <div
      className={clsx(
        'animate-spin rounded-full border-2 border-gray-200 border-t-primary-600',
        sizes[size],
        className
      )}
    />
  )
}

export function PageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="xl" />
    </div>
  )
}

export function LoadingOverlay({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <Spinner size="lg" />
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  )
}
