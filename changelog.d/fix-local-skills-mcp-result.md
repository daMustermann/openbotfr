### Fixed

- Return local skill lists as an MCP-compatible object, including when the shared skill library is empty. This fixes the invalid `structuredContent` response error when agents call `list_local_skills`.
