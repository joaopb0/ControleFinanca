# ⚡ Projeto Full-Stack: React + Node.js (Clean Architecture)

Estrutura profissional e padronizada com separação clara de responsabilidades entre o **Front-end (Client)** e o **Back-end (Server)**.

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
  - Roteamento modular (`/api/health`, `/api/users`)
  - Middleware global de captura e tratamento de erros
  - Middleware de log de requisições em tempo real

## MySQL na Render

O `render.yaml` cria `mysql-db` como serviço privado com disco persistente em `/var/lib/mysql`, além do backend e do frontend. A Render inicia o contêiner do MySQL quando sincroniza o Blueprint; `npm start` inicia a API e aguarda a conexão com o banco. O serviço privado e o disco são pagos. O backend usa o endereço interno fornecido pelo Blueprint.

1. **Antes de sincronizar o Blueprint**, crie um Environment Group chamado `controle-financa-mysql` no mesmo workspace dos serviços, no Dashboard da Render. Em **Add from .env**, importe o arquivo local `server/.env` e salve o grupo. Assim, o usuário e a senha já existem no primeiro início do MySQL.
2. Sincronize o Blueprint já vinculado a este repositório na Render, usando a branch `main`. Se ainda não houver um Blueprint, crie um apontando para o `render.yaml`. Se a sincronização automática ocorreu antes da criação do grupo e falhou, execute uma nova sincronização.
3. Confirme que `mysql-db` e `backend-api` estão ativos e que `/api/health` no backend retorna HTTP 200 com o MySQL conectado. O Blueprint entrega o mesmo grupo aos dois serviços e fornece o endereço interno do banco ao backend.

O arquivo `server/.env` é local e ignorado pelo Git. A senha nele é de teste; antes de armazenar dados reais, altere a senha do usuário no MySQL e atualize o grupo na Render. Mudar apenas o `.env` depois da primeira inicialização não altera a senha no banco. Variáveis definidas diretamente em um serviço da Render prevalecem sobre as do grupo; remova valores antigos de `DB_*` ou `MYSQL_*` que entrem em conflito. As variáveis `MYSQL_*` inicializam usuário e banco somente quando o disco do MySQL está vazio. Se o serviço `database-interface` (Adminer) já existir na sua conta Render, remova-o após a sincronização: tirar sua definição do Blueprint não exclui um serviço remoto existente, e a interface pública permitiria tentativas de acesso com a senha de teste.
