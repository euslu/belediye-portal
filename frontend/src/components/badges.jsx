const STATUS_STYLES = {
  OPEN:             'bg-blue-100 text-blue-700',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
  ASSIGNED:         'bg-indigo-100 text-indigo-700',
  IN_PROGRESS:      'bg-yellow-100 text-yellow-700',
  RESOLVED:         'bg-green-100 text-green-700',
  CLOSED:           'bg-gray-100 text-gray-500',
  REJECTED:         'bg-red-100 text-red-700',
};
const STATUS_LABELS = {
  OPEN: 'Açık', PENDING_APPROVAL: 'Onay Bekliyor', ASSIGNED: 'Atandı',
  IN_PROGRESS: 'İşlemde', RESOLVED: 'Çözüldü', CLOSED: 'Kapalı', REJECTED: 'Reddedildi',
};

const PRIORITY_STYLES = {
  LOW:      'bg-gray-100 text-gray-600',
  MEDIUM:   'bg-blue-100 text-blue-700',
  HIGH:     'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};
const PRIORITY_LABELS = {
  LOW: 'Düşük', MEDIUM: 'Orta', HIGH: 'Yüksek', CRITICAL: 'Kritik',
};

const TYPE_STYLES = {
  INCIDENT: 'bg-red-50 text-red-600',
  REQUEST:  'bg-purple-50 text-purple-600',
  CHANGE:   'bg-teal-50 text-teal-600',
};
const TYPE_LABELS = { INCIDENT: 'Arıza', REQUEST: 'Talep', CHANGE: 'Değişiklik' };

function Badge({ label, cls }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

export function StatusBadge({ status }) {
  return <Badge label={STATUS_LABELS[status] || status} cls={STATUS_STYLES[status] || 'bg-gray-100 text-gray-500'} />;
}

export function PriorityBadge({ priority }) {
  return <Badge label={PRIORITY_LABELS[priority] || priority} cls={PRIORITY_STYLES[priority] || 'bg-gray-100 text-gray-500'} />;
}

export function TypeBadge({ type }) {
  return <Badge label={TYPE_LABELS[type] || type} cls={TYPE_STYLES[type] || 'bg-gray-100 text-gray-500'} />;
}
