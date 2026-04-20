interface ProjectAvatarProps {
  logoUrl?: string | null
  clientName: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ProjectAvatar({ logoUrl, clientName, size = 'md', className }: ProjectAvatarProps) {
  const sizeClasses = {
    sm: 'h-6 w-6 text-[10px]',
    md: 'h-8 w-8 text-xs',
    lg: 'h-20 w-20 text-2xl',
  }

  const firstLetter = clientName.charAt(0).toUpperCase()

  if (logoUrl) {
    return (
      <div className={`${sizeClasses[size]} rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden ${className}`}>
        <img src={logoUrl} alt={clientName} className="h-full w-full object-cover" />
      </div>
    )
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0 bg-gray-700 ${className}`}
    >
      {firstLetter}
    </div>
  )
}
