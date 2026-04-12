#!/bin/bash
BASE=${1:-http://localhost:3001}
FAIL=0

check() {
  local DESC=$1 EXPECTED=$2
  shift 2
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$@")
  if [ "$STATUS" = "$EXPECTED" ]; then
    echo "✅  $DESC → $STATUS"
  else
    echo "❌  $DESC → $STATUS (beklenen: $EXPECTED)"
    FAIL=1
  fi
}

check "health"                    200 "$BASE/health"
check "auth/login (boş)"         400 -X POST -H 'Content-Type: application/json' -d '{}' "$BASE/api/auth/login"
check "dashboard (no token)"      401 "$BASE/api/dashboard"
check "flexcity (no token)"       401 "$BASE/api/flexcity/personel"
check "muhtarbis (no token)"      401 "$BASE/api/muhtarbis/liste"
check "rbac (no token)"           401 "$BASE/api/rbac/kullanicilar"
check "404 handler"               404 "$BASE/olmayan-bir-sayfa"

echo ""
[ $FAIL -eq 0 ] && echo "Tüm smoke testler geçti." || echo "Bazı testler başarısız."
exit $FAIL
