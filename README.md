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
