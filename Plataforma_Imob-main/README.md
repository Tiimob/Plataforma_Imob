# Plataforma Imob — Versão Temporária

Central interna de acessos, credenciais, suporte e orientações para uso temporário das operações **Even More** e **Even Vendas**.

> Versão: **5.0.1-temp** — atualização de 08/10/2026

## Motivo desta versão

A unificação interna para Even Vendas já ocorreu, porém algumas plataformas terceirizadas ainda mantêm ambientes separados.  
Para evitar confusão no credenciamento e no primeiro acesso de novos corretores, esta versão restaura temporariamente a seleção entre **Even More** e **Even Vendas**.

## Ambientes configurados

| Operação | E-mail | Webmail | Hypnobox |
|---|---|---|---|
| Even More | `apelido@emci.com.br` | `http://webmail.emci.com.br` | `https://evenmore.hypnobox.com.br` |
| Even Vendas | `apelido@evci.com.br` | `http://webmail.evci.com.br` | `https://even.hypnobox.com.br` |

Acessos comuns:
- Portal do Corretor: `http://corretor.even.com.br`
- SIGAV: `https://sigav.even.com.br`

## Comportamento

1. O corretor seleciona a operação na tela inicial.
2. A Plataforma gera o e-mail com o domínio correspondente.
3. Os cards de Webmail e Hypnobox apontam para o ambiente correto.
4. Chamados de suporte registram a empresa selecionada.
5. O Assistente Imob usa o contexto da operação para abrir os links adequados.

> **Importante:** as regras internas de processo presentes na base do Assistente continuam homologadas para **Even Vendas**. A seleção Even More nesta versão temporária foi reintroduzida principalmente para links, credenciais e acesso aos sistemas terceirizados.

## Publicação

Substitua os arquivos atuais do repositório pelos arquivos deste pacote.  
Depois do deploy do GitHub Pages, use `Ctrl + F5` ou teste em uma janela anônima para evitar cache da versão anterior.

## Segurança

Não inclua no repositório tokens, senhas administrativas, chaves privadas, códigos de autenticação ou segredos reais.

---

Desenvolvido e mantido por **TI Imob**.
