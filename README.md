# Marcenapp

Aplicativo profissional para gestão de marcenarias com recursos de IA.

## Desenvolvimento

O repositório oficial é a fonte de código do projeto.

```sh
git clone <this-repository-url>
cd <repository-name>
npm ci
npm run dev
```

### Validação

```sh
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

A publicação de produção é controlada pelo fluxo de CI/CD configurado no repositório. Alterações devem ser feitas no código versionado e validadas antes de chegar à produção.
