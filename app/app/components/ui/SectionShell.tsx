interface SectionShellProps {
  children: React.ReactNode
  className?: string
  id?: string
}

export default function SectionShell({ children, className = '', id }: SectionShellProps) {
  return (
    <section id={id} className={`px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28 ${className}`}>
      <div className="mx-auto max-w-7xl">
        {children}
      </div>
    </section>
  )
}
