# Posibles preguntas sobre el frontend

## Arquitectura y conexión blockchain

### 1. ¿Qué tecnologías usa el frontend para conectarse a Ethereum?

Usa wagmi para el ciclo de vida de la wallet y viem para leer contratos, simular operaciones y esperar recibos. React y TanStack Query manejan la interfaz y el estado remoto.

### 2. ¿Por qué se usan wagmi y viem en vez de ethers en el frontend?

wagmi resuelve la conexión reactiva con wallets y está construido sobre viem. viem aporta clientes y llamadas tipadas. ethers queda en los tests de Hardhat.

### 3. ¿Cómo se conecta la wallet?

Mediante el conector `injected` de wagmi, que detecta proveedores EIP-1193 instalados en el navegador, como MetaMask.

### 4. ¿La aplicación recibe la clave privada del usuario?

No. La clave permanece en la wallet. El frontend solo solicita conexión y firma de transacciones.

### 5. ¿Qué diferencia hay entre conectar la wallet y firmar una transacción?

Conectar expone la dirección pública autorizada. Firmar requiere una confirmación separada para cada transacción que modifica la blockchain.

### 6. ¿En qué red funciona la aplicación?

En Sepolia, cuyo `chainId` es `11155111`. La configuración rechaza otro chain ID al iniciar.

### 7. ¿Qué ocurre si la wallet está en otra red?

Las lecturas siguen funcionando sobre el RPC fijo de Sepolia, pero se bloquean las escrituras y se ofrece cambiar la wallet a Sepolia.

### 8. ¿Por qué las lecturas no usan el proveedor de la wallet?

Para que la consulta pública sea consistente y funcione sin conectar una wallet. Todas las lecturas apuntan al RPC de Sepolia configurado por la aplicación.

### 9. ¿Qué datos de configuración necesita el frontend?

La URL RPC de Sepolia, el chain ID, la dirección de `EscrowFactory` y la URL del explorador.

### 10. ¿Es seguro poner las variables `VITE_*` en el frontend?

Solo si son datos públicos. Vite las incluye en el bundle, por eso nunca deben contener claves privadas ni secretos.

## Lecturas y estado on-chain

### 11. ¿Cómo sabe el frontend qué funciones tiene cada contrato?

Usa los ABI generados en el paquete `@escrow/contracts`. El ABI describe funciones, eventos, errores y tipos.

### 12. ¿Cómo descubre los escrows existentes?

Consulta el registro `allEscrows` de la factory. Para una cuenta también usa los registros separados por rol: owner, worker y arbiter.

### 13. ¿Cómo evita mostrar como válido cualquier contrato indicado por URL?

Antes de leer el detalle consulta `EscrowFactory.isEscrow(address)`. Solo acepta contratos registrados por la factory configurada.

### 14. ¿Por qué se usa `multicall`?

Permite agrupar muchas lecturas en una solicitud RPC, reduciendo latencia y cantidad de llamadas.

### 15. ¿Cómo se mantiene consistente una página con muchas lecturas?

Las multicalls de una página se fijan al mismo número de bloque. Así no se mezclan valores de bloques distintos.

### 16. ¿Cómo se actualizan los datos después de una operación?

Al confirmarse la transacción se invalidan las consultas relacionadas. TanStack Query vuelve a leer el detalle y los listados desde la cadena.

### 17. ¿La interfaz escucha eventos en tiempo real?

No depende de WebSockets. Usa polling mientras la página está visible y refresca consultas al recuperar visibilidad.

### 18. ¿Qué pasa al cambiar de cuenta o red?

Se cancelan e invalidan las consultas cacheadas y se recalculan permisos, saldos pendientes y acciones disponibles.

### 19. ¿De dónde sale la hora usada para los vencimientos?

De timestamps de bloques, no únicamente del reloj local. El contrato decide usando `block.timestamp`; la cuenta regresiva del frontend es informativa.

### 20. ¿El frontend es la fuente de verdad del estado?

No. La fuente de verdad son los contratos en Sepolia. El frontend solo proyecta y presenta ese estado.

## Escrituras y transacciones

### 21. ¿Cuál es el flujo de una transacción?

Primero se valida, luego se simula contra el contrato, se solicita la firma a la wallet, se envía y finalmente se espera el recibo.

### 22. ¿Para qué sirve simular antes de pedir la firma?

Detecta muchos reverts sin gastar gas y permite mostrar un error más claro antes de abrir la wallet.

### 23. ¿Una simulación exitosa garantiza que la transacción tendrá éxito?

No. El estado puede cambiar entre simulación e inclusión, el gas puede variar o la transacción puede ser reemplazada.

### 24. ¿Quién paga el gas?

La cuenta que firma y envía la transacción. Incluso las funciones de expiración, ejecutables por cualquiera, requieren gas de quien las materializa.

### 25. ¿Las lecturas cuestan gas?

No al usuario, porque son llamadas RPC locales mediante `eth_call`. El proveedor RPC sí aporta la infraestructura.

### 26. ¿Cómo crea un escrow el frontend?

Llama a `EscrowFactory.createEscrow` con participantes, duraciones y título, y adjunta el monto como `msg.value` convertido de ETH a wei.

