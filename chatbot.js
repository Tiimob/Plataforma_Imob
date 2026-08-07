/* Assistente Imob — funcionamento local, sem banco de dados externo. */
(function () {
  'use strict';

  const VERSAO_ASSISTENTE = '4.1.0';
  const CHAVE_HISTORICO = 'assistenteImob.historico.v4';
  const CHAVE_LOGS = 'assistenteImob.logs.v4';
  const CHAVE_CONTEXTO = 'assistenteImob.contexto.v4';
  const LIMITE_HISTORICO = 24;
  const LIMITE_LOGS = 300;

  const estado = {
    base: [],
    iniciado: false,
    ultimaPergunta: '',
    processando: false,
    contexto: {
      categoria: '',
      itemId: '',
      titulo: '',
    },
  };

  const stopwords = new Set([
    'a', 'ao', 'aos', 'as', 'com', 'como', 'da', 'das', 'de', 'do', 'dos',
    'e', 'em', 'eu', 'me', 'meu', 'minha', 'na', 'nas', 'no', 'nos', 'o',
    'os', 'ou', 'para', 'por', 'pra', 'que', 'se', 'sem', 'um', 'uma',
    'esta', 'estou', 'isso', 'esse', 'essa', 'tem', 'tenho', 'meus', 'minhas'
  ]);

  const sinonimos = {
    hipnobox: 'hypnobox',
    skynova: 'skymail',
    skymail: 'webmail',
    sigavi360: 'sigav',
    followup: 'follow-up',
    facs: 'fac',
    hypnobx: 'hypnobox',
    hypnoboxe: 'hypnobox',
    hypnobox360: 'hypnobox',
    sigavi: 'sigav',
    'sigav360': 'sigav',
    correio: 'email',
    e_mail: 'email',
    redefinicao: 'redefinir',
    reset: 'redefinir',
    resetar: 'redefinir',
    travou: 'travado',
    trava: 'travado',
    bug: 'erro',
    bugado: 'erro',
    bugada: 'erro',
    smartphone: 'celular',
    telefone: 'celular',
    autenticador: 'authenticator',
    autenticacao: 'authenticator',
    '2fa': 'authenticator',
    mfa: 'authenticator',
  };

  const porId = (id) => document.getElementById(id);

  function lerJSON(chave, fallback) {
    try {
      const valor = window.localStorage?.getItem(chave) || window.sessionStorage?.getItem(chave);
      return valor ? JSON.parse(valor) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function gravarLocal(chave, valor) {
    try {
      window.localStorage?.setItem(chave, JSON.stringify(valor));
    } catch (_) {
      // O assistente continua funcionando mesmo quando o armazenamento está bloqueado.
    }
  }

  function gravarSessao(chave, valor) {
    try {
      window.sessionStorage?.setItem(chave, JSON.stringify(valor));
    } catch (_) {
      // O assistente continua funcionando mesmo quando o armazenamento está bloqueado.
    }
  }

  function normalizarTexto(texto) {
    return String(texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/e[-\s]?mail/g, 'email')
      .replace(/sky\s*mail/g, 'skymail')
      .replace(/sigavi\s*360/g, 'sigav')
      .replace(/follow[ -]?up/g, 'follow-up')
      .replace(/google\s+authenticator/g, 'authenticator')
      .replace(/autenticador\s+(do\s+)?google/g, 'authenticator')
      .replace(/autenticacao\s+(de\s+)?(dois|duplo)\s+fatores/g, 'authenticator')
      .replace(/verificacao\s+em\s+duas\s+etapas/g, 'authenticator')
      .replace(/portal\s+do\s+corretor/g, 'portal corretor')
      .replace(/[^a-z0-9\s_-]/g, ' ')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tokenizar(texto) {
    return normalizarTexto(texto)
      .split(' ')
      .map((token) => sinonimos[token] || token)
      .filter((token) => token.length > 1 && !stopwords.has(token));
  }

  function distanciaEdicaoLimitada(a, b, limite = 1) {
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > limite) return limite + 1;
    if (a.length < 5 || b.length < 5) return limite + 1;

    const anterior = Array.from({ length: b.length + 1 }, (_, i) => i);
    const atual = new Array(b.length + 1);

    for (let i = 1; i <= a.length; i += 1) {
      atual[0] = i;
      let menorLinha = atual[0];

      for (let j = 1; j <= b.length; j += 1) {
        const custo = a[i - 1] === b[j - 1] ? 0 : 1;
        atual[j] = Math.min(
          anterior[j] + 1,
          atual[j - 1] + 1,
          anterior[j - 1] + custo
        );
        menorLinha = Math.min(menorLinha, atual[j]);
      }

      if (menorLinha > limite) return limite + 1;
      for (let j = 0; j <= b.length; j += 1) anterior[j] = atual[j];
    }

    return anterior[b.length];
  }

  function tokensSemelhantes(a, b) {
    if (a === b) return true;
    if (a.length >= 5 && b.length >= 5 && (a.startsWith(b) || b.startsWith(a))) return true;
    return distanciaEdicaoLimitada(a, b, 1) <= 1;
  }

  function intersecaoAproximada(tokensPergunta, tokensBase) {
    let correspondencias = 0;
    const utilizados = new Set();

    tokensPergunta.forEach((tokenPergunta) => {
      const indice = tokensBase.findIndex((tokenBase, i) => !utilizados.has(i) && tokensSemelhantes(tokenPergunta, tokenBase));
      if (indice >= 0) {
        correspondencias += 1;
        utilizados.add(indice);
      }
    });

    return correspondencias;
  }

  function ehDuvidaGestaoClientes(perguntaNormalizada, tokens = []) {
    const texto = ` ${perguntaNormalizada || tokens.join(' ')} `;
    const termosFortes = [
      ' cliente ', ' clientes ', ' carteira ', ' lead ', ' leads ', ' follow up ',
      ' follow-up ', ' oferta ativa ', ' fac ', ' facs ', ' timeline ', ' funil ',
      ' visita ', ' visitas ', ' proposta ', ' propostas ', ' rodizio ', ' mailing '
    ];
    const mencionaGestao = termosFortes.some((termo) => texto.includes(termo));
    const cadastroOuAtualizacao = /(cadastrar|cadastro|criar|editar|atualizar|alterar)\s+(um\s+|uma\s+)?(cliente|lead|fac)/.test(texto);
    const atendimentoCliente = texto.includes(' atendimento ') && (texto.includes(' cliente ') || texto.includes(' lead '));
    return mencionaGestao || cadastroOuAtualizacao || atendimentoCliente;
  }

  function categoriaDetectada(tokens, perguntaNormalizada = '') {
    const texto = ` ${tokens.join(' ')} `;

    if (texto.includes(' authenticator ') || texto.includes(' autenticador ') || texto.includes(' 2fa ') || texto.includes(' mfa ')) {
      return 'Google Authenticator';
    }
    if (texto.includes(' webmail ') || texto.includes(' skymail ') || texto.includes(' email ') || texto.includes(' imap ') || texto.includes(' smtp ')) return 'Webmail';
    if (texto.includes(' portal ') || texto.includes(' portal corretor ')) return 'Portal do Corretor';
    if (ehDuvidaGestaoClientes(perguntaNormalizada, tokens)) return 'Hypnobox';
    if (texto.includes(' hypnobox ')) return 'Hypnobox';
    if (texto.includes(' sigav ')) return 'SIGAV';
    if (texto.includes(' senha ') || texto.includes(' credencial ')) return 'Credenciais';
    if (texto.includes(' chamado ') || texto.includes(' suporte ') || texto.includes(' ti ')) return 'Suporte';
    if (texto.includes(' treinamento ') || texto.includes(' manual ')) return 'Treinamentos';
    return '';
  }

  function perguntaPareceContinuidade(pergunta, tokens) {
    const texto = normalizarTexto(pergunta);
    if (!estado.contexto.categoria) return false;
    if (categoriaDetectada(tokens, texto)) return false;
    if (tokens.length <= 5) return true;
    return /^(e |mas |agora |tambem |ainda |continua )/.test(texto)
      || /(nao funciona|nao aparece|deu erro|continua igual|e depois|como faco isso|onde fica|qual opcao)/.test(texto);
  }

  function pontuarItem(item, perguntaNormalizada, tokensPergunta) {
    const categoria = normalizarTexto(item.categoria);
    const titulo = normalizarTexto(item.titulo);
    const tokensTitulo = tokenizar(item.titulo);
    const tokensChave = (item.palavrasChave || []).flatMap(tokenizar);
    const categoriaPergunta = categoriaDetectada(tokensPergunta, perguntaNormalizada);
    let pontos = 0;

    if (categoriaPergunta && item.categoria === categoriaPergunta) pontos += 10;
    if (perguntaNormalizada.includes(categoria) && categoria.length > 3) pontos += 8;
    if (perguntaNormalizada.includes(titulo) && titulo.length > 8) pontos += 24;

    pontos += intersecaoAproximada(tokensPergunta, tokensChave) * 5;
    pontos += intersecaoAproximada(tokensPergunta, tokensTitulo) * 3;

    let melhorPergunta = 0;
    (item.perguntas || []).forEach((variacao) => {
      const normalizada = normalizarTexto(variacao);
      const tokensVariacao = tokenizar(variacao);

      if (perguntaNormalizada === normalizada) {
        melhorPergunta = Math.max(melhorPergunta, 44);
        return;
      }

      if (
        perguntaNormalizada.length >= 8
        && (perguntaNormalizada.includes(normalizada) || normalizada.includes(perguntaNormalizada))
      ) {
        melhorPergunta = Math.max(melhorPergunta, 27);
      }

      const correspondencias = intersecaoAproximada(tokensPergunta, tokensVariacao);
      const denominador = Math.max(tokensPergunta.length, tokensVariacao.length, 1);
      const similaridade = correspondencias / denominador;
      melhorPergunta = Math.max(melhorPergunta, similaridade * 22 + correspondencias * 1.5);
    });

    return pontos + melhorPergunta;
  }

  function buscarResposta(pergunta, usarContexto = true) {
    if (!estado.base.length && Array.isArray(window.BASE_CONHECIMENTO_IMOB)) {
      estado.base = window.BASE_CONHECIMENTO_IMOB;
    }
    const perguntaOriginalNormalizada = normalizarTexto(pergunta);
    let perguntaPesquisa = pergunta;
    let tokensPergunta = tokenizar(perguntaPesquisa);
    let contextoAplicado = false;

    if (usarContexto && perguntaPareceContinuidade(pergunta, tokensPergunta)) {
      perguntaPesquisa = `${pergunta} ${estado.contexto.categoria} ${estado.contexto.titulo}`;
      tokensPergunta = tokenizar(perguntaPesquisa);
      contextoAplicado = true;
    }

    const perguntaNormalizada = normalizarTexto(perguntaPesquisa);
    const categoriaPrincipal = categoriaDetectada(tokensPergunta, perguntaNormalizada)
      || (contextoAplicado ? estado.contexto.categoria : '');
    const somenteHypnobox = categoriaPrincipal === 'Hypnobox'
      && ehDuvidaGestaoClientes(perguntaNormalizada, tokensPergunta);
    const basePesquisa = somenteHypnobox
      ? estado.base.filter((item) => item.categoria === 'Hypnobox')
      : estado.base;

    const resultados = basePesquisa
      .map((item) => ({ item, pontos: pontuarItem(item, perguntaNormalizada, tokensPergunta) }))
      .sort((a, b) => b.pontos - a.pontos);

    const melhor = resultados[0] || null;
    const segundo = resultados[1] || null;
    const diferenca = melhor && segundo ? melhor.pontos - segundo.pontos : melhor?.pontos || 0;
    let confianca = 'baixa';

    if (melhor && (melhor.pontos >= 24 || (melhor.pontos >= 17 && diferenca >= 3))) {
      confianca = 'alta';
    } else if (melhor && melhor.pontos >= 11) {
      confianca = 'media';
    }

    return {
      resposta: confianca === 'alta' ? melhor.item : null,
      candidato: confianca === 'media' ? melhor.item : null,
      sugestoes: resultados.filter((r) => r.pontos >= 7).slice(0, 3).map((r) => r.item),
      pontuacao: melhor?.pontos || 0,
      diferenca,
      confianca,
      categoria: categoriaPrincipal,
      contextoAplicado,
      perguntaOriginalNormalizada,
    };
  }

  function obterContexto() {
    if (typeof window.obterContextoAssistente === 'function') {
      return window.obterContextoAssistente();
    }
    return { chaveEmpresa: '', nomeEmpresa: '', apelido: '', email: '', links: [], todasEmpresas: {} };
  }

  function obterLinkPlataforma(nomePlataforma, chaveEmpresa) {
    const contexto = obterContexto();
    const origem = chaveEmpresa
      ? contexto.todasEmpresas?.[chaveEmpresa]
      : { links: contexto.links || [] };
    return origem?.links?.find((item) => item.nome === nomePlataforma)?.url || '';
  }

  function rolarMensagens() {
    const area = porId('assistantMessages');
    if (!area) return;
    requestAnimationFrame(() => {
      area.scrollTop = area.scrollHeight;
    });
  }

  function criarBolha(tipo) {
    const linha = document.createElement('div');
    linha.className = tipo === 'usuario' ? 'assistant-message-row user' : 'assistant-message-row bot';

    const bolha = document.createElement('div');
    bolha.className = tipo === 'usuario' ? 'assistant-bubble assistant-bubble-user' : 'assistant-bubble assistant-bubble-bot';

    if (tipo === 'usuario') {
      linha.appendChild(bolha);
      return { linha, bolha };
    }

    const avatar = document.createElement('div');
    avatar.className = 'assistant-avatar';
    avatar.innerHTML = `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="width:1.15rem;height:1.15rem">
      <path d="M24 8V4" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      <circle cx="24" cy="4" r="2" fill="currentColor"/>
      <rect x="10" y="11" width="28" height="25" rx="8" stroke="currentColor" stroke-width="3"/>
      <circle cx="19" cy="23" r="2.5" fill="currentColor"/>
      <circle cx="29" cy="23" r="2.5" fill="currentColor"/>
      <path d="M18 30C20 32 28 32 30 30" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    </svg>`;
    avatar.setAttribute('aria-hidden', 'true');
    linha.append(avatar, bolha);
    return { linha, bolha };
  }

  function salvarHistorico(entrada) {
    const historico = lerJSON(CHAVE_HISTORICO, []);
    historico.push({ ...entrada, dataHora: new Date().toISOString() });
    gravarSessao(CHAVE_HISTORICO, historico.slice(-LIMITE_HISTORICO));
  }

  function registrarLog(tipo, dados = {}) {
    const contexto = obterContexto();
    const logs = lerJSON(CHAVE_LOGS, []);
    logs.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      dataHora: new Date().toISOString(),
      tipo,
      empresa: contexto.nomeEmpresa || '',
      apelido: contexto.apelido || '',
      versao: VERSAO_ASSISTENTE,
      ...dados,
    });
    gravarLocal(CHAVE_LOGS, logs.slice(-LIMITE_LOGS));
  }

  function adicionarMensagemUsuario(texto, opcoes = {}) {
    const area = porId('assistantMessages');
    if (!area) return;
    const { linha, bolha } = criarBolha('usuario');
    const paragrafo = document.createElement('p');
    paragrafo.textContent = texto;
    bolha.appendChild(paragrafo);
    area.appendChild(linha);
    if (!opcoes.restaurando) salvarHistorico({ tipo: 'usuario', texto });
    rolarMensagens();
  }

  function adicionarMensagemSimples(texto, titulo = '', opcoes = {}) {
    const area = porId('assistantMessages');
    if (!area) return;
    const { linha, bolha } = criarBolha('bot');

    if (titulo) {
      const cabecalho = document.createElement('p');
      cabecalho.className = 'assistant-answer-title';
      cabecalho.textContent = titulo;
      bolha.appendChild(cabecalho);
    }

    const paragrafo = document.createElement('p');
    paragrafo.textContent = texto;
    bolha.appendChild(paragrafo);
    area.appendChild(linha);
    if (!opcoes.restaurando) salvarHistorico({ tipo: 'simples', texto, titulo });
    rolarMensagens();
  }

  function definirInterfaceProcessando(processando) {
    estado.processando = processando;
    const input = porId('assistantInput');
    const enviar = porId('assistantSend');
    const area = porId('assistantMessages');
    if (input) input.disabled = processando;
    if (enviar) {
      enviar.disabled = processando;
      enviar.textContent = processando ? 'Aguarde' : 'Enviar';
    }
    if (area) area.setAttribute('aria-busy', String(processando));
    document.querySelectorAll('[data-assistant-question]').forEach((botao) => {
      botao.disabled = processando;
    });
  }

  function adicionarIndicadorAnalise() {
    const area = porId('assistantMessages');
    if (!area) return { linha: null, parar: () => {} };

    const mensagens = [
      'Analisando sua dúvida',
      'Consultando a base de conhecimento',
      'Verificando a melhor orientação',
    ];
    let indice = 0;
    const { linha, bolha } = criarBolha('bot');
    linha.classList.add('assistant-thinking-row');
    bolha.classList.add('assistant-thinking-bubble');
    bolha.setAttribute('role', 'status');

    const texto = document.createElement('span');
    texto.textContent = mensagens[indice];
    const pontos = document.createElement('span');
    pontos.className = 'assistant-thinking-dots';
    pontos.setAttribute('aria-hidden', 'true');
    pontos.innerHTML = '<span></span><span></span><span></span>';
    bolha.append(texto, pontos);
    area.appendChild(linha);
    rolarMensagens();

    const temporizador = window.setInterval(() => {
      indice = (indice + 1) % mensagens.length;
      texto.textContent = mensagens[indice];
    }, 1450);

    return {
      linha,
      parar: () => window.clearInterval(temporizador),
    };
  }

  function aguardar(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function calcularTempoResposta(resultado, item, pergunta) {
    const variacao = Math.min(350, normalizarTexto(pergunta).length * 4);
    if (resultado.confianca === 'baixa') return 3400 + variacao;
    if (resultado.confianca === 'media') return 4100 + variacao;
    if (Array.isArray(item?.passos) && item.passos.length >= 4) return 4900 + Math.min(250, variacao);
    return 4400 + variacao;
  }

  function criarLinkAcao(texto, url) {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'assistant-action';
    link.textContent = texto;
    return link;
  }

  function criarBotaoAcao(texto, callback) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'assistant-action';
    botao.textContent = texto;
    botao.addEventListener('click', callback);
    return botao;
  }

  function adicionarAcoes(container, item, pergunta) {
    const acoes = item.acoes || [];
    if (!acoes.length) return;
    const areaAcoes = document.createElement('div');
    areaAcoes.className = 'assistant-actions';

    acoes.forEach((acao) => {
      if (acao.tipo === 'link' && acao.url) {
        areaAcoes.appendChild(criarLinkAcao(acao.texto, acao.url));
        return;
      }
      if (acao.tipo === 'suporte') {
        areaAcoes.appendChild(criarBotaoAcao(acao.texto, () => abrirChamadoDoAssistente(item, pergunta)));
        return;
      }
      if (acao.tipo === 'plataforma') {
        const contexto = obterContexto();
        if (contexto.chaveEmpresa) {
          const url = obterLinkPlataforma(acao.plataforma, contexto.chaveEmpresa);
          if (url) areaAcoes.appendChild(criarLinkAcao(acao.texto, url));
          return;
        }
        Object.entries(contexto.todasEmpresas || {}).forEach(([chave, empresa]) => {
          const url = obterLinkPlataforma(acao.plataforma, chave);
          if (url) areaAcoes.appendChild(criarLinkAcao(`${acao.plataforma} — ${empresa.nome}`, url));
        });
      }
    });

    if (areaAcoes.children.length) container.appendChild(areaAcoes);
  }

  function obterRelacionados(item) {
    const tokensItem = new Set(tokenizar([
      item.titulo,
      ...(item.palavrasChave || []),
    ].join(' ')));

    return estado.base
      .filter((candidato) => candidato.id !== item.id && candidato.categoria === item.categoria)
      .map((candidato) => {
        const tokensCandidato = tokenizar([
          candidato.titulo,
          ...(candidato.palavrasChave || []),
        ].join(' '));
        const pontos = tokensCandidato.filter((token) => tokensItem.has(token)).length;
        return { candidato, pontos };
      })
      .filter((resultado) => resultado.pontos > 0)
      .sort((a, b) => b.pontos - a.pontos)
      .slice(0, 2)
      .map((resultado) => resultado.candidato);
  }

  function adicionarRelacionados(container, item) {
    const relacionados = obterRelacionados(item);
    if (!relacionados.length) return;

    const rotulo = document.createElement('p');
    rotulo.className = 'assistant-related-label';
    rotulo.textContent = 'Orientações relacionadas:';
    const lista = document.createElement('div');
    lista.className = 'assistant-related';
    relacionados.forEach((relacionado) => {
      lista.appendChild(criarBotaoAcao(relacionado.titulo, () => processarPergunta(relacionado.titulo)));
    });
    container.append(rotulo, lista);
  }

  function adicionarFeedback(container, item, pergunta) {
    const caixa = document.createElement('div');
    caixa.className = 'assistant-feedback';
    caixa.setAttribute('aria-label', 'Avaliação da resposta');

    const perguntaFeedback = document.createElement('p');
    perguntaFeedback.className = 'assistant-feedback-label';
    perguntaFeedback.textContent = 'Essa resposta ajudou?';

    const botoes = document.createElement('div');
    botoes.className = 'assistant-feedback-actions';
    const status = document.createElement('p');
    status.className = 'assistant-feedback-status';
    status.setAttribute('aria-live', 'polite');

    const concluir = (valor) => {
      botoes.querySelectorAll('button').forEach((botao) => { botao.disabled = true; });
      registrarLog('feedback', {
        pergunta,
        respostaId: item.id,
        respostaTitulo: item.titulo,
        categoria: item.categoria,
        avaliacao: valor,
      });
      status.textContent = valor === 'ajudou'
        ? 'Obrigado pela avaliação.'
        : 'Avaliação registrada neste navegador. Você também pode abrir um chamado.';
      if (valor === 'nao_ajudou') {
        const chamado = criarBotaoAcao('Abrir chamado', () => abrirChamadoDoAssistente(item, pergunta));
        chamado.classList.add('assistant-feedback-call');
        caixa.appendChild(chamado);
      }
    };

    const sim = criarBotaoAcao('Sim, ajudou', () => concluir('ajudou'));
    const nao = criarBotaoAcao('Não ajudou', () => concluir('nao_ajudou'));
    botoes.append(sim, nao);
    caixa.append(perguntaFeedback, botoes, status);
    container.appendChild(caixa);
  }

  function definirContextoResposta(item) {
    estado.contexto = {
      categoria: item.categoria || '',
      itemId: item.id || '',
      titulo: item.titulo || '',
    };
    gravarSessao(CHAVE_CONTEXTO, estado.contexto);
  }

  function adicionarResposta(item, pergunta, opcoes = {}) {
    const area = porId('assistantMessages');
    if (!area) return;
    const { linha, bolha } = criarBolha('bot');

    const categoria = document.createElement('span');
    categoria.className = 'assistant-category';
    categoria.textContent = item.categoria;
    const titulo = document.createElement('p');
    titulo.className = 'assistant-answer-title';
    titulo.textContent = item.titulo;
    const resposta = document.createElement('p');
    resposta.textContent = item.resposta;
    bolha.append(categoria, titulo, resposta);

    if (Array.isArray(item.passos) && item.passos.length) {
      const lista = document.createElement('ol');
      lista.className = 'assistant-steps';
      item.passos.forEach((passo) => {
        const li = document.createElement('li');
        li.textContent = passo;
        lista.appendChild(li);
      });
      bolha.appendChild(lista);
    }

    if (item.fonte?.titulo) {
      const fonte = item.fonte.url ? document.createElement('a') : document.createElement('p');
      fonte.className = 'assistant-source';
      const referencia = item.fonte.referencia ? ` — ${item.fonte.referencia}` : '';
      fonte.textContent = `Fonte: ${item.fonte.titulo}${referencia}`;
      if (item.fonte.url) {
        fonte.href = item.fonte.url;
        fonte.target = '_blank';
        fonte.rel = 'noopener noreferrer';
      }
      bolha.appendChild(fonte);
    }

    adicionarAcoes(bolha, item, pergunta);
    adicionarRelacionados(bolha, item);
    if (!opcoes.restaurando) adicionarFeedback(bolha, item, pergunta);
    area.appendChild(linha);

    definirContextoResposta(item);
    if (!opcoes.restaurando) salvarHistorico({ tipo: 'resposta', itemId: item.id, pergunta });
    rolarMensagens();
  }

  function adicionarConfirmacao(pergunta, sugestoes, resultado) {
    const area = porId('assistantMessages');
    if (!area) return;
    const { linha, bolha } = criarBolha('bot');
    const titulo = document.createElement('p');
    titulo.className = 'assistant-answer-title';
    titulo.textContent = 'Encontrei orientações parecidas';
    const texto = document.createElement('p');
    texto.textContent = 'Selecione a opção que mais combina com sua dúvida para eu não apresentar uma orientação incorreta.';
    bolha.append(titulo, texto);

    const relacionados = document.createElement('div');
    relacionados.className = 'assistant-related';
    sugestoes.slice(0, 3).forEach((item) => {
      relacionados.appendChild(criarBotaoAcao(`${item.categoria}: ${item.titulo}`, () => {
        adicionarResposta(item, pergunta);
        registrarLog('resposta_confirmada', {
          pergunta,
          categoria: item.categoria,
          respostaId: item.id,
          respostaTitulo: item.titulo,
        });
      }));
    });
    bolha.appendChild(relacionados);
    area.appendChild(linha);
    salvarHistorico({ tipo: 'simples', titulo: titulo.textContent, texto: texto.textContent });
    registrarLog('pergunta_ambigua', {
      pergunta,
      categoriaDetectada: resultado.categoria,
      pontuacao: Number(resultado.pontuacao.toFixed(2)),
      sugestoes: sugestoes.slice(0, 3).map((item) => item.id),
    });
    rolarMensagens();
  }

  function adicionarFallback(pergunta, sugestoes, resultado) {
    const area = porId('assistantMessages');
    if (!area) return;
    const { linha, bolha } = criarBolha('bot');
    const titulo = document.createElement('p');
    titulo.className = 'assistant-answer-title';
    titulo.textContent = 'Ainda não encontrei uma orientação específica';
    const texto = document.createElement('p');
    texto.textContent = 'Informe o nome da plataforma, o que você estava fazendo e a mensagem exibida. Também posso preencher um chamado com a sua pergunta.';
    bolha.append(titulo, texto);

    if (sugestoes.length) {
      const rotulo = document.createElement('p');
      rotulo.className = 'assistant-related-label';
      rotulo.textContent = 'Talvez você esteja procurando:';
      bolha.appendChild(rotulo);
      const relacionados = document.createElement('div');
      relacionados.className = 'assistant-related';
      sugestoes.forEach((item) => {
        relacionados.appendChild(criarBotaoAcao(item.titulo, () => processarPergunta(item.titulo)));
      });
      bolha.appendChild(relacionados);
    }

    const acoes = document.createElement('div');
    acoes.className = 'assistant-actions';
    acoes.appendChild(criarBotaoAcao('Abrir chamado com esta dúvida', () => abrirChamadoDoAssistente(null, pergunta)));
    bolha.appendChild(acoes);
    area.appendChild(linha);

    salvarHistorico({ tipo: 'simples', titulo: titulo.textContent, texto: texto.textContent });
    registrarLog('pergunta_sem_resposta', {
      pergunta,
      categoriaDetectada: resultado.categoria,
      pontuacao: Number(resultado.pontuacao.toFixed(2)),
      contextoAplicado: resultado.contextoAplicado,
    });
    rolarMensagens();
  }

  function respostaConversacional(pergunta) {
    const texto = normalizarTexto(pergunta);
    if (/^(oi|ola|bom dia|boa tarde|boa noite|hey)$/.test(texto)) {
      adicionarMensagemSimples('Olá. Posso orientar sobre Hypnobox, Webmail, Portal do Corretor, SIGAV, Google Authenticator, credenciais, treinamentos e chamados.');
      return true;
    }
    if (/^(obrigado|obrigada|valeu|agradeco|agradecido)$/.test(texto)) {
      adicionarMensagemSimples('Por nada. Quando precisar, descreva a plataforma e o problema encontrado.');
      return true;
    }
    return false;
  }

  async function processarPergunta(pergunta) {
    const texto = String(pergunta || '').trim();
    if (!texto || estado.processando) return;

    estado.ultimaPergunta = texto;
    adicionarMensagemUsuario(texto);
    definirInterfaceProcessando(true);
    const indicador = adicionarIndicadorAnalise();

    try {
      const conversacional = /^(oi|ola|bom dia|boa tarde|boa noite|hey|obrigado|obrigada|valeu|agradeco|agradecido)$/i.test(normalizarTexto(texto));
      const resultado = conversacional ? null : buscarResposta(texto);
      const tempo = conversacional ? 2600 : calcularTempoResposta(resultado, resultado?.resposta || resultado?.candidato, texto);
      await aguardar(tempo);
      indicador.parar();
      indicador.linha?.remove();

      if (respostaConversacional(texto)) return;

      if (resultado.resposta) {
        adicionarResposta(resultado.resposta, texto);
        registrarLog('resposta_exibida', {
          pergunta: texto,
          categoria: resultado.resposta.categoria,
          respostaId: resultado.resposta.id,
          respostaTitulo: resultado.resposta.titulo,
          confianca: resultado.confianca,
          pontuacao: Number(resultado.pontuacao.toFixed(2)),
          contextoAplicado: resultado.contextoAplicado,
        });
      } else if (resultado.confianca === 'media' && resultado.sugestoes.length) {
        adicionarConfirmacao(texto, resultado.sugestoes, resultado);
      } else {
        adicionarFallback(texto, resultado.sugestoes, resultado);
      }
    } finally {
      indicador.parar();
      indicador.linha?.remove();
      definirInterfaceProcessando(false);
      porId('assistantInput')?.focus();
    }
  }

  function enviarPerguntaAssistente() {
    const input = porId('assistantInput');
    if (!input) return;
    const pergunta = input.value.trim();
    if (!pergunta) return;
    input.value = '';
    processarPergunta(pergunta);
  }

  function perguntarAssistente(pergunta) {
    const painel = porId('centralAjuda');
    if (painel?.classList.contains('hidden') && typeof window.alternarCentralAjuda === 'function') {
      window.alternarCentralAjuda();
    }
    processarPergunta(pergunta);
  }

  function detectarPlataformaNaPergunta(pergunta) {
    const texto = normalizarTexto(pergunta);
    const tokens = tokenizar(pergunta);
    if (texto.includes('authenticator') || texto.includes('autenticador') || texto.includes('2fa')) return 'Google Authenticator';
    if (texto.includes('webmail') || texto.includes('email')) return 'Webmail';
    if (texto.includes('portal')) return 'Portal do Corretor';
    if (ehDuvidaGestaoClientes(texto, tokens)) return 'Hypnobox';
    if (texto.includes('hypnobox') || texto.includes('hipnobox')) return 'Hypnobox';
    if (texto.includes('sigav') || texto.includes('sigavi')) return 'SIGAV';
    return 'Outra';
  }

  function definirValorSelect(id, valor, fallback = '') {
    const select = porId(id);
    if (!select) return;
    const existe = Array.from(select.options).some((option) => option.value === valor || option.textContent === valor);
    select.value = existe ? valor : fallback;
  }

  function abrirChamadoDoAssistente(item, pergunta) {
    const suporte = item?.suporte || {};
    const tipo = suporte.tipo || (/(erro|travado|nao abre|não abre|lento)/i.test(pergunta) ? 'Reportar erro' : 'Ajuda com plataforma');
    const plataforma = suporte.plataforma && suporte.plataforma !== 'Outra'
      ? suporte.plataforma
      : detectarPlataformaNaPergunta(pergunta);

    definirValorSelect('tipoSuporte', tipo, 'Ajuda com plataforma');
    definirValorSelect('plataformaSuporte', plataforma, 'Outra');

    const descricao = porId('descricaoSuporte');
    if (descricao) {
      descricao.value = `Dúvida informada ao Assistente Imob:\n${pergunta}\n\nDescreva abaixo o que aconteceu e, se possível, a mensagem apresentada na tela:\n`;
    }

    if (typeof window.fecharCentralAjuda === 'function') window.fecharCentralAjuda();
    if (typeof window.abrirModalSuporte === 'function') window.abrirModalSuporte();
    setTimeout(() => descricao?.focus(), 100);
  }

  function limparConversaAssistente() {
    const area = porId('assistantMessages');
    if (!area) return;
    try {
      window.sessionStorage?.removeItem(CHAVE_HISTORICO);
      window.sessionStorage?.removeItem(CHAVE_CONTEXTO);
    } catch (_) {}
    estado.contexto = { categoria: '', itemId: '', titulo: '' };
    area.replaceChildren();
    adicionarBoasVindas();
  }

  function adicionarBoasVindas(opcoes = {}) {
    const contexto = obterContexto();
    const empresa = contexto.nomeEmpresa ? ` A empresa selecionada é ${contexto.nomeEmpresa}.` : '';
    adicionarMensagemSimples(
      `Sou o Assistente Imob. Posso orientar sobre Hypnobox, Webmail, Portal do Corretor, SIGAV e Google Authenticator.${empresa} Digite o que deseja fazer ou descreva o problema encontrado.`,
      'Olá! Como posso ajudar?',
      opcoes
    );
  }

  function restaurarHistorico() {
    const historico = lerJSON(CHAVE_HISTORICO, []);
    const contextoSalvo = lerJSON(CHAVE_CONTEXTO, null);
    if (contextoSalvo?.categoria) estado.contexto = contextoSalvo;
    if (!Array.isArray(historico) || !historico.length) return false;

    historico.forEach((entrada) => {
      if (entrada.tipo === 'usuario') {
        adicionarMensagemUsuario(entrada.texto, { restaurando: true });
      } else if (entrada.tipo === 'resposta') {
        const item = estado.base.find((registro) => registro.id === entrada.itemId);
        if (item) adicionarResposta(item, entrada.pergunta || '', { restaurando: true });
      } else if (entrada.tipo === 'simples') {
        adicionarMensagemSimples(entrada.texto, entrada.titulo || '', { restaurando: true });
      }
    });
    return true;
  }

  function atualizarContextoAssistente() {
    const contexto = obterContexto();
    const status = porId('assistantContext');
    if (!status) return;
    status.textContent = contexto.nomeEmpresa
      ? `${contexto.nomeEmpresa} selecionada`
      : 'Selecione a empresa para receber links específicos';
  }

  function atualizarVersaoVisivel() {
    const meta = window.BASE_CONHECIMENTO_IMOB_META || {};
    const elemento = porId('baseVersion');
    if (elemento) {
      const data = meta.atualizadoEm ? ` · atualizada em ${meta.atualizadoEm.split('-').reverse().join('/')}` : '';
      elemento.textContent = `Base ${meta.versao || VERSAO_ASSISTENTE}${data}`;
    }
  }

  function inicializarAssistente() {
    estado.base = Array.isArray(window.BASE_CONHECIMENTO_IMOB)
      ? window.BASE_CONHECIMENTO_IMOB
      : [];

    if (document.body?.dataset.assistantTest === 'true') {
      atualizarVersaoVisivel();
      return;
    }

    const input = porId('assistantInput');
    const enviar = porId('assistantSend');
    const limpar = porId('assistantClear');

    input?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        enviarPerguntaAssistente();
      }
    });
    enviar?.addEventListener('click', enviarPerguntaAssistente);
    limpar?.addEventListener('click', limparConversaAssistente);

    document.querySelectorAll('[data-assistant-question]').forEach((botao) => {
      botao.addEventListener('click', () => perguntarAssistente(botao.dataset.assistantQuestion || botao.textContent));
    });

    atualizarVersaoVisivel();
    if (!estado.base.length) {
      adicionarMensagemSimples('A base de conhecimento não foi carregada. Verifique se o arquivo base-conhecimento.js está na mesma pasta do index.html.');
      return;
    }

    atualizarContextoAssistente();
    if (!restaurarHistorico()) adicionarBoasVindas();
    estado.iniciado = true;
  }

  window.enviarPerguntaAssistente = enviarPerguntaAssistente;
  window.perguntarAssistente = perguntarAssistente;
  window.abrirChamadoDoAssistente = abrirChamadoDoAssistente;
  window.limparConversaAssistente = limparConversaAssistente;
  window.atualizarContextoAssistente = atualizarContextoAssistente;
  window.AssistenteImobDebug = {
    versao: VERSAO_ASSISTENTE,
    normalizarTexto,
    buscarResposta: (pergunta) => buscarResposta(pergunta, false),
    testarPergunta: (pergunta) => {
      const resultado = buscarResposta(pergunta, false);
      return {
        pergunta,
        confianca: resultado.confianca,
        categoria: resultado.resposta?.categoria || resultado.candidato?.categoria || resultado.categoria || '',
        respostaId: resultado.resposta?.id || resultado.candidato?.id || '',
        titulo: resultado.resposta?.titulo || resultado.candidato?.titulo || '',
        pontuacao: resultado.pontuacao,
      };
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarAssistente);
  } else {
    inicializarAssistente();
  }
}());
