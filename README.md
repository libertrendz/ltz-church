# LTZ-CHURCH

Sistema multi-tenant para gestão organizacional de igrejas.

Projeto construído com:
- Next.js (App Router)
- Supabase (Auth + PostgreSQL + RLS)
- Vercel (deploy)

---

# 🎯 Objetivo

LTZ-CHURCH é um sistema estruturado para:

- Gestão de igrejas (multi-tenant)
- Membros
- Congregações
- Departamentos
- Atividades (tipos estruturados)
- Escalas
- Agenda
- Aceite de documentos (Permanecer)

Baseado em:

- Isolamento total por tenant (`igreja_id`)
- RLS obrigatório em todas as tabelas de negócio
- RPCs com `security definer`
- Zero confiança no frontend para dados críticos

---

# 🏗 Arquitetura Base

## Multi-Tenant

Todas as tabelas de negócio contêm:
