import Link from "next/link";

function FieldCircle() {
  return (
    <div className="relative w-72 h-72 mx-auto">
      {/* Glow */}
      <div className="absolute inset-0 rounded-full bg-green-500 animate-pulse-glow blur-3xl" />

      {/* Outer circle */}
      <div className="absolute inset-0 rounded-full border-2 border-green-500/30 animate-spin-slow" />

      {/* Inner field */}
      <div className="absolute inset-8 rounded-full border-2 border-green-500/20 bg-green-950/20 flex items-center justify-center">
        {/* Center mark */}
        <div className="absolute w-10 h-10 rounded-full border-2 border-green-500/30" />
        {/* Halfway line */}
        <div className="absolute w-full h-px bg-green-500/20 top-1/2" />

        {/* Ball */}
        <div className="relative z-10 text-6xl animate-float select-none">⚽</div>
      </div>

      {/* Player dots */}
      {[
        { top: "18%", left: "14%", delay: "0s" },
        { top: "18%", left: "70%", delay: "0.4s" },
        { top: "72%", left: "14%", delay: "0.8s" },
        { top: "72%", left: "70%", delay: "1.2s" },
        { top: "44%", left: "4%",  delay: "0.2s" },
        { top: "44%", left: "80%", delay: "0.6s" },
      ].map((pos, i) => (
        <span
          key={i}
          className="absolute w-3 h-3 rounded-full bg-green-400 border-2 border-zinc-900 shadow-lg shadow-green-500/50"
          style={{ top: pos.top, left: pos.left, animationDelay: pos.delay }}
        />
      ))}
    </div>
  );
}

function StepCard({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-3">
      <div className="w-10 h-10 rounded-full bg-green-500 text-zinc-950 font-black flex items-center justify-center text-sm shrink-0">
        {n}
      </div>
      <div>
        <p className="font-semibold text-zinc-100">{title}</p>
        <p className="text-zinc-500 text-sm mt-0.5">{desc}</p>
      </div>
    </div>
  );
}


