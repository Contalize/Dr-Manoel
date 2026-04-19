## 2024-04-19 - Weak Random Number Generation for Identifiers
**Vulnerability:** Usage of `Math.random().toString(36)` to generate local identifiers (`id_instancia`).
**Learning:** Developers often use `Math.random()` for quick local IDs, but this is a weak PRNG which can lead to predictable identifiers and collision issues.
**Prevention:** Enforce the usage of `crypto.randomUUID()` for all identifier generation to ensure cryptographically secure uniqueness.
