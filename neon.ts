import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Customer accounts: Neon Auth (Managed Better Auth). See src/lib/auth/server.ts.
  auth: true,
  buckets: {
    // Product images uploaded in /admin. Public reads so <img>/next/image can load them;
    // writes need the branch credential (server only). See src/lib/storage.ts.
    "product-uploads": { access: "public_read" },
  },
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
});
