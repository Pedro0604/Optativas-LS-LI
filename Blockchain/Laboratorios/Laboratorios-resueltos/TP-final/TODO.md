### Next
- Hacer issue-07
- Hacer lifecycle tests.

### Bugs
- Arreglar form de creación porque los errores siempre se muestran al inicio, deberían ir calculandose on blur o algo así
- Al clickear conectar Wallet, aparece MetaMask y Injected, que abre MetaMask
- En confirmación de creación mostrar duración en segundos, pero también en un formato más legible (días, horas, minutos, según corresponda)

### Later
- IEscrow.sol que tenga todos los eventos, errores y la interfaz con su NatSpec para que en Escrow.sol esté la implementación y no esté lleno de comentarios de specs (usar @inheritdoc) 

### Antes de entrgar
- Revisar 21, 22 y 23 de specs-todo
- Revisar y aplicar o eliminar TODOs
- Revisar docstrings de .sol para que todas las funciones tengan y que respete NatSpec, mejorarlo y asegurarse que es correcto para cada función.
- Revisar que las funciones, constantes y types de archivos .ts tengan sus docstrings
- Matchear state de Escrow.sol con state de State.ts y de EscrowState.ts y errores y eventos con Error.ts y Event.ts

## Links
Grilling: https://chatgpt.com/c/6a6a88a4-3b28-83e9-8cb8-8fe8a40804c0

https://asignaturas.info.unlp.edu.ar/course/view.php?id=141
https://chatgpt.com/share/6a5a20b3-3318-83e9-9559-db9facc90955
https://chatgpt.com/s/t_6a642f3e2ed4819192445afe7d476234
https://chatgpt.com/s/t_6a642ebc12048191b0cc14ae882c8c98
https://docs.soliditylang.org/en/v0.8.36/style-guide.html
https://docs.soliditylang.org/en/v0.8.36/genindex.html

Tests:
https://hardhat.org/docs/guides/testing/using-ethers#testing-a-function-that-reverts
https://hardhat.org/docs/plugins/hardhat-ethers
https://hardhat.org/docs/plugins/hardhat-ethers-chai-matchers#reverted-transactions
https://hardhat.org/docs/plugins/hardhat-network-helpers#time

Deploy:
https://hardhat.org/docs/guides/deployment
https://hardhat.org/docs/guides/deployment/using-ignition
https://hardhat.org/docs/guides/smart-contract-verification
Set config keys: https://chatgpt.com/c/6a6e36a3-90dc-83e9-8f46-98762c22a932

## Futurisimo
- Comisión de arbiter
- Arbiters designados por creador de EscrowFactory?
- Despliegues de Escrow solo desde EscrowFactory?
- Comisión del sistema
- Referencias y razones de entrega, disputa y resolucion que sean bytes32 hash 