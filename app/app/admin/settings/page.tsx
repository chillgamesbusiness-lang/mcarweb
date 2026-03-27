export const metadata = { title: 'Settings' }

export default function AdminSettingsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-xl">
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-[-0.02em] text-foreground mb-1">Settings</h1>
      <p className="text-sm text-warm-gray mb-8">System configuration</p>

      <div className="space-y-5">
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
    <div className="card-premium p-5 sm:p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-gray mb-4 flex items-center gap-2">
        <svg className="w-3.5 h-3.5 text-gold" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        {title}
      </p>
      <div className="space-y-2.5">{children}</div>
    </div>
  )
}

function Setting({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-4">
      <span className="w-48 text-sm text-warm-gray shrink-0">{label}</span>
      <span className="text-sm text-foreground font-medium">{value}</span>
    </div>
  )
}
