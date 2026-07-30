# To-do de implementación del sistema Escrow

> Este checklist supone que `to-do.md`, `escrow-spec.md` y `guia-resumen.md` se encuentran en el mismo directorio.  
> Las referencias **HU** corresponden a la numeración de la sección [User Stories](./escrow-spec.md#user-stories) de la especificación.

## Checklist

- [ ] **1. Revisar el diseño actual y preparar el refactor**

  Comparar los contratos y helpers actuales con la arquitectura acordada, identificar interfaces que cambiarán y registrar qué tests existentes deberán adaptarse antes de agregar funcionalidad.

  **Referencias:** [Arquitectura y módulos](./escrow-spec.md#contract-modules) · [Arquitectura general](./guia-resumen.md#2-arquitectura-general) · [Orden sugerido de implementación](./guia-resumen.md#21-orden-sugerido-de-implementación)  
  **Historias abarcadas:** [HU 112–119 y 140](./escrow-spec.md#user-stories)

- [ ] **2. Definir el enum completo y las variables de estado de `Escrow`**

  Incorporar los once estados definitivos, las direcciones de los tres participantes, duraciones, deadlines, strings almacenados, monto y mapping de retiros pendientes.

  **Referencias:** [Máquina de estados](./escrow-spec.md#state-machine) · [Estados](./guia-resumen.md#4-estados) · [Variables de Escrow](./guia-resumen.md#10-variables-de-escrow)  
  **Historias abarcadas:** [HU 27–29, 39, 42, 48, 66, 73, 84–91, 132, 135–140](./escrow-spec.md#user-stories)

- [ ] **3. Implementar constantes y validaciones del constructor**

  Validar ETH, participantes, duraciones y título; guardar los datos inmutables; calcular `acceptanceDeadline`; dejar los demás deadlines en cero; iniciar el estado en `PendingAcceptance`.

  **Referencias:** [Validaciones y errores](./escrow-spec.md#validation-and-errors) · [Validaciones del constructor](./guia-resumen.md#17-validaciones-del-constructor) · [Participantes](./guia-resumen.md#3-participantes)  
  **Historias abarcadas:** [HU 1–18 y 115–117](./escrow-spec.md#user-stories)

- [ ] **4. Actualizar la interfaz de creación de `EscrowFactory`**

  Adaptar `createEscrow` para recibir árbitro, cuatro duraciones en segundos y título; enviar el ETH al constructor; devolver la dirección creada y mantener la creación atómica.

  **Referencias:** [Interfaz de creación](./escrow-spec.md#creation-interface) · [Interfaz de EscrowFactory](./guia-resumen.md#9-interfaz-de-escrowfactory) · [Atomicidad de la fábrica](./guia-resumen.md#18-atomicidad-de-la-fábrica)  
  **Historias abarcadas:** [HU 1–18, 100–105 y 112–119](./escrow-spec.md#user-stories)

- [ ] **5. Completar los registros y consultas de la fábrica**

  Agregar `escrowsByArbitrator`, `isEscrow`, registro global y consultas de cantidades; evitar un contador duplicado y usar `allEscrows.length` como total.

  **Referencias:** [Registros de la fábrica](./escrow-spec.md#factory-registries) · [Registros y consultas](./guia-resumen.md#registros)  
  **Historias abarcadas:** [HU 106–111 y 130–131](./escrow-spec.md#user-stories)

- [ ] **6. Implementar la aceptación del acuerdo**

  Implementar `acceptEscrow()` para el worker, validar estado y ventana temporal, calcular `submissionDeadline`, cambiar a `PendingSubmission` y emitir `EscrowAccepted`.

  **Referencias:** [Modelo temporal](./escrow-spec.md#time-model) · [`acceptEscrow()`](./guia-resumen.md#accept) · [Reglas temporales](./guia-resumen.md#8-reglas-temporales)  
  **Historias abarcadas:** [HU 17–20, 23 y 28–29](./escrow-spec.md#user-stories)

- [ ] **7. Implementar cancelación y vencimiento de aceptación**

  Implementar `cancelEscrow()` para el owner antes del deadline y `expireAcceptance()` permissionless desde el deadline; ambos deben acreditar al owner y terminar en estados diferentes.

  **Referencias:** [Cancelación](./escrow-spec.md#cancellation-behavior) · [Expiraciones](./escrow-spec.md#expiration-behavior) · [`cancelEscrow()` y `expireAcceptance()`](./guia-resumen.md#11-funciones-de-escrow)  
  **Historias abarcadas:** [HU 21–27 y 87–91](./escrow-spec.md#user-stories)

- [ ] **8. Implementar entrega y vencimiento de entrega**

  Implementar `submitWork()` con referencia obligatoria e inmutable, cálculo de `reviewDeadline` y transición a `PendingReview`; implementar `expireDelivery()` con devolución completa al owner.

  **Referencias:** [Interfaz de entrega](./escrow-spec.md#submission-interface) · [`submitWork()` y `expireDelivery()`](./guia-resumen.md#11-funciones-de-escrow) · [Datos textuales](./guia-resumen.md#10-variables-de-escrow)  
  **Historias abarcadas:** [HU 30–43, 95–96 y 136](./escrow-spec.md#user-stories)

- [ ] **9. Implementar aprobación y vencimiento de revisión**

  Implementar `approveWork()` antes del deadline y `expireReview()` desde el deadline; ambos deben acreditar el monto completo al worker, pero terminar en `WorkApproved` y `ReviewExpired` respectivamente.

  **Referencias:** [Interfaz de aprobación](./escrow-spec.md#approval-interface) · [`approveWork()` y `expireReview()`](./guia-resumen.md#11-funciones-de-escrow)  
  **Historias abarcadas:** [HU 44–48 y 87–91](./escrow-spec.md#user-stories)

- [ ] **10. Implementar apertura de disputas**

  Implementar `openDispute()` únicamente para el owner y antes de `reviewDeadline`; validar, almacenar e inmovilizar `disputeReason`; calcular `arbitrationDeadline` y pasar a `PendingArbitration`.

  **Referencias:** [Interfaz de disputa](./escrow-spec.md#dispute-interface) · [`openDispute()`](./guia-resumen.md#opendispute-string-disputereason_) · [Estado `PendingArbitration`](./guia-resumen.md#disputed)  
  **Historias abarcadas:** [HU 49–55, 95–96 y 136](./escrow-spec.md#user-stories)

- [ ] **11. Implementar resolución arbitral proporcional**

  Implementar `resolveDispute()` para el árbitro antes del deadline, validar `workerAmount`, calcular el resto para el owner, almacenar `resolutionReason`, acreditar ambos saldos y pasar a `DisputeResolved`.

  **Referencias:** [Resolución de disputas](./escrow-spec.md#dispute-interface) · [`resolveDispute()`](./guia-resumen.md#resolvedispute-uint256-workeramount-string-resolutionreason_) · [Invariantes contables](./guia-resumen.md#15-invariantes-contables)  
  **Historias abarcadas:** [HU 56–68, 95–99 y 138–139](./escrow-spec.md#user-stories)

- [ ] **12. Implementar vencimiento del arbitraje**

  Implementar `expireArbitration()` permissionless desde `arbitrationDeadline`, distribuir 50/50 y asignar al worker cualquier wei sobrante.

  **Referencias:** [Expiración arbitral](./escrow-spec.md#expiration-behavior) · [`expireArbitration()`](./guia-resumen.md#expirearbitration) · [Resumen de transiciones](./guia-resumen.md#7-resumen-de-transiciones)  
  **Historias abarcadas:** [HU 68–73, 87–91, 127 y 138–139](./escrow-spec.md#user-stories)

- [ ] **13. Centralizar la acreditación de fondos**

  Implementar una lógica interna uniforme para acreditar `pendingWithdrawals` en todas las terminaciones, asegurando que cada camino asigne exactamente `amount` una sola vez.

  **Referencias:** [Contabilidad de retiros](./escrow-spec.md#withdrawal-accounting) · [Withdrawal pattern](./guia-resumen.md#14-withdrawal-pattern) · [Invariantes contables](./guia-resumen.md#15-invariantes-contables)  
  **Historias abarcadas:** [HU 41, 45–46, 57, 70–76 y 137–139](./escrow-spec.md#user-stories)

- [ ] **14. Implementar `withdraw()` de forma segura**

  Retirar el saldo completo del llamante, revertir ante saldo cero, aplicar checks-effects-interactions, manejar fallos de transferencia y emitir `FundsWithdrawn` sin modificar el estado.

  **Referencias:** [Contabilidad de retiros](./escrow-spec.md#withdrawal-accounting) · [`withdraw()`](./guia-resumen.md#withdraw) · [Checks-effects-interactions](./guia-resumen.md#checks-effects-interactions) · [Reentrancia](./guia-resumen.md#reentrancia)  
  **Historias abarcadas:** [HU 74–83, 98, 128–129 y 137–139](./escrow-spec.md#user-stories)

- [ ] **15. Definir todos los eventos y actualizar `EscrowCreated`**

  Incorporar los eventos definitivos con los parámetros e índices acordados; no emitir strings ni actores deducibles; emitir deadlines cuando comienza cada etapa.

  **Referencias:** [Eventos](./escrow-spec.md#events) · [Eventos de Escrow](./guia-resumen.md#12-eventos) · [Evento de creación](./guia-resumen.md#evento-de-creación)  
  **Historias abarcadas:** [HU 67, 92–105, 118–119 y 133–134](./escrow-spec.md#user-stories)

- [ ] **16. Completar custom errors y modificadores**

  Agregar errores específicos para árbitro, strings, montos, retiros y duraciones; revisar `onlyOwner`, `onlyWorker`, `onlyArbitrator`, `inState`, `onlyBefore` y `onlyAfter`.

  **Referencias:** [Validaciones y errores](./escrow-spec.md#validation-and-errors) · [Custom errors recomendados](./guia-resumen.md#13-custom-errors-recomendados) · [Orden de actualización](./guia-resumen.md#16-orden-recomendado-de-actualización-de-estado)  
  **Historias abarcadas:** [HU 15, 20, 35–36, 38, 50–53, 61–65, 68, 78 y 85–91](./escrow-spec.md#user-stories)

- [ ] **17. Actualizar fixtures, helpers y datos de prueba**

  Adaptar los helpers de despliegue y creación a los nuevos participantes, duraciones, eventos y estados; facilitar el avance controlado del tiempo y la creación de escrows en etapas específicas.

  **Referencias:** [Orden sugerido](./guia-resumen.md#21-orden-sugerido-de-implementación) · [Máquina de estados](./escrow-spec.md#state-machine) · [Reglas temporales](./guia-resumen.md#8-reglas-temporales)  
  **Historias abarcadas:** [HU 120–131](./escrow-spec.md#user-stories)

- [ ] **18. Implementar los tests funcionales de la máquina de estados**

  Cubrir cada transición válida, permisos, estado de origen, estado destino, deadlines calculados, eventos emitidos, strings almacenados y distribución resultante.

  **Referencias:** [Máquina de estados](./escrow-spec.md#state-machine) · [Resumen de transiciones](./guia-resumen.md#7-resumen-de-transiciones) · [Tests no obvios](./guia-resumen.md#19-tests-no-obvios-o-especialmente-importantes)  
  **Historias abarcadas:** [HU 120–126 y 132–136](./escrow-spec.md#user-stories)

- [ ] **19. Implementar tests exhaustivos de límites temporales**

  Probar cada acción y expiración un segundo antes, exactamente en y después del deadline; verificar que no existan ventanas superpuestas ni carreras lógicas después del vencimiento.

  **Referencias:** [Modelo temporal](./escrow-spec.md#time-model) · [Límites temporales exactos](./guia-resumen.md#191-límites-temporales-exactos) · [Carrera lógica](./guia-resumen.md#192-carrera-lógica-después-del-vencimiento)  
  **Historias abarcadas:** [HU 20, 22, 38, 50, 68, 86–91 y 122–123](./escrow-spec.md#user-stories)

- [ ] **20. Implementar tests contables y de seguridad no triviales**

  Probar repartos extremos, división impar, retiros independientes, doble retiro, receptor que rechaza ETH, conservación de saldos y asignación única del monto.

  **Referencias:** [Atomicidad y consistencia](./escrow-spec.md#atomicity-and-consistency) · [Invariantes contables](./guia-resumen.md#15-invariantes-contables) · [Tests 19.4–19.7](./guia-resumen.md#194-distribución-arbitral-extrema)  
  **Historias abarcadas:** [HU 126–129 y 137–139](./escrow-spec.md#user-stories)

- [ ] **21. Implementar tests de registros y atomicidad de la fábrica**

  Probar múltiples escrows y roles, `isEscrow`, arrays y counts; ante una creación inválida con registros previos, comprobar que direcciones, balances y entradas existentes permanecen sin cambios.

  **Referencias:** [Registros de la fábrica](./escrow-spec.md#factory-registries) · [Atomicidad y consistencia](./escrow-spec.md#atomicity-and-consistency) · [Estado previo no vacío](./guia-resumen.md#193-estado-previo-no-vacío-ante-creación-inválida) · [Registros por roles](./guia-resumen.md#1911-registros-por-roles-coincidentes-entre-escrows)  
  **Historias abarcadas:** [HU 106–119 y 130–131](./escrow-spec.md#user-stories)

- [ ] **22. Revisar ABI, despliegue e integración con la interfaz**

  Actualizar artefactos y módulo de despliegue de la fábrica; comprobar que la UI pueda descubrir escrows, leer strings, interpretar estados, mostrar deadlines, ofrecer acciones por rol y habilitar retiros.

  **Referencias:** [Further Notes](./escrow-spec.md#further-notes) · [Consideraciones para la interfaz web](./guia-resumen.md#20-consideraciones-para-la-interfaz-web) · [Resumen ejecutivo](./guia-resumen.md#22-resumen-ejecutivo)  
  **Historias abarcadas:** [HU 92–111 y 132–136](./escrow-spec.md#user-stories)

- [ ] **23. Realizar una auditoría final de consistencia**

  Verificar que nombres, documentación NatSpec, ABI, estados, eventos, errores y tests coincidan con la especificación; confirmar que no haya transiciones desde estados terminales ni caminos que asignen fondos dos veces.

  **Referencias:** [Atomicidad y consistencia](./escrow-spec.md#atomicity-and-consistency) · [Invariantes contables](./guia-resumen.md#15-invariantes-contables) · [Resumen ejecutivo](./guia-resumen.md#22-resumen-ejecutivo)  
  **Historias abarcadas:** [HU 117–140](./escrow-spec.md#user-stories)

## Criterio global de finalización

El sistema puede considerarse implementado cuando:

- los contratos compilan con la ABI acordada;
- todas las transiciones válidas e inválidas están cubiertas;
- los deadlines respetan exactamente las ventanas definidas;
- cada finalización acredita exactamente el monto del escrow;
- los retiros son independientes y seguros;
- la fábrica conserva registros coherentes ante éxitos y reverts;
- la interfaz puede interpretar el ciclo completo sin depender de datos no expuestos.
