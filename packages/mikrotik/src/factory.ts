import type { MikroTikController, RouterConnectionConfig } from "./controller";
import { RouterOSController } from "./routeros";
import { MockMikroTikController } from "./mock";
import type { Router } from "@tz/database";

// =====================================================
// MikroTik Controller Factory
// =====================================================
//
// Given a Router DB record (with encrypted credentials),
// returns a controller. In development/test mode
// (MIKROTIK_MODE=mock) returns MockMikroTikController;
// otherwise returns the real RouterOSController.
//
// Router credentials are decrypted using the configured
// encryption key (see encryption.ts). The frontend never
// receives router credentials.

function decrypt(encrypted: string | null, keyId: string | null): string {
  if (!encrypted) return "";
  // Decryption uses the app's encryption key. Kept separate
  // from this package boundary; see shared/encryption.
  const { decryptValue } = require("@tz/shared");
  return decryptValue(encrypted, keyId ?? undefined);
}

export function isMockMode(): boolean {
  return (process.env.MIKROTIK_MODE || "mock") === "mock";
}

export function buildRouterConfig(router: Router): RouterConnectionConfig {
  return {
    host: router.host ?? "",
    apiPort: router.apiPort ?? 8728,
    apiSecurePort: router.apiSecurePort ?? 8729,
    username: decrypt(router.usernameEncrypted, router.encryptionKeyId) || "admin",
    password: decrypt(router.passwordEncrypted, router.encryptionKeyId),
    tls: (process.env.MIKROTIK_TLS_ENABLED || "false") === "true",
  };
}

export function buildController(router: Router): MikroTikController {
  const config = buildRouterConfig(router);
  if (isMockMode()) {
    return new MockMikroTikController(config);
  }
  return new RouterOSController(config);
}

export function buildControllerFromConfig(config: RouterConnectionConfig): MikroTikController {
  if (isMockMode()) {
    return new MockMikroTikController(config);
  }
  return new RouterOSController(config);
}
