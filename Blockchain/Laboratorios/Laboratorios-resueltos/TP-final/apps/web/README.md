# Pacto web

SPA estática para consultar y operar escrows desplegados en Sepolia.

## Configuración

Copiá `.env.example` a `.env.local` y definí estas variables antes de compilar:

| Variable | Valor requerido |
| --- | --- |
| `VITE_SEPOLIA_RPC_URL` | URL HTTP pública de un RPC de Sepolia. |
| `VITE_CHAIN_ID` | `11155111`. |
| `VITE_FACTORY_ADDRESS` | Dirección del `EscrowFactory` desplegado en Sepolia. |
| `VITE_EXPLORER_URL` | URL base del explorador, por ejemplo `https://sepolia.etherscan.io`. |

Las variables `VITE_*` quedan incluidas en el bundle: no deben contener secretos ni claves privadas.
La aplicación valida la configuración al iniciar y no usa la red de la wallet para sus lecturas
públicas.

## Compilación y publicación estática

Desde la raíz del repositorio:

```sh
pnpm web:build
```

Publicá el contenido generado en `apps/web/dist/`.

El hosting debe aplicar una reescritura de fallback para que toda ruta que no corresponda a un
archivo estático entregue `/index.html` con estado `200`. La regla equivalente en muchos hosts es:

```text
/*  /index.html  200
```

La reescritura no debe ser una redirección. Así, abrir o recargar rutas como
`/escrows/0x...` conserva la URL y permite que TanStack Router la resuelva. Una ruta desconocida
también recibe `index.html`, pero el router muestra la página 404 propia de la SPA.
