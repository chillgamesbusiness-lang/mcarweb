import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Get Your Valuation',
  description: 'Enter your registration to start a free, no-obligation MCar vehicle valuation.',
  alternates: { canonical: '/offer' },
}

export default function OfferLayout({ children }: { children: React.ReactNode }) {
  return children
}