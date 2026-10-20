# Repository Working Rules

- Do not invent or broaden product requirements. Follow the user's stated
  behavior; when an unspecified behavior would affect data, permissions,
  notifications, or external destinations, ask before choosing it.
- Keep integrations isolated by purpose. Never send to another feature's
  webhook, account, or destination as a fallback unless the user explicitly
  requires that behavior. Treat missing destination configuration as an error.
