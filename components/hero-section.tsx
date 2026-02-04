"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MapPin, Trophy, Users, ArrowRight } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 pt-20 pb-8 sm:px-6 sm:pt-16">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl text-center">
        {/* Badge */}
        <div className="mb-4 sm:mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 sm:px-4 sm:py-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          <span className="text-xs sm:text-sm text-muted-foreground">Nova forma de jogar</span>
        </div>

        {/* Main Headline */}
        <h1 className="mb-4 sm:mb-6 text-balance text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
          Jogue mais,{" "}
          <span className="text-primary">organize menos.</span>
        </h1>

        {/* Subheadline */}
        <p className="mx-auto mb-6 sm:mb-10 max-w-2xl text-pretty text-base sm:text-lg leading-relaxed text-muted-foreground md:text-xl">
          Encontre partidas próximas a você, registre seus gols e suba de nível com a comunidade.
        </p>

        {/* CTA Buttons */}
        <div className="flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row sm:gap-4">
          <Link href="/signup" className="w-full sm:w-auto">
            <Button size="lg" className="group h-11 sm:h-12 w-full px-6 sm:px-8 text-sm sm:text-base bg-primary text-primary-foreground hover:bg-primary/90">
              Começar agora
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          <Link href="/login" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="h-11 sm:h-12 w-full px-6 sm:px-8 text-sm sm:text-base border-border text-foreground hover:bg-secondary bg-transparent">
              Já tenho conta
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-10 sm:mt-16 grid w-full grid-cols-3 gap-3 sm:gap-6 lg:gap-8">
          <div className="flex flex-col items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border border-border bg-card/50 p-3 sm:p-6 backdrop-blur-sm">
            <div className="flex h-8 w-8 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-primary/20">
              <MapPin className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
            </div>
            <span className="text-lg sm:text-2xl font-bold text-foreground">1.5k+</span>
            <span className="text-xs sm:text-sm text-muted-foreground text-center">Partidas</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border border-border bg-card/50 p-3 sm:p-6 backdrop-blur-sm">
            <div className="flex h-8 w-8 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-accent/20">
              <Trophy className="h-4 w-4 sm:h-6 sm:w-6 text-accent" />
            </div>
            <span className="text-lg sm:text-2xl font-bold text-foreground">25k+</span>
            <span className="text-xs sm:text-sm text-muted-foreground text-center">Gols</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border border-border bg-card/50 p-3 sm:p-6 backdrop-blur-sm">
            <div className="flex h-8 w-8 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-primary/20">
              <Users className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
            </div>
            <span className="text-lg sm:text-2xl font-bold text-foreground">8k+</span>
            <span className="text-xs sm:text-sm text-muted-foreground text-center">Jogadores</span>
          </div>
        </div>
      </div>
    </section>
  )
}
