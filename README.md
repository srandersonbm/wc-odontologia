# WC Odontologia

Sistema de gestão para consultório odontológico: agenda do consultório, planos de
tratamento por paciente, portal do paciente e área administrativa para dentistas.

## Estrutura

- `backend/` — API em Node.js + Express + TypeScript, banco SQLite (arquivo local).
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

## Papéis

- **Dentista**: cadastro próprio (auto-cadastro em `/registrar`), controle total —
  cadastra pacientes, cria outros dentistas, gerencia procedimentos, categorias de
  tarefas, planos de tratamento e o calendário do consultório.
- **Paciente**: conta criada apenas pelo dentista. Vê somente seus próprios
  atendimentos, progresso do plano, e pode avisar indisponibilidade (com pelo
  menos 24h de antecedência).
