# Autenticação do ControleFinanca

## Implementação

Express mantém models, services, controllers, routes e middlewares. `src/app.js` monta a API e `src/server.js` verifica configuração, conecta ao MySQL, executa migrations e só então abre a porta. Não existe fallback de contas, sessões ou regras em memória, inclusive no desenvolvimento. `/api/health` é público e retorna 503 quando o MySQL está indisponível. As demais rotas privadas passam pela autenticação antes do parser multipart e dos controllers.

Senhas usam bcryptjs com custo 12, mínimo 12 caracteres e máximo 72 bytes UTF-8, sem truncamento. E-mails são normalizados por trim/minúsculas; índice único em coluna gerada também impede duplicatas normalizadas no banco. Nome tem 2–100 caracteres. IDs de contas e sessões são UUIDs aleatórios. O papel do usuário não pode ser atribuído pelo cadastro.

O JWT HS256 contém apenas identidade, identificador de sessão e claims de validade. Assinatura, algoritmo, expiração, emissor e audiência são verificados. Cada requisição autenticada também consulta `auth_sessions` e `users`: apagar/revogar a sessão impede replay do JWT anterior. Logout remove a sessão atual; outras sessões legítimas da conta continuam válidas. Não há renovação silenciosa: ao expirar, é necessário entrar novamente.

O JWT existe exclusivamente em cookie HttpOnly, persistido por até sete dias (configurável). Produção exige Secure, prefixo `__Host-`, Path=/ e nenhum Domain. O frontend mantém apenas o token CSRF em memória, envia `credentials: include` em JSON, upload e download, desmonta o estado privado no logout/401 e verifica `/auth/me` na abertura. A preferência de tema continua no localStorage; credenciais não são armazenadas ali.

Login, cadastro e logout avisam as outras abas via BroadcastChannel; elas limpam o estado privado antes de recuperar a identidade atual. Navegadores sem esse recurso usam um evento de storage contendo somente horário, sem tokens ou dados pessoais. Classificador e relatórios apresentam erros da API: os antigos fallbacks locais que simulavam CRUD/classificação/relatório bem-sucedido foram removidos, preservando as telas.

CSRF usa `csrf-csrf`, padrão double submit assinado, com HMAC vinculado ao JWT e chave derivada do segredo. Todos os métodos que alteram estado exigem cookie CSRF, cabeçalho `X-CSRF-Token` e `Origin` autorizada, inclusive login e cadastro. O token é rotacionado após autenticar. CORS permite somente as origens exatas configuradas e não substitui esse controle. Clientes fora do navegador também precisam enviar Origin e CSRF nas escritas.

Tentativas de login/cadastro consomem limites MySQL atômicos: 30 requisições por IP e 10 por e-mail normalizado em 15 minutos, compartilhados entre instâncias. Sucessos também contam para controlar criação abusiva. Excesso retorna 429 com Retry-After. Login inexistente e senha incorreta retornam a mesma mensagem e executam bcrypt. Na Render, somente o proxy imediatamente anterior é confiado para obter o IP.

## Instalação local

Use Node compatível com Vite 8 (Node 22.12+ ou versão superior compatível) e MySQL 8.0/8.4 com InnoDB. Crie um schema exclusivo e uma conta de banco, sem usar banco de produção. A conta precisa executar DDL nas migrations e DML nas tabelas da aplicação.

```powershell
npm.cmd ci
npm.cmd --prefix server ci
npm.cmd --prefix client ci
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Copiar os exemplos só deve ser feito na primeira configuração, preservando `.env` existentes. Coloque o segredo gerado em `JWT_SECRET` no `server/.env` e preencha suas credenciais DB_*. Nenhum segredo deve entrar no Git. Inicie com `npm.cmd run dev`. Acesse `http://localhost:5173`; use `localhost` tanto no frontend quanto em `VITE_API_URL`, evitando misturar localhost e 127.0.0.1 para cookies.

| Variável | Local | Produção |
| --- | --- | --- |
| `NODE_ENV` | `development` | `production` |
| `JWT_SECRET` | Aleatório, pelo menos 32 bytes | Segredo próprio do ambiente, gerado pela Render |
| `CLIENT_URL` | `http://localhost:5173` | Origem HTTPS exata do frontend, sem barra final ou caminho. Separe múltiplas origens por vírgula. |
| `VITE_API_URL` (client) | `http://localhost:3000/api` | URL HTTPS da API terminada em `/api` |
| `SESSION_TTL_SECONDS` | `604800` padrão | Inteiro entre 900 e 604800 |
| `COOKIE_SAME_SITE` | `lax` | `none` para sites distintos; `lax`/`strict` se a topologia permitir |
| `DB_HOST/PORT/USER/PASSWORD/NAME` | Sua instância MySQL | Instância escolhida; sem credencial padrão |
| `DB_SSL` | `false` para loopback | `true` para MySQL remoto com TLS |
| `DB_SSL_CA` | Opcional | Conteúdo PEM da CA, quando necessário; validação TLS permanece ativa |
| `MYSQL_EMBEDDED` (Docker) | Sem efeito no `npm run dev` | `true` no Blueprint atual; `false` para MySQL externo |

