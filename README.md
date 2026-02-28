# PharmaZen | Dr. Manoel da Farmácia

## Gestão Farmacêutica Integrativa e Clínica de Alta Performance

O **PharmaZen** é uma plataforma SaaS (Software as a Service) desenvolvida especificamente para clínicas farmacêuticas integrativas. O sistema combina rigor clínico, inteligência artificial e conformidade legal (LGPD/ANVISA) em uma interface moderna e veloz.

### 🚀 Funcionalidades Principais

- **Prontuário Eletrônico Integrado:** Evolução clínica diária com linha do tempo imutável e intuitiva.
- **Planejador IA PharmaZen:** Racional clínico gerado por Inteligência Artificial (Gemini) para validação de protocolos e terapias.
- **Busca Farmacêutica Ultra-Rápida:** Base de dados local com centenas de ativos, suplementos e alopáticos, com busca por Nome Comercial ou Princípio Ativo.
- **Agenda Inteligente:** Gestão de horários com slots de atendimento, suporte a encaixes e visualização de alta densidade.
- **Governança e Privacidade:** Trilha de auditoria (Audit Log) completa para conformidade com a LGPD e normas da ANVISA.
- **Financeiro Integrado:** Monitoramento de receitas, ticket médio e fluxo de caixa da clínica.

### 🛠️ Tech Stack

- **Frontend:** Next.js 15 (App Router)
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS + Shadcn/UI
- **Backend:** Firebase Firestore + Auth
- **AI/LLM:** Google Genkit (Gemini 1.5 Flash)

### 📦 Como Iniciar o Desenvolvimento

1. **Clonar o Repositório:**
   ```bash
   git clone https://github.com/Contalize/Dr-Manoel.git
   ```

2. **Instalar Dependências:**
   ```bash
   npm install
   ```

3. **Configuração de Ambiente:**
   Crie um arquivo `.env` na raiz do projeto com as suas credenciais do Firebase.

4. **Rodar em Desenvolvimento:**
   ```bash
   npm run dev
   ```

### 🔒 Segurança e Privacidade

Este software foi projetado seguindo as diretrizes da **LGPD (Lei Geral de Proteção de Dados)**. Dados sensíveis de saúde são protegidos por camadas de autenticação e todas as visualizações de dados críticos são auditadas na coleção `audit_logs`.

### 🚀 Comandos para Conectar ao GitHub

Se você estiver iniciando o repositório agora, execute estes comandos no seu terminal:

```bash
git init
git add .
git commit -m "Initial commit: PharmaZen Core"
git branch -M main
git remote add origin https://github.com/Contalize/Dr-Manoel.git
git push -u origin main
```

---
*Desenvolvido para transformar a prática farmacêutica integrativa.*
