import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const SECTIONS: { title: string; items: string[] }[] = [
  {
    title: 'Quais dados tratamos',
    items: [
      'Relatos: tipo, local no mapa, descrição e fotos que você enviar. Telefones, CPF, e-mails e placas digitados na descrição são removidos automaticamente.',
      'Fotos: são recomprimidas no servidor e os metadados (incluindo a localização GPS da câmera) são apagados.',
      'Votos e confirmações ("Eu também vi", "Ainda está aí"): guardamos um código derivado do seu endereço IP e navegador, cifrado com chave secreta, só para evitar votos repetidos. Não guardamos o IP em si.',
      'Notificações: se você ativar, guardamos o endereço técnico de notificação do seu navegador e, se escolher, o ponto e raio da sua área de alertas.',
      'Contas de moderação: e-mail, nome e senha (guardada apenas como hash).',
    ],
  },
  {
    title: 'Para que usamos',
    items: [
      'Mostrar ocorrências de segurança e infraestrutura no mapa e avisar quem mora ou circula perto (interesse legítimo e interesse público — LGPD art. 7º, IX).',
      'Moderar conteúdo, evitar abuso, spam e votos duplicados.',
      'Gerar estatísticas agregadas e anônimas por área e horário.',
    ],
  },
  {
    title: 'Por quanto tempo',
    items: [
      'Relatos recusados são apagados após 90 dias.',
      'Relatos publicados sem confirmação saem do mapa automaticamente (45 dias para crimes, 120 para infraestrutura) e ficam só para estatística.',
      'Inscrições de notificação sem uso há 12 meses são apagadas.',
      '"Meus relatos" e rascunhos ficam apenas no seu aparelho; apague os dados do site no navegador para removê-los.',
    ],
  },
  {
    title: 'Com quem compartilhamos',
    items: [
      'Não vendemos nem compartilhamos dados pessoais.',
      'O mapa usa imagens do OpenStreetMap e da Esri, e a busca de endereços usa o Nominatim (OpenStreetMap): esses serviços recebem o trecho do mapa ou o texto buscado.',
      'Notificações passam pelo serviço do fabricante do seu navegador (Google, Mozilla, Apple ou Microsoft).',
    ],
  },
  {
    title: 'Seus direitos (LGPD art. 18)',
    items: [
      'Você pode pedir acesso, correção ou exclusão de dados e de relatos que enviou, e retirar o consentimento das notificações a qualquer momento (nas configurações do navegador).',
      'Para pedidos, fale com a equipe responsável pelo serviço informando o link do relato (botão "Compartilhar").',
    ],
  },
];

export default function PrivacyPage() {
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
          <h1 className="text-xl font-semibold">Privacidade</h1>
        </div>
        <p className="text-sm text-gray-300">
          Este mapa é colaborativo e anônimo: você não precisa de conta para ver ou relatar. Abaixo explicamos, em linguagem simples, o que acontece com os dados.
        </p>
        {SECTIONS.map((s) => (
          <section key={s.title} className="space-y-2">
            <h2 className="text-lg font-semibold">{s.title}</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-300">
              {s.items.map((i) => <li key={i}>{i}</li>)}
            </ul>
          </section>
        ))}
        <p className="text-xs text-gray-400">Atualizado em novembro de 2026.</p>
      </div>
    </div>
  );
}
