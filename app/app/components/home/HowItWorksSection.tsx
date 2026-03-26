import { Fragment } from 'react'
import SectionShell from '@/app/components/ui/SectionShell'

const steps = [
  {
    number: 1,
    title: 'Enter Your Registration',
    description: 'We verify your vehicle details instantly using official DVLA data.',
  },
  {
    number: 2,
    title: 'Confirm Your Details',
    description: 'Answer a few quick questions about mileage and condition.',
  },
  {
    number: 3,
    title: 'Get Your Valuation',
    description: 'Receive a clear valuation and book your appointment.',
  },
]

export default function HowItWorksSection() {
  return (
    <SectionShell className="bg-surface-warm">
      <div className="text-center mb-14">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-charcoal">
          How it works
        </h2>
        <p className="mt-3 text-warm-gray text-lg">
          Three simple steps to your valuation
        </p>
      </div>

      <div className="flex flex-col md:flex-row items-start justify-center gap-8 md:gap-0 max-w-4xl mx-auto">
        {steps.map((step, i) => (
          <Fragment key={step.number}>
            <div className="flex-1 text-center px-4">
              <div className="w-16 h-16 rounded-full bg-gold-light text-gold-dark font-bold text-xl flex items-center justify-center mx-auto mb-5 ring-4 ring-gold-50">
                {step.number}
              </div>
              <h3 className="text-lg font-semibold text-charcoal mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-warm-gray leading-relaxed max-w-[240px] mx-auto">
                {step.description}
              </p>
            </div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div className="hidden md:flex items-center self-start mt-8">
                <div className="w-16 lg:w-24 h-px bg-warm-border relative">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-gold/40" />
                </div>
              </div>
            )}
          </Fragment>
        ))}
      </div>
    </SectionShell>
  )
}
