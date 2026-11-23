# Enriquecimento de estabelecimentos e logotipos

O ControleFinanca pode identificar automaticamente a marca comercial associada a lançamentos importados via CSV, exibindo o nome comercial limpo, o logotipo oficial (quando disponível) e metadados opcionais (domínio e setor) sem alterar a descrição original nem interferir na classificação ou nos cálculos financeiros.

## Provedor escolhido: Brandfetch

Após comparar as principais alternativas ativas (descartando a Clearbit Logo API, que foi descontinuada), o projeto utiliza a **Brandfetch** (`Brand Search API` + `Logo API`, com suporte opcional à `Brand API`):

| Critério | Brandfetch (escolhido) | Logo.dev | Brand.dev / Context.dev |
| --- | --- | --- | --- |
| Pesquisa por nome comercial | Sim (`GET /v2/search/{name}`) | Sim (`GET /v2/search?q={name}`) | Sim |
| Identificação de domínio | Sim (`domain`) | Sim (`domain`) | Sim |
| Logotipo oficial | Sim (`icon` via `cdn.brandfetch.io`, suporta `fallback/404`) | Sim (`logo_url` via `img.logo.dev`, suporta `fallback=404`) | Sim |
| Segmento / setor (`industry`) | Opcional via Brand API (`company.industries[]`, cota gratuita limitada a 100 consultas únicas) | Não disponível (nem no plano pago da Brand API) | Sim (NAICS/SIC), mas consome créditos escassos |
| Limite gratuito | **500.000 buscas/mês** (Brand Search) e **1.000.000 logos/mês** (Logo API) | 500.000 logos/mês + US$ 5/mês em créditos de API | ~100 a 500 créditos/mês |
| Uso comercial no plano gratuito | **Permitido sem exigência de atribuição visual** | Exige link visível obrigatório (*"Logos provided by Logo.dev"*) em uso comercial gratuito | Planos pagos a partir de ~US$ 20–29/mês |
| Autenticação | Client ID (`BRANDFETCH_CLIENT_ID`) na busca/CDN; Bearer API Key opcional (`BRANDFETCH_API_KEY`) no backend para setor | Secret Key (`sk_...`) no backend + Publishable Key (`pk_...`) nas URLs de imagem | Bearer API Key |

### Por que Brandfetch

1. **Melhor relação custo-benefício para uso real e comercial:** oferece 500 mil buscas/mês e 1 milhão de renderizações de logotipo/mês gratuitamente, sem exigir badge/atribuição visual obrigatória.
2. **Alinhamento com a segurança do projeto:** toda consulta de busca acontece exclusivamente no backend (`server/src/services/merchantEnrichment.service.js`), sem nenhuma credencial em `client/.env` ou variáveis `VITE_*`.
3. **Sem dados inventados:** a Brand Search API retorna `name`, `domain` e `icon`; quando `BRANDFETCH_API_KEY` não está configurada, `industry` permanece `null`.

## Como obter a chave e configurar localmente

