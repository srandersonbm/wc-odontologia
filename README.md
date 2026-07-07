# WC Odontologia

Sistema de gestão para consultório odontológico: cadastro de pacientes, anamnese,
planos de tratamento com geração de PDF, calendário de atendimentos e área
administrativa multi-consultório para dentistas.

## Estrutura

- `backend/` — API em Node.js + Express + TypeScript, banco libSQL (arquivo local em
  desenvolvimento; Turso hospedado em produção, para persistir os dados).
- `frontend/` — React + Vite + TypeScript + Tailwind, com calendário, geração de PDF
  (jsPDF) e design próprio.

## Como rodar

### 1. Backend (porta 4300)

```bash
cd backend
npm install
npm run seed   # cria dicas de saúde bucal e um dentista de demonstração
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

## Como funciona

- **Multi-consultório**: cada dentista que se autocadastra (`/registrar`) cria seu
  próprio consultório (tenant) — dentistas convidados por ele, pacientes, agenda e
  procedimentos ficam isolados de outros consultórios.
- **Pacientes**: são cadastros do consultório, sem login próprio — só o dentista
  acessa o sistema. Cada paciente pode ter anamnese, plano(s) de tratamento e
  documentos (termo de consentimento, atestado) gerados em PDF e/ou anexados já
  assinados em PDF.
- **Calendário**: mostra os atendimentos (procedimentos agendados) dos planos
  ativos, filtrável por dentista. Agendar um atendimento cria (ou reaproveita) um
  plano de tratamento do paciente com aquele dentista automaticamente.
