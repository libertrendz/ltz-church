# LTZ-CHURCH — DECISÕES FECHADAS

Versão: v1.0  
Status: BLOQUEADAS (não reabrir sem motivo crítico)

---

## 1. Natureza do Produto

LTZ-CHURCH é um produto SaaS multi-tenant para igrejas.

ADMVC é apenas o primeiro cliente (tenant).

O produto deve ser vendável para múltiplas igrejas sem reescrita estrutural.

---

## 2. Multi-Tenant

- Tenant principal: `igreja`
- Todas as tabelas de negócio terão `igreja_id`
- RLS sempre baseado em `igreja_id`
- Nunca criar dados globais misturados

Tenant strategy (Fase 1):
→ URL baseada em slug:
`app.ltz-church.app/<slug>/...`

Subdomínios poderão ser considerados futuramente.

---

## 3. Portas de Entrada

1. Via site da igreja → botão "Área de Membros"
2. Via app próprio (PWA)

Importante:
Não existem dois sistemas.
É o mesmo sistema web.

---

## 4. Papéis (Roles)

Papéis fixos:

- membro (default)
- lider
- admin

Regra estrutural:
Papéis são papéis.
Escopo é separado (ex: departamento_id).

É proibido criar papéis por departamento.

---

## 5. Departamentos

Termo único: "Departamentos"

Nunca usar “ministérios”.

Membros podem pertencer a múltiplos departamentos.

Tabela pivot obrigatória:
membros_departamentos (membro_id, departamento_id)

---

## 6. Segmentação de Pessoas

Todos são membros.

Alguns membros podem também ser:
- voluntários
- obreiros

Essas são classificações, não papéis de acesso.

---

## 7. Fase 1 — Escopo Fechado

Entregáveis obrigatórios:

- Cadastro completo de membros
- Igreja mãe + congregações
- Permanecer (adesão formal)
- Departamentos
- Atividades (dropdown)
- Escalas
- Agenda fixa de cultos
- Perfis de acesso

Nada mais entra na Fase 1.

---

## 8. Branding

- Dark mode padrão fixo
- Customizável por tenant:
    - logo
    - cor primária (accent)

Não permitir tema completo diferente por cliente.

---

## 9. Fonte de Verdade

Supabase é a única fonte de verdade.

O frontend nunca deve conter lógica de negócio crítica.

---

## 10. Método de Trabalho

- Sempre usar checkpoints (branch/tag)
- Nunca avançar sem estado VERDE
- Nunca assumir que algo existe
