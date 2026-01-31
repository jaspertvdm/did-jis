# did-jis

[![npm version](https://img.shields.io/npm/v/did-jis.svg)](https://www.npmjs.com/package/did-jis)
[![IETF Draft](https://img.shields.io/badge/IETF-draft--vandemeent--jis--identity-blue)](https://datatracker.ietf.org/doc/draft-vandemeent-jis-identity/)
[![IETF Draft](https://img.shields.io/badge/IETF-draft--vandemeent--tibet--provenance-blue)](https://datatracker.ietf.org/doc/draft-vandemeent-tibet-provenance/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**JIS (JTel Identity Standard)** - Bilateral consent and intent verification with TIBET provenance trails.

> *"Other DIDs prove who you are. did:jis proves both parties agreed to what happened."*

## Features

- **Bilateral Consent** - Both parties must agree; cryptographic proof for each
- **TIBET Provenance** - Full audit trail: WHAT, WITH, WHERE, WHY (WWWw)
- **Intent Verification** - Not just identity, but *why* this action
- **W3C/IETF Compatible** - Works with Verifiable Credentials ecosystem
- **Browser & Node.js** - ESM and CommonJS builds included
- **Zero Dependencies** - Lightweight, secure, auditable

## Installation

```bash
npm install did-jis
```

```bash
yarn add did-jis
```

```bash
pnpm add did-jis
```

## Quick Start

### Bilateral Consent Flow

```typescript
import { createBilateralConsent, createDID } from 'did-jis';

// Create DIDs for both parties
const aliceDid = createDID('alice');
const bobDid = createDID('bob');

// Alice proposes sharing data with Bob
const { proposal, accept, reject } = await createBilateralConsent({
  from: aliceDid,
  to: bobDid,
  action: 'share-health-records',
  purpose: 'Medical consultation'
});

console.log('Proposal token:', proposal.token.tokenId);

// Bob accepts - both now have cryptographic proof
const response = await accept();
console.log('Consent accepted:', response.token);
```

### TIBET Provenance Tokens

```typescript
import { TIBET } from 'did-jis';

const tibet = new TIBET('did:jis:myapp');

// Create a token with full WWWw provenance
const token = await tibet.createToken({
  type: 'audit',
  what: 'User logged in',
  with: ['did:jis:user123', 'did:jis:auth-service'],
  where: { ip: '192.168.1.1', device: 'mobile' },
  why: 'Session initialization'
});

// Verify the token
const result = await tibet.verify(token.tokenId);
console.log('Valid:', result.valid);
console.log('Trust score:', result.trustScore);

// Get full provenance chain
const chain = tibet.getChain(token.tokenId);
console.log('Chain length:', chain?.length);
```

### DID Document Builder

```typescript
import { DIDDocumentBuilder, createDID } from 'did-jis';

const did = createDID('company', 'employee', '42');

const doc = new DIDDocumentBuilder(did)
  .addVerificationMethod({
    id: `${did}#key-1`,
    type: 'JsonWebKey2020',
    controller: did,
    publicKeyJwk: { /* your JWK */ }
  })
  .addConsentService('https://api.company.com/consent')
  .addTibetService('https://api.company.com/tibet')
  .build();

console.log(JSON.stringify(doc, null, 2));
```

## WWWw Provenance Model

TIBET uses the **WWWw** model for complete provenance:

| Term | Dutch | English | Description |
|------|-------|---------|-------------|
| **WHAT** | ERIN | Within | What's inside - the content/action itself |
| **WITH** | ERAAN | Attached | What's linked - dependencies, references |
| **WHERE** | EROMHEEN | Around | Context - environment, circumstances |
| **WHY** | ERACHTER | Behind | Intent - purpose, reason |

```typescript
// Every TIBET token captures all four dimensions
const token = await tibet.createToken({
  type: 'bilateral_consent',
  what: 'Share medical records',        // WHAT is happening
  with: ['did:jis:patient', 'did:jis:doctor'], // WITH whom
  where: { hospital: 'General', dept: 'Cardiology' }, // WHERE/context
  why: 'Treatment planning for cardiac procedure'     // WHY
});
```

## API Reference

### TIBET Class

```typescript
const tibet = new TIBET(actorDid?: string);

// Create token
await tibet.createToken({ type, what, with?, where?, why, ... });

// Verify token
await tibet.verify(tokenOrId);

// Get provenance chain
tibet.getChain(tokenId);

// Update state
tibet.updateState(tokenId, newState);

// List tokens
tibet.listTokens({ type?, state?, actor? });
```

### BilateralConsentManager

```typescript
const manager = new BilateralConsentManager(actorDid?: string);

// Propose consent
await manager.propose({ from, to, action, purpose, context?, expiresIn? });

// Accept proposal
await manager.accept(proposalId, acceptorDid);

// Reject proposal
await manager.reject(proposalId, rejectorDid, reason?);

// Verify consent
await manager.verifyConsent(tokenId);
```

### DID Utilities

```typescript
// Create a DID
createDID('alice');                    // 'did:jis:alice'
createDID('org', 'dept', '123');       // 'did:jis:org:dept:123'

// Parse a DID
parseDID('did:jis:alice');             // { method: 'jis', id: 'alice' }

// Validate a DID
isValidDID('did:jis:alice');           // true
isValidDID('invalid');                 // false
```

## Use Cases

### Cookie Consent with Audit Trail

```typescript
const { proposal, accept } = await createBilateralConsent({
  from: 'did:jis:website',
  to: 'did:jis:visitor-' + visitorId,
  action: 'set-analytics-cookies',
  purpose: 'Website analytics for improving user experience'
});

// Store proposal token as proof of consent request
// When user clicks "Accept", call accept()
```

### API Authentication with Intent

```typescript
const token = await tibet.createToken({
  type: 'verification',
  what: { endpoint: '/api/user/data', method: 'GET' },
  with: ['did:jis:client-app', 'did:jis:api-server'],
  where: { timestamp: Date.now(), requestId: uuid() },
  why: 'Fetch user profile for dashboard display'
});

// Include token in API request headers
headers['X-TIBET-Token'] = token.tokenId;
```

### GDPR-Compliant Data Sharing

```typescript
const consent = await createBilateralConsent({
  from: 'did:jis:data-controller',
  to: 'did:jis:user-' + userId,
  action: 'share-with-third-party',
  purpose: 'Share anonymized data with research partner',
  context: {
    dataCategories: ['usage-statistics'],
    recipient: 'Research University',
    retention: '24 months'
  }
});
```

## IETF Specifications

This library implements:

- **JIS**: [draft-vandemeent-jis-identity](https://datatracker.ietf.org/doc/draft-vandemeent-jis-identity/)
- **TIBET**: [draft-vandemeent-tibet-provenance](https://datatracker.ietf.org/doc/draft-vandemeent-tibet-provenance/)

## Related

- [did-jis (Python)](https://pypi.org/project/did-jis/) - Python implementation
- [W3C DID Core](https://www.w3.org/TR/did-core/) - DID specification
- [W3C Verifiable Credentials](https://www.w3.org/TR/vc-data-model-2.0/) - VC data model

## License

MIT - see [LICENSE](LICENSE)

## Authors

- **Jasper van de Meent** - [jasper@humotica.nl](mailto:jasper@humotica.nl)
- **Claude** (Anthropic) - AI Co-author

---

Built with bilateral consent by [Humotica](https://humotica.com)

*One love, one fAmIly*
