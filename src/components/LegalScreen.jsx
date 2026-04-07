import { useState } from 'react'

const TERMOS = `TERMOS DE USO — QUITA
Última atualização: abril de 2026

1. ACEITAÇÃO DOS TERMOS

Ao criar uma conta ou utilizar o aplicativo Quita ("App"), você concorda integralmente com estes Termos de Uso. Se não concordar, não utilize o App.

2. DESCRIÇÃO DO SERVIÇO

O Quita é um aplicativo de educação financeira gamificada que oferece:
• Trilha de lições sobre finanças pessoais com quizzes interativos
• Registro e categorização de gastos, receitas e dívidas
• Diagnóstico financeiro automatizado com inteligência artificial
• Chat com assistente virtual (Quita IA) para dúvidas financeiras
• Sistema de gamificação com XP, streaks, moedas virtuais e ranking
• Loja de personalização do mascote virtual

3. NATUREZA EDUCACIONAL — ISENÇÃO DE RESPONSABILIDADE FINANCEIRA

O Quita é uma ferramenta de EDUCAÇÃO FINANCEIRA. O conteúdo fornecido, incluindo as respostas da Quita IA, tem caráter exclusivamente informativo e educacional.

O Quita NÃO é e NÃO substitui:
• Consultoria financeira profissional (CVM/CFA)
• Planejamento financeiro personalizado certificado
• Recomendação de investimentos
• Assessoria tributária, contábil ou jurídica

As informações e sugestões geradas pela inteligência artificial são baseadas nos dados fornecidos pelo usuário e em modelos estatísticos, podendo conter imprecisões. Decisões financeiras devem ser tomadas com o auxílio de profissionais qualificados e habilitados.

O Quita não se responsabiliza por perdas financeiras, decisões de investimento ou qualquer consequência decorrente do uso das informações fornecidas pelo App.

4. CADASTRO E CONTA

4.1. Para utilizar o App, você deve criar uma conta fornecendo email válido e senha.
4.2. Você é responsável pela veracidade das informações fornecidas.
4.3. Você é responsável por manter a segurança de suas credenciais de acesso.
4.4. Cada pessoa pode manter apenas uma conta ativa.
4.5. Menores de 18 anos devem utilizar o App sob supervisão de responsável legal.

5. DADOS FINANCEIROS

5.1. Os dados financeiros inseridos (gastos, receitas, dívidas, patrimônio) são fornecidos voluntariamente pelo usuário.
5.2. O Quita não acessa contas bancárias, cartões de crédito ou qualquer sistema financeiro externo.
5.3. A precisão dos diagnósticos e insights depende diretamente da qualidade dos dados informados pelo usuário.
5.4. O Quita não verifica a veracidade dos dados financeiros informados.

6. MOEDAS VIRTUAIS E LOJA

6.1. As moedas virtuais do Quita ("Moedas") são obtidas exclusivamente através de atividades dentro do App.
6.2. Moedas não possuem valor monetário real e não podem ser trocadas, vendidas ou convertidas em dinheiro.
6.3. Itens adquiridos na loja (skins, fundos) são de uso pessoal e intransferível.
6.4. O Quita reserva-se o direito de ajustar preços e disponibilidade de itens da loja.

7. INTELIGÊNCIA ARTIFICIAL

7.1. A Quita IA utiliza modelos de linguagem de terceiros (Anthropic Claude) para gerar respostas.
7.2. As respostas são geradas automaticamente e podem conter erros ou imprecisões.
7.3. O contexto financeiro enviado à IA é processado exclusivamente para gerar a resposta e não é armazenado pelo provedor de IA.
7.4. Existe um limite de consultas por hora para garantir a qualidade do serviço.

8. CONDUTA DO USUÁRIO

É proibido:
• Utilizar o App para fins ilegais ou fraudulentos
• Tentar acessar dados de outros usuários
• Realizar engenharia reversa do App
• Utilizar bots ou scripts automatizados
• Compartilhar credenciais de acesso com terceiros
• Manipular o sistema de gamificação de forma fraudulenta

9. PROPRIEDADE INTELECTUAL

9.1. Todo o conteúdo do App (textos, lições, imagens, personagens, código, design) é de propriedade exclusiva do Quita.
9.2. O mascote "Quita" e suas variações são propriedade intelectual protegida.
9.3. O conteúdo educacional não pode ser reproduzido, distribuído ou comercializado sem autorização.

10. DISPONIBILIDADE DO SERVIÇO

10.1. O Quita é fornecido "como está" (as is), sem garantias de disponibilidade ininterrupta.
10.2. Podemos realizar manutenções, atualizações ou descontinuar funcionalidades a qualquer momento.
10.3. Não nos responsabilizamos por perda de dados decorrente de falhas técnicas, desde que tomemos medidas razoáveis de proteção.

11. PLANOS E PAGAMENTOS

11.1. O Quita oferece um plano gratuito com funcionalidades limitadas.
11.2. Funcionalidades premium podem ser oferecidas mediante assinatura paga (Quita Pro).
11.3. Em caso de assinatura, as condições de pagamento, renovação e cancelamento serão informadas no momento da contratação.

12. RESCISÃO

12.1. Você pode encerrar sua conta a qualquer momento.
12.2. O Quita pode suspender ou encerrar contas que violem estes Termos.
12.3. Dados pessoais serão tratados conforme a Política de Privacidade após o encerramento.

13. LIMITAÇÃO DE RESPONSABILIDADE

Na máxima extensão permitida pela legislação brasileira, o Quita não será responsável por:
• Decisões financeiras tomadas com base no conteúdo do App
• Perdas ou danos indiretos, incidentais ou consequenciais
• Interrupções no serviço fora do controle razoável do Quita
• Ações de terceiros que afetem o funcionamento do App

14. ALTERAÇÕES

Podemos atualizar estes Termos periodicamente. Alterações significativas serão comunicadas pelo App. O uso continuado após as alterações constitui aceitação dos novos termos.

15. LEI APLICÁVEL E FORO

Estes Termos são regidos pela legislação brasileira. Fica eleito o foro da comarca de Porto Alegre/RS para dirimir eventuais controvérsias.

16. CONTATO

Para dúvidas sobre estes Termos: contato@appquita.com.br`

