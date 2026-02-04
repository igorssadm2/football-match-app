"use client"

import React from "react"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Goal, ArrowLeft, Upload } from "lucide-react"
import { useState } from "react"

const posicoes = [
  "Goleiro",
  "Zagueiro",
  "Lateral Direito",
  "Lateral Esquerdo",
  "Volante",
  "Meio-campo",
  "Meia Atacante",
  "Ponta Direita",
  "Ponta Esquerda",
  "Centroavante",
]

const generos = [
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
  { value: "outro", label: "Outro" },
  { value: "prefiro-nao-dizer", label: "Prefiro não dizer" },
]

const pesDominantes = [
  { value: "direito", label: "Direito" },
  { value: "esquerdo", label: "Esquerdo" },
  { value: "ambos", label: "Ambidestro" },
]

export default function SignUpPage() {
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/images/football-bg.jpg"
          alt=""
          fill
          className="object-cover opacity-30"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Back Button */}
        <div className="p-3 sm:p-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-sm bg-transparent">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Voltar
            </Button>
          </Link>
        </div>

        <div className="flex flex-1 justify-center px-5 sm:px-6 pb-8">
          <div className="w-full max-w-lg space-y-5 sm:space-y-6">
            {/* Logo */}
            <div className="flex flex-col items-center">
              <div className="mb-3 sm:mb-4 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl bg-primary">
                <Goal className="h-6 w-6 sm:h-8 sm:w-8 text-primary-foreground" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Crie sua conta</h1>
              <p className="mt-1.5 sm:mt-2 text-center text-sm sm:text-base text-muted-foreground">
                Junte-se à comunidade e comece a jogar
              </p>
            </div>

            {/* Google Sign Up - First Option */}
            <Button
              type="button"
              variant="outline"
              className="h-11 sm:h-12 w-full border-border bg-transparent text-foreground hover:bg-secondary text-sm sm:text-base"
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Cadastrar com Google
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs sm:text-sm">
                <span className="bg-background px-4 text-muted-foreground">ou preencha o formulário</span>
              </div>
            </div>

            {/* Form */}
            <form className="space-y-5 sm:space-y-6">
              {/* Dados Pessoais */}
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2">
                  Dados Pessoais
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="nome" className="text-foreground text-sm">Nome completo</Label>
                    <Input
                      id="nome"
                      type="text"
                      placeholder="Seu nome"
                      className="h-10 sm:h-11 border-border bg-card/80 text-foreground placeholder:text-muted-foreground text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="apelido" className="text-foreground text-sm">Apelido</Label>
                    <Input
                      id="apelido"
                      type="text"
                      placeholder="Como te chamam no campo"
                      className="h-10 sm:h-11 border-border bg-card/80 text-foreground placeholder:text-muted-foreground text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-foreground text-sm">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    className="h-10 sm:h-11 border-border bg-card/80 text-foreground placeholder:text-muted-foreground text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="senha" className="text-foreground text-sm">Senha</Label>
                  <Input
                    id="senha"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    className="h-10 sm:h-11 border-border bg-card/80 text-foreground placeholder:text-muted-foreground text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="dataNascimento" className="text-foreground text-sm">Data de Nascimento</Label>
                    <Input
                      id="dataNascimento"
                      type="date"
                      className="h-10 sm:h-11 border-border bg-card/80 text-foreground text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="genero" className="text-foreground text-sm">Gênero</Label>
                    <Select>
                      <SelectTrigger className="h-10 sm:h-11 border-border bg-card/80 text-foreground text-sm">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {generos.map((genero) => (
                          <SelectItem key={genero.value} value={genero.value}>
                            {genero.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Localização */}
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2">
                  Localização
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="cidade" className="text-foreground text-sm">Cidade</Label>
                    <Input
                      id="cidade"
                      type="text"
                      placeholder="Sua cidade"
                      className="h-10 sm:h-11 border-border bg-card/80 text-foreground placeholder:text-muted-foreground text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="bairro" className="text-foreground text-sm">Bairro</Label>
                    <Input
                      id="bairro"
                      type="text"
                      placeholder="Seu bairro"
                      className="h-10 sm:h-11 border-border bg-card/80 text-foreground placeholder:text-muted-foreground text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 sm:w-1/2">
                  <Label htmlFor="cep" className="text-foreground text-sm">CEP</Label>
                  <Input
                    id="cep"
                    type="text"
                    placeholder="00000-000"
                    className="h-10 sm:h-11 border-border bg-card/80 text-foreground placeholder:text-muted-foreground text-sm"
                  />
                </div>
              </div>

              {/* Características Físicas */}
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2">
                  Características Físicas
                </h2>

                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="altura" className="text-foreground text-sm">Altura (cm)</Label>
                    <Input
                      id="altura"
                      type="number"
                      placeholder="175"
                      className="h-10 sm:h-11 border-border bg-card/80 text-foreground placeholder:text-muted-foreground text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="peso" className="text-foreground text-sm">Peso (kg)</Label>
                    <Input
                      id="peso"
                      type="number"
                      placeholder="70"
                      className="h-10 sm:h-11 border-border bg-card/80 text-foreground placeholder:text-muted-foreground text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="tamanhoPe" className="text-foreground text-sm">Tamanho Pé</Label>
                    <Input
                      id="tamanhoPe"
                      type="number"
                      placeholder="42"
                      className="h-10 sm:h-11 border-border bg-card/80 text-foreground placeholder:text-muted-foreground text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Características do Jogador */}
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2">
                  Características do Jogador
                </h2>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="peDominante" className="text-foreground text-sm">Pé Dominante</Label>
                    <Select>
                      <SelectTrigger className="h-10 sm:h-11 border-border bg-card/80 text-foreground text-sm">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {pesDominantes.map((pe) => (
                          <SelectItem key={pe.value} value={pe.value}>
                            {pe.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="posicao" className="text-foreground text-sm">Posição</Label>
                    <Select>
                      <SelectTrigger className="h-10 sm:h-11 border-border bg-card/80 text-foreground text-sm">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {posicoes.map((posicao) => (
                          <SelectItem key={posicao} value={posicao.toLowerCase().replace(/\s+/g, "-")}>
                            {posicao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Foto de Perfil */}
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2">
                  Foto de Perfil
                </h2>
                <div className="flex flex-col items-center gap-3">
                  <div className="relative h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-full border-2 border-dashed border-border bg-card">
                    {fotoPreview ? (
                      <Image src={fotoPreview || "/placeholder.svg"} alt="Foto de perfil" fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <label htmlFor="foto" className="cursor-pointer text-sm text-primary hover:underline">
                    Adicionar foto
                  </label>
                  <input
                    id="foto"
                    type="file"
                    accept="image/*"
                    onChange={handleFotoChange}
                    className="hidden"
                  />
                </div>
              </div>

              <Button type="submit" className="h-11 sm:h-12 w-full bg-primary text-primary-foreground hover:bg-primary/90 text-sm sm:text-base font-semibold">
                Criar conta
              </Button>
            </form>

            {/* Terms */}
            <p className="text-center text-xs text-muted-foreground px-2">
              Ao criar uma conta, você concorda com nossos{" "}
              <Link href="#" className="text-primary hover:underline">
                Termos de Uso
              </Link>{" "}
              e{" "}
              <Link href="#" className="text-primary hover:underline">
                Política de Privacidade
              </Link>
            </p>

            {/* Login Link */}
            <p className="text-center text-sm sm:text-base text-muted-foreground pb-4">
              Já tem uma conta?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Entrar
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
