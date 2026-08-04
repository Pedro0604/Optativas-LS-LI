# Escrow descentralizado para contratación de trabajos mediante smart contracts

Aplicación para crear y gestionar acuerdos de trabajo con pagos en ETH. Los fondos quedan bloqueados en un contrato inteligente hasta que el trabajo se aprueba, vence alguno de los plazos o una disputa es resuelta.

El proyecto funciona sobre Sepolia. Incluye los contratos en Solidity, el testeo con Hardhat, Mocha y ethers, el despliegue con Hardhat Ignition y una aplicación web para interactuar con ellos desde una wallet.

## Cómo funciona

`EscrowFactory` es el punto de entrada al sistema. Cada llamada a `createEscrow` despliega un contrato `Escrow` independiente, deposita el ETH enviado y registra la dirección según sus tres participantes:

- `owner`: crea y financia el acuerdo.
- `worker`: acepta el acuerdo, entrega el trabajo y recibe el pago.
- `arbiter`: interviene si el owner abre una disputa.

Un escrow comienza pendiente de aceptación y luego puede pasar por entrega, revisión y arbitraje. Los plazos se calculan en la blockchain a partir de `block.timestamp`. Cuando un plazo vence, cualquier cuenta puede materializar la expiración mediante la función correspondiente.

Los pagos no se envían durante cada transición. El contrato acredita saldos en `pendingWithdrawals` y cada participante los retira con `withdraw`. Este modelo evita que un receptor que rechaza ETH bloquee el resto del flujo y aplica Checks-Effects-Interactions contra reentradas.

La factory también mantiene el listado global de escrows, índices por participante y el registro `isEscrow`, usado por la web para validar que una dirección pertenece al sistema.

## Tecnologías

- Solidity 0.8.36
- Hardhat 3, Hardhat Ignition y ethers v6
- React 19, Vite, wagmi y viem
- pnpm
- Mocha para contratos y Vitest para la web

## Requisitos

- Node.js 22 o superior
- pnpm
- Una wallet con ETH de Sepolia para desplegar y/o utilizar el sistema
- Una URL RPC de Sepolia

## Instalación

Desde la raíz del repositorio:

```shell
pnpm install
```

Para compilar los contratos:

```shell
pnpm hardhat build
```

## Ejecutar las pruebas

Todas las pruebas del proyecto:

```shell
pnpm test
```

Solo contratos:

```shell
pnpm hardhat test
```

Solo frontend:

```shell
pnpm web:test
```

La verificación completa compila, ejecuta las pruebas, comprueba los artefactos compartidos, hace typecheck y genera el build de la web:

```shell
pnpm verify
```

## Desplegar los contratos en Sepolia

Hardhat necesita la URL RPC y la clave privada de la cuenta que realizará el despliegue. Se pueden guardar cifradas en el keystore local:

```shell
pnpm hardhat keystore set SEPOLIA_RPC_URL
pnpm hardhat keystore set SEPOLIA_PRIVATE_KEY
```

Como URL del RPC se puede utilizar [https://ethereum-sepolia.publicnode.com](https://ethereum-sepolia.publicnode.com) que se utiliza también en el frontend.

La clave privada debe pertenecer a una cuenta con ETH de Sepolia y nunca debe agregarse al repositorio. Desde la extensión de MetaMask para navegadores se puede obtener siguiendo los siguientes pasos:
1. Click en el nombre de la cuenta.
2. Click en tres puntos.
3. Click en Account details/Detalles de la cuenta.
4. Private keys/Claves privadas.
5. Ingresar contraseña de MetaMask.
6. Copiar la private key de ETH.

Después se despliega `EscrowFactory` con el módulo de Ignition:

```shell
pnpm hardhat ignition deploy ignition/modules/EscrowFactory.ts --network sepolia
```

Ignition muestra la dirección de `EscrowFactory` al terminar. Esa dirección se necesita para configurar la aplicación web. Los contratos `Escrow` no se despliegan manualmente: la factory crea uno nuevo por cada acuerdo.

Por default en el .env.example de la web se setea la dirección del contrato de EscrowFactory que usa [Pacto](https://pacto-blockchain.netlify.app)

Si también se quiere verificar el contrato en Etherscan, primero hay que configurar la API key:

```shell
pnpm hardhat keystore set ETHERSCAN_API_KEY
```

Que se puede obtener desde: [https://etherscan.io/apidashboard](https://etherscan.io/apidashboard)

## Levantar la aplicación web

Crear el archivo .env a partir del ejemplo (que ya viene con todos los valores seteados ya que ninguno es privado ni debería serlo porque todo eso queda público en la build):

```powershell
Copy-Item apps/web/.env.example apps/web/.env
```

En Linux o macOS:

```shell
cp apps/web/.env.example apps/web/.env
```

Completar `apps/web/.env` con los datos del entorno:

```dotenv
VITE_SEPOLIA_RPC_URL=https://ethereum-sepolia.publicnode.com
VITE_CHAIN_ID=11155111
VITE_FACTORY_ADDRESS=0x742d8E835276e3b1B0CaC3e6acb4ff39eD7475be
VITE_EXPLORER_URL=https://sepolia.etherscan.io
```

Las variables `VITE_*` son públicas porque quedan incluidas en el bundle. No se debe colocar una clave privada ni otro secreto en este archivo.

Finalmente, iniciar Vite desde la raíz:

```shell
pnpm web:dev
```

La terminal indicará la URL local, normalmente `http://localhost:5173`. Para escribir en los contratos hay que conectar una wallet configurada en Sepolia; las consultas se realizan mediante el RPC definido en el `.env`.

## Estructura del repositorio

```text
contracts/                 Contratos Solidity
test/                      Pruebas de integración de los contratos
ignition/modules/          Módulos de despliegue
apps/web/                  Aplicación React
packages/contracts/        ABI y bytecode compartidos con la web
```

Cuando cambia la interfaz de un contrato, se regeneran los artefactos consumidos por la web con:

```shell
pnpm contracts:generate
```
