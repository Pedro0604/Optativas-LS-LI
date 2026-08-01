# Escrow

Sistema de acuerdos financiados con ETH entre participantes identificados por sus direcciones blockchain.

## Language

**Participant**:
Persona que interviene en un escrow mediante una cuenta blockchain y puede ocupar el rol de owner, worker o arbiter.
_Avoid_: User, authenticated user

**Connected account**:
Cuenta blockchain que el participante seleccionó en su wallet y que identifica su sesión actual en la interfaz. No constituye una sesión autenticada fuera de la blockchain.
_Avoid_: Login, off-chain session

**Owner**:
Participante que crea y financia un escrow para contratar un trabajo.
_Avoid_: Client, customer

**Worker**:
Participante encargado de aceptar y entregar el trabajo a cambio del pago acordado.
_Avoid_: Employee, contractor

**Arbiter**:
Participante independiente encargado de distribuir los fondos cuando existe una disputa.
_Avoid_: Judge, mediator
