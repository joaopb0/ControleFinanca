# Histórico mensal de receitas e despesas

Ao clicar em **Gerar relatório**, o usuário revisa e confirma os totais que serão salvos antes de abrir o relatório. O histórico armazena apenas receitas e despesas em centavos por categoria e mês. Descrições, destinatários, nomes de arquivos e movimentações individuais não são enviados ao endpoint de histórico nem gravados por ele. As preferências de classificação continuam com o comportamento anterior.

## Contribuições de extratos

Cada importação recebe um identificador próprio, mantido enquanto o extrato permanece aberto. Um arquivo com diversos meses é dividido conforme as datas dos lançamentos revisados; exclusões e correções individuais entram no resumo. Receitas e despesas da mesma categoria são somadas separadamente, sem compensação prévia.

- Um novo extrato soma uma nova contribuição ao histórico.
- Se já houver outros extratos nos meses afetados, a prévia mostra valores atuais, valores do extrato e resultado, exigindo confirmação adicional de que os valores ainda não foram contabilizados.
- Arquivos diferentes com movimentações sobrepostas não são deduplicados automaticamente, pois as movimentações não são armazenadas.
- Gerar novamente o relatório de um extrato inalterado apenas abre o relatório, sem duplicar totais.
- Editar um extrato já salvo permite substituir somente sua contribuição. Meses retirados desse extrato também são retirados da contribuição, preservando os demais extratos.
- Cada solicitação de salvamento recebe uma chave estável. Uma tentativa repetida após falha de rede devolve a confirmação anterior, sem executar a soma novamente.
- Revisões da contribuição e do histórico da conta impedem salvar sobre uma prévia desatualizada. Um conflito exige nova revisão e confirmação.
- Recarregar a página encerra o extrato transitório. Reimportar o arquivo depois disso é uma nova contribuição, sujeita à confirmação de sobreposição.

Datas inválidas e valores não finitos são rejeitados antes do salvamento. Os cálculos utilizam centavos inteiros e arredondamento comercial simétrico. O limite é de 10000 lançamentos e 2000 combinações de mês e categoria por extrato; o total mensal de receitas mais despesas é limitado a 1 trilhão de centavos.

## Categorias arquivadas

A migração `003-spending-history` acrescenta `deletedAt` ao catálogo. Excluir uma categoria arquiva seu registro, remove regras e preferências vinculadas e move os lançamentos abertos para o fallback. O histórico permanece com o nome e a cor registrados quando a contribuição foi salva. A consulta marca categorias atualmente arquivadas.

Criar novamente uma categoria com o mesmo nome pode reativar seu identificador anterior. Restaurar regras padrão reativa as respectivas categorias padrão, preservando sua identidade; se o nome estiver em uso, utiliza um nome distinto. O fallback continua protegido contra exclusão.

## Consulta, exportação e exclusão

A aba **Histórico** é o dashboard de relatório financeiro: reutiliza os mesmos cards, filtro de período, controles de CSV/PDF e tabela de categorias. Ao confirmar **Gerar relatório**, essa aba abre selecionada e filtrada pelo mês atual no calendário de São Paulo, mesmo quando o extrato importado contém outros meses. Se o mês atual estiver vazio, os controles continuam disponíveis para selecionar outro período.

Os filtros operam sobre meses completos, com mês inicial/final e atalhos **Todo o período**, **Mês atual** e **Últimos 3 meses**. Cards, maior categoria de despesa, subtotais, percentuais e exportações consultam o mesmo período do histórico persistido. Receitas e despesas da mesma categoria têm linhas separadas. Quantidades de lançamentos não são armazenadas e aparecem como indisponíveis, sem gerar contagens artificiais.

As exclusões ficam em **Gerenciar histórico** no cabeçalho do dashboard. Quando apenas um mês está selecionado, é possível excluir esse mês; a exclusão de todo o histórico também permanece disponível.

Excluir um mês remove suas entradas em todas as contribuições da conta, preservando outros meses. Excluir todo o histórico remove as contribuições e os recibos de salvamento. Ambas as operações preservam o catálogo e o extrato aberto. As revisões são atualizadas para impedir que tentativas antigas de salvamento restaurem os dados removidos. Confirmar novamente o extrato aberto depois da exclusão pode registrá-lo outra vez.

Excluir a conta remove suas contribuições, entradas, recibos e versão por chaves estrangeiras. O histórico usa o MySQL já configurado, sem mudança de hospedagem ou política de retenção nesta implementação acadêmica.

## API e camadas

Rotas, controllers, service e model ficam separados. O proprietário é sempre `req.user.id`. Todos os endpoints exigem sessão; métodos de escrita e prévia também exigem CSRF e origem autorizada. Operações são transacionais e serializadas por conta, seguindo o padrão do catálogo.

| Método | Endpoint | Finalidade |
| --- | --- | --- |
| GET | `/api/history?from=AAAA-MM&to=AAAA-MM` | Consultar agregados da própria conta. |
| GET | `/api/history/report?from=AAAA-MM&to=AAAA-MM` | Resumo do dashboard no período, com totais e detalhamento por categoria. |
| GET | `/api/history/report/csv` e `/api/history/report/pdf` | Exportar o dashboard com os mesmos filtros mensais. |
| POST | `/api/history/preview` | Receber `{ batchId, entries }` e calcular a prévia sem gravar valores. |
| POST | `/api/history/contributions` | Salvar com `requestId`, `expectedRevision`, `expectedHistoryVersion` e `confirmOverlap`. |
| GET | `/api/history/export/csv` | Exportar os agregados, com filtros opcionais. |
| DELETE | `/api/history/months/:month` | Excluir um mês. |
| DELETE | `/api/history` | Excluir todo o histórico da própria conta. |

Cada entrada contém somente `{ month, categoryId, incomeCents, expenseCents }`. O backend verifica propriedade e disponibilidade da categoria e determina seus rótulos. Não são aceitos valores negativos, fracionários em centavos ou categorias repetidas no mesmo mês. Reutilizar a mesma chave de solicitação com outro conteúdo retorna 409.

## Verificação

```powershell
npm.cmd --prefix client test
npm.cmd --prefix client run lint
npm.cmd --prefix client run build
npm.cmd --prefix server test
```

A integração real exige MySQL local isolado com `AUTH_TEST_DATABASE=1`, credenciais de um runner que possa criar schemas e `DB_NAME` terminado em `_test`, conforme `autenticacao.md`. Os testes verificam soma entre extratos, isolamento entre contas, CSRF, precisão, concorrência, idempotência, atualização de contribuições, categorias arquivadas, exportação e exclusões.
