import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, ShieldCheck, Clock, CheckCircle2, Users, Lock, XCircle } from 'lucide-react';

const STEPS = [
  { icon: <Clock size={18} />, title: 'Enviado', text: 'Seu relato aparece no mapa na hora como "aguardando aprovação" — só o tipo e o local. Texto e fotos ficam ocultos.' },
  { icon: <ShieldCheck size={18} />, title: 'Em análise', text: 'A moderação confere se é um problema público real, no local certo e sem conteúdo impróprio.' },
  { icon: <CheckCircle2 size={18} />, title: 'Publicado ou recusado', text: 'Aprovado, o relato fica completo para todos. Recusado, você vê o motivo em "Meus relatos".' },
  { icon: <Users size={18} />, title: 'Mantido pela comunidade', text: 'Quem passa pelo local confirma ("Eu também vi", "Ainda está aí") ou avisa que foi resolvido.' },
];

const REJECT_REASONS = [
  'Informação insuficiente para entender o problema',
  'Relato duplicado de uma ocorrência já no mapa',
  'Fora da área atendida',
  'Conteúdo ofensivo, pessoal ou que identifica pessoas',
  'Não é um problema público (ex.: briga entre vizinhos)',
];

export default function AboutPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-[100dvh] bg-[#121212] text-white">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
            className="w-11 h-11 -ml-2 rounded-full flex items-center justify-center text-gray-300 hover:bg-white/5"
            aria-label="Voltar"
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-xl font-semibold">Como funciona</h1>
        </div>

        <a
          href="tel:190"
          className="flex items-center gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4"
        >
          <Phone className="text-red-400 shrink-0" size={22} />
          <span>
            <span className="block font-semibold text-red-200">Emergência? Ligue 190</span>
            <span className="block text-sm text-red-100/80">Este mapa não substitui a polícia nem o SAMU (192). Os relatos não são vistos em tempo real.</span>
          </span>
        </a>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">O que acontece com seu relato</h2>
          <ol className="space-y-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3 rounded-xl border border-white/10 bg-[#1a1a1a] p-3">
                <span className="w-9 h-9 shrink-0 rounded-full bg-white/10 flex items-center justify-center text-blue-300" aria-hidden>{s.icon}</span>
                <span>
                  <span className="block text-sm font-semibold">{i + 1}. {s.title}</span>
                  <span className="block text-sm text-gray-300">{s.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold flex items-center gap-2"><XCircle size={18} className="text-red-400" /> Por que um relato é recusado</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-300">
            {REJECT_REASONS.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Lock size={18} className="text-emerald-400" /> Privacidade</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-300">
            <li>Você não precisa de conta para relatar. Não pedimos nome, telefone nem e-mail.</li>
            <li>Seu histórico em "Meus relatos" fica só neste aparelho.</li>
            <li>A localização é usada apenas para mostrar o mapa e posicionar o relato; não guardamos seu trajeto.</li>
            <li>Não publique rostos, placas ou dados de outras pessoas nas fotos.</li>
          </ul>
          <button onClick={() => navigate('/privacidade')} className="text-sm text-blue-300 underline underline-offset-2">
            Ler a política de privacidade completa
          </button>
        </section>

        <button
          onClick={() => navigate('/')}
          className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold"
        >
          Voltar ao mapa
        </button>
      </div>
    </div>
  );
}
