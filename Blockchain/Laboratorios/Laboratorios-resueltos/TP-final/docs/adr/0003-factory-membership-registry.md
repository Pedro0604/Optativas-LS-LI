# Keep a factory membership registry

`EscrowFactory` will maintain a permanent public `isEscrow` mapping in addition to its address arrays. The duplicated storage is accepted so clients can validate address-based routes in constant time and distinguish canonical factory-created escrows from independently deployed compatible contracts without scanning arrays or historical logs.
