type ChevronProps = { open: boolean }

export function Chevron({ open }: ChevronProps) {
  return (
    <svg className="icon" viewBox="0 0 20 20" aria-hidden="true">
      <path
        d={open ? "M5 8 L10 13 L15 8" : "M8 5 L13 10 L8 15"}
        fill="none"
        stroke="currentColor"
        strokeWidth="var(--icon-stroke)"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
