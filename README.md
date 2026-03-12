# Node CEP (mascara + cookies)

Projeto simples (sem frameworks) em Node.js que:

- Mostra um campo de texto com mascara para CEP (`00000-000`)
- Consulta o ViaCEP e exibe logradouro, bairro (se houver), cidade e UF
- Salva CEP e resultado em cookies
- Ao recarregar, continua exibindo as informacoes salvas

Este projeto (servidor + pagina + JS/CSS) foi feito pelo Codex, assistente de programacao da OpenAI, a partir do seu pedido no workspace `d:\\Users\\Roni\\3D Objects\\node-test`.

## O que foi feito

- Servidor HTTP com Node "puro" (sem Express).
- Pagina estatica em `public/` com:
  - Campo de CEP com mascara (`00000-000`) e `inputmode="numeric"`.
  - Busca ao completar 8 digitos (e tambem via botao "Buscar").
  - Exibicao dos campos retornados (incluindo `bairro` quando existir).
  - Botao "Limpar" para apagar os cookies e resetar o estado.
- Endpoint backend `/api/cep`:
  - Valida CEP com 8 digitos.
  - Consulta o ViaCEP (`https://viacep.com.br/ws/<cep>/json/`).
  - Retorna JSON para o frontend e trata erros comuns (invalido/nao encontrado/indisponivel).
- Persistencia em cookies no navegador:
  - `cep`: o CEP formatado.
  - `cep_data`: o JSON do ViaCEP (stringificado).
  - Ao carregar a pagina, o frontend restaura e renderiza os dados a partir desses cookies.

## Rodar

```bash
npm start
```

Acesse: `http://localhost:3000`

Se a porta 3000 estiver ocupada:

```powershell
$env:PORT=3001; npm start
```

## Estrutura

- `index.js`: servidor Node (arquivos estaticos + `/api/cep`)
- `public/index.html`: UI
- `public/styles.css`: estilos
- `public/app.js`: mascara, busca, renderizacao e cookies
