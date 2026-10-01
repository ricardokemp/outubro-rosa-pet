# Outubro Rosa Pet 🌸🐾

Site de conscientização sobre saúde mamária de cães e gatos, preparado para publicação no GitHub Pages.

## Estrutura

- `index.html` página principal
- `styles.css` estilos responsivos
- `script.js` pequenas interações
- `assets/poster-outubro-rosa-pet.png` arte visual da campanha
- `assets/qrcode-demo.svg` QR Code apenas demonstrativo

## Publicar no GitHub Pages

1. Crie um repositório no GitHub, por exemplo `outubro-rosa-pet`.
2. Envie todos os arquivos desta pasta para a raiz do repositório.
3. No GitHub, abra **Settings > Pages**.
4. Em **Build and deployment**, selecione **Deploy from a branch**.
5. Escolha a branch `main` e a pasta `/ (root)`.
6. Salve e aguarde a publicação.

O endereço normalmente ficará no formato:

`https://SEU-USUARIO.github.io/outubro-rosa-pet/`

## QR Code

O QR Code incluído é propositalmente apenas um modelo visual. Para a versão final, substitua `assets/qrcode-demo.svg` por um QR Code real que aponte para a página, formulário, clínica ou material informativo desejado.

## Personalização

Os textos, logotipo, contatos, fontes e fontes científicas podem ser alterados diretamente no `index.html`.

## Responsividade

O layout foi desenvolvido com abordagem mobile-first/fluid, usando `clamp()`,
CSS Grid e breakpoints para adaptar conteúdo a celulares, tablets, notebooks,
monitores grandes, ultrawide e TVs 1080p/4K. Também há tratamento para
orientação horizontal, toque, impressão e preferência por redução de movimento.