`DATABASE_URL`/`MYSQL_URL` também são aceitas quando nenhum DB_* está definido. Se utilizar URL, remova DB_* conflitantes; não imprima a URL com credenciais em logs. HTTPS é obrigatório em produção. `none` sem Secure é rejeitado pela configuração.

## Contrato HTTP

Todas as respostas de sessão usam `{ success: true, data: { user, csrfToken } }`. `user` contém somente id, name, email, role e createdAt, sem hash. Erros usam `{ success: false, error: { message } }`.

| Método e caminho | Comportamento |
| --- | --- |
| `GET /api/auth/csrf` | Prepara cookie CSRF e retorna `data.csrfToken`; disponível antes do login |
| `POST /api/auth/register` | Recebe name/email/password, cria conta, oito regras próprias e sessão na mesma transação; 201 |
| `POST /api/auth/login` | Recebe email/password; 200 com usuário e CSRF novo |
| `GET /api/auth/me` | Recupera usuário e token CSRF; 401 sem sessão válida |
| `POST /api/auth/logout` | Exige sessão/CSRF, revoga no banco e limpa cookies; 204 |

Erros: 400 para dados inválidos, 401 para credencial/sessão inválida, 403 para origem/CSRF, 409 para e-mail já utilizado, 429 para excesso de tentativas e 503 para MySQL indisponível. Rotas privadas incluem usuários legados, upload, classificação, CRUD/reset de regras, relatórios e exportações. `/api/users` retorna somente a própria conta; IDs de outra conta retornam 404. O cadastro antigo `POST /api/users` retorna 405 para usuário autenticado e orienta usar `/auth/register`.

Transações importadas e relatórios continuam transitórios, como na arquitetura original: o browser envia os dados para processamento e o servidor não mantém um arquivo ou histórico financeiro compartilhado. Uploads são removidos após processamento, inclusive em erro, têm limite de 5 MB e não são servidos publicamente. Regras persistidas sempre usam `req.user.id`; `userId` enviado pelo browser não determina propriedade.

## Migração e dados legados

`server/src/migrations/001-authentication.js` é executada automaticamente na inicialização e registrada em `schema_migrations`. Um lock MySQL serializa migrations. Passos DDL são reexecutáveis se houver interrupção (MySQL não oferece rollback transacional de DDL).

- Acrescenta `users.passwordHash` anulável e `normalizedEmail` gerado com índice único; normaliza e-mails existentes.
- Preserva IDs, nomes, papéis e dados antigos; não gera senha, usuário padrão ou reivindicação automática de conta antiga.
- Registros sem hash bcrypt válido não autenticam. E-mails legados continuam reservados; habilitar uma conta existente exige um fluxo separado de comprovação de identidade, fora deste cadastro. Não atribua senha padrão.
- Acrescenta `classification_rules.userId` e FK; regras antigas ficam com NULL e invisíveis, pois não é possível provar seu proprietário. Não são compartilhadas como regras particulares.
- Copia padrões do código para cada nova conta; todas as cópias podem ser editadas sem afetar outra conta. Reset substitui somente as próprias regras em transação.
- Cria sessões e limites no MySQL. Excluir a própria conta também remove suas regras e sessões via FK.

Antes de migrar uma base persistente, faça backup e teste uma cópia isolada. Se houver e-mails que colidam após trim/minúsculas, a migração aborta antes de alterar credenciais; resolva o conflito com o responsável pelos dados e execute novamente. Nunca mescle ou apague contas automaticamente. A aplicação não abre a porta se a migração falhar. Para recuperação, mantenha o schema ampliado e publique uma versão corrigida; voltar ao backend antigo reabre endpoints públicos e não é rollback seguro. Não remova colunas ou tabelas com dados para reverter código.

## Render

O `render.yaml` preserva os dois serviços existentes e o plano Free, adicionando somente configuração. Nenhuma provisão, mudança de plano, sincronização remota ou publicação é feita pela implementação local.

