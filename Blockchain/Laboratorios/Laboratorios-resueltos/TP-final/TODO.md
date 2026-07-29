- Luego, seguir añadiendo funcionalidad a Escrow: aceptar escrow por parte del worker... Hacer TDD(?
- Cuando se implementen las transiciones de estado, cada función pública debería tener su propio describe():
- Reemplazar amountInEth por string o bigint para evitar problemas de precisión por number. Probar con valores de ETH no enteros para ver q tal.

- Añadir en Escrow tests explícitos para establecer el comportamiento esperado de:
  - Título compuesto únicamente por espacios.
  - Título con saltos de línea.
- Añadir en EscrowFactory: El test de revert actualmente parte de registros vacíos y verifica que continúen vacíos. Modificarlo para:
  - Crear uno o más escrows válidos.
  - Guardar counts y direcciones existentes.
  - Ejecutar una creación inválida.
  - Verificar que counts, arrays, balances y entradas existentes permanezcan exactamente iguales.

### Antes de entrgar

- docstrings de .sol y utils.ts (o similares)
- revisar y aplicar o eliminar TODOs
- Matchear state de Escrow.sol con state de utils.ts
