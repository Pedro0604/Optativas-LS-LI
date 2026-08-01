# Escrow

Sistema de acuerdos financiados con ETH entre participantes identificados por sus direcciones blockchain.

## Language

**Escrow**:
Acuerdo financiado con ETH que mantiene fondos aislados y atraviesa un ciclo de aceptación, entrega, revisión y eventual arbitraje.
_Avoid_: Contract, job, transaction

**Escrow state**:
Etapa autoritativa del ciclo de vida de un escrow, almacenada en la blockchain. Puede ser operativa o terminal.
_Avoid_: UI status, transaction status

**Available action**:
Transición que una cuenta puede intentar según el estado del escrow, su rol y el plazo vigente. El contrato conserva la autoridad final para aceptarla o rechazarla.
_Avoid_: Permission, authorized button

**Unfinalized expiration**:
Situación en la que el plazo activo ya terminó pero el escrow aún conserva su estado operativo porque nadie ejecutó la transición de expiración.
_Avoid_: Expired state, automatic expiration

**Submission reference**:
Texto inmutable que identifica dónde puede consultarse la entrega del trabajo, normalmente una URL o un CID. No contiene ni garantiza por sí mismo el contenido entregado.
_Avoid_: Uploaded work, on-chain file

**Worker allocation**:
Parte del monto del escrow que el arbiter asigna al worker al resolver una disputa. La asignación del owner es siempre el remanente exacto.
_Avoid_: Split percentage, worker reward

**Participant**:
Persona que interviene en un escrow mediante una cuenta blockchain y puede ocupar el rol de owner, worker o arbiter.
_Avoid_: User, authenticated user

**Connected account**:
Cuenta blockchain que el participante seleccionó en su wallet y que identifica su sesión actual en la interfaz. No constituye una sesión autenticada fuera de la blockchain.
_Avoid_: Login, off-chain session

**Visitor**:
Persona que consulta información pública de los escrows sin conectar una cuenta. Solo se convierte en participante dentro de la interfaz cuando conecta una cuenta.
_Avoid_: Anonymous user, unauthenticated user

**Owner**:
Participante que crea y financia un escrow para contratar un trabajo.
_Avoid_: Client, customer

**Worker**:
Participante encargado de aceptar y entregar el trabajo a cambio del pago acordado.
_Avoid_: Employee, contractor

**Arbiter**:
Participante independiente encargado de distribuir los fondos cuando existe una disputa.
_Avoid_: Judge, mediator
