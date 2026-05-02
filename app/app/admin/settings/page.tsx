export const metadata = { title: 'Settings' }

type SettingTone = 'good' | 'warn'
type SettingItem = { label: string; value: string; tone?: SettingTone }

function integrationStatus(label: string, configured: boolean, missingValue = 'Needs attention'): SettingItem {
  return {
    label,
    value: configured ? 'Configured' : missingValue,
    tone: configured ? 'good' : 'warn',
  }
}

export default function AdminSettingsPage() {
  const emailConfigured = Boolean(process.env.RESEND_API_KEY)
  const emailStatus = emailConfigured ? 'Active' : 'Degraded'
  const emailTone: SettingTone = emailConfigured ? 'good' : 'warn'
  const otpProofDeferred = process.env.MCAR_PUBLIC_OTP_PROOF_DEFERRED === 'true'
  const buildHash = process.env.NEXT_PUBLIC_GIT_COMMIT_HASH ?? 'unknown'
  const runtimeStatus = [
    { label: 'Build', value: buildHash },
    { label: 'Vercel env', value: process.env.VERCEL_ENV ?? 'local' },
    { label: 'Node env', value: process.env.NODE_ENV ?? 'unknown' },
    { label: 'OTP proof', value: otpProofDeferred ? 'Deferred' : 'Required', tone: otpProofDeferred ? 'warn' : 'good' as SettingTone },
  ]
  const envStatus = [
    integrationStatus('DVLA lookup', Boolean(process.env.DVLA_VES_API_KEY)),
    integrationStatus('Turnstile bot protection', Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY)),
    integrationStatus('Redis rate limits', Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)),
    integrationStatus('SMS verification', Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_VERIFY_SERVICE_SID)),
    integrationStatus('Email notifications', emailConfigured, 'Optional'),
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-4xl">
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-[-0.02em] text-foreground mb-1">Settings</h1>
      <p className="text-sm text-warm-gray mb-8">Operational configuration snapshot</p>

      <div className="grid gap-5 lg:grid-cols-2">
        <SettingGroup title="Booking Rules">
          <Setting label="Available days" value="Monday – Saturday" />
          <Setting label="In-person duration" value="45 minutes" />
          <Setting label="Video duration" value="20 minutes" />
          <Setting label="Minimum notice" value="24 hours" />
        </SettingGroup>

        <SettingGroup title="Staff Workflow">
          <Setting label="Admin actions" value="Status, finance, booking, inspector, notes" />
          <Setting label="Inspector queue" value="Assigned active leads" />
          <Setting label="Outcome tracking" value="Won/lost with realised values" />
          <Setting label="Audit mode" value="Append-only actions" />
        </SettingGroup>

        <SettingGroup title="Notifications">
          <Setting label="Appointment confirmation" value={emailStatus} tone={emailTone} />
          <Setting label="Appointment reminder (24h)" value="Not active" tone="warn" />
          <Setting label="Admin: new lead alert" value={emailStatus} tone={emailTone} />
          <Setting label="Admin: inspection complete alert" value="Not active" tone="warn" />
        </SettingGroup>

        <SettingGroup title="Integrations">
          {envStatus.map((item) => (
            <Setting
              key={item.label}
              label={item.label}
              value={item.value}
              tone={item.tone}
            />
          ))}
        </SettingGroup>

        <SettingGroup title="Release Gate">
          {runtimeStatus.map((item) => (
            <Setting key={item.label} label={item.label} value={item.value} tone={item.tone} />
          ))}
          <Setting label="Public lookup" value="Browser-proven" tone="good" />
          <Setting label="Public booking" value="Needs OTP proof" tone="warn" />
          <Setting label="Dev credentials" value="Must stay disabled" tone="warn" />
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

function Setting({ label, value, tone }: { label: string; value: string; tone?: SettingTone }) {
  const valueClass = tone === 'good'
    ? 'text-green-700'
    : tone === 'warn'
      ? 'text-amber-700'
      : 'text-foreground'

  return (
    <div className="flex items-baseline gap-4">
      <span className="w-48 text-sm text-warm-gray shrink-0">{label}</span>
      <span className={`text-sm font-medium ${valueClass}`}>{value}</span>
    </div>
  )
}
