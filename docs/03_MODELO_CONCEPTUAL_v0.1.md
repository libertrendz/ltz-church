# LTZ-CHURCH — MODELO CONCEPTUAL v0.1

---

# ENTIDADES PRINCIPAIS

## igrejas
- id
- nome
- slug
- logo_url
- cor_primaria

---

## congregacoes
- id
- igreja_id
- nome
- morada
- ativa

---

## usuarios
- id
- igreja_id
- email

---

## membros
- id
- igreja_id
- usuario_id
- nome
- data_nascimento
- telefone
- morada
- voluntario (bool)
- obreiro (bool)

---

## departamentos
- id
- igreja_id
- nome
- ativo

---

## membros_departamentos
- membro_id
- departamento_id

---

## atividades
- id
- igreja_id
- nome

---

## escalas
- id
- igreja_id
- data
- departamento_id

---

## escala_itens
- id
- escala_id
- atividade_id
- membro_id

---

## agenda_eventos
- id
- igreja_id
- titulo
- data
- tipo (culto, celula)

---

## permanecer_documentos
- id
- igreja_id
- versao
- texto

---

## permanecer_aceites
- id
- membro_id
- documento_id
- data_aceite
