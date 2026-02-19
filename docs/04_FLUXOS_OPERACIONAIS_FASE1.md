# LTZ-CHURCH — FLUXOS OPERACIONAIS FASE 1

Idioma: pt-PT  
Escopo: Fase 1 apenas

---

# 1. FLUXO — ADMIN

## 1.1 Primeiro acesso do tenant

1. Admin acede ao sistema
2. Completa dados da igreja
3. Define logo e cor primária
4. Confirma congregações base (Sede, Leiria, Barcelos)
5. Cria novos departamentos (se necessário)

Estado final esperado:
Sistema pronto para receber membros.

---

## 1.2 Gestão de Congregações

1. Admin cria congregação
2. Define nome, morada e estado
3. Associa à igreja automaticamente

Resultado:
Nova congregação disponível para seleção no cadastro de membros.

---

## 1.3 Gestão de Departamentos

1. Admin cria departamento
2. Define se está ativo
3. Pode atribuir líder ao departamento

Resultado:
Departamento disponível para associação de membros.

---

## 1.4 Gestão de Atividades

1. Admin cria atividades por departamento
   Exemplos:
   - Estacionamento
   - Recepção
   - Nave
   - Intercessão
   - Cantina

Resultado:
Atividades disponíveis para escalas.

---

## 1.5 Criação de Escala

1. Admin ou Líder seleciona data
2. Seleciona departamento
3. Cria escala
4. Adiciona itens (atividade + membro)
5. Guarda

Resultado:
Escala visível para os membros envolvidos.

---

# 2. FLUXO — MEMBRO

## 2.1 Primeiro Login

1. Utilizador autentica-se
2. Sistema verifica se existe membro
3. Se não existir, cria perfil base
4. Redireciona para /meus-dados

---

## 2.2 Atualização de Dados

1. Membro preenche dados pessoais
2. Atualiza telefone, morada
3. Indica histórico eclesiástico
4. Pode anexar carta de recomendação

---

## 2.3 Adesão ao Permanecer

1. Membro visualiza documento ativo
2. Lê conteúdo
3. Marca aceite
4. Sistema regista data e versão

Resultado:
Membro oficialmente aderido.

---

## 2.4 Visualização de Escala

1. Membro acede à área pessoal
2. Visualiza próximas escalas
3. Vê atividades atribuídas

---

# 3. FLUXO — LÍDER

## 3.1 Gestão de Escalas do Departamento

1. Líder vê apenas seu departamento
2. Pode criar ou editar escalas
3. Pode atribuir membros do departamento

Importante:
Líder nunca vê dados de outros departamentos.

---

# 4. FLUXO — AGENDA FIXA

1. Admin cria evento recorrente
2. Define tipo (culto ou célula)
3. Define data/hora
4. Evento aparece na agenda pública

---

# CRITÉRIO DE SUCESSO FASE 1

- Admin cria departamento
- Admin cria escala
- Membro vê escala
- Membro adere ao Permanecer
- Sistema respeita isolamento por igreja
