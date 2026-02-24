TZ-CHURCH — ESTADO OFICIAL FASE 1
Arquitectura Validada
Multi-tenant

igreja_id em todas as tabelas de negócio

RLS por tenant

current_user_igreja_id() padrão

Agenda
Modelo final:

atividade = tipo

agenda_series = regra recorrente

agenda_eventos = instância concreta

UI:

Criar evento:

Avulso

Recorrente (semanal)

Série invisível ao utilizador

Estado:

✔ Criar evento avulso
✔ Criar recorrência
✔ Gerar eventos
✔ Agrupamento por mês
✔ RLS corrigido

Escalas
Novo modelo:

atividade_funcoes_defaults

escala_slots

escala_itens (atribuições)

Fluxo:

Definir defaults por atividade

Criar escala

Slots gerados automaticamente

Atribuir membros

Estado:

✔ Slots geram automático
✔ Itens funcionam
✔ Compatibilidade legacy mantida

Problemas resolvidos nesta fase

RLS agenda_series

NOT NULL legado em escala_itens

NOT NULL evento.data

NOT NULL evento.titulo

Constraint tipo check

Trigger auto-fill igreja_id

Trigger auto-fill atividade_id

Próxima Fase

UI Escalas agrupado por função

UI atribuição de membro por slot

Sistema de paleta oficial multi-tenant

Settings globais

Documentação final consolidada

Observação crítica

Performance da sessão actual instável.
Transferência feita para evitar perda de contexto.
