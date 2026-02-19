# LTZ-CHURCH

Produto SaaS multi-tenant para gestão estruturada de igrejas.

Versão inicial: Fase 1  
Status: Em construção (do zero)  
Cliente piloto: ADMVC  

---

# 1. VISÃO DO PRODUTO

LTZ-CHURCH é um sistema digital concebido para igrejas gerirem:

- membros
- congregações e células
- departamentos
- voluntariado
- escalas
- agenda fixa
- formalização de membresia (Permanecer)

O sistema é comercial e multi-tenant.

Cada igreja funciona como um tenant isolado dentro da mesma infraestrutura.

ADMVC é o primeiro cliente, mas o produto deve servir múltiplas igrejas no futuro.

---

# 2. PORTAS DE ENTRADA

O sistema possui duas portas de acesso:

1. Via site da igreja (botão "Área de Membros")
2. Via app próprio (PWA instalável)

Importante:
Não existem dois sistemas.
É a mesma aplicação web.

---

# 3. ARQUITETURA BASE

Stack alvo:

- Next.js (App Router)
- TypeScript
- Tailwind
- Supabase (DB + Auth + Storage + RLS)
- Vercel
- GitHub

Supabase é a única fonte de verdade.

Toda lógica crítica deve estar no banco.

Frontend apenas consome e apresenta.

---

# 4. MULTI-TENANT

Estrutura:

- Entidade principal: `igrejas`
- Todas as tabelas de negócio possuem `igreja_id`
- RLS garante isolamento por tenant

Estratégia inicial:
Tenant identificado por slug na URL:

app.ltz-church.app/<slug>/...

---

# 5. PAPÉIS DE ACESSO

Papéis fixos:

- membro
- lider
- admin

Regra:
Papéis não são departamentos.
Escopo é separado (ex: departamento_id).

---

# 6. FASE 1 — ESCOPO FECHADO

A Fase 1 entrega:

- Cadastro completo de membros
- Igreja + congregações
- Permanecer (adesão formal)
- Departamentos
- Atividades
- Escalas
- Agenda fixa de cultos
- Perfis de acesso

Nada além disso entra nesta fase.

---

# 7. BRANDING

Base visual:

- Dark mode fixo
- Cor primária customizável por igreja
- Logo customizável por igreja

Não será permitido tema completo diferente por tenant.

---

# 8. REGRAS DE CONSTRUÇÃO

- Começar do zero (infra, repo e DB)
- Sempre usar checkpoints
- Nunca assumir que algo já existe
- Nunca avançar sem estado "VERDE"
- Evitar remendos
- Manter arquitetura limpa e escalável

---

# 9. DOCUMENTOS DE REFERÊNCIA

Este projeto é guiado pelos seguintes documentos:

- 01_DECISOES_FECHADAS.md
- 02_MASTER_SPEC_v0.1.md
- 03_MODELO_CONCEPTUAL_v0.1.md

Estes documentos são a verdade estrutural do produto.

---

# 10. OBJETIVO IMEDIATO

Construir a infraestrutura base do produto do zero:

1. Criar novo projeto Supabase
2. Criar novo repositório GitHub
3. Criar projeto Next.js
4. Configurar Vercel
5. Implementar modelo conceptual base
6. Ativar RLS corretamente

Somente após isso iniciar módulos da Fase 1.
