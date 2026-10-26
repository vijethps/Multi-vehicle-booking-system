import clsx from 'clsx'

const statusMap = {
  // Booking statuses
  draft:            'badge-gray',
  pending_payment:  'badge-yellow',
  pending_approval: 'badge-yellow',
  confirmed:        'badge-green',
  active:           'badge-blue',
  completed:        'badge-green',
  cancelled:        'badge-red',
  expired:          'badge-gray',
  payment_failed:   'badge-red',
  refund_pending:   'badge-purple',
  // Payment statuses
  pending:          'badge-yellow',
  success:          'badge-green',
  failed:           'badge-red',
  refunded:         'badge-purple',
  partially_refunded:'badge-purple',
  // Trip statuses
  scheduled:        'badge-blue',
  boarding:         'badge-yellow',
  departed:         'badge-blue',
  delayed:          'badge-yellow',
  // Vehicle
  available:        'badge-green',
  unavailable:      'badge-red',
}

const labelMap = {
  pending_payment:   'Pending Payment',
  pending_approval:  'Pending Approval',
  payment_failed:    'Payment Failed',
  refund_pending:    'Refund Pending',
  partially_refunded:'Partial Refund',
}

export default function StatusBadge({ status, className }) {
  const badgeClass = statusMap[status] || 'badge-gray'
  const label = labelMap[status] || status?.replace(/_/g, ' ')
  return (
    <span className={clsx(badgeClass, 'capitalize', className)}>
      {label}
    </span>
  )
}
