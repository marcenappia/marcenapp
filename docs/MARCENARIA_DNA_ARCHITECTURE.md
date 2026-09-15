# DNA da Marcenaria

O DNA é a camada persistente de conhecimento profissional da própria marcenaria. Ele acompanha o trabalho do usuário e orienta a IARA sem substituir o estado canônico do projeto.

## Hierarquia

`Diário → Cliente → Obra/Projeto → Ambiente → IARA → Project Model`

O DNA fica fora dessa cadeia de estado: ele é um contexto profissional reutilizável pela IARA em qualquer projeto daquele usuário.

## Tipos de conhecimento

- `defined`: regra declarada pelo profissional; autoridade máxima dentro do DNA.
- `learned`: preferência observada em comportamentos repetidos; nunca deve virar regra rígida silenciosamente.
- `suggested`: hipótese que a IARA pode propor para confirmação.
- `project_exception`: decisão exclusiva de um projeto; vence o DNA geral somente naquele contexto.

## Prioridade

`exceção do projeto > regra definida > preferência aprendida > sugestão`

A decisão explícita do projeto não altera o DNA automaticamente.

## Proveniência

Cada regra mantém origem, confiança, versão e datas. Alterações são registradas como nova versão em vez de apagar a história lógica da regra.

## Regra de segurança técnica

O DNA não autoriza a IARA a inventar medidas, materiais, ferragens ou condições de produção. Quando faltar evidência técnica, a IARA deve declarar a incerteza ou pedir confirmação.

## Experiência

O acesso deve ser simples e descobrível em `Minha Marcenaria`. O usuário não precisa preencher um cadastro gigante: pode ensinar uma regra por vez, a partir do trabalho real.

Exemplos:

- “Trabalho normalmente com MDF 18 mm.”
- “Minha folga de porta é 2 mm.”
- “Prefiro corrediça telescópica.”
- “Na minha produção, identificamos as peças antes da montagem.”

O objetivo do primeiro contato é gerar a sensação: **“eu ensinei uma vez e não preciso repetir isso em todo projeto.”**
