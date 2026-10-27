type MarkVariant = "noche" | "dia" | "tinta" | "blanco"

const sources: Record<MarkVariant, string> = {
  noche: "/brand/vela-marca-azul-noche.svg",
  dia: "/brand/vela-marca-azul-dia.svg",
  tinta: "/brand/vela-marca-tinta.svg",
  blanco: "/brand/vela-marca-blanco.svg",
}

export function Mark({ variant = "noche", label }: { variant?: MarkVariant; label?: string }) {
  return <img className="mark" src={sources[variant]} alt={label ?? ""} />
}

export function Lockup() {
  return (
    <div className="lockup">
      <Mark />
      <span className="wordmark">Vela</span>
    </div>
  )
}
