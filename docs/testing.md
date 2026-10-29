# Tests y verificación (cargar al correr checks o verificar UI)

## Tests (Vitest, ambos lados)
Cobertura concentrada en **dinero y fechas** (donde salieron todos los bugs reales). Al corregir un bug de cálculo, agregar el test de regresión.
- Frontend `src/utils/__tests__/`: `format.test.js`, `currency.test.js`, `bankCredit.test.js`, `creditCard.test.js`, csvImport.
- Backend `src/**/__tests__/`: `cycleDay.test.js`, `localDate.test.js` (`vi.useFakeTimers()`: febrero, meses de 30, cruce de año, horas
  nocturnas), `bankCreditCalculation.test.js`, `core/middleware/__tests__/jwtMiddleware.test.js`.

## Verificación visual
No hay navegador integrado. Playwright + Chromium en `%TEMP%\pw-runner\` (si falta: `cd %TEMP%\pw-runner && npm i playwright && npx playwright install chromium`).
Escribir el script ahí, `node script.js`, guardar PNG y abrirlo con Read. Pantallas internas: `POST /api/users/login` → `{ token, user }`;
inyectar ambos en `localStorage` (`token`, `user` como JSON) con `context.addInitScript` antes de navegar. Móvil de referencia 390×844.
Si el 5174 está ocupado, Vite usa 5175.
