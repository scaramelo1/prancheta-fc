#!/bin/bash
# Publica a API em https://fsadesigners.com.br/prancheta-api/. Se algo falhar, restaura o Apache.
set -euo pipefail

CONF=/etc/apache2/sites-enabled/fsadesigners-le-ssl.conf
COPIA="/root/fsadesigners-le-ssl.conf.antes-prancheta-$(date +%Y%m%d_%H%M%S)"

cp -a "$CONF" "$COPIA"
restaurar() {
  cp -a "$COPIA" "$CONF"
  apachectl configtest && systemctl reload apache2
  echo "Falhou: Apache restaurado de $COPIA"
}
trap restaurar ERR

if ! grep -q 'prancheta-api' "$CONF"; then
  python3 - "$CONF" <<'PY'
import sys
caminho = sys.argv[1]
texto = open(caminho).read()
regra = '<LocationMatch "^/(?!assets/|cliente/)[^/]+/">'
log = '    ErrorLog ${APACHE_LOG_DIR}/fsadesigners_erro.log'
bloco = '''    # Prancheta FC: API do jogo, servida pelo Node só em 127.0.0.1
    <Location "/prancheta-api/">
        ProxyPass "http://127.0.0.1:3100/"
        ProxyPassReverse "http://127.0.0.1:3100/"
        RequestHeader set X-Real-IP "%{REMOTE_ADDR}s"
        Header always set X-Robots-Tag "noindex, nofollow"
    </Location>

'''
assert regra in texto and log in texto
texto = texto.replace(regra, '<LocationMatch "^/(?!assets/|cliente/|prancheta-api/)[^/]+/">')
open(caminho, 'w').write(texto.replace(log, bloco + log, 1))
PY
fi
apachectl configtest

cp /var/www/prancheta-fc/servidor/prancheta-fc.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now prancheta-fc
sleep 3
systemctl is-active prancheta-fc
curl -sf -m 5 http://127.0.0.1:3100/saude

cat > /etc/cron.d/prancheta-fc-backup <<'CRON'
# Backup diário do banco do Prancheta FC, às 4h30
30 4 * * * root cd /var/www/prancheta-fc && BANCO=/var/lib/private/prancheta-fc/prancheta.db BACKUPS=/var/backups/prancheta-fc /usr/bin/node --no-warnings servidor/backup.ts
CRON

systemctl reload apache2
sleep 2
trap - ERR

echo
echo "API:          $(curl -s -m 10 https://fsadesigners.com.br/prancheta-api/saude)"
echo "FSA Designer: $(curl -s -o /dev/null -w '%{http_code}' -m 10 https://fsadesigners.com.br/)"
echo "Aldoria:      $(curl -s -o /dev/null -w '%{http_code}' -m 10 https://aldoria.com.br/)"
echo "Sistema PM:   $(curl -s -o /dev/null -w '%{http_code}' -m 10 http://127.0.0.1/)"
echo "Memória:      $(systemctl show prancheta-fc -p MemoryCurrent --value) bytes"
echo "Cópia do Apache: $COPIA"