Após revisão e integração pelo fluxo `feature → develop → main`, confirme as URLs reais em CLIENT_URL e VITE_API_URL. O Blueprint declara JWT_SECRET com `generateValue: true` (gera quando não existe), sete dias de sessão e SameSite=None. Valores existentes precisam ser conferidos, especialmente se o Environment Group antigo trouxe um JWT_SECRET vazio/fraco ou COOKIE_SAME_SITE=lax. Configure segredos somente no backend. Uma mudança no VITE_API_URL exige novo build do frontend. As rotas SPA continuam reescritas para index.html, incluindo /login e /register. Consulte a [referência do Blueprint](https://render.com/docs/blueprint-spec#generating-random-secrets).

Em serviços configurados pelo painel, defina `CLIENT_URL` diretamente no backend e `VITE_API_URL` no frontend. Cole a origem do frontend sem barra final e inclua `/api` no fim da URL do backend. Sincronize o Blueprint se ele gerencia os serviços. Ao alterar `VITE_API_URL` pelo painel, use **Save, rebuild, and deploy** para incorporar a URL ao JavaScript publicado. [Variáveis de ambiente no Render](https://render.com/docs/configure-environment-variables)

Após a publicação, abra `/api/health` na URL do backend e confirme `200`. Uma chamada do frontend a `/api/auth/me` deve retornar `401` quando ainda não há sessão, com `Access-Control-Allow-Origin` igual à origem do frontend. O erro `CLIENT_URL deve conter origens completas autorizadas, sem caminho` nos logs indica que a API parou antes de abrir a porta. Já `403` com `Origem não autorizada.` indica que o backend iniciou, mas a origem recebida não está em `CLIENT_URL`.

Na topologia com dois domínios onrender.com, cookies são cross-site: HTTPS, SameSite=None e credenciais são necessários, mas alguns navegadores bloqueiam cookies de terceiros. Para compatibilidade nesses navegadores, use frontend/API sob domínios próprios do mesmo site (por exemplo app.example.com e api.example.com) ou proxy da API na origem do frontend, ajustando URLs e cookies; não remova CSRF nem exponha JWT em armazenamento JS. Veja as [regras de cookies do navegador](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie).

O MySQL do contêiner atual é **efêmero**. Ao perder o armazenamento, contas, hashes, regras e sessões também desaparecem, mesmo que o cookie ainda exista no navegador. O próximo acesso retorna 401. Essa configuração serve para dados fictícios, não oferece persistência de contas de produção.

### MySQL persistente

Para usar uma instância persistente já disponível, configure MYSQL_EMBEDDED=false no backend Docker, remova os DB_HOST/PORT locais do Blueprint e aponte DB_* para o MySQL escolhido; revise também variáveis do Environment Group. Configure DB_SSL=true/CA quando remoto, acesso de rede, privilégios, backup e restauração. O entrypoint passa a executar somente a API, sem iniciar MySQL local. A mesma API e migrations funcionam sem alterar models. A implementação não cria nem contrata instâncias ou discos pagos.

Em banco persistente, execute periodicamente em ferramenta administrativa autorizada, repetindo lotes conforme o volume, para remover registros que não podem mais autorizar nada:

```sql
DELETE FROM auth_sessions WHERE expiresAt <= UTC_TIMESTAMP() LIMIT 1000;
DELETE FROM auth_rate_limits WHERE resetAt <= UTC_TIMESTAMP() LIMIT 1000;
```

Rotacionar JWT_SECRET invalida todos os JWTs e CSRF existentes; os usuários entram novamente. Não compartilhe a chave entre desenvolvimento, teste e produção.

## Testes e evidências

```powershell
npm.cmd --prefix server test
npm.cmd --prefix client test
npm.cmd --prefix client run lint
npm.cmd --prefix client run build
npm.cmd --prefix server audit
```

Sem configuração de integração, os testes de banco ficam explicitamente ignorados e não comprovam persistência. Para executá-los, use uma instância MySQL **local de teste**, configure DB_* no processo, crie um schema descartável terminado em `_test` e defina AUTH_TEST_DATABASE=1. A conta desse runner precisa criar/remover schemas: os testes de autenticação e migração criam nomes aleatórios próprios e removem somente os schemas que criaram. `rules.test.js` usa o schema _test fornecido e limpa somente fixtures que criou. Nunca aponte para dados reais. JWT_SECRET e senhas de fixtures são gerados aleatoriamente.

```powershell
$env:AUTH_TEST_DATABASE='1'
# Defina DB_HOST=127.0.0.1, DB_PORT, DB_NAME terminado em _test e credenciais do runner.
# Forneça DB_PASSWORD no ambiente sem versioná-la.
npm.cmd --prefix server test
```

Os testes cobrem validação, duplicatas normalizadas, cadastros concorrentes, bcrypt, login, recuperação, cookies em produção, rotas legadas, CSRF/origem, limites, JWT inválido/expirado, revogação/replay, isolamento, reset, importação/exportação e ausência de informações sensíveis. A migração é exercitada sobre schema anterior com dados fictícios e colisão de e-mails. Testes do cliente exercitam credenciais/CSRF para todos os transportes e descarte de respostas antigas; fixtures HTTP do cliente não substituem a integração real do backend.
