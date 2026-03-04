# LT-CHURCH — BACKLOG FASE 1

Ordem obrigatória de construção.

---

# ETAPA 1 — Infraestrutura

- Criar projeto Supabase
- Criar repositório GitHub
- Criar projeto Next.js
- Configurar Vercel
- Configurar ENV

VERDE quando:
Deploy funcional + /health retorna OK

---

# ETAPA 2 — Base de Dados

- Criar tabela igrejas
- Criar tabela usuarios
- Criar tabela congregacoes
- Criar tabela membros
- Criar tabela departamentos
- Criar tabela membros_departamentos
- Criar tabela atividades
- Criar tabela escalas
- Criar tabela escala_itens
- Criar tabela agenda_eventos
- Criar tabela permanecer_documentos
- Criar tabela permanecer_aceites
- Ativar RLS
- Criar policies base

VERDE quando:
Usuário só vê dados da sua igreja

---

# ETAPA 3 — Módulo Membros

- Tela cadastro
- Upload carta recomendação
- Atualização dados
- Associação congregação

VERDE quando:
Membro consegue atualizar dados

---

# ETAPA 4 — Permanecer

- Criar documento ativo
- Tela leitura
- Registro de aceite

VERDE quando:
Aceite registrado corretamente

---

# ETAPA 5 — Departamentos

- CRUD departamentos
- Associação membros

VERDE quando:
Membro aparece no departamento

---

# ETAPA 6 — Atividades

- CRUD atividades

---

# ETAPA 7 — Escalas

- Criar escala
- Adicionar itens
- Visualização por membro

VERDE quando:
Membro vê sua escala

---

# ETAPA 8 — Agenda Fixa

- CRUD eventos
- Visualização agenda

VERDE quando:
Eventos aparecem corretamente

---

Fase 1 concluída quando todas as etapas estão VERDES.