function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-3xl font-black text-green-400">{value}</p>
      <p className="text-zinc-500 text-sm mt-1">{label}</p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-zinc-800/50 backdrop-blur-md bg-zinc-950/80">
        <span className="font-black text-xl tracking-tight">
          vamo<span className="text-green-400">jogar</span>
        </span>
        <Link
          href="/login"
          className="rounded-lg bg-green-500 hover:bg-green-400 text-zinc-950 font-semibold text-sm px-4 py-2 transition-colors"
        >
          Entrar →
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-6 pt-20 text-center overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-green-500/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto">
          <span className="inline-block text-xs font-semibold tracking-widest text-green-400 uppercase mb-6 border border-green-500/30 bg-green-500/5 px-3 py-1 rounded-full animate-fade-up">
            ⚡ Gerenciador de partidas
          </span>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-[1.05] tracking-tight mb-6 animate-fade-up-d1">
            Chama o time.<br />
            <span className="text-green-400">A gente cuida</span><br />
            do resto.
          </h1>

          <p className="text-zinc-400 text-lg sm:text-xl max-w-xl mx-auto mb-10 leading-relaxed animate-fade-up-d2">
            Organize partidas de futebol, monte times, acompanhe estatísticas e
            nunca mais perca uma pelada por falta de organização.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-up-d3">
            <Link
              href="/login"
              className="rounded-xl bg-green-500 hover:bg-green-400 text-zinc-950 font-bold text-base px-8 py-4 transition-all duration-200 shadow-lg shadow-green-500/20 hover:shadow-green-400/30 hover:-translate-y-0.5"
            >
              Criar minha conta grátis
            </Link>
            <a
              href="#como-funciona"
              className="rounded-xl border border-zinc-700 hover:border-zinc-500 text-zinc-300 font-semibold text-base px-8 py-4 transition-all duration-200 hover:-translate-y-0.5"
            >
              Ver como funciona
            </a>
          </div>
        </div>

        <div className="relative z-10 mt-16 animate-fade-up-d3">
          <FieldCircle />
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-zinc-600 animate-bounce">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-center text-xs font-semibold tracking-widest text-green-400 uppercase mb-3">Simples assim</p>
          <h2 className="text-3xl sm:text-4xl font-black text-center mb-16">Como funciona</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 relative">
            {/* Connector line */}
            <div className="hidden sm:block absolute top-5 left-[calc(16.66%+20px)] right-[calc(16.66%+20px)] h-px bg-gradient-to-r from-green-500/50 via-green-500/20 to-green-500/50" />
            <StepCard n="1" title="Entre com Google" desc="Um clique e você já está dentro. Sem senha, sem complicação." />
            <StepCard n="2" title="Complete seu perfil" desc="Informe seus dados físicos para a gente te colocar no time certo." />
            <StepCard n="3" title="Partiu jogar!" desc="Crie ou entre em uma partida e aproveite. É isso." />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y border-zinc-800 bg-zinc-900/30">
        <div className="max-w-3xl mx-auto px-6 grid grid-cols-3 gap-8">
          <Stat value="10k+" label="Partidas organizadas" />
          <Stat value="50k+" label="Jogadores ativos" />
          <Stat value="200+" label="Cidades" />
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black mb-16">Por que o<br /><span className="text-green-400">VamoJogar?</span></h2>

          <div className="divide-y divide-zinc-800">
            {[
              {
                num: "01",
                title: "Pelada sem bagunça.",
                desc: "Defina local, horário e número de vagas. Quem confirmou, confirmou. Sem aquele grupo de WhatsApp infinito.",
              },
              {
                num: "02",
                title: "Times que fazem sentido.",
                desc: "A gente usa seu perfil pra distribuir os jogadores direito. Chega de um lado ter cinco bons e o outro só sofrer.",
              },
              {
                num: "03",
                title: "Sua história no campo.",
                desc: "Cada gol, cada assistência, cada partida. Tudo guardado. Você nunca mais vai precisar lembrar na raça.",
              },
              {
                num: "04",
                title: "Só futebol por enquanto.",
                desc: "Mas futsal, basquete e vôlei tão na fila. O VamoJogar tá crescendo no mesmo ritmo que você.",
              },
            ].map(({ num, title, desc }) => (
              <div key={num} className="py-8 flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-12 group">
                <span className="text-xs font-bold text-zinc-600 tracking-widest pt-1 shrink-0 group-hover:text-green-500 transition-colors">
                  {num}
                </span>
                <div>
                  <h3 className="text-xl font-black text-zinc-100 mb-2">{title}</h3>
                  <p className="text-zinc-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto relative">
          <div className="absolute inset-0 rounded-3xl bg-green-500/5 blur-xl" />
          <div className="relative rounded-3xl border border-green-500/20 bg-zinc-900/80 p-12 text-center">
            <div className="text-5xl mb-6">⚽</div>
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              Bora jogar?
            </h2>
            <p className="text-zinc-400 mb-8 text-lg">
              Sua próxima pelada começa aqui. Grátis, rápido e sem burocracia.
            </p>
            <Link
              href="/login"
              className="inline-block rounded-xl bg-green-500 hover:bg-green-400 text-zinc-950 font-bold text-base px-10 py-4 transition-all duration-200 shadow-lg shadow-green-500/20 hover:shadow-green-400/30 hover:-translate-y-0.5"
            >
              Criar minha conta grátis
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8 px-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-zinc-600 text-sm">
          <span className="font-black text-base text-zinc-400">
            vamo<span className="text-green-400">jogar</span>
          </span>
          <p>© {new Date().getFullYear()} VamoJogar. Feito com ❤️ pra quem ama jogar.</p>
        </div>
      </footer>
    </div>
  );
}
