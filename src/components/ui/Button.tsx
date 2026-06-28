type ButtonProps = {
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  fullWidth?: boolean
}

export const Button = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  fullWidth = false,
}: ButtonProps) => {
  const base = 'rounded-lg font-semibold transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center'

  const sizes = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base',
  }

  const variants = {
    primary: 'bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-400/25',
    secondary: 'bg-gray-800 hover:bg-gray-700 active:bg-gray-900 text-gray-200 border border-gray-700 hover:border-gray-600',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[base, sizes[size], variants[variant], fullWidth ? 'w-full' : ''].join(' ')}
    >
      {children}
    </button>
  )
}
