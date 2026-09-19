# AGENTS.md — Diretrizes de Desenvolvimento para Agentes de IA

> [!IMPORTANT]
> **INSTRUÇÃO OBRIGATÓRIA DE INICIALIZAÇÃO:**
> Este projeto utiliza o sistema nativo de Skills do Google Antigravity.
> O agente **DEVE OBRIGATORIAMENTE** ativar e consultar a skill **[`diretrizes-desenvolvimento`](./.agents/skills/diretrizes-desenvolvimento/SKILL.md)** para qualquer tarefa de desenvolvimento, arquitetura, banco de dados, segurança, testes ou Git.
> Todas as normas completas, tabelas de impacto e guias detalhados estão preservados na íntegra nos módulos de [`references/`](./.agents/skills/diretrizes-desenvolvimento/references/).

---

## 1. Princípios Inegociáveis e Governança

1. **Prioridade:** Entregar soluções **corretas, seguras, simples, compatíveis, verificáveis e sustentáveis**, preservando o trabalho existente. Rapidez não justifica ocultar falhas, enfraquecer controles ou declarar resultados sem evidência real.
2. **Preservação da Arquitetura:** Mantenha a arquitetura, convenções e estrutura de pastas existentes. Prefira a menor alteração que resolva o problema por completo. Proibida formatação global ou refatoração cosmética não solicitada.
3. **Tipagem e Erros:** Proibido o uso de `any`, casts cegos, supressão de erros no linter ou `catch` vazios para silenciar falhas. Trate falhas de forma segura e transparente.
4. **Evidências Reais:** Nunca afirme que testes passaram sem executá-los e inspecionar a saída real. Proibido criar mocks artificiais ou alterar testes apenas para deixar o pipeline verde.
5. **Autonomia com Responsabilidade:** Avance nas tarefas reversíveis de leitura, investigação e implementação local. Operações destrutivas (apagar dados, reescrever histórico do Git, migrations irreversíveis) exigem autorização explícita.

---

## 2. Leitura Obrigatória para Operações com Git / GitHub

> [!WARNING]
> **Antes de modificar o projeto e, obrigatoriamente, antes de QUALQUER operação com Git ou GitHub (branches, commits, push, PRs, merges, tags), LEIA INTEGRALMENTE o [CONTRIBUTING.md](./CONTRIBUTING.md).**

A consulta prévia ao [CONTRIBUTING.md](./CONTRIBUTING.md) e ao guia [`references/18-git-github-e-promocao-para-producao.md`](./.agents/skills/diretrizes-desenvolvimento/references/18-git-github-e-promocao-para-producao.md) é estritamente obrigatória em qualquer ferramenta (CLI, terminal ou chamadas de API).

---

## 3. Uso Obrigatório das Skills por Domínio

Ao atuar em cada área do projeto, o agente deve carregar a skill [`diretrizes-desenvolvimento`](./.agents/skills/diretrizes-desenvolvimento/SKILL.md) e ler os arquivos correspondentes em `references/`:

| Domínio de Trabalho | Arquivo de Referência Obrigatório na Skill |
| :--- | :--- |
| **Git, Commits, PRs e CI/CD** | [`18-git-github-e-promocao-para-producao.md`](./.agents/skills/diretrizes-desenvolvimento/references/18-git-github-e-promocao-para-producao.md) e [`19-ci-cd-entrega-e-recuperacao.md`](./.agents/skills/diretrizes-desenvolvimento/references/19-ci-cd-entrega-e-recuperacao.md) |
| **Investigação e Bugs** | [`04-investigacao-antes-da-implementacao.md`](./.agents/skills/diretrizes-desenvolvimento/references/04-investigacao-antes-da-implementacao.md) e [`08-diagnostico-e-correcao-de-bugs.md`](./.agents/skills/diretrizes-desenvolvimento/references/08-diagnostico-e-correcao-de-bugs.md) |
| **Análise de Impacto** | [`05-analise-de-impacto-e-plano-de-mudanca.md`](./.agents/skills/diretrizes-desenvolvimento/references/05-analise-de-impacto-e-plano-de-mudanca.md) |
| **Código e Integrações** | [`06-implementacao-e-preservacao-do-projeto.md`](./.agents/skills/diretrizes-desenvolvimento/references/06-implementacao-e-preservacao-do-projeto.md) e [`09-apis-contratos-e-integracoes-externas.md`](./.agents/skills/diretrizes-desenvolvimento/references/09-apis-contratos-e-integracoes-externas.md) |
| **Banco e Migrations** | [`10-banco-de-dados-migrations-e-integridade.md`](./.agents/skills/diretrizes-desenvolvimento/references/10-banco-de-dados-migrations-e-integridade.md) e [`15-13-sql-injection-e-consultas-dinamicas.md`](./.agents/skills/diretrizes-desenvolvimento/references/15-13-sql-injection-e-consultas-dinamicas.md) |
| **Frontend e Acessibilidade** | [`11-frontend-experiencia-e-acessibilidade.md`](./.agents/skills/diretrizes-desenvolvimento/references/11-frontend-experiencia-e-acessibilidade.md) |
| **Segurança (29 Áreas OWASP)** | [`15-00-seguranca-desde-a-concepcao-intro.md`](./.agents/skills/diretrizes-desenvolvimento/references/15-00-seguranca-desde-a-concepcao-intro.md) até `15-29` |
| **Testes e Validação** | [`16-estrategia-de-testes-proporcional-ao-impacto.md`](./.agents/skills/diretrizes-desenvolvimento/references/16-estrategia-de-testes-proporcional-ao-impacto.md) e [`17-execucao-de-validacoes-e-evidencias.md`](./.agents/skills/diretrizes-desenvolvimento/references/17-execucao-de-validacoes-e-evidencias.md) |
| **Checklists de Entrega** | [`25-checklist-de-desenvolvimento-e-revisao.md`](./.agents/skills/diretrizes-desenvolvimento/references/25-checklist-de-desenvolvimento-e-revisao.md) e [`26-checklist-de-seguranca.md`](./.agents/skills/diretrizes-desenvolvimento/references/26-checklist-de-seguranca.md) |

---

## 4. Regra Final de Entrega

O trabalho só é considerado concluído quando:
1. O código cumpre todos os critérios de aceitação sem quebrar funcionalidades existentes.
2. Todos os testes automatizados relevantes foram executados com sucesso comprovado por logs.
3. Os checklists [25](./.agents/skills/diretrizes-desenvolvimento/references/25-checklist-de-desenvolvimento-e-revisao.md) e [26](./.agents/skills/diretrizes-desenvolvimento/references/26-checklist-de-seguranca.md) foram verificados.
4. As alterações estão documentadas e prontas conforme o [CONTRIBUTING.md](./CONTRIBUTING.md).