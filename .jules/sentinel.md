## 2024-04-17 - [Insecure Randomness]
**Vulnerability:** Weak random number generation using `Math.random()` for ID generation (`id_instancia`).
**Learning:** The usage of `Math.random()` was chosen for simplicity, but it's not cryptographically secure and may lead to collisions.
**Prevention:** Use `crypto.randomUUID()` when generating unique identifiers instead of relying on `Math.random()`.
