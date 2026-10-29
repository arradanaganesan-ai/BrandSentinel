# BrandSentinel — Known Limitations & Future Roadmap

## 1. Current Engineering Limitations

1. **Local Database Default**:
   - The platform defaults to `sqlite+aiosqlite:///./brandsentinel.db` with WAL mode for instantaneous single-command local development without external dependencies.
   - For high-concurrency multi-tenant enterprise production, configure `DATABASE_URL` to PostgreSQL with `asyncpg` (`postgresql+asyncpg://...`).

2. **Visual Asset Extraction**:
   - Automated visual checks extract exact dominant color coordinates and compute mathematical WCAG 2.1 relative luminance ratios using Pillow.
   - Complex typographic hierarchy, letter spacing, kerning, and subtle logo distortion heuristics require manual visual review by a human brand designer. The platform explicitly advises this rather than fabricating uncalibrated layout metrics.

3. **External LLM Providers**:
   - When configured in `DEMO` mode, BrandSentinel uses its deterministic rule engine, regex offset matcher, and pre-calibrated Claim DNA decomposition templates without requiring paid API keys.
   - When configured with `OPENAI` or `GEMINI` API keys, external models process semantic guideline alignment. Prompt injection protections are enforced: uploaded draft texts are isolated in user prompts and never treated as execution instructions.

4. **Multi-Tenancy Isolation**:
   - In MVP demo mode, all five user personas operate within the fictional "Northstar Labs" organization workspace with server-side organization ID checks on every route.
   - Multi-organization cross-tenant switching in a single session is supported at the database schema level via the `Membership` model.

---

## 2. Recommended Next Enhancements

1. **pgvector Semantic Retrieval**:
   - Add automated vector embeddings (`pgvector` or `chromadb`) for semantic similarity search across historical corporate documents.
2. **Automated Headless Document Parser**:
   - Add DOCX and multi-page PDF text and raster layer extraction pipeline.
3. **Figma / Canva Plugin Integration**:
   - Connect BrandSentinel Review Studio directly to Figma component libraries to run live visual governance during design time.
