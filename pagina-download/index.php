<?php
// O botão aparece sozinho quando prancheta-fc.apk é colocado nesta pasta.
$apk = __DIR__ . '/prancheta-fc.apk';
$temApk = is_file($apk);
$tamanho = $temApk ? number_format(filesize($apk) / 1048576, 0, ',', '.') . ' MB' : '';
$data = $temApk ? date('d/m/Y', filemtime($apk)) : '';
$versao = $temApk ? filemtime($apk) : 0;
?>
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#0B2A3A">
<title>Prancheta FC: baixar para Android</title>
<meta name="description" content="Baixe o Prancheta FC para Android, o manager de futebol online.">
<link rel="icon" href="icone.png">
<style>
  :root {
    --fundo: #0B2A3A; --cartao: #12394C; --texto: #F4F7FA; --suave: #A8C0CC;
    --borda: #28566B; --destaque: #FFC21A; --sobre: #08202D; --verde: #35B86B;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--fundo); color: var(--texto); line-height: 1.5;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  main { max-width: 480px; margin: 0 auto; padding: 40px 16px 32px; }
  .topo { text-align: center; }
  .topo img { width: 96px; height: 96px; border-radius: 22px; display: block; margin: 0 auto 16px; }
  h1 { font-size: 30px; line-height: 1.15; margin: 0 0 8px; }
  .topo p { color: var(--suave); margin: 0 0 24px; }
  .botao {
    display: block; padding: 16px; border-radius: 12px; text-align: center; text-decoration: none;
    background: var(--destaque); color: var(--sobre); font-size: 18px; font-weight: 700;
  }
  .botao:focus-visible { outline: 3px solid var(--texto); outline-offset: 2px; }
  .aguarde { padding: 16px; border: 1px solid var(--borda); border-radius: 12px; text-align: center; color: var(--suave); }
  .info { color: var(--suave); font-size: 14px; text-align: center; margin: 10px 0 0; }
  .aviso { display: none; background: var(--cartao); border-left: 4px solid var(--destaque); border-radius: 8px; padding: 12px 14px; margin: 0 0 16px; text-align: left; }
  h2 { font-size: 19px; margin: 36px 0 12px; }
  ol { list-style: none; margin: 0; padding: 0; counter-reset: passo; }
  ol li {
    counter-increment: passo; position: relative; min-height: 32px; padding-left: 44px; margin-bottom: 14px;
  }
  ol li::before {
    content: counter(passo); position: absolute; left: 0; top: 0; width: 32px; height: 32px; border-radius: 50%;
    background: var(--cartao); border: 1px solid var(--borda); color: var(--destaque);
    display: flex; align-items: center; justify-content: center; font-weight: 700;
  }
  ul { margin: 0; padding-left: 20px; }
  ul li { margin-bottom: 8px; }
  .nota { background: var(--cartao); border-radius: 12px; padding: 14px 16px; margin-top: 36px; font-size: 15px; color: var(--suave); }
  .nota strong { color: var(--texto); }
  footer { text-align: center; color: var(--suave); font-size: 13px; margin-top: 28px; }
</style>
</head>
<body>
<main>
  <section class="topo">
    <img src="icone.png" alt="" width="96" height="96">
    <h1>Prancheta FC</h1>
    <p>Monte seu time, escolha a tática e dispute a temporada online com seus amigos.</p>
    <div class="aviso" id="iphone">Por enquanto o app existe só para Android. Abra esta página em um celular Android para baixar.</div>
<?php if ($temApk): ?>
    <a class="botao" href="prancheta-fc.apk?v=<?= $versao ?>">Baixar para Android</a>
    <p class="info"><?= $tamanho ?> · atualizado em <?= $data ?></p>
<?php else: ?>
    <div class="aguarde">O download estará disponível em breve.</div>
<?php endif; ?>
  </section>

  <h2>Como instalar</h2>
  <ol>
    <li>Toque em <strong>Baixar para Android</strong> e aguarde o download terminar.</li>
    <li>Abra o arquivo <strong>prancheta-fc.apk</strong> nas notificações ou na pasta Downloads.</li>
    <li>Se o Android pedir, permita instalar apps desta fonte.</li>
    <li>Toque em <strong>Instalar</strong> e abra o jogo.</li>
  </ol>

  <h2>O que tem no jogo</h2>
  <ul>
    <li>Ligas com amigos por código de convite</li>
    <li>Mundo Oficial com divisões, acesso e rebaixamento</li>
    <li>Três jogos por dia, às 12h, 18h e 21h</li>
    <li>Mercado, leilão entre técnicos e jovens da base</li>
  </ul>

  <div class="nota">
    <strong>Versão de testes, fora das lojas.</strong> O Android pode mostrar um aviso de app desconhecido,
    porque ele ainda não está na Play Store. Baixe somente por esta página.
    Para atualizar, baixe de novo e instale por cima.
  </div>

  <footer>Clubes e jogadores fictícios.</footer>
</main>
<script>
  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) document.getElementById('iphone').style.display = 'block';
</script>
</body>
</html>
