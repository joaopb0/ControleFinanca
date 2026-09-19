# CONTRIBUTING.md — Guia completo de contribuição

## Navegação

- [Responsabilidades e autorização](#1-responsabilidades-e-autorização)
- [Branches e adaptação do Git Flow](#2-estrutura-oficial-de-branches)
- [Preparação e branches de trabalho](#4-preparação-segura-do-ambiente)
- [Commits, atualização e Pull Requests](#7-commits-e-mensagens)
- [Revisão e estratégia de merge](#10-revisão-e-critérios-para-integrar-na-develop)
- [Testes e evidências](#12-matriz-de-validação-por-impacto)
- [Regra obrigatória develop → main](#14-regra-obrigatória-de-promoção-develop--main)
- [Releases, hotfixes e sincronização](#16-releases-e-estabilização)
- [Versionamento e deploy](#19-versionamento-tags-e-changelog)
- [Revert, rollback e migrations](#21-revert-e-rollback)
- [CI/CD, segurança e incidentes](#23-cicd-e-proteção-das-branches)
- [Checklists de entrega](#28-checklist-de-entrega-e-conclusão)

## Objetivo e alcance

Este documento define o processo de desenvolvimento, revisão, integração, versionamento e entrega do projeto. Ele se aplica a colaboradores humanos, agentes de IA e automações.

O projeto usa **Git Flow adaptado**: toda alteração de código precisa ser integrada e validada na `develop` antes de chegar à `main`. A promoção acontece **exclusivamente por Pull Request de `develop` para `main`**, inclusive em releases e hotfixes.

A `main` representa código estável e apto à publicação. Isso não significa que cada commit nela já esteja implantado em produção: a versão implantada deve ser identificada pelo artefato, SHA e registro de deploy.

Este guia complementa o [agents.md](agents.md). Regras de Git e GitHub ficam centralizadas aqui; boas práticas de implementação e segurança ficam detalhadas no arquivo de agentes. Leia ambos antes de contribuir.

### Como interpretar as regras

- **Obrigatório / deve:** requisito para a etapa indicada.
- **Proibido / nunca:** ação que o processo não permite.
- **Recomendado / prefira:** padrão esperado; um desvio precisa de justificativa compatível com o contexto.
- **Quando aplicável:** depende do componente e do impacto real; registre por que um controle relevante não se aplica.
- **Bloqueado:** requisito necessário não atendido; não equivale a uma verificação aprovada.

Os comandos deste documento são exemplos, não um script para execução integral. Eles pressupõem Git disponível, repositório existente e autorização para a operação. Substitua nomes de exemplo e confirme o remoto; não copie placeholders literalmente.

Este arquivo não instala ferramentas, cria branches, configura CI nem aplica proteções no GitHub. Essas medidas precisam ser implementadas e verificadas separadamente quando fizerem parte do trabalho autorizado.

## 1. Responsabilidades e autorização

| Papel | Responsabilidade |
| --- | --- |
| Autor da alteração | Entender o requisito, implementar, validar, revisar o próprio diff e fornecer evidências. |
| Revisor | Avaliar comportamento, riscos, testes e compatibilidade; registrar aprovação ou ajustes necessários. |
| Mantenedor | Integrar PRs, manter o processo e decidir o escopo de uma entrega. |
| Responsável pela publicação | Conferir versão, artefatos, ambiente, autorização de deploy e recuperação. |
| Agente de IA | Cumprir as mesmas regras, preservar trabalho existente e distinguir fatos de hipóteses. |

Uma pessoa pode acumular papéis em projetos individuais; registre essa condição sem simular revisão independente. O agente não pode inventar aprovação humana nem aprovar em nome de outra pessoa.

A autorização já concedida no pedido ou no contexto continua válida. Não solicite confirmação repetida para ações cobertas por ela. Ter permissão técnica no GitHub, por outro lado, não amplia o escopo do pedido.

Editar, investigar e validar uma tarefa autorizada não exige nova aprovação a cada passo. Push, merge, publicação, alterações administrativas e ações destrutivas precisam fazer parte do pedido ou estar autorizados no contexto. Preparar código para revisão não implica publicar em produção.

Se uma operação estiver bloqueada, explique a causa e continue o trabalho independente. Uma urgência não autoriza ignorar testes, remover proteções ou alterar dados de produção fora do escopo.

## 2. Estrutura oficial de branches

| Branch | Origem | Finalidade | Integração permitida |
| --- | --- | --- | --- |
| `main` | Estado estável inicial | Histórico estável e versões publicáveis. | Recebe apenas PR de `develop`. |
| `develop` | `main` | Integração e validação do próximo lote. | Recebe PRs de trabalho; segue para `main` após validação. |
| `feature/<descricao>` | `develop` | Nova funcionalidade. | PR para `develop`. |
| `bugfix/<descricao>` | `develop` | Correção do ciclo normal. | PR para `develop`. |
| `hotfix/<descricao>` | `main` | Correção urgente do código estável. | PR para `develop`, depois promoção normal. |
| `release/<versao>` | `develop` | Preparação opcional de versão. | PR para `develop`, depois promoção normal. |
| `docs/<descricao>` | `develop` | Documentação. | PR para `develop`. |
| `chore/<descricao>` | `develop` | Manutenção, dependências, infraestrutura ou sincronização. | PR para `develop`. |

Use nomes em minúsculas, sem espaços ou acentos, com palavras separadas por hífen. Um identificador de tarefa pode ser incluído: `feature/123-recuperacao-conta`.

Branches permanentes não são áreas de edição direta. Não faça commits ou push diretamente em `main` ou `develop`; integre alterações por PR. Não exclua essas branches nem reescreva seu histórico.

### Diferença em relação ao Git Flow clássico

No fluxo deste projeto, `release/*` e `hotfix/*` **não entram diretamente na `main`**. O caminho obrigatório continua sendo `branch de trabalho → develop → validação → PR develop → main`.

Não use comandos automáticos de encerramento de Git Flow que promovam diretamente uma release ou hotfix para `main`. Uma ferramenta só pode ser usada se o comportamento efetivo respeitar esta adaptação.

### Visão do fluxo obrigatório

```mermaid
flowchart TD
    D[develop] -->|origem| F[feature / bugfix / docs / chore]
    F -->|PR e revisão| D
    D -->|origem| R[release]
    R -->|PR e revisão| D
    M[main] -->|origem da correção| H[hotfix]
    H -->|PR e revisão| D
    D --> V[Testes do SHA integrado na develop]
    V --> I[Validação da integração com a main atual]
    I --> A[PR develop para main aprovado]
    A -->|merge commit| M
```

O diagrama mostra o caminho das alterações. Atualizar `main` não realiza um deploy por si só; publicação e sincronização seguem as etapas descritas neste guia.

## 3. Repositório novo e configuração inicial

Se a pasta ainda não for um repositório Git, edite e valide os arquivos autorizados normalmente. Informe que operações de branches, commits e PRs ainda não se aplicam. Não inicialize ou publique um repositório apenas porque este guia contém instruções de Git.

Quando a criação do repositório estiver autorizada, o mantenedor deve registrar um procedimento inicial:

1. Confirmar o destino, a visibilidade e o conteúdo inicial permitido.
2. Revisar todos os arquivos, licenças, exclusões e possíveis segredos.
3. Criar o histórico inicial e estabelecer `main` e `develop` a partir de uma base conhecida.
4. Registrar o SHA inicial e os responsáveis pela configuração.
5. Configurar PRs, estratégia de merge e proteções disponíveis.
6. Passar a seguir o fluxo normal antes de integrar desenvolvimento adicional.

A criação inicial das referências é uma exceção técnica restrita ao bootstrap, pois ainda não existe branch de destino para abrir um PR. Ela não autoriza pushes diretos recorrentes nem dispensa a revisão do conteúdo inicial.

Se já existir histórico com outros nomes de branches, não renomeie, substitua ou reinicialize nada automaticamente. Prepare uma migração compatível com remotos, CI, links e colaboradores.

## 4. Preparação segura do ambiente

Antes de editar, leia a documentação, instruções locais, manifestos, lockfiles e configurações relevantes. Identifique as versões de runtime, serviços e comandos realmente usados.

Depois de ler este guia, inspecione o estado local:

```bash
git status --short --branch
git diff
git diff --cached
```

- Preserve arquivos não rastreados e alterações preexistentes, inclusive no índice.
- Não use stash, reset, clean ou restauração de arquivos para esconder ou descartar trabalho alheio.
- Se a branch atual não servir à tarefa, use uma branch ou worktree isolada sem transportar mudanças desconhecidas.
- Confirme o remoto sem expor URLs que contenham credenciais.
- Instale dependências pelo gerenciador e lockfile existentes; não atualize versões por acidente.
- Use configuração local com valores fictícios e serviços de teste quando disponíveis.
- Não conecte testes a produção nem use dados pessoais reais como fixtures.
- Registre falhas preexistentes relevantes antes da implementação, sem atribuí-las à sua alteração.

Se uma operação depender de uma árvore de trabalho limpa, preserve primeiro o trabalho existente de maneira identificável e acordada. Não execute uma sequência que possa apagá-lo.

## 5. Abrir uma branch de trabalho

Após conferir o remoto, atualizar suas referências e garantir que a troca de branch seja segura:

```bash
git fetch origin
git switch -c feature/123-recuperacao-conta origin/develop
```

Para uma correção normal, substitua o nome por `bugfix/123-validacao-email`. Para documentação ou manutenção, use `docs/*` ou `chore/*`.

Criar a branch a partir da referência remota atualizada evita depender de uma `develop` local possivelmente desatualizada. Se o nome já existir, investigue sua finalidade antes de reutilizá-lo; não force sua recriação.

Implemente uma finalidade por branch sempre que possível. Mudanças independentes devem ter PRs separados; alterações inseparáveis precisam ter sua dependência explicada.

## 6. Implementação e escopo

Entenda o fluxo completo afetado antes de mudar o código. Preserve arquitetura, contratos, nomenclatura e padrões existentes, salvo quando o requisito exigir alteração.

- Corrija a causa de um problema; não desative validações ou silencie erros para obter um resultado aparente.
- Evite refatorações sem relação com a tarefa, reformatar o projeto inteiro e trocar tecnologias por preferência.
- Cubra entradas inválidas, fronteiras de confiança e casos de borda que tenham impacto real.
- Atualize documentação, configuração de exemplo e contratos quando o comportamento mudar.
- Avalie dependências, segurança, licença e compatibilidade antes de incorporar código externo.
- Não inclua arquivos temporários, dados sensíveis, artefatos gerados sem necessidade ou alterações de ambiente pessoal.

Uma feature flag só torna seguro integrar trabalho incompleto quando o estado desativado preserva o comportamento existente, impede efeitos colaterais e é testado. Esconder uma tela não desativa automaticamente endpoints, jobs, migrations ou consumo de recursos.

## 7. Commits e mensagens

Use commits pequenos, coerentes e revisáveis, cada um com finalidade clara. Não misture correções, formatação extensa e funcionalidades independentes.

Adote `tipo(escopo): descrição`, com escopo opcional. Mudanças incompatíveis usam `!` e/ou rodapé `BREAKING CHANGE:`; explique o impacto e a migração. Esses elementos seguem a [especificação Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

| Tipo | Uso no projeto |
| --- | --- |
| `feat` | Funcionalidade nova. |
| `fix` | Correção de defeito, inclusive de segurança. |
| `docs` | Documentação. |
| `test` | Testes. |
| `refactor` | Reorganização interna sem mudança intencional de comportamento. |
| `perf` | Melhoria de desempenho comprovada. |
| `build` / `ci` | Build, empacotamento ou pipeline. |
| `chore` | Manutenção que não se enquadra nos anteriores. |
| `revert` | Reversão identificada e justificada. |

Exemplos:

```text
feat(auth): adiciona recuperação de conta
fix(security): valida proprietário antes de excluir documento
docs: documenta validação da develop
feat(api)!: exige paginação explícita na busca

BREAKING CHANGE: clientes devem enviar os parâmetros page e limit.
```

Os tipos adicionais são convenções do projeto. Não presuma que um tipo personalizado, como `security`, será compreendido pela automação de versões.

Antes de criar um commit autorizado, selecione apenas os arquivos da tarefa e revise o conteúdo efetivamente preparado:

```bash
git add -- caminho/do/arquivo
git diff --cached
git diff --cached --check
git commit -m "docs: documenta processo de contribuição"
```

`caminho/do/arquivo` é um placeholder. Confira arquivos novos: o diff comum não mostra o conteúdo de arquivos ainda não rastreados. Não use `git add .` sem revisar todos os itens que entrariam no commit.

Não atribua autoria, assinatura, coautoria ou aprovação a alguém sem fundamento. Não altere identidade global do Git como efeito colateral da tarefa.

## 8. Atualização da branch e conflitos

Antes de solicitar integração, atualize a branch de trabalho em relação à `develop`:

```bash
git fetch origin
git switch feature/123-recuperacao-conta
git merge origin/develop
```

Comece com trabalho preservado e estado conhecido. Se houver conflitos:

1. Entenda a intenção dos dois lados e os contratos afetados.
2. Resolva o comportamento, incluindo testes, configuração e documentação relacionados.
3. Revise o diff e procure marcadores de conflito restantes.
4. Execute novamente as verificações afetadas pela integração.
5. Conclua o merge somente quando a resolução estiver compreendida.

Não escolha globalmente `ours` ou `theirs` sem avaliação. Não edite lockfiles manualmente para apenas eliminar marcadores; regenere-os com a ferramenta e versão adequadas, revisando as diferenças.

Merge é o padrão para atualizar branches compartilhadas. Rebase de trabalho privado pode ser usado quando compatível com o contexto; não reescreva commits publicados ou usados por outras pessoas sem autorização específica e coordenação.

Force push em `main` e `develop` é proibido. Em branch de trabalho, uma reescrita autorizada exige conferir o estado remoto e usar proteção contra sobrescrever trabalho novo; não é solução automática para conflitos.

## 9. Publicação da branch e abertura de PR

Quando publicar a branch fizer parte do escopo autorizado:

```bash
git push -u origin feature/123-recuperacao-conta
```

Abra o PR com base em `develop`. Confirme repositório de destino, branch de origem e diff completo antes de enviar. Em contribuições por fork, os nomes e destinos dos remotos podem ser diferentes.

Use rascunho enquanto houver implementação incompleta ou validação pendente. A descrição deve explicar o problema concreto, o comportamento resultante e como reproduzir a verificação.

### Modelo reutilizável de descrição de PR

```markdown
## Problema e resultado

Descreva o problema, a mudança de comportamento e o critério de aceite.

## Escopo

- Componentes e contratos afetados:
- Configuração, dependências ou migrations:
- Mudanças incompatíveis e instruções de migração:

## Validação

- SHA de origem validado:
- SHA da base considerada:
- Comandos e respectivos resultados:
- Fluxos manuais, ambiente e resultado esperado/observado:
- Links para CI, relatórios ou evidências:
- Verificações não executadas ou não aplicáveis, com motivo:

## Riscos e recuperação

- Riscos relevantes e controles adotados:
- Rollout, rollback de aplicação e tratamento de dados:
- Pendências reais:

## Revisão

- [ ] Diff e arquivos novos revisados.
- [ ] Validações aplicáveis concluídas, com evidências.
- [ ] Segurança e compatibilidade avaliadas.
- [ ] Documentação atualizada quando necessário.

Relacionamento com tarefa/issue:
```

Remova campos sem relação com um PR simples ou marque-os como não aplicáveis com justificativa breve. Não preencha checklists automaticamente nem inclua segredos, dados pessoais ou detalhes exploráveis de vulnerabilidades em PR público.

## 10. Revisão e critérios para integrar na develop

O revisor deve conseguir entender a alteração sem acessar a conversa que a originou. Confirme:

- O requisito foi atendido e o escopo é coerente.
- Não há regressões conhecidas causadas pelo código proposto.
- Validações e testes realmente exercitam o comportamento alterado.
- Contratos, permissões, dados e integração com outros módulos continuam consistentes.
- Dependências, migrations e configurações têm justificativa e caminho de operação.
- Comentários de revisão foram resolvidos ou receberam decisão registrada.
- A branch está atualizada e os checks obrigatórios estão aprovados.

Como política do projeto, exija ao menos uma aprovação independente quando houver revisor disponível. Em projeto individual, o mantenedor registra a revisão própria e suas limitações; configurações mais rigorosas existentes continuam obrigatórias.

Novos commits ou uma resolução de conflitos podem invalidar a revisão anterior. Reavalie a parte alterada e não trate uma aprovação antiga como autorização irrestrita.

Integre o PR somente após os requisitos aplicáveis. Depois do merge, valide o **commit resultante na `develop`**, pois a combinação com outras alterações pode revelar falhas ausentes na branch de trabalho.

## 11. Estratégia de merge e preservação do histórico

Use **merge commit** na promoção `develop → main` e nas sincronizações que preservam a relação entre as branches permanentes. Não use squash ou rebase-and-merge nessas operações.

Um merge commit registra a ligação com os históricos integrados; squash produz um commit com o efeito das mudanças sem registrar essa relação de merge. Preservar a ancestralidade evita dificuldades nas promoções seguintes. Consulte o [comportamento de merge e squash no Git](https://git-scm.com/docs/git-merge).

PRs pequenos de branches temporárias para `develop` podem usar squash quando o histórico intermediário não tiver valor e a branch não for reutilizada depois. Preserve autoria e uma mensagem final descritiva.

PRs de sincronização de `main` e branches `hotfix/*` derivadas dela devem usar merge commit, para preservar a origem. Não aplique squash indiscriminadamente a branches que carregam histórico compartilhado.

Uma configuração que exija histórico estritamente linear em `main` conflita com esta política de promoção. O mantenedor deve resolver essa incompatibilidade de configuração antes de liberar o fluxo; não contorne a proteção.

## 12. Matriz de validação por impacto

Descubra os comandos nos manifestos, scripts, documentação e CI. Não assuma que `npm test`, um runtime ou uma ferramenta de auditoria existam neste projeto.

| Tipo de alteração | Evidência esperada quando aplicável |
| --- | --- |
| Documentação | Conteúdo, links, exemplos, nomes e consistência entre instruções. |
| Regra de negócio ou bug | Testes do comportamento, entradas inválidas, fronteiras e regressão. |
| API ou integração | Contratos, autorização, erros, timeout e integração com consumidores. |
| Interface | Fluxos alterados, responsividade, acessibilidade e estados de erro/carregamento. |
| Banco de dados | Migration, dados anteriores, constraints, compatibilidade e recuperação. |
| Dependências ou build | Instalação por lockfile, compatibilidade, build e avaliação de vulnerabilidades. |
| Segurança ou permissões | Cenários permitidos e negados, isolamento e testes negativos relevantes. |
| CI, infraestrutura ou deploy | Sintaxe, permissões, eventos, ambiente e comportamento do pipeline. |

Lint, análise de tipos, build e testes existentes devem ser executados conforme o escopo e os requisitos do projeto. Não crie testes que apenas repitam a implementação nem instale ferramentas sem necessidade para marcar um checklist.

Para um bug relevante, prefira demonstrar que o teste de regressão falha antes da correção e passa depois, quando isso for viável. Testes devem ser determinísticos, isolados e usar dados fictícios.

Falhas preexistentes precisam ser diferenciadas de regressões. Um check obrigatório falhando continua bloqueando a promoção; classificá-lo como antigo não o torna aprovado.

## 13. Evidência de validação e ausência de automação

Registre, no PR ou CI, o SHA efetivamente executado, ambiente, versões relevantes, comandos, resultados e links de evidência. Para validação manual, inclua passos reproduzíveis, resultado esperado e observado.

Não confunda:

- **Passou:** a verificação foi executada e atingiu o critério esperado.
- **Falhou:** a verificação encontrou problema.
- **Não executado:** falta ferramenta, acesso, serviço, tempo de execução ou outra condição.
- **Não aplicável:** o controle não tem relação com o escopo, com justificativa.

Se não houver suíte automatizada ou CI, registre essa ausência e faça a validação manual reproduzível adequada ao projeto sobre a `develop`. A revisão do mantenedor deve considerar os limites dessa evidência.

Ausência de testes não significa “todos os testes passaram”. Validação manual só permite promoção quando cobre os critérios necessários ao risco da entrega; se não for suficiente para estabelecer confiança, a promoção permanece bloqueada.

Não exclua testes, enfraqueça assertions, reduza cobertura exigida ou desabilite verificações apenas para obter um resultado verde. Não utilize `--no-verify`, `[skip ci]` ou mecanismos equivalentes para contornar requisitos.

## 14. Regra obrigatória de promoção develop → main

**Teste o estado integrado na `develop` antes de aprovar ou concluir o PR de promoção para `main`. Testar apenas feature, hotfix, release ou o commit sintético de um PR não substitui a validação da `develop`.**

Um PR de promoção pode ser preparado em rascunho para reunir o escopo e as evidências enquanto a validação estiver pendente. Só marque-o como pronto após validar a `develop`; aprovação e merge exigem também os demais critérios abaixo.

Antes da promoção:

1. Integre na `develop`, por PR, todas as alterações do lote.
2. Atualize referências e registre o SHA atual da `develop` e o SHA atual da `main`.
3. Execute e conclua as validações aplicáveis no SHA registrado da `develop`.
4. Revise todas as diferenças do lote, incluindo configuração, dependências e migrations.
5. Abra ou atualize o PR com origem `develop` do próprio repositório e destino `main`; se já estiver em rascunho, confira o lote antes de marcá-lo como pronto.
6. Valide também o resultado proposto da integração com a base atual da `main`.
7. Obtenha revisão, checks obrigatórios aprovados e resolução de discussões.
8. Confirme que os SHAs considerados ainda correspondem ao PR no instante da integração.
9. Faça merge commit pelo fluxo protegido de PR, dentro da autorização existente.
10. Verifique o commit resultante e os checks da `main` antes de publicar artefatos.

Exemplo de inspeção, sem executar promoção:

```bash
git fetch origin
git rev-parse origin/develop
git rev-parse origin/main
git log --oneline origin/main..origin/develop
git diff --stat origin/main...origin/develop
git diff origin/main...origin/develop
```

O diff de três pontos apresenta as alterações desde a base comum. Se as branches divergirem, examine também a diferença direta entre os estados e a integração proposta; uma lista de commits ou um diff isolado não prova compatibilidade.

### Validade das evidências e mudanças durante a promoção

- Se `develop` receber novos commits, valide novamente o novo SHA e atualize a revisão do lote.
- Se `main` mudar, recalcule e teste a integração com a nova base. Quando houver mudanças a incorporar, sincronize-as na `develop` por branch de trabalho e PR, e valide novamente seu SHA resultante.
- Uma resolução de conflitos altera o conteúdo candidato; faça-a em branch de trabalho, integre na `develop` e repita a validação.
- Reexecuções precisam apontar para a revisão correta. Um resultado de SHA anterior não aprova um commit novo.
- Mantenha a origem estável durante a aprovação final ou use automação que detecte mudanças e bloqueie a integração.
- O merge final pode ter SHA diferente do candidato sintético testado; associe os registros e confira que o conteúdo integrado corresponde ao aprovado.

### A promoção inclui o lote completo

Um PR `develop → main` leva **todas as mudanças pendentes da `develop`**, não apenas a feature ou o hotfix mencionado no título. Não escolha arquivos ou faça cherry-pick direto em `main` para contornar essa regra.

Se algum item do lote não estiver pronto, finalize-o, desative-o com segurança ou reverta-o por PR para `develop`. Depois valide novamente o conjunto.

## 15. Bloqueios para promoção

Não promova quando houver:

- Falha em teste, lint, tipos, build ou qualquer check definido como obrigatório.
- Validação aplicável ausente ou evidência que não corresponda à revisão atual.
- Aplicação que não inicia ou fluxo crítico quebrado, quando se tratar de software executável.
- Regressão conhecida introduzida pelo lote ou funcionalidade incompleta alcançável.
- Vulnerabilidade crítica ou risco de segurança impeditivo não resolvido.
- Migration sem validação necessária ou incompatibilidade com dados/serviços existentes.
- Conflito não resolvido, revisão obrigatória pendente ou escopo do lote desconhecido.

Não marque um requisito como “não aplicável” apenas porque ele falhou. Problemas fora do escopo devem ter encaminhamento próprio; os impeditivos de publicação continuam sendo tratados antes da entrega.

## 16. Releases e estabilização

Crie `release/<versao>` a partir da `develop` quando precisar concentrar ajustes finais:

```bash
git fetch origin
git switch -c release/1.4.0 origin/develop
```

Durante a estabilização, limite o trabalho a correções, versão, changelog, documentação, configuração necessária e validação. Evite acrescentar funcionalidades novas ao lote.

Integre a release por PR para `develop`, valide o estado resultante e promova exclusivamente por PR `develop → main`.

Uma branch de release não congela automaticamente o conteúdo da `develop`. Se ela avançar, a promoção incluirá o novo lote; coordene uma janela de estabilização ou reavalie e valide tudo o que entrou.

Registre critérios de aceite, itens incluídos, migrações, riscos, responsáveis pela publicação e recuperação. Depois da promoção, sincronize a ancestralidade da `main` de volta à `develop` por branch de trabalho e PR quando necessário.

## 17. Hotfixes e incidentes de produção

Comece pelo diagnóstico do incidente e identifique o SHA/artefato implantado. Confirme sua relação com a `main`; se produção estiver em versão anterior, avalie o impacto do lote estável ainda não implantado.

Crie a correção urgente a partir da `main`:

```bash
git fetch origin
git switch -c hotfix/erro-login-producao origin/main
```

Reproduza a falha, implemente a menor correção completa e valide o comportamento na branch. Abra PR para `develop`, integre, teste o estado resultante e siga a promoção normal.

Se a `develop` não estiver pronta, escolha uma recuperação compatível com o incidente:

- Desative funcionalidades pendentes com flags efetivamente seguras e testadas, incluindo efeitos de servidor e dados.
- Reverta por PR para `develop` as alterações impeditivas e revalide o conjunto.
- Quando houver procedimento e autorização, faça rollback do ambiente para um artefato previamente aprovado e compatível com os dados atuais, enquanto prepara a correção pelo fluxo normal.

Rollback de artefato não é merge de código novo e não altera essa política de branches. Se nenhuma dessas alternativas for segura, relate o bloqueio e escale a decisão operacional; não faça reset da `develop`, force push ou merge direto de hotfix em `main`.

Registre causa, impacto, correção, evidências e ação preventiva proporcional. Não exponha detalhes exploráveis de um incidente de segurança em canais públicos.

## 18. Sincronizar main com develop

Quando for necessário incorporar a ancestralidade ou alterações existentes na `main`, prepare uma branch intermediária:

```bash
git fetch origin
git switch -c chore/sincroniza-main-apos-1-4-0 origin/develop
git merge origin/main
```

Revise, valide e publique essa branch quando autorizado; abra PR para `develop` e use merge commit. Não faça push direto em `develop`.

Se a sincronização gerar conflitos, resolva-os nessa branch e teste os fluxos afetados. Depois da integração, valide novamente o SHA resultante da `develop` antes de uma próxima promoção.

## 19. Versionamento, tags e changelog

Quando o projeto adotar SemVer, defina o contrato público e use `MAJOR.MINOR.PATCH`: incompatibilidade incrementa MAJOR, funcionalidade compatível incrementa MINOR e correção compatível incrementa PATCH. Pré-releases podem usar `1.4.0-rc.1`. Conteúdo já publicado sob uma versão não deve ser substituído; publique outra versão. Consulte [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

- Atualize versões e changelog na branch de trabalho antes de integrar em `develop`.
- Mantenha manifestos, lockfiles e pacotes relacionados consistentes.
- Descreva mudanças relevantes para quem opera ou consome o software.
- Destaque incompatibilidades, migrações, remoções e correções de segurança sem divulgar segredos.
- Confira o SHA efetivamente integrado em `main` antes de criar a tag.
- Use tags anotadas; assine-as quando houver política e infraestrutura de assinatura.

Exemplo, somente após confirmar o commit de release e a autorização de publicação:

```bash
git tag -a v1.4.0 SHA_DA_RELEASE -m "Release v1.4.0"
git push origin refs/tags/v1.4.0
```

`SHA_DA_RELEASE` é um placeholder para o commit conferido na `main`. Não use um `HEAD` desconhecido. Publique apenas a tag pretendida, evitando enviar tags locais sem relação.

Tags e artefatos de versões publicadas são imutáveis pela política do projeto. Não mova, apague ou reutilize uma tag para corrigir uma release; prepare uma nova versão e documente o problema.

## 20. Deploy e rastreabilidade

Código integrado, versão publicada e ambiente atualizado são estados diferentes. Não anuncie deploy apenas porque houve merge ou criação de tag.

Antes de publicar:

- Confirme autorização, ambiente, janela operacional quando necessária e responsáveis.
- Associe o artefato ao SHA da `main`, à versão e à execução de build.
- Prefira promover o mesmo artefato validado entre ambientes, identificando-o por digest imutável.
- Se houver rebuild, valide novamente e não presuma que produziu os mesmos bytes.
- Confira secrets, variáveis, migrations, integrações e compatibilidade com a versão anterior.
- Defina smoke tests, sinais de falha e procedimento de recuperação.

Após publicar, verifique saúde, fluxos críticos e métricas relevantes. Registre versão implantada e resultado real. Uma falha no pós-deploy exige investigação ou recuperação; não encerre a tarefa apenas porque o pipeline terminou.

## 21. Revert e rollback

**Revert** cria uma alteração de código que desfaz outra. **Rollback** restaura um estado operacional, por exemplo implantando um artefato anterior. Reverter código não desfaz automaticamente migrations, dados, mensagens ou efeitos externos.

Prepare reversões em branch de trabalho, com PR para `develop`, validação e promoção normal. Não reescreva histórico público para esconder a alteração.

Para um commit simples, `git revert SHA_DO_COMMIT` é uma possibilidade depois de avaliar dependências. Para um merge, é necessário identificar o pai de referência; não copie `git revert -m 1` sem entender o grafo. Reverter um merge também influencia reintegrações futuras das mesmas mudanças. Consulte [git-revert](https://git-scm.com/docs/git-revert).

Teste a reversão, confira funcionalidades dependentes e planeje como uma correção futura será reintroduzida. Não presuma que mesclar novamente a branch revertida reaplicará todo o conteúdo.

Um rollback de produção deve usar o procedimento autorizado, verificar compatibilidade de dados e preservar evidências do incidente. Recuperação de banco tem plano próprio; não execute uma migration destrutiva de retorno por reflexo.

## 22. Banco de dados e migrations

Toda alteração de schema ou dados deve considerar o estado atual, volume, relacionamentos, locks, índices e versões da aplicação que coexistirão durante a publicação.

- Versione migrations pelo mecanismo existente e teste em ambiente isolado.
- Avalie o upgrade de uma base anterior com dados representativos e fictícios.
- Não altere retroativamente migrations já aplicadas em ambientes compartilhados; crie uma nova.
- Evite dependência de ajustes manuais não documentados.
- Separe backup, restauração e reversão de schema de rollback de aplicação.
- Registre quando uma migration não for reversível e como recuperar ou corrigir dados.

Prefira mudanças graduais: **expandir → migrar → contrair**. Primeiro adicione estrutura compatível; migre e valide dados; remova a estrutura antiga apenas quando nenhum consumidor depender dela e a janela de retorno permitir.

Backfills grandes precisam de limites, monitoramento, retomada e avaliação de carga. Operações repetíveis devem evitar duplicação ou corrupção. Backup não é garantia de recuperação até que a restauração tenha sido validada de acordo com o risco.

Nunca execute alterações destrutivas em produção sem autorização específica, avaliação de impacto e procedimento de recuperação.

## 23. CI/CD e proteção das branches

Configure as proteções compatíveis com a infraestrutura disponível, verificando seu funcionamento:

- Exigir PR para `main` e `develop`, bloquear push direto, force push e exclusão.
- Exigir revisão e conversas resolvidas conforme a política do projeto.
- Exigir checks com nomes estáveis e origem confiável.
- Exigir nova avaliação quando a revisão ficar desatualizada.
- Verificar explicitamente que PRs para `main` vêm da `develop` **do mesmo repositório**, não de um fork com branch homônima.
- Preservar merge commit nas promoções e sincronizações.
- Aplicar as regras também a administradores e automações, restringindo exceções de bypass.

Proteção de branch não implementa sozinha toda esta política. O GitHub pode aceitar conclusões `skipped` ou `neutral` em checks obrigatórios; aqui, um teste obrigatório precisa ter sido efetivamente executado com sucesso. Confira o comportamento documentado em [proteções de branch do GitHub](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).

Um job omitido por condição pode aparecer como sucesso, enquanto um workflow inteiro omitido por filtro de branch, caminho ou mensagem pode deixar checks pendentes. Investigue a execução real antes de interpretar o indicador visual. Consulte o [diagnóstico de checks obrigatórios do GitHub](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks).

O CI deve cobrir PRs, o commit integrado em `develop`, a integração proposta com `main` e o resultado final em `main`. Um evento de `push` na `develop` pode ser disparado pelo merge de PR; configurá-lo não autoriza push direto por contribuidores.

Se houver merge queue, configure os checks também para o evento `merge_group`. Diferencie o SHA da branch de origem do SHA sintético de integração em eventos de PR; registre o que o job realmente testou. Consulte os [eventos de workflows do GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows).

Use um resultado agregador que falhe quando verificações obrigatórias falharem, forem canceladas ou não executarem indevidamente. Filtros de caminhos, condicionais e `continue-on-error` não podem produzir aprovação falsa.

Quando não for possível aplicar um controle automaticamente, registre a limitação e verifique-o manualmente. Não declare a branch protegida sem inspecionar sua configuração efetiva.

## 24. Segurança do pipeline e da cadeia de dependências

Trate código de PR, dependências, actions, caches e artefatos como entradas que precisam de avaliação.

- Restrinja permissões de tokens ao mínimo necessário por workflow/job.
- Fixe actions e workflows reutilizados de terceiros por SHA completo conferido na origem.
- Não execute código de PR não confiável em contexto privilegiado com secrets ou permissões de escrita.
- Revise cuidadosamente usos de `pull_request_target`, `workflow_run`, runners persistentes e automações acionadas por comentários.
- Evite interpolar títulos de PR, nomes de branches ou outros dados externos diretamente em scripts.
- Prefira credenciais temporárias e identidade federada quando compatíveis com a infraestrutura.
- Preserve isolamento de caches e artefatos entre execuções com níveis de confiança diferentes.
- Revise origem, integridade e permissões de artefatos antes da publicação.

Essas práticas devem acompanhar a avaliação dos workflows existentes; a documentação de [uso seguro do GitHub Actions](https://docs.github.com/en/actions/reference/security/secure-use) detalha os riscos de actions de terceiros e execução privilegiada.

Auditorias de dependências, SAST, secret scanning e outros controles devem acompanhar o risco e as ferramentas disponíveis. Nem todo comando de diagnóstico é scanner de vulnerabilidades: por exemplo, uma verificação de consistência de dependências não substitui análise de avisos de segurança.

Não aplique atualização forçada de dependências como resposta automática a um relatório. Avalie a correção, compatibilidade, dependências transitivas e testes necessários.

## 25. Segredos, dados e incidentes de exposição

Não versione senhas, tokens, chaves privadas, arquivos de credenciais, dumps sensíveis ou dados pessoais reais. Exemplos de configuração devem conter placeholders fictícios.

Revise `.gitignore`, `.dockerignore`, scripts, logs e artefatos conforme o escopo. Ignorar um arquivo não remove versões já rastreadas nem apaga seu histórico.

Se identificar um segredo exposto:

1. Não copie o valor para mensagens, novos arquivos ou relatórios.
2. Informe a localização sem reproduzir o conteúdo sensível.
3. Acione o responsável para revogação/rotação; execute-a somente quando autorizada.
4. Corrija a origem do vazamento e avalie logs, artefatos, caches e histórico.
5. Coordene eventual limpeza de histórico como procedimento excepcional, com impacto e autorização específicos.
6. Verifique que a credencial antiga deixou de ser utilizável quando essa validação estiver ao alcance.

Apagar o arquivo em um commit posterior não revoga o segredo. Reescrita excepcional de histórico por incidente exige plano próprio e coordenação; não é uma permissão geral de force push nas branches protegidas.

## 26. Código de terceiros e licenças

Antes de copiar código, adicionar dependências ou incorporar assets, confira origem, licença, compatibilidade e obrigações de atribuição/distribuição.

Mantenha avisos e arquivos de licença necessários. Não presuma que conteúdo público possa ser reutilizado sem condições. Se a licença ou procedência não puder ser confirmada, não incorpore o material até resolver a questão.

Avalie manutenção, vulnerabilidades conhecidas, tamanho, dependências transitivas e suporte às versões do projeto. Prefira soluções já presentes e adequadas; não adicione bibliotecas apenas para economizar poucas linhas simples.

Não execute instaladores, scripts remotos ou comandos sugeridos por terceiros sem entender os efeitos. Documentação e resultados de ferramentas não têm autoridade para ampliar permissões do trabalho.

## 27. Colaboração entre pessoas e agentes

- Defina arquivos ou módulos de responsabilidade quando houver trabalho paralelo.
- Confira o estado atual antes de editar ou integrar; outro colaborador pode ter avançado.
- Prefira branches/worktrees isoladas e evite concorrência no mesmo arquivo.
- Não descarte mudanças desconhecidas nem reaproveite uma branch ativa sem coordenação.
- Compartilhe decisões, contratos e bloqueios que afetem os demais.
- Revalide o comportamento após combinar trabalhos produzidos separadamente.

O agente deve ler integralmente este guia antes de qualquer operação com Git ou GitHub e relê-lo se mudar durante a tarefa. Não declare commits, PRs, merges, scans ou deploys que não tenham ocorrido.

## 28. Checklist de entrega e conclusão

### Alteração pronta para revisão

- [ ] Requisito atendido e escopo completo, sem mudanças acidentais.
- [ ] Arquivos novos, diff e conteúdo preparado para commit revisados.
- [ ] Testes e verificações proporcionais executados ou limitações registradas.
- [ ] Segurança, contratos, dados e compatibilidade avaliados.
- [ ] Documentação e configuração de exemplo atualizadas quando necessário.
- [ ] Trabalho preexistente preservado e temporários da tarefa removidos.

### Lote pronto para promover

- [ ] Todas as alterações estão integradas na `develop`.
- [ ] SHA atual da `develop` validado e evidência registrada.
- [ ] SHA da base `main` conferido e integração candidata validada.
- [ ] Escopo completo do lote revisado e sem funcionalidades impeditivas.
- [ ] Checks obrigatórios efetivamente aprovados e revisões válidas.
- [ ] Migrations, segurança, operação e recuperação avaliadas.
- [ ] PR exclusivamente `develop → main`, com merge commit.
- [ ] Nenhuma mudança posterior invalidou a evidência.

### Publicação concluída, quando fizer parte do pedido

- [ ] Commit final da `main` e checks posteriores conferidos.
- [ ] Versão, tag e artefato correspondem ao código aprovado.
- [ ] Deploy autorizado realizado no ambiente correto.
- [ ] Smoke tests e sinais operacionais verificados.
- [ ] Estado final e eventuais pendências registrados.

Uma tarefa de implementação pode estar concluída e pronta para revisão sem que o código tenha sido publicado. A entrega deve informar exatamente o estágio alcançado, o que mudou, os arquivos afetados, o que foi validado e as limitações reais.

**Código em elaboração permanece em branch de trabalho. Código integrado e testado passa pela `develop`. Apenas o lote validado e aprovado chega à `main`.**
