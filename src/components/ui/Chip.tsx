type ChipProps = {
  label: string
  selected: boolean
  onClick: () => void
}

export const Chip = ({ label, selected, onClick }: ChipProps) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      'px-4 py-2 rounded-full text-sm font-medium border transition-all duration-150 cursor-pointer select-none',
      selected
        ? 'bg-orange-500 border-orange-500 text-white shadow-sm shadow-orange-500/30'
        : 'bg-transparent border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200 hover:bg-gray-800/50',
    ].join(' ')}
  >
    {label}
  </button>
)
