import Index from './Index';

/**
 * Shell da aplicação.
 *
 * A navegação principal pertence ao próprio Index. Evitamos uma segunda
 * camada de menu sobreposta para manter o produto limpo e previsível,
 * especialmente em telas menores e dentro de previews/editor.
 */
const AppShell = () => <Index />;

export default AppShell;
