# WC Odontologia

Sistema de gestão para consultório odontológico: agenda do consultório, planos de
tratamento por paciente, portal do paciente e área administrativa para dentistas.

## Estrutura

- `backend/` — API em Node.js + Express + TypeScript, banco libSQL (arquivo local em
  desenvolvimento; Turso hospedado em produção, para persistir os dados).
- `frontend/` — React + Vite + TypeScript + Tailwind, com calendário e design próprio.

## Como rodar

### 1. Backend (porta 4300)

```bash
cd backend
npm install
npm run seed   # cria dicas de saúde bucal, categorias padrão e um dentista de demonstração
npm run dev
```

Conta de demonstração criada pelo seed:
- **E-mail:** dentista@wcodontologia.com
- **Senha:** demo1234

### 2. Frontend (porta 5183)

```bash
cd frontend
npm install
npm run dev
```

Acesse http://localhost:5183 — o Vite já faz proxy de `/api` para o backend.

## Deploy gratuito

- **Backend**: Render (free) + Turso (banco libSQL hospedado, persistente e gratuito).
  Configuração pronta em `render.yaml` — defina as variáveis `TURSO_DATABASE_URL` e
  `TURSO_AUTH_TOKEN` no painel do Render.
- **Frontend**: GitHub Pages, via o workflow em
  `.github/workflows/deploy-pages.yml`. Ative o GitHub Pages nas configurações do
  repositório (Settings → Pages → Source: GitHub Actions) e crie a variável de
  repositório `VITE_API_URL` (Settings → Secrets and variables → Actions → Variables)
  apontando para a URL pública do backend no Render.

O frontend usa `HashRouter` (URLs como `.../#/dashboard`) e caminhos relativos no
build, o que evita erros 404 ao recarregar a página em qualquer subpasta do
GitHub Pages.

## Papéis

- **Dentista**: cadastro próprio (auto-cadastro em `/registrar`), controle total —
  cadastra pacientes, cria outros dentistas, gerencia procedimentos, categorias de
  tarefas, planos de tratamento e o calendário do consultório.
- **Paciente**: conta criada apenas pelo dentista. Vê somente seus próprios
  atendimentos, progresso do plano, e pode avisar indisponibilidade (com pelo
  menos 24h de antecedência).
