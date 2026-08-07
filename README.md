<div align="center">
  <img src="icone-imob-192.png" alt="Plataforma EVEN IMOB" width="96" />

# Plataforma EVEN IMOB

**Central interna de acessos, suporte e conhecimento para as operações comerciais da EVEN IMOB.**

Versão atual: **4.1.0** · Aplicação web estática · PWA · GitHub Pages

[ Acessar a plataforma ](https://tiimob.github.io/Plataforma_Imob/)
</div>

---

## Sobre o projeto

A **Plataforma EVEN IMOB** foi desenvolvida para centralizar, em um único ambiente, recursos utilizados no dia a dia das equipes comerciais e de suporte.

O projeto reúne atalhos para as principais plataformas, geração orientada de credenciais iniciais, abertura de chamados e o **Assistente Imob**, uma base de conhecimento local preparada para responder dúvidas recorrentes com orientações padronizadas.

A aplicação funciona sem backend e sem banco de dados externo, sendo publicada diretamente pelo **GitHub Pages**.

## Principais funcionalidades

- Seleção do ambiente **Even More** ou **Even Vendas**.
- Geração orientada de e-mail corporativo a partir do apelido do usuário.
- Centralização dos acessos às plataformas utilizadas pela operação.
- Formulário de suporte com informações organizadas para abertura de chamado.
- **Assistente Imob** com base de conhecimento local.
- Respostas com grau de confiança e sugestões relacionadas.
- Contexto das mensagens durante a sessão.
- Avaliação das respostas com **“Sim, ajudou”** e **“Não ajudou”**.
- Orientações sobre **Hypnobox**, **SkyMail/Webmail**, **Google Authenticator**, **Portal do Corretor**, **SIGAV** e suporte.
- Regras internas de gestão de clientes e leads no Hypnobox.
- Registro local de perguntas e avaliações no navegador.
- Página de diagnóstico e exportação dos registros locais.
- Página de testes automáticos da base de conhecimento.
- Instalação como aplicativo por meio de **PWA**.
- Funcionamento responsivo em computador, tablet e celular.

## Assistente Imob

O Assistente Imob utiliza uma base de conhecimento aprovada e armazenada no próprio projeto. O mecanismo faz a análise da pergunta, identifica termos relevantes, compara possíveis orientações e considera um nível de confiança antes de exibir a resposta.

Quando a correspondência não é suficientemente clara, o assistente pode apresentar alternativas ou orientar o usuário a entrar em contato com o suporte, evitando respostas aleatórias.

### Áreas atendidas

| Categoria | Exemplos de orientação |
| --- | --- |
| Hypnobox | Clientes, leads, carteira, tarefas, propostas e regras internas |
| SkyMail / Webmail | Acesso, senha, envio e recebimento, Outlook e dispositivos móveis |
| Google Authenticator | Configuração, troca de celular, códigos e problemas de autenticação |
| Portal do Corretor | Acesso e problemas recorrentes |
| SIGAV | Acesso, senha e orientações específicas da plataforma |
| Suporte | Direcionamento e abertura de chamados |

## Tecnologias

O projeto foi construído para ser simples de manter e publicar:

- **HTML5**
- **CSS / Tailwind CSS**
- **JavaScript Vanilla**
- **LocalStorage e SessionStorage**
- **Service Worker**
- **Web App Manifest (PWA)**
- **GitHub Pages**

Não há servidor de aplicação, API própria ou banco de dados externo.

## Estrutura do projeto

```text
Plataforma_Imob/
├── index.html                 # Interface principal
├── chatbot.js                 # Lógica do Assistente Imob
├── base-conhecimento.js       # Perguntas, respostas e regras da base
├── manifest.webmanifest       # Configuração da PWA
├── sw.js                      # Service Worker e cache
├── testes.html                # Testes automáticos da base
├── relatorio-local.html       # Consulta dos registros locais
├── logo.png                   # Identidade visual da plataforma
├── favicon-even.ico
├── favicon-even-32.png
├── favicon-even-64.png
├── icone-imob-192.png
├── icone-imob-512.png
└── README.md
```

## Publicação

A aplicação é hospedada pelo **GitHub Pages**.

Após enviar uma atualização para a branch publicada pelo repositório, aguarde a conclusão do deploy e acesse:

```text
https://tiimob.github.io/Plataforma_Imob/
```

Caso o navegador carregue uma versão antiga após uma publicação, utilize `Ctrl + F5` ou abra a página em uma janela anônima para validar o novo conteúdo.

## Atualizando a base de conhecimento

As orientações do assistente ficam em `base-conhecimento.js`.

Fluxo recomendado para uma atualização:

1. Adicionar ou revisar a orientação na base.
2. Incluir diferentes formas de o usuário formular a mesma dúvida.
3. Revisar palavras-chave para evitar conflito entre categorias.
4. Atualizar o número da versão quando necessário.
5. Executar `testes.html` e verificar se os cenários principais continuam corretos.
6. Publicar os arquivos atualizados no GitHub.
7. Validar a nova versão no GitHub Pages.

Sempre que a versão for alterada, também é recomendável revisar as referências de versão usadas no `index.html` e o nome do cache no `sw.js`, evitando que arquivos antigos permaneçam armazenados no navegador.

## Testes da base

A página abaixo executa perguntas predefinidas e verifica se cada uma está sendo encaminhada para a categoria esperada:

```text
https://tiimob.github.io/Plataforma_Imob/testes.html
```

Ela é especialmente útil antes de publicar alterações em palavras-chave, regras de prioridade ou novas orientações.

## Relatório local

O projeto possui uma página de diagnóstico para visualizar perguntas, respostas e avaliações registradas **no navegador atual**:

```text
https://tiimob.github.io/Plataforma_Imob/relatorio-local.html
```

Os registros podem ser utilizados para identificar dúvidas recorrentes e pontos que precisam ser acrescentados ou melhorados na base.

> **Importante:** como o projeto não utiliza servidor ou banco de dados, os registros não são centralizados. Cada dispositivo mantém apenas os próprios dados locais.

## Segurança e privacidade

O Assistente Imob foi pensado para fornecer orientações de procedimento, e não para receber informações sensíveis.

Não devem ser informados no chat:

- Senhas;
- Códigos do Google Authenticator;
- Códigos de recuperação;
- CPF, RG ou outros documentos pessoais;
- Dados pessoais de clientes;
- Informações financeiras;
- Dados confidenciais de propostas ou negociações.

Como o repositório pode ser visualizado conforme sua configuração de privacidade no GitHub, **não devem ser armazenados no código tokens, chaves privadas, credenciais administrativas ou segredos reais**.

## PWA

A plataforma possui suporte a **Progressive Web App** e pode ser adicionada à tela inicial de dispositivos compatíveis.

O `manifest.webmanifest` define nome, identidade visual e ícones, enquanto o `sw.js` gerencia o cache dos arquivos essenciais.

## Versão 4.1.0

Principais pontos presentes nesta versão:

- Aprimoramentos no Assistente Imob.
- Avaliação das respostas.
- Contexto de conversa durante a sessão.
- Grau de confiança e sugestões relacionadas.
- Google Authenticator incluído na base.
- Gestão de clientes direcionada ao Hypnobox.
- Regras internas de prazo e atualização de clientes/leads.
- Configuração do SkyMail no Outlook.
- Testes automáticos da base.
- Relatório local.
- PWA e Service Worker.
- Favicon e ícones com identidade visual EVEN.
- Melhorias de responsividade e acessibilidade.

## Status

O projeto está em **evolução contínua**. Novas orientações são adicionadas conforme surgem dúvidas recorrentes, alterações de processo e necessidades das equipes comerciais.

---

<div align="center">
  <strong>Plataforma EVEN IMOB</strong><br />
  Desenvolvido por TI · Uso interno
</div>
