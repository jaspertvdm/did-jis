# ⚠️ DEPRECATED - Moved to jis-npm

This repository has been **deprecated**. The new packages are:

## NPM Packages
- **[@humotica/jis](https://www.npmjs.com/package/@humotica/jis)** - JIS TypeScript/JavaScript library
- **[@humotica/jis-core](https://www.npmjs.com/package/@humotica/jis-core)** - JIS Core with WASM bindings

### Why the rename?
The `did:jis` prefix conflicted with W3C DID specification. We've pivoted to `jis:` URIs as a standalone identity standard.

### Migration
```bash
# Old (deprecated)
npm install did-jis

# New
npm install @humotica/jis
```

### Links
- **NPM @humotica/jis**: https://www.npmjs.com/package/@humotica/jis
- **NPM @humotica/jis-core**: https://www.npmjs.com/package/@humotica/jis-core
- **GitHub jis-core**: https://github.com/jaspertvdm/jis-core
- **IETF Draft**: https://datatracker.ietf.org/doc/draft-vandemeent-jis-identity/

---

*JIS (JTel Identity Standard) - Bilateral intent verification with TIBET provenance*