1. Crie uma conta gratuita no portal de desenvolvedores da Brandfetch: [https://developers.brandfetch.com](https://developers.brandfetch.com).
2. Copie o **Client ID** no painel da Brandfetch.
3. No arquivo local `server/.env` (nunca versionado no Git), adicione:

```dotenv
BRANDFETCH_CLIENT_ID=seu_client_id_aqui
```

4. *(Opcional)* Se desejar consultar também o setor (`industry`) pela Brand API:

```dotenv
BRANDFETCH_API_KEY=sua_api_key_privada_aqui
```

> [!NOTE]
> Em produção, configure os domínios autorizados (*Allowed Domains / Referer*) no painel da Brandfetch para restringir o uso do `BRANDFETCH_CLIENT_ID` nas imagens carregadas pelo navegador. A `BRANDFETCH_API_KEY` (opcional) é uma chave privada usada somente no cabeçalho `Authorization: Bearer` no backend e nunca é exposta em respostas HTTP, URLs ou logs.

### Variáveis de ambiente suportadas (`server/.env`)

| Variável | Obrigatória | Padrão | Finalidade |
| --- | --- | --- | --- |
| `BRANDFETCH_CLIENT_ID` | Não | *(vazio)* | Habilita a busca de marcas e logotipos via Brandfetch. Quando vazia, o enriquecimento é desativado silenciosamente. |
| `BRANDFETCH_API_KEY` | Não | *(vazio)* | Habilita consulta complementar de `industry` na Brand API (uso restrito ao backend). |
| `MERCHANT_ENRICHMENT_TIMEOUT_MS` | Não | `3000` | Timeout por requisição externa em ms (limitado entre `500` e `10000`). |
| `MERCHANT_ENRICHMENT_CONCURRENCY` | Não | `4` | Número máximo de consultas simultâneas ao provedor (entre `1` e `10`). |
| `MERCHANT_ENRICHMENT_CACHE_TTL_MS` | Não | `86400000` | Tempo de retenção em cache de marcas encontradas (24 h). |
| `MERCHANT_ENRICHMENT_CACHE_MAX_SIZE` | Não | `500` | Limite máximo de marcas mantidas no cache LRU em memória. |

## Fluxo de processamento e preservação dos dados

O enriquecimento é integrado diretamente ao endpoint protegido `POST /api/upload-csv` (via `csvImportService.parseCsvFile`):

1. O CSV é normalizado (`CsvImportModel.normalizeCsvRow`).
2. O classificador (`classifyItem`) aplica regras e preferências pessoais **exclusivamente sobre a descrição original** (`description`).
3. O serviço `merchantEnrichment.service.js`:
   - Filtra operações bancárias genéricas e transferências pessoais (ex.: `RECEBIMENTO PIX - GUILHERME`, `PIX ENVIADO - ...`, `TED`, `Salário mensal`), evitando consultas desnecessárias e vazamento de nomes de pessoas físicas.
   - Remove prefixos de intermediadores de pagamento (`PG *`, `PAG*`, `MERCADO PAGO*`, `PAYPAL *`, `EBN *`, etc.) e sufixos operacionais (`*TRIP`, `*PEDIDO`, parcelas `02/12`, códigos de transação), diferenciando o intermediador do estabelecimento real (ex.: `MERCADO PAGO*STORE` não recebe logotipo do Mercado Pago).
   - Deduplica estabelecimentos únicos dentro do mesmo lote e reutiliza o cache em memória (LRU + TTL) indexado apenas pelo nome comercial normalizado — nunca por descrições financeiras brutas, valores, datas ou identificadores de conta.
   - Valida estritamente a correspondência entre candidato e marca retornada, além de validar protocolo `https:` e host permitido (`cdn.brandfetch.io` / `asset.brandfetch.io`) para `logoUrl`, convertendo `/fallback/lettermark/` em `/fallback/404/` para acionar o fallback visual próprio da interface quando a marca não possui logotipo real.
4. O resultado é anexado em `transaction.merchant` (`{ name, domain, logoUrl, industry, confidence }` ou `null`), preservando intactos `description`, `value`, `date`, `category` e todos os campos financeiros.

Nenhuma nova tabela ou migration de banco de dados foi criada, pois os lançamentos importados continuam transitórios em memória e o histórico persiste apenas totais agregados por mês e categoria.

## Comportamento em caso de indisponibilidade ou ausência de chave

- **Sem `BRANDFETCH_CLIENT_ID` configurada:** nenhuma requisição externa é disparada; todas as transações chegam com `merchant: null` e a interface exibe normalmente a descrição original com ícone neutro.
- **Timeout, falha de rede, erro 5xx ou resposta inválida:** o erro é contido no serviço sem interromper a importação do CSV; os lançamentos são retornados normalmente com `merchant: null` e a falha transitória não envenena o cache negativo permanente.
- **HTTP 429 (limite de taxa) ou 401/403 (credencial inválida):** um circuito de proteção pausa novas chamadas no lote atual para evitar sobrecarga e preserva o funcionamento completo do sistema financeiro.
- **Erro ao carregar imagem no navegador:** o componente `MerchantAvatar` captura `onError` e exibe automaticamente um badge com iniciais (quando a empresa foi identificada) ou ícone genérico neutro, sem imagens quebradas.

## Limitações conhecidas e custos

- O plano gratuito da **Brand Search API** (500.000 buscas/mês) e da **Logo API** (1.000.000 logos/mês) cobre amplamente o uso padrão sem custo. O campo `industry`, porém, só é fornecido pela **Brand API**, cuja cota gratuita é única (100 consultas para teste); uso contínuo de `industry` em escala exige plano pago da Brandfetch.
- Estabelecimentos locais muito pequenos ou descrições excessivamente abreviadas/genéricas (ex.: `MERCADO PAGO*STORE`) podem não ter correspondência confiável e preservam a descrição original por segurança contra falsos positivos.
- O cache reside em memória no processo Node.js (reiniciado a cada restart do servidor), evitando persistência de dados financeiros em armazenamento compartilhado.
