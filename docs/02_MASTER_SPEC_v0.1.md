# LT-CHURCH — MASTER SPEC v0.1

Idioma: pt-PT  
Stack alvo: Next.js + Supabase + Vercel

---

# 1. VISÃO

Criar um sistema estruturado e escalável para igrejas gerirem:

- membros
- departamentos
- voluntariado
- escalas
- agenda fixa
- formalização de membresia

Produto comercial multi-tenant.

---

# 2. PERSONAS

## 2.1 Membro
- Atualiza dados
- Aderir ao Permanecer
- Ver agenda
- Ver escala pessoal

## 2.2 Líder
- Gerir escalas do seu departamento
- Ver membros do departamento

## 2.3 Admin
- Gerir igreja
- Gerir congregações
- Gerir departamentos
- Gerir membros
- Gerir permissões
- Gerir agenda fixa

---

# 3. MÓDULOS

## 3.1 Igreja
- Dados institucionais
- Branding
- Configurações

## 3.2 Congregações
- CRUD
- Ligação à igreja

## 3.3 Membros
- Dados pessoais
- Histórico eclesiástico
- Carta de recomendação
- Consentimento RGPD
- Permanecer

## 3.4 Departamentos
- CRUD
- Associação de membros

## 3.5 Atividades
- Lista fixa por igreja
- Usadas em escalas

## 3.6 Escalas
- Criação por data
- Atribuição de membros
- Estado da escala

## 3.7 Agenda Fixa
- Cultos recorrentes
- Futuro: células

---

# 4. REQUISITOS NÃO FUNCIONAIS

- Multi-tenant isolado
- RLS obrigatório
- Auditoria mínima
- Código limpo e idempotente
- Checkpoints obrigatórios

---

# 5. CRITÉRIO DE DONE (FASE 1)

Fase 1 está concluída quando:

- Admin consegue criar congregações
- Admin cria departamentos
- Admin cria atividades
- Admin cria escala
- Membro vê sua escala
- Membro adere ao Permanecer
