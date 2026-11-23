# ⚡ Projeto Full-Stack: React + Node.js (Clean Architecture)

Categorias, cores e preferências de classificação são persistidas por usuário. Consulte [Categorias e preferências pessoais](docs/categorias.md) para comportamento, migração e API.

O [Histórico mensal](docs/historico.md) acumula receitas e despesas por mês e categoria ao confirmar a geração do relatório, com controle de duplicação por contribuição de extrato.

Estrutura profissional e padronizada com separação clara de responsabilidades entre o **Front-end (Client)** e o **Back-end (Server)**.

O ControleFinanca exige autenticação real no MySQL. Consulte [Autenticação e configuração](docs/autenticacao.md) para instalação local, variáveis, migração, testes e publicação na Render. Antes de `npm run dev`, instale as dependências e configure `server/.env` e `client/.env` conforme os respectivos `.env.example`; o servidor não inicia sem MySQL e `JWT_SECRET` válidos.

---

## 📁 Estrutura de Pastas

```text
Jest/
├── client/                     # 🌐 Front-end (React 19 + Vite)
│   ├── public/                 # Arquivos estáticos servidos diretamente
│   ├── src/
│   │   ├── assets/             # Imagens, ícones e mídias
│   │   ├── components/         # Componentes reutilizáveis
│   │   │   ├── common/         # Botões, Cards, Inputs, etc.
│   │   │   └── layout/         # Navbar, Footer, Sidebar
│   │   ├── contexts/           # Estados globais (Context API / Theme)
│   │   ├── hooks/              # Custom Hooks reutilizáveis (useFetch)
│   │   ├── pages/              # Páginas e telas da aplicação
│   │   │   ├── Home/           # Página inicial explicativa
│   │   │   └── Users/          # Tela integrada com a API
│   │   ├── services/           # Comunicação HTTP (api.js)
│   │   ├── styles/             # CSS Global e variáveis de tema
│   │   ├── utils/              # Funções utilitárias (formatters)
│   │   ├── App.jsx             # Componente raiz
│   │   └── main.jsx            # Ponto de entrada do React
│   ├── .env                    # Variáveis de ambiente locais
│   ├── package.json
│   └── vite.config.js
│
├── server/                     # 🚀 Back-end (Node.js + Express)
│   ├── src/
│   │   ├── controllers/        # Controladores das rotas (regras de negócio)
│   │   ├── middlewares/        # Middlewares (logs, tratamento de erros)
│   │   ├── models/             # Modelos e acesso a dados
│   │   ├── routes/             # Definição e agrupamento de rotas REST
│   │   └── server.js           # Inicialização do servidor Express
│   ├── .env                    # Variáveis secretas do servidor (PORT, etc.)
│   └── package.json
│
├── .gitignore
├── package.json                # Orquestrador com scripts simultâneos
└── README.md
```

---

## 🚀 Como Executar o Projeto

Você tem a flexibilidade de rodar os dois juntos com um único comando ou cada um separadamente.

### 🌟 Opção 1: Rodar Front-end e Back-end juntos (Recomendado)
Na pasta raiz do projeto:
```bash
npm run dev
```
Isso iniciará o **Servidor Express** em `http://localhost:3000` e o **React Vite** em `http://localhost:5173` simultaneamente no mesmo terminal!

---

### 🌟 Opção 2: Rodar Separadamente

#### Rodando apenas o Back-end:
```bash
cd server
npm run dev
```
> Disponível em `http://localhost:3000/api`

#### Rodando apenas o Front-end:
```bash
cd client
npm run dev
```
> Disponível em `http://localhost:5173`

---

## 🛠️ Tecnologias e Funcionalidades

- **Front-end:**
  - React 19 + Vite 8
  - Clean Architecture & Modular Folder Structure
  - Dark / Light Mode com Context API e CSS Variables
  - Custom Hook `useFetch` para requisições assíncronas com tratamento de loading/erro
  - Camada de Serviço HTTP centralizada em `src/services/api.js`

- **Back-end:**
  - Node.js + Express 4
  - CORS configurado para comunicação segura com o Vite
  - Cadastro, login, sessão recuperável e logout com JWT HttpOnly e revogação no MySQL
  - Rotas privadas protegidas, CSRF e limitação de tentativas persistida no MySQL
  - Regras de classificação isoladas por usuário; padrões copiados para cada conta
  - Roteamento modular (`/api/health`, `/api/auth`, `/api/users`)
  - Middleware global de captura e tratamento de erros
  - Middleware de log de requisições em tempo real

## MySQL na Render

Para a demonstração, o `backend-api` usa um único serviço web Docker no plano Free. O script de inicialização sobe o MySQL 8.4 localmente e executa `npm start` para a API. O banco aceita conexões somente em `127.0.0.1`, dentro do mesmo contêiner. O frontend continua como site estático.

1. **Antes de sincronizar o Blueprint**, crie um Environment Group chamado `controle-financa-mysql` no mesmo workspace dos serviços, no Dashboard da Render. Em **Add from .env**, importe o arquivo local `server/.env` e salve o grupo. O Blueprint cria uma senha aleatória separada para o usuário root do MySQL.
2. Sincronize o Blueprint vinculado a este repositório usando a branch `main`, ou crie um Blueprint apontando para `render.yaml`. Se a sincronização automática ocorreu antes da criação do grupo e falhou, execute uma nova sincronização.
3. Confira que `backend-api` está ativo e que `/api/health` retorna HTTP 200 com o MySQL conectado. Na primeira inicialização, o banco precisa criar os arquivos e as tabelas, então a API pode demorar alguns minutos para ficar pronta.

O Blueprint também declara `JWT_SECRET` com `generateValue: true`, `COOKIE_SAME_SITE=none` e a duração das sessões. Confira esses valores antes da publicação; nunca use o segredo local no frontend. O cadastro cria contas reais sem usuários ou senhas padrão. A perda do MySQL efêmero também apaga contas, hashes, regras e sessões. Para utilização durável, configure um MySQL persistente já disponível conforme [o guia](docs/autenticacao.md#mysql-persistente), sem criar recursos pagos automaticamente.

O banco **não é persistente**: a Render apaga os dados quando o serviço gratuito hiberna após 15 minutos sem tráfego, reinicia ou recebe um novo deploy. Use apenas dados fictícios na aula. O arquivo `server/.env` fica somente neste computador, ignorado pelo Git e excluído do contexto de build Docker; importe-o no grupo de ambiente. Remova variáveis antigas de `DB_*` ou `MYSQL_*` definidas diretamente no serviço que conflitem com o grupo. Se `mysql-db` ou `database-interface` já existirem na sua conta Render, exclua esses serviços pelo Dashboard após conferir que não são mais necessários: retirá-los do Blueprint não os apaga automaticamente nem interrompe eventual cobrança.
