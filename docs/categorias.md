# Categorias e preferências pessoais

Cada conta possui seu catálogo de categorias (identificador, nome e cor), regras de classificação e preferências por descrição. O backend determina o proprietário pela sessão autenticada; `userId` recebido do cliente não define propriedade.

## Comportamento

- O cadastro cria categorias, regras padrão e sessão na mesma transação.
- A tela de importação permite criar, renomear, alterar cores e excluir categorias, mesmo sem extrato aberto.
- As alterações são persistidas no MySQL e compartilhadas entre importação, classificador e relatórios.
- O identificador da categoria é estável: renomear não desfaz regras ou preferências.
- Cada lançamento abre seu próprio modal de classificação com descrição, data e valor. A opção “Salvar como padrão para esta descrição nas próximas importações” começa marcada a cada abertura e pode ser desmarcada para alterar somente aquele registro.
- O botão “Nova categoria” no modal reutiliza o formulário de nome e cor. Ao salvar, a categoria pessoal é criada e fica selecionada na classificação, preservando a opção de padrão. Cancelar a criação retorna à seleção anterior; a classificação só é aplicada ao confirmar “Salvar classificação”.
- Confirmar a categoria altera somente o lançamento selecionado, mesmo quando outro PIX tem exatamente a mesma descrição e mesmo quando a escolha também é salva como padrão.
- Marcar a opção salva o padrão para a descrição completa, normalizada por acentos, maiúsculas/minúsculas e espaços nas extremidades. Não usa correspondência parcial. Novas importações usam esse padrão.
- Uma preferência tem precedência sobre regras por palavras-chave. Outra escolha memorizada para a mesma descrição substitui a anterior.
- O modal consulta e mostra o padrão pessoal existente. Com a opção desmarcada, ele permanece preservado; marcada, a confirmação o substitui. Cancelar não altera o extrato nem o padrão.
- Toda classificação confirmada manualmente permanece no extrato aberto, inclusive ao trocar de aba ou reclassificar, independentemente de ter sido salva como padrão.
- Renomeações e cores atualizam o extrato aberto e seus relatórios. Alterações nas regras reclassificam o extrato, preservando exceções locais.
- Excluir uma categoria arquiva seu registro, remove suas regras e preferências e move os lançamentos abertos para o fallback, sem exigir substituição. Os valores já registrados no histórico são preservados.
- O fallback é identificado por `systemKey=fallback`, pode ser renomeado e ter sua cor alterada, mas não pode ser excluído.
- Restaurar regras padrão recria categorias padrão ausentes e preserva nomes personalizados das categorias padrão que ainda existem. Preferências por descrição permanecem salvas.
- As movimentações individuais continuam transitórias. Ao gerar o relatório, os totais mensais por categoria podem ser confirmados e salvos no [histórico](historico.md). Recarregar a página exige nova importação para revisar movimentações.
- Cada linha também oferece “Excluir”. A confirmação mostra descrição, data e valor e remove somente aquele identificador do extrato aberto. Contagens, totais e relatórios acompanham a exclusão; categorias, regras e padrões salvos permanecem preservados. Excluir o último lançamento retorna à tela sem transações. Reimportar o arquivo restaura os registros excluídos.

## Migração

`002-user-categories` roda automaticamente antes de a API abrir a porta. Cria `user_categories` e `category_preferences`, acrescenta `classification_rules.categoryId` e associa regras existentes ao catálogo de seu proprietário. Categorias adicionais encontradas nas regras são preservadas. Regras legadas sem proprietário continuam isoladas, com `categoryId=NULL`; nenhuma propriedade é presumida.

As alterações DDL podem ser repetidas após interrupção, e o preenchimento dos dados ocorre em transação. A versão é registrada em `schema_migrations`. Categorias e regras novas utilizam chaves estrangeiras que incluem o usuário, impedindo associações entre contas. Operações de escrita são serializadas por conta para evitar conflitos entre renomeação, exclusão e criação de regras.

## API

Todos os endpoints exigem sessão; escritas também exigem origem autorizada e CSRF. Respostas seguem `{ success, data }` ou `{ success: false, error: { message } }`.

| Método | Endpoint | Entrada / efeito |
| --- | --- | --- |
| GET | `/api/categories` | Lista apenas o catálogo da conta. |
| POST | `/api/categories` | `{ name, color }`; nome entre 2 e 100 caracteres, cor hexadecimal `#RRGGBB`. |
| PUT | `/api/categories/:id` | `{ name, color }`; atualiza também os nomes nas regras vinculadas. |
| DELETE | `/api/categories/:id` | Remove categoria, regras e preferências; rejeita o fallback. |
| PUT | `/api/categories/preferences` | `{ description, categoryId }`; salva ou substitui preferência exata. |
| GET | `/api/categories/preferences` | Lista os padrões por descrição exata da conta. |
| PUT | `/api/categories/preferences/:id` | `{ categoryId }`; altera somente a categoria do padrão pessoal. |
| DELETE | `/api/categories/preferences/:id` | Exclui o padrão pessoal; próximas classificações seguem palavras-chave ou fallback. |
| POST | `/api/categories/preferences/lookup` | `{ description }`; consulta o padrão da conta ou retorna `data: null`. A descrição fica no corpo para não aparecer na URL. |

O CRUD de regras aceita `categoryId`. O campo textual `category` continua presente nas respostas e é aceito como entrada para compatibilidade com clientes anteriores. Nesse caso, uma categoria pessoal é criada se necessário.

O classificador apresenta padrões pessoais por descrição exata em grupos por categoria, recolhidos inicialmente e com contagem de descrições. A busca consulta todas as descrições e os nomes de categorias, ignora acentos e abre os grupos correspondentes. Cada grupo exibe até 10 descrições por página; a paginação ocorre no frontend, após a consulta autenticada das preferências. Regras por palavras-chave ficam em uma tabela própria com busca e filtro por categoria.

Padrões anteriores aparecem sem migração. A edição de um padrão mantém a descrição original e altera sua categoria, movendo-o para o grupo correspondente. A exclusão exige confirmação e remove somente o padrão selecionado. Edição e exclusão atualizam a classificação automática do extrato aberto, preservando exceções manuais. Restaurar as regras padrão preserva os padrões por descrição exata.

## Validação

```powershell
npm.cmd --prefix client test
npm.cmd --prefix client run lint
npm.cmd --prefix client run build
npm.cmd --prefix server test
```

Os testes de integração exigem `AUTH_TEST_DATABASE=1`, MySQL local e `DB_NAME` terminado em `_test`, conforme `autenticacao.md`. Use uma instância descartável: o runner precisa criar schemas isolados. Os testes abrangem migração com regras personalizadas, cadastro com padrões, isolamento entre contas, rejeição de IDs de outra conta, preferências, importação, renomeação, exclusão e proteção do fallback.
