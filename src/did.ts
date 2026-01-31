/**
 * DID:JIS Resolver and Document Management
 *
 * Implements the did:jis method specification.
 * IETF Draft: draft-vandemeent-jis-identity
 */

import { DIDDocument, VerificationMethod, ServiceEndpoint } from './types';

/**
 * Parse a did:jis identifier
 *
 * Format: did:jis:<method-specific-id>
 *
 * @example
 * ```typescript
 * const parsed = parseDID('did:jis:user123');
 * // { method: 'jis', id: 'user123' }
 *
 * const parsed2 = parseDID('did:jis:org:company:employee42');
 * // { method: 'jis', id: 'org:company:employee42' }
 * ```
 */
export function parseDID(did: string): { method: string; id: string } | null {
  const regex = /^did:([a-z]+):(.+)$/;
  const match = did.match(regex);

  if (!match) return null;

  return {
    method: match[1],
    id: match[2],
  };
}

/**
 * Validate a did:jis identifier
 */
export function isValidDID(did: string): boolean {
  if (!did.startsWith('did:jis:')) return false;

  const parsed = parseDID(did);
  if (!parsed) return false;

  // ID must be non-empty and contain valid characters
  return /^[a-zA-Z0-9:._-]+$/.test(parsed.id);
}

/**
 * Create a new did:jis identifier
 *
 * @example
 * ```typescript
 * const did = createDID('alice');
 * // 'did:jis:alice'
 *
 * const did2 = createDID('company', 'employee', '42');
 * // 'did:jis:company:employee:42'
 * ```
 */
export function createDID(...parts: string[]): string {
  if (parts.length === 0) {
    throw new Error('DID must have at least one identifier part');
  }

  const id = parts.join(':');

  if (!/^[a-zA-Z0-9:._-]+$/.test(id)) {
    throw new Error('DID contains invalid characters');
  }

  return `did:jis:${id}`;
}

/**
 * DID Document Builder
 *
 * @example
 * ```typescript
 * const doc = new DIDDocumentBuilder('did:jis:alice')
 *   .addVerificationMethod({
 *     id: 'did:jis:alice#key-1',
 *     type: 'JsonWebKey2020',
 *     controller: 'did:jis:alice',
 *     publicKeyJwk: { ... }
 *   })
 *   .addService({
 *     id: 'did:jis:alice#consent-endpoint',
 *     type: 'BilateralConsentService',
 *     serviceEndpoint: 'https://api.example.com/consent'
 *   })
 *   .build();
 * ```
 */
export class DIDDocumentBuilder {
  private doc: DIDDocument;

  constructor(did: string) {
    if (!isValidDID(did)) {
      throw new Error(`Invalid DID: ${did}`);
    }

    this.doc = {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/jws-2020/v1',
        'https://humotica.com/ns/jis/v1', // JIS-specific context
      ],
      id: did,
      verificationMethod: [],
      authentication: [],
      assertionMethod: [],
      service: [],
    };
  }

  /**
   * Set the controller of this DID document
   */
  setController(controller: string): this {
    this.doc.controller = controller;
    return this;
  }

  /**
   * Add a verification method (key)
   */
  addVerificationMethod(method: VerificationMethod): this {
    this.doc.verificationMethod = this.doc.verificationMethod || [];
    this.doc.verificationMethod.push(method);
    return this;
  }

  /**
   * Add authentication method reference
   */
  addAuthentication(methodId: string): this {
    this.doc.authentication = this.doc.authentication || [];
    this.doc.authentication.push(methodId);
    return this;
  }

  /**
   * Add assertion method reference
   */
  addAssertionMethod(methodId: string): this {
    this.doc.assertionMethod = this.doc.assertionMethod || [];
    this.doc.assertionMethod.push(methodId);
    return this;
  }

  /**
   * Add a service endpoint
   */
  addService(service: ServiceEndpoint): this {
    this.doc.service = this.doc.service || [];
    this.doc.service.push(service);
    return this;
  }

  /**
   * Add bilateral consent service endpoint
   */
  addConsentService(endpoint: string): this {
    return this.addService({
      id: `${this.doc.id}#bilateral-consent`,
      type: 'BilateralConsentService',
      serviceEndpoint: endpoint,
    });
  }

  /**
   * Add TIBET provenance service endpoint
   */
  addTibetService(endpoint: string): this {
    return this.addService({
      id: `${this.doc.id}#tibet-provenance`,
      type: 'TIBETProvenanceService',
      serviceEndpoint: endpoint,
    });
  }

  /**
   * Build the DID document
   */
  build(): DIDDocument {
    return { ...this.doc };
  }

  /**
   * Build and return as JSON string
   */
  toJSON(): string {
    return JSON.stringify(this.build(), null, 2);
  }
}

/**
 * Simple in-memory DID resolver
 *
 * For production, implement a resolver that fetches from
 * a DID registry or distributed ledger.
 */
export class DIDResolver {
  private documents: Map<string, DIDDocument> = new Map();

  /**
   * Register a DID document
   */
  register(doc: DIDDocument): void {
    if (!isValidDID(doc.id)) {
      throw new Error(`Invalid DID: ${doc.id}`);
    }
    this.documents.set(doc.id, doc);
  }

  /**
   * Resolve a DID to its document
   */
  resolve(did: string): DIDDocument | null {
    return this.documents.get(did) || null;
  }

  /**
   * Check if a DID is registered
   */
  exists(did: string): boolean {
    return this.documents.has(did);
  }

  /**
   * Deactivate (remove) a DID
   */
  deactivate(did: string): boolean {
    return this.documents.delete(did);
  }

  /**
   * List all registered DIDs
   */
  list(): string[] {
    return Array.from(this.documents.keys());
  }
}
