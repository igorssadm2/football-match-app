import { Calendar, Target, TrendingUp, MapPinned } from "lucide-react"

const features = [
  {
    icon: MapPinned,
    title: "Encontre partidas",
    description: "Descubra jogos acontecendo perto de você em tempo real.",
  },
  {
    icon: Calendar,
    title: "Organize facilmente",
    description: "Crie e gerencie partidas em poucos cliques.",
  },
  {
    icon: Target,
    title: "Registre seus gols",
    description: "Acompanhe suas estatísticas e evolução como jogador.",
  },
  {
    icon: TrendingUp,
    title: "Suba de nível",
    description: "Ganhe pontos, conquiste badges e destaque-se na comunidade.",
  },
]

export function FeaturesSection() {
  return (
    <section className="border-t border-border bg-card/30 py-12 sm:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="mb-8 sm:mb-12 text-center">
          <h2 className="mb-3 sm:mb-4 text-2xl sm:text-3xl font-bold text-foreground md:text-4xl">
            Como funciona
          </h2>
          <p className="mx-auto max-w-2xl text-sm sm:text-base text-muted-foreground">
            Tudo que você precisa para jogar mais e se divertir com a comunidade.
          </p>
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group rounded-lg sm:rounded-xl border border-border bg-card p-4 sm:p-6 transition-all hover:border-primary/50 hover:bg-card/80"
            >
              <div className="mb-3 sm:mb-4 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary/20 transition-colors group-hover:bg-primary/30">
                <feature.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <h3 className="mb-1.5 sm:mb-2 text-sm sm:text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
