/* Assistente Imob — orientações aprovadas pelo TI. */
(function () {
  'use strict';

  const estado = {
    base: [],
    iniciado: false,
    ultimaPergunta: '',
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
  };

  const porId = (id) => document.getElementById(id);

  function normalizarTexto(texto) {
    return String(texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/e[-\s]?mail/g, 'email')
      .replace(/sky\s*mail/g, 'skymail')
      .replace(/sigavi\s*360/g, 'sigav')
      .replace(/follow[ -]?up/g, 'follow-up')
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

  function categoriaDetectada(tokens) {
    const texto = ` ${tokens.join(' ')} `;
    if (texto.includes(' hypnobox ')) return 'Hypnobox';
    if (texto.includes(' webmail ') || texto.includes(' skymail ') || texto.includes(' email ') || texto.includes(' imap ') || texto.includes(' smtp ')) return 'Webmail';
    if (texto.includes(' portal ') || texto.includes(' portal corretor ')) return 'Portal do Corretor';
    if (texto.includes(' sigav ') || texto.includes(' fac ') || texto.includes(' rodizio ') || texto.includes(' oferta ativa ') || texto.includes(' empreendimento ')) return 'SIGAV';
    if (texto.includes(' senha ') || texto.includes(' credencial ')) return 'Credenciais';
    if (texto.includes(' chamado ') || texto.includes(' suporte ') || texto.includes(' ti ')) return 'Suporte';
    if (texto.includes(' treinamento ') || texto.includes(' manual ')) return 'Treinamentos';
    return '';
  }

  function pontuarItem(item, perguntaNormalizada, tokensPergunta) {
    const categoria = normalizarTexto(item.categoria);
    const titulo = normalizarTexto(item.titulo);
    const tokensTitulo = tokenizar(item.titulo);
    const tokensChave = (item.palavrasChave || []).flatMap(tokenizar);
    const categoriaPergunta = categoriaDetectada(tokensPergunta);
    let pontos = 0;

    if (categoriaPergunta && item.categoria === categoriaPergunta) pontos += 10;
    if (perguntaNormalizada.includes(categoria) && categoria.length > 3) pontos += 8;
    if (perguntaNormalizada.includes(titulo) && titulo.length > 8) pontos += 24;

    const chaveExata = intersecaoAproximada(tokensPergunta, tokensChave);
    pontos += chaveExata * 5;

    const tituloExato = intersecaoAproximada(tokensPergunta, tokensTitulo);
    pontos += tituloExato * 3;

    let melhorPergunta = 0;
    (item.perguntas || []).forEach((variacao) => {
      const normalizada = normalizarTexto(variacao);
      const tokensVariacao = tokenizar(variacao);

      if (perguntaNormalizada === normalizada) {
        melhorPergunta = Math.max(melhorPergunta, 40);
        return;
      }

      if (
        perguntaNormalizada.length >= 8 &&
        (perguntaNormalizada.includes(normalizada) || normalizada.includes(perguntaNormalizada))
      ) {
        melhorPergunta = Math.max(melhorPergunta, 26);
      }

      const correspondencias = intersecaoAproximada(tokensPergunta, tokensVariacao);
      const denominador = Math.max(tokensPergunta.length, tokensVariacao.length, 1);
      const similaridade = correspondencias / denominador;
      melhorPergunta = Math.max(melhorPergunta, similaridade * 22 + correspondencias * 1.5);
    });

    pontos += melhorPergunta;
    return pontos;
  }

  function buscarResposta(pergunta) {
    const perguntaNormalizada = normalizarTexto(pergunta);
    const tokensPergunta = tokenizar(pergunta);

    const resultados = estado.base
      .map((item) => ({ item, pontos: pontuarItem(item, perguntaNormalizada, tokensPergunta) }))
      .sort((a, b) => b.pontos - a.pontos);

    const melhor = resultados[0];
    const segundo = resultados[1];
    const confiavel = melhor && melhor.pontos >= 13;
    const muitoAmbiguo = confiavel && segundo && melhor.pontos - segundo.pontos < 1.5 && melhor.pontos < 20;

    return {
      resposta: confiavel && !muitoAmbiguo ? melhor.item : null,
      sugestoes: resultados.filter((r) => r.pontos >= 8).slice(0, 3).map((r) => r.item),
      pontuacao: melhor ? melhor.pontos : 0,
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
    const link = origem?.links?.find((item) => item.nome === nomePlataforma);
    return link?.url || '';
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

    const avatar = document.createElement('div');
    avatar.className = 'assistant-avatar';
    if (tipo === 'usuario') {
      avatar.textContent = 'VC';
    } else {
      avatar.innerHTML = `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="width:1.15rem;height:1.15rem">
        <path d="M24 8V4" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
        <circle cx="24" cy="4" r="2" fill="currentColor"/>
        <rect x="10" y="11" width="28" height="25" rx="8" stroke="currentColor" stroke-width="3"/>
        <circle cx="19" cy="23" r="2.5" fill="currentColor"/>
        <circle cx="29" cy="23" r="2.5" fill="currentColor"/>
        <path d="M18 30C20 32 28 32 30 30" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      </svg>`;
    }
    avatar.setAttribute('aria-hidden', 'true');

    const bolha = document.createElement('div');
    bolha.className = tipo === 'usuario' ? 'assistant-bubble assistant-bubble-user' : 'assistant-bubble assistant-bubble-bot';

    linha.append(avatar, bolha);
    return { linha, bolha };
  }

  function adicionarMensagemUsuario(texto) {
    const area = porId('assistantMessages');
    if (!area) return;
    const { linha, bolha } = criarBolha('usuario');
    const paragrafo = document.createElement('p');
    paragrafo.textContent = texto;
    bolha.appendChild(paragrafo);
    area.appendChild(linha);
    rolarMensagens();
  }

  function adicionarMensagemSimples(texto, titulo = '') {
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
    rolarMensagens();
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

  function adicionarResposta(item, pergunta) {
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
    area.appendChild(linha);
    rolarMensagens();
  }

  function adicionarFallback(pergunta, sugestoes) {
    const area = porId('assistantMessages');
    if (!area) return;
    const { linha, bolha } = criarBolha('bot');

    const titulo = document.createElement('p');
    titulo.className = 'assistant-answer-title';
    titulo.textContent = 'Ainda não encontrei uma orientação específica';

    const texto = document.createElement('p');
    texto.textContent = 'Tente informar o nome da plataforma, o que você estava fazendo e a mensagem exibida. Também posso preencher um chamado com a sua pergunta.';

    bolha.append(titulo, texto);

    if (sugestoes.length) {
      const rotulo = document.createElement('p');
      rotulo.className = 'assistant-related-label';
      rotulo.textContent = 'Talvez você esteja procurando:';
      bolha.appendChild(rotulo);

      const relacionados = document.createElement('div');
      relacionados.className = 'assistant-related';
      sugestoes.forEach((item) => {
        relacionados.appendChild(criarBotaoAcao(item.titulo, () => {
          adicionarMensagemUsuario(item.titulo);
          adicionarResposta(item, item.titulo);
        }));
      });
      bolha.appendChild(relacionados);
    }

    const acoes = document.createElement('div');
    acoes.className = 'assistant-actions';
    acoes.appendChild(criarBotaoAcao('Abrir chamado com esta dúvida', () => abrirChamadoDoAssistente(null, pergunta)));
    bolha.appendChild(acoes);

    area.appendChild(linha);
    rolarMensagens();
  }

  function respostaConversacional(pergunta) {
    const texto = normalizarTexto(pergunta);
    if (/^(oi|ola|bom dia|boa tarde|boa noite|hey)$/.test(texto)) {
      adicionarMensagemSimples('Olá. Posso orientar sobre Hypnobox, Webmail, Portal do Corretor, SIGAV, credenciais, treinamentos e chamados.');
      return true;
    }
    if (/^(obrigado|obrigada|valeu|agradeco|agradecido)$/.test(texto)) {
      adicionarMensagemSimples('Por nada. Quando precisar, descreva a plataforma e o problema encontrado.');
      return true;
    }
    return false;
  }

  function processarPergunta(pergunta) {
    const texto = String(pergunta || '').trim();
    if (!texto) return;

    estado.ultimaPergunta = texto;
    adicionarMensagemUsuario(texto);

    if (respostaConversacional(texto)) return;

    const resultado = buscarResposta(texto);
    if (resultado.resposta) {
      adicionarResposta(resultado.resposta, texto);
    } else {
      adicionarFallback(texto, resultado.sugestoes);
    }
  }

  function enviarPerguntaAssistente() {
    const input = porId('assistantInput');
    if (!input) return;
    const pergunta = input.value.trim();
    if (!pergunta) return;
    input.value = '';
    processarPergunta(pergunta);
    input.focus();
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
    if (texto.includes('hypnobox') || texto.includes('hipnobox')) return 'Hypnobox';
    if (texto.includes('webmail') || texto.includes('email')) return 'Webmail';
    if (texto.includes('portal')) return 'Portal do Corretor';
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
    area.replaceChildren();
    adicionarBoasVindas();
  }

  function adicionarBoasVindas() {
    const contexto = obterContexto();
    const empresa = contexto.nomeEmpresa ? ` A empresa selecionada é ${contexto.nomeEmpresa}.` : '';
    adicionarMensagemSimples(
      `Sou o Assistente Imob. Posso orientar sobre Hypnobox, Webmail, Portal do Corretor e SIGAV.${empresa} Digite o que deseja fazer ou descreva o problema encontrado.`,
      'Olá! Como posso ajudar?'
    );
  }

  function atualizarContextoAssistente() {
    const contexto = obterContexto();
    const status = porId('assistantContext');
    if (!status) return;
    status.textContent = contexto.nomeEmpresa
      ? `${contexto.nomeEmpresa} selecionada`
      : 'Selecione a empresa para receber links específicos';
  }

  function inicializarAssistente() {
    estado.base = Array.isArray(window.BASE_CONHECIMENTO_IMOB)
      ? window.BASE_CONHECIMENTO_IMOB
      : [];

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

    if (!estado.base.length) {
      adicionarMensagemSimples('A base de conhecimento não foi carregada. Verifique se o arquivo base-conhecimento.js está na mesma pasta do index.html.');
      return;
    }

    atualizarContextoAssistente();
    adicionarBoasVindas();
    estado.iniciado = true;
  }

  window.enviarPerguntaAssistente = enviarPerguntaAssistente;
  window.perguntarAssistente = perguntarAssistente;
  window.abrirChamadoDoAssistente = abrirChamadoDoAssistente;
  window.limparConversaAssistente = limparConversaAssistente;
  window.atualizarContextoAssistente = atualizarContextoAssistente;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarAssistente);
  } else {
    inicializarAssistente();
  }
}());