const PRIVACIDADE = `POLÍTICA DE PRIVACIDADE — QUITA
Última atualização: abril de 2026

Esta Política de Privacidade descreve como o Quita ("nós", "nosso") coleta, utiliza, armazena e protege os dados pessoais dos usuários ("você"), em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018) e demais legislações aplicáveis.

1. CONTROLADOR DE DADOS

Controlador: Quita Tecnologia
Contato do Encarregado de Proteção de Dados (DPO): privacidade@appquita.com.br

2. DADOS PESSOAIS QUE COLETAMOS

2.1. Dados fornecidos diretamente por você:

• Dados de cadastro: nome, endereço de email, senha (armazenada de forma criptografada)
• Dados de perfil: faixa de renda mensal, principal dificuldade financeira
• Dados financeiros: gastos registrados (descrição, valor, categoria, data), receitas (fonte, valor), dívidas (credor, valor total, valor pago, taxa de juros, tipo), metas financeiras (nome, valor alvo, valor poupado), patrimônio (reserva de emergência, investimentos por classe de ativo)
• Dados de interação com a IA: mensagens enviadas ao chat da Quita IA

2.2. Dados coletados automaticamente:

• Dados de uso do App: telas visitadas, lições iniciadas e completadas, respostas em quizzes, tempo de sessão, ações realizadas (registro de gastos, uso da IA, compras na loja)
• Dados de gamificação: XP acumulado, streak, nível, liga, moedas, itens comprados, skin e fundo equipados
• Dados técnicos: tipo de dispositivo (mobile/desktop), se o App foi instalado como PWA, navegador utilizado
• Dados de analytics: eventos de navegação e interação coletados via PostHog (serviço de analytics)

2.3. Dados que NÃO coletamos:

• Dados bancários (número de conta, agência, cartão de crédito)
• CPF, RG ou documentos de identificação
• Localização geográfica precisa (GPS)
• Dados de saúde
• Dados biométricos
• Contatos do telefone, fotos, arquivos (exceto faturas que você voluntariamente importa)

3. BASES LEGAIS PARA O TRATAMENTO (Art. 7º, LGPD)

Tratamos seus dados com base nas seguintes hipóteses legais:

• Consentimento (Art. 7º, I): ao criar sua conta e aceitar estes termos, você consente com o tratamento descrito nesta política. O consentimento pode ser revogado a qualquer momento.
• Execução de contrato (Art. 7º, V): o tratamento é necessário para fornecer o serviço contratado — trilha de lições, diagnóstico, chat com IA, registro financeiro.
• Legítimo interesse (Art. 7º, IX): para melhorar o App, corrigir erros, prevenir fraudes e garantir segurança, sempre respeitando seus direitos e expectativas.

4. COMO UTILIZAMOS SEUS DADOS

4.1. Prestação do serviço:
• Autenticação e manutenção da sua conta
• Funcionamento da trilha de lições, gamificação e ranking
• Geração de diagnóstico financeiro personalizado
• Funcionamento do chat com Quita IA (seus dados financeiros são enviados como contexto para a IA gerar respostas personalizadas)
• Geração do plano de ação personalizado
• Funcionamento da loja de personalização

4.2. Melhoria do serviço:
• Análise agregada de comportamento de uso (analytics) para identificar problemas, melhorar funcionalidades e priorizar desenvolvimento
• Análise de retenção e engajamento para melhorar a experiência
• Identificação e correção de erros técnicos

4.3. Comunicação:
• Envio de emails transacionais (confirmação de conta, recuperação de senha)
• Eventuais comunicações sobre atualizações do serviço (com opção de opt-out)

4.4. O que NÃO fazemos com seus dados:
• NÃO vendemos seus dados pessoais a terceiros
• NÃO utilizamos seus dados para publicidade direcionada
• NÃO compartilhamos dados financeiros individuais com outros usuários (o ranking mostra apenas nome, XP, streak e liga)
• NÃO utilizamos seus dados para fins não descritos nesta política

5. COMPARTILHAMENTO DE DADOS COM TERCEIROS

Compartilhamos dados apenas com os seguintes prestadores de serviço, estritamente necessários para o funcionamento do App:

5.1. Supabase (supabase.com)
• Função: banco de dados e autenticação
• Dados: todos os dados da conta (criptografados em trânsito e em repouso)
• Localização: servidores na América do Sul (São Paulo)
• Base legal: execução de contrato

5.2. Anthropic (anthropic.com)
• Função: processamento de linguagem natural (Quita IA)
• Dados: mensagens do chat e contexto financeiro (enviados apenas quando você usa o chat, diagnóstico ou plano de ação)
• Tratamento: dados processados em tempo real para gerar respostas; a Anthropic não retém dados de API para treinamento
• Localização: Estados Unidos
• Base legal: consentimento e execução de contrato

5.3. PostHog (posthog.com)
• Função: analytics de produto
• Dados: eventos de uso (telas visitadas, ações realizadas), tipo de dispositivo, duração de sessão. NÃO inclui dados financeiros pessoais
• Localização: Estados Unidos
• Base legal: legítimo interesse (melhoria do serviço)

5.4. Vercel (vercel.com)
• Função: hospedagem do aplicativo
• Dados: requisições HTTP (IP, user agent) — logs padrão de servidor
• Localização: CDN global
• Base legal: execução de contrato

5.5. NÃO compartilhamos dados com:
• Anunciantes ou redes de publicidade
• Corretoras, bancos ou instituições financeiras
• Data brokers ou empresas de marketing
• Redes sociais

6. TRANSFERÊNCIA INTERNACIONAL DE DADOS

Alguns de nossos prestadores de serviço (Anthropic, PostHog, Vercel) estão localizados nos Estados Unidos. A transferência internacional de dados é realizada com base no Art. 33 da LGPD, mediante:
• Cláusulas contratuais que garantem nível adequado de proteção
• Compromisso dos prestadores com padrões equivalentes à LGPD
• Uso de criptografia em trânsito (TLS/HTTPS) em todas as comunicações

7. RETENÇÃO DE DADOS

7.1. Dados da conta ativa: mantidos enquanto a conta existir
7.2. Dados de analytics: retidos por até 12 meses, depois anonimizados
7.3. Logs de servidor: retidos por até 30 dias
7.4. Após exclusão da conta: dados pessoais são removidos em até 30 dias. Dados anonimizados e agregados podem ser mantidos para fins estatísticos

8. SEGURANÇA DOS DADOS

Adotamos medidas técnicas e organizacionais para proteger seus dados:

• Criptografia em trânsito: todas as comunicações usam HTTPS/TLS
• Criptografia em repouso: banco de dados criptografado
• Autenticação segura: senhas armazenadas com hash bcrypt (nunca em texto puro)
• Controle de acesso: apenas pessoal autorizado acessa a infraestrutura
• Rate limiting: proteção contra uso abusivo da API
• Backup: dados replicados para recuperação em caso de falha
• Monitoramento: alertas automáticos de segurança

Nenhum sistema é 100% seguro. Em caso de incidente de segurança que represente risco aos seus direitos, notificaremos você e a Autoridade Nacional de Proteção de Dados (ANPD) conforme Art. 48 da LGPD.

9. SEUS DIREITOS (Art. 18, LGPD)

Você tem os seguintes direitos, exercíveis a qualquer momento:

9.1. Confirmação e acesso: saber se tratamos seus dados e obter cópia deles
9.2. Correção: corrigir dados incompletos, inexatos ou desatualizados
9.3. Anonimização, bloqueio ou eliminação: de dados desnecessários, excessivos ou tratados em desconformidade
9.4. Portabilidade: receber seus dados em formato estruturado para transferência a outro serviço
9.5. Eliminação: solicitar a exclusão dos dados tratados com base no consentimento
9.6. Informação sobre compartilhamento: saber com quem seus dados são compartilhados
9.7. Revogação do consentimento: retirar seu consentimento a qualquer momento, sem afetar a licitude do tratamento anterior
9.8. Oposição: opor-se ao tratamento baseado em legítimo interesse, se aplicável

Para exercer qualquer desses direitos, entre em contato: privacidade@appquita.com.br

Prazo de resposta: até 15 dias úteis, conforme Art. 18, §5º da LGPD.

10. COOKIES E TECNOLOGIAS DE RASTREAMENTO

O App não utiliza cookies tradicionais. O PostHog utiliza tecnologias de rastreamento baseadas em JavaScript para coletar eventos de uso, sem armazenar cookies no dispositivo.

Você pode bloquear o carregamento de scripts de analytics utilizando bloqueadores de anúncios, embora isso não afete o funcionamento do App.

11. MENORES DE IDADE

O Quita não é direcionado a menores de 13 anos. Menores entre 13 e 18 anos devem utilizar o App com consentimento de responsável legal. Se tomarmos conhecimento de que coletamos dados de menores de 13 anos sem consentimento parental, excluiremos tais dados.

12. ALTERAÇÕES A ESTA POLÍTICA

Podemos atualizar esta política periodicamente. Em caso de alterações significativas:
• Publicaremos aviso no App
• A data de "última atualização" será modificada
• Para mudanças que ampliem o uso de seus dados, solicitaremos novo consentimento

13. AUTORIDADE NACIONAL DE PROTEÇÃO DE DADOS (ANPD)

Se considerar que o tratamento de seus dados viola a LGPD, você tem direito de peticionar à ANPD:
• Site: www.gov.br/anpd
• Email: encarregado@anpd.gov.br

14. CONTATO

Para questões sobre esta Política de Privacidade:
• Email geral: contato@appquita.com.br
• Email do DPO: privacidade@appquita.com.br`

export default function LegalScreen({ type, onBack }) {
  const content = type === 'termos' ? TERMOS : PRIVACIDADE
  const title = type === 'termos' ? 'Termos de Uso' : 'Política de Privacidade'

  return (
    <div style={{ background: '#F0EDF8', minHeight: '100vh', fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ background: 'linear-gradient(160deg,#1E0A3C 0%,#3B1578 35%,#6D28D9 100%)', padding: 'calc(var(--sat, 0px) + 16px) 20px 20px', borderRadius: '0 0 28px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 12, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{title}</div>
        </div>
      </div>
      <div style={{ padding: '20px 20px 60px' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <pre style={{ fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", fontSize: 13, color: '#333', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordWrap: 'break-word', margin: 0 }}>
            {content}
          </pre>
        </div>
      </div>
    </div>
  )
}
