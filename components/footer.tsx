import { Goal } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/50 py-6 sm:py-8">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-3 sm:gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-primary">
              <Goal className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary-foreground" />
            </div>
            <span className="text-sm sm:text-base font-semibold text-foreground">GolApp</span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {new Date().getFullYear()} GolApp. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