### 27. ¿Cómo obtiene la dirección del escrow recién creado?

Decodifica el evento `EscrowCreated` del recibo y luego comprueba la dirección con `isEscrow` en la factory.

### 28. ¿Por qué se usa `parseEther`?

Porque el usuario escribe ETH con decimales, pero los contratos reciben enteros en wei. `parseEther` hace esa conversión sin usar números de punto flotante.

### 29. ¿Cómo se controla que solo el rol correcto ejecute una acción?

La UI compara la cuenta conectada con owner, worker o arbiter para habilitar botones. La seguridad real la imponen los modificadores del contrato.

### 30. ¿Qué pasa si alguien evita la UI y llama directamente al contrato?

El contrato vuelve a verificar rol, estado, plazo y parámetros. Las validaciones del frontend mejoran la experiencia, pero no son una barrera de seguridad.

### 31. ¿Cómo se evita enviar dos operaciones simultáneas sobre el mismo escrow?

El coordinador mantiene un bloqueo en memoria por dirección mientras una simulación, firma o confirmación está pendiente.

### 32. ¿Qué ocurre si el usuario rechaza la firma?

No se envía ninguna transacción ni se gasta gas. La interfaz distingue ese rechazo de un revert on-chain o de un fallo desconocido.

### 33. ¿Qué diferencia hay entre una transacción enviada, confirmada y revertida?

Enviada ya tiene hash pero aún no recibo. Confirmada fue incluida con estado exitoso. Revertida fue incluida, consumió gas y deshizo sus cambios.

### 34. ¿Cómo maneja una transacción que tarda demasiado?

Después de 60 segundos la marca como prolongada, conserva su hash en `localStorage` y consulta periódicamente el recibo al volver a abrir la aplicación.

### 35. ¿Qué se guarda en `localStorage`?

Solo la dirección del escrow, el hash y la fecha de envío de transacciones pendientes. No se guardan claves ni firmas.

### 36. ¿Qué ocurre si una transacción es reemplazada?

El coordinador reconoce el hash de reemplazo, deja de seguir el anterior y registra el nuevo.

## Seguridad, fondos y privacidad

### 37. ¿El ETH queda guardado en el frontend o en la factory?

No. La factory despliega un contrato `Escrow` y le transfiere el `msg.value`; los fondos quedan custodiados por ese contrato.

### 38. ¿Por qué los pagos se retiran con `withdraw` en vez de enviarse automáticamente?

Se usa el patrón pull payment: el contrato acredita `pendingWithdrawals` y cada beneficiario retira. Esto reduce fallos y superficie de reentrancia durante cambios de estado.

### 39. ¿Cómo se protege `withdraw` de reentrancia?

Aplica Checks-Effects-Interactions: comprueba el saldo, lo pone en cero y recién después envía ETH. Si el envío falla, el revert restaura el estado.

### 40. ¿Los textos de entrega y disputa son privados?

No. Se almacenan on-chain y cualquiera puede leerlos. La UI advierte que no se publiquen secretos ni datos sensibles.

### 41. ¿Por qué se validan direcciones y textos también en el frontend?

Para dar feedback inmediato y evitar firmas inútiles. El contrato repite las validaciones porque no puede confiar en el cliente.

### 42. ¿Cómo se muestran errores del contrato?

El frontend reconoce errores personalizados del ABI y los traduce a mensajes entendibles, conservando el detalle técnico para diagnóstico.

### 43. ¿Qué riesgo tiene depender de un RPC?

Si el RPC falla o está desactualizado, las lecturas pueden fallar o demorarse. No puede falsificar una transacción firmada, pero sí afectar disponibilidad y presentación temporal de datos.

### 44. ¿Para qué sirven los enlaces al explorador?

Permiten verificar independientemente direcciones y transacciones en Sepolia, incluyendo estado, bloque, eventos y consumo de gas.

## Decisiones de diseño

### 45. ¿Por qué la aplicación puede ser una SPA estática?

Porque el estado persistente vive en Ethereum y las lecturas se hacen por RPC. No necesita un backend propio para operar el protocolo.

### 46. ¿Qué aporta TanStack Query en una dApp?

Cachea estado on-chain, controla reintentos y polling, evita solicitudes duplicadas y permite invalidar datos después de una confirmación.

### 47. ¿Por qué no se actualiza la UI apenas la wallet devuelve el hash?

Un hash solo prueba que la operación fue enviada. Se espera el recibo exitoso antes de considerar confirmado el cambio on-chain.

### 48. ¿Qué limitación tiene filtrar escrows en el frontend?

El filtro actúa sobre la página ya leída, no como una consulta indexada global. Para gran escala convendría un indexador, como The Graph o un backend de eventos.

### 49. ¿Qué ventaja tiene mantener registros por participante en la factory?

Permite consultar los escrows de una cuenta por rol sin recorrer todos los contratos desplegados.

### 50. ¿Qué parte del sistema debe auditarse con mayor rigor?

Los contratos, porque custodian fondos y definen permisos y transiciones irreversibles. El frontend también debe validarse, pero no debe ser la única defensa.
