export const metadata = { title: 'Settings' }

export default function AdminSettingsPage() {
  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="space-y-6">
        <SettingCard title="Booking Rules">
          <Setting label="Available days" value="Monday – Saturday" />
          <Setting label="In-person duration" value="45 minutes" />
          <Setting label="Video duration" value="20 minutes" />
          <Setting label="Minimum notice" value="24 hours" />
          <p className="text-xs text-gray-400 mt-3">Editable settings form coming in a later session.</p>
        </SettingCard>

        <SettingCard title="Email Templates">
          <Setting label="Appointment confirmation" value="Active" />
          <Setting label="Appointment reminder (24h)" value="Active" />
          <Setting label="Admin: new lead alert" value="Active" />
          <Setting label="Admin: inspection complete alert" value="Active" />
          <p className="text-xs text-gray-400 mt-3">Template editor coming in a later session.</p>
        </SettingCard>
      </div>
    </div>
  )
}

function SettingCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Setting({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4">
      <span className="w-52 text-sm text-gray-400 shrink-0">{label}</span>
      <span className="text-sm text-gray-800">{value}</span>
    </div>
  )
}
