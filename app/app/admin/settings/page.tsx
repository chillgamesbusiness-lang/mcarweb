export const metadata = { title: 'Settings' }

export default function AdminSettingsPage() {
  return (
    <div className="p-6 lg:p-10 max-w-xl">
      <h1 className="text-3xl font-bold tracking-tight text-charcoal mb-10">Settings</h1>

      <div className="space-y-10">
        <SettingGroup title="Booking Rules">
          <Setting label="Available days" value="Monday – Saturday" />
          <Setting label="In-person duration" value="45 minutes" />
          <Setting label="Video duration" value="20 minutes" />
          <Setting label="Minimum notice" value="24 hours" />
          <p className="text-[11px] text-warm-gray/50 mt-4">Editable settings form coming in a later session.</p>
        </SettingGroup>

        <SettingGroup title="Email Templates">
          <Setting label="Appointment confirmation" value="Active" />
          <Setting label="Appointment reminder (24h)" value="Active" />
          <Setting label="Admin: new lead alert" value="Active" />
          <Setting label="Admin: inspection complete alert" value="Active" />
          <p className="text-[11px] text-warm-gray/50 mt-4">Template editor coming in a later session.</p>
        </SettingGroup>
      </div>
    </div>
  )
}

function SettingGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-gray mb-4">{title}</p>
      <div className="space-y-3 border-l-2 border-warm-border-light pl-5">{children}</div>
    </div>
  )
}

function Setting({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-4">
      <span className="w-48 text-sm text-warm-gray shrink-0">{label}</span>
      <span className="text-sm text-charcoal font-medium">{value}</span>
    </div>
  )
}
