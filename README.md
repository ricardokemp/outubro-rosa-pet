# Outubro Rosa Pet, Mural Digital

Versão com formulário próprio no site, Google Apps Script, Google Drive, Google Sheets e mural público moderado.

## Estrutura

- `index.html`: página principal, formulário e mural.
- `styles.css`: identidade visual e responsividade.
- `mural.js`: envio do formulário, filtros, busca, modal e carregamento do mural.
- `config.js`: URL do Web App do Google Apps Script.
- `google-apps-script/Code.gs`: backend para receber dados, salvar fotos no Drive e alimentar o Sheets.
- `assets/`: imagens da campanha.

## Importante sobre o Google Forms

O Google Forms original pode continuar existindo, mas um formulário HTML próprio não consegue, de forma confiável, fazer upload de uma foto para um campo de upload do Google Forms em nome do visitante. Por isso, nesta arquitetura, o site usa o Google Apps Script como backend e grava os dados em uma planilha Google Sheets e as fotos em uma pasta Google Drive. O visitante nunca precisa abrir o Google Forms.

## Configuração do Google

1. Crie uma Google Sheet para o mural.
2. Copie o ID da planilha, que aparece entre `/d/` e `/edit` na URL.
3. Crie uma pasta no Google Drive para as fotos.
4. Copie o ID da pasta, que aparece depois de `folders/` na URL.
5. Abra `Code.gs` em um projeto do Google Apps Script.
6. Preencha `SPREADSHEET_ID` e `FOLDER_ID`.
7. Execute a função `setup()` uma vez e autorize o acesso.
8. Publique como **Web app**:
   - Executar como: **Você**
   - Quem tem acesso: **Qualquer pessoa**
9. Copie a URL terminada em `/exec`.
10. Cole a URL em `config.js`, no campo `apiUrl`.
11. Envie `index.html`, `styles.css`, `script.js`, `mural.js`, `config.js` e `assets/` para o GitHub Pages.

## Moderação

A planilha criada pelo script terá uma coluna `PUBLICAR`.

- `NÃO`: a participação fica aguardando aprovação.
- `SIM`: a participação aparece no mural público.

Depois de alterar `PUBLICAR` para `SIM`, recarregue o site para atualizar o mural.

## Colunas da planilha

`DATA | NOME | PET | TIPO | MENSAGEM | ARQUIVO | FILE_ID | FOTO_URL | PUBLICAR | CONSENTIMENTO`

## Formulário

O formulário do site solicita:

- Nome do participante
- Nome do pet
- Tipo de animal
- Mensagem de até 250 caracteres
- Foto de até 8 MB
- Autorização para publicação

## URL do Google Forms original

O formulário fornecido para a campanha é:
https://forms.gle/Ju99995cXtN7SiwN8

Ele não é aberto automaticamente pelo site nesta arquitetura. O formulário próprio do site é o ponto de entrada do participante.
