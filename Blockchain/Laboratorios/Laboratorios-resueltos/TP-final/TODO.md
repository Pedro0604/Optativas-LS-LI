- Tests de Escrow:
  Escrow
  └── constructor
  ├── valid initialization
  │ ├── stores the participants
  │ ├── stores the original amount
  │ ├── stores the title
  │ ├── calculates the deadline
  │ ├── starts in Funded
  │ └── retains the deposited ETH
  │
  └── validation
  ├── reverts without ETH
  ├── reverts with zero owner
  ├── reverts with zero worker
  ├── reverts when owner equals worker
  ├── reverts with zero duration
  ├── reverts with empty title
  ├── accepts a 64-byte title
  └── rejects a title longer than 64 bytes

- Luego, seguir añadiendo funcionalidad a Escrow: aceptar escrow por parte del worker... Hacer TDD(?
- Cuando se implementen las transiciones de estado, cada función pública debería tener su propio describe():

### Antes de entrgar

- docstrings de .sol y utils.ts (o similares)
