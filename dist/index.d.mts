/**
 * TIBET Token Types - WWWw Provenance Model
 *
 * WHAT  (ERIN)     - What's inside the action
 * WITH  (ERAAN)    - What's attached/linked
 * WHERE (EROMHEEN) - Context around it
 * WHY   (ERACHTER) - Intent behind it
 */
interface WWWwProvenance {
    /** WHAT - The content/action itself */
    what: string | Record<string, unknown>;
    /** WITH - Dependencies, references, linked parties */
    with?: string[];
    /** WHERE - Context, environment, circumstances */
    where?: Record<string, unknown>;
    /** WHY - Intent, purpose, reason */
    why: string;
}
interface TIBETToken {
    /** Unique token identifier */
    tokenId: string;
    /** Token type */
    type: TIBETTokenType;
    /** Who created this token */
    actor: string;
    /** WWWw Provenance data */
    provenance: WWWwProvenance;
    /** Creation timestamp (ISO 8601) */
    timestamp: string;
    /** Token state */
    state: TIBETState;
    /** Cryptographic signature */
    signature: string;
    /** Parent token ID (for chains) */
    parentId?: string;
    /** Expiration timestamp (ISO 8601) */
    expiresAt?: string;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
}
type TIBETTokenType = 'bilateral_consent' | 'unilateral_action' | 'verification' | 'revocation' | 'delegation' | 'audit' | 'threat';
type TIBETState = 'CREATED' | 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'REVOKED';
interface BilateralConsent {
    /** Proposing party DID */
    from: string;
    /** Accepting party DID */
    to: string;
    /** What is being consented to */
    action: string;
    /** Why this consent is needed */
    purpose: string;
    /** Additional context */
    context?: Record<string, unknown>;
    /** Consent expiration */
    expiresIn?: number;
}
interface ConsentProposal {
    /** Proposal token */
    token: TIBETToken;
    /** Accept URL/callback */
    acceptUrl?: string;
    /** Reject URL/callback */
    rejectUrl?: string;
}
interface ConsentResponse {
    /** Original proposal token ID */
    proposalId: string;
    /** Response: accepted or rejected */
    accepted: boolean;
    /** Response token */
    token: TIBETToken;
    /** Reason (especially for rejection) */
    reason?: string;
}
interface VerificationResult {
    /** Is the token valid? */
    valid: boolean;
    /** Token ID verified */
    tokenId: string;
    /** Trust score (0.0 - 1.0) */
    trustScore: number;
    /** Verification details */
    details: {
        signatureValid: boolean;
        notExpired: boolean;
        chainIntact: boolean;
        actorTrusted: boolean;
    };
    /** Error message if invalid */
    error?: string;
}
interface ProvenanceChain {
    /** Total chain length */
    length: number;
    /** All tokens in chain */
    tokens: TIBETToken[];
    /** Genesis (first) token */
    origin: TIBETToken;
    /** Current (latest) token */
    current: TIBETToken;
}
/**
 * DID JIS Document structure
 */
interface DIDDocument {
    '@context': string[];
    id: string;
    controller?: string;
    verificationMethod?: VerificationMethod[];
    authentication?: string[];
    assertionMethod?: string[];
    service?: ServiceEndpoint[];
}
interface VerificationMethod {
    id: string;
    type: string;
    controller: string;
    publicKeyJwk?: JsonWebKey;
    publicKeyMultibase?: string;
}
interface ServiceEndpoint {
    id: string;
    type: string;
    serviceEndpoint: string | Record<string, unknown>;
}

/**
 * TIBET - Transaction/Interaction-Based Evidence Trail
 *
 * Core implementation for creating and verifying provenance tokens.
 * IETF Draft: draft-vandemeent-tibet-provenance
 */

/**
 * TIBET Token Factory
 *
 * Creates and manages TIBET provenance tokens.
 */
declare class TIBET {
    private tokens;
    private defaultActor;
    constructor(actor?: string);
    /**
     * Create a new TIBET token with WWWw provenance
     *
     * @example
     * ```typescript
     * const tibet = new TIBET('did:jis:user123');
     *
     * const token = await tibet.createToken({
     *   type: 'bilateral_consent',
     *   what: 'Share health records',
     *   with: ['did:jis:doctor456'],
     *   where: { context: 'medical-consultation' },
     *   why: 'Treatment planning'
     * });
     * ```
     */
    createToken(params: {
        type: TIBETTokenType;
        what: string | Record<string, unknown>;
        with?: string[];
        where?: Record<string, unknown>;
        why: string;
        actor?: string;
        parentId?: string;
        expiresIn?: number;
        metadata?: Record<string, unknown>;
    }): Promise<TIBETToken>;
    /**
     * Verify a TIBET token
     */
    verify(tokenOrId: TIBETToken | string): Promise<VerificationResult>;
    /**
     * Get the full provenance chain for a token
     */
    getChain(tokenId: string): ProvenanceChain | null;
    /**
     * Update token state
     */
    updateState(tokenId: string, newState: TIBETState): TIBETToken | null;
    /**
     * Get a token by ID
     */
    getToken(tokenId: string): TIBETToken | undefined;
    /**
     * List all tokens (optionally filtered by type or state)
     */
    listTokens(filter?: {
        type?: TIBETTokenType;
        state?: TIBETState;
        actor?: string;
    }): TIBETToken[];
    /**
     * Export tokens to JSON (for persistence)
     */
    export(): string;
    /**
     * Import tokens from JSON
     */
    import(json: string): void;
}

/**
 * Bilateral Consent Manager
 *
 * Handles the propose → accept/reject flow with TIBET provenance.
 *
 * @example
 * ```typescript
 * const consent = new BilateralConsentManager('did:jis:alice');
 *
 * // Alice proposes sharing data with Bob
 * const proposal = await consent.propose({
 *   from: 'did:jis:alice',
 *   to: 'did:jis:bob',
 *   action: 'share-contact-info',
 *   purpose: 'Add to contacts'
 * });
 *
 * // Bob accepts
 * const response = await consent.accept(proposal.token.tokenId, 'did:jis:bob');
 *
 * // Both have proof
 * console.log(response.token); // Acceptance token
 * ```
 */
declare class BilateralConsentManager {
    private tibet;
    private proposals;
    constructor(actorDid?: string);
    /**
     * Propose bilateral consent
     *
     * Creates a PROPOSED token that the other party can accept or reject.
     */
    propose(consent: BilateralConsent): Promise<ConsentProposal>;
    /**
     * Accept a consent proposal
     *
     * Creates an ACCEPTED token linked to the proposal.
     */
    accept(proposalId: string, acceptorDid: string): Promise<ConsentResponse>;
    /**
     * Reject a consent proposal
     *
     * Creates a REJECTED token linked to the proposal.
     */
    reject(proposalId: string, rejectorDid: string, reason?: string): Promise<ConsentResponse>;
    /**
     * Get the full consent chain (proposal + response)
     */
    getConsentChain(proposalId: string): ProvenanceChain | null;
    /**
     * Verify a consent token
     */
    verifyConsent(tokenId: string): Promise<VerificationResult>;
    /**
     * List all proposals (optionally filtered by state)
     */
    listProposals(state?: 'PROPOSED' | 'ACCEPTED' | 'REJECTED'): ConsentProposal[];
    /**
     * Get underlying TIBET instance for advanced operations
     */
    getTibet(): TIBET;
}
/**
 * Quick consent helper for simple use cases
 *
 * @example
 * ```typescript
 * const { proposal, accept, reject } = await createBilateralConsent({
 *   from: 'did:jis:alice',
 *   to: 'did:jis:bob',
 *   action: 'view-profile',
 *   purpose: 'Networking'
 * });
 *
 * // Bob can call accept() or reject()
 * const result = await accept();
 * ```
 */
declare function createBilateralConsent(consent: BilateralConsent): Promise<{
    proposal: ConsentProposal;
    accept: (reason?: string) => Promise<ConsentResponse>;
    reject: (reason?: string) => Promise<ConsentResponse>;
}>;

/**
 * DID:JIS Resolver and Document Management
 *
 * Implements the did:jis method specification.
 * IETF Draft: draft-vandemeent-jis-identity
 */

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
declare function parseDID(did: string): {
    method: string;
    id: string;
} | null;
/**
 * Validate a did:jis identifier
 */
declare function isValidDID(did: string): boolean;
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
declare function createDID(...parts: string[]): string;
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
declare class DIDDocumentBuilder {
    private doc;
    constructor(did: string);
    /**
     * Set the controller of this DID document
     */
    setController(controller: string): this;
    /**
     * Add a verification method (key)
     */
    addVerificationMethod(method: VerificationMethod): this;
    /**
     * Add authentication method reference
     */
    addAuthentication(methodId: string): this;
    /**
     * Add assertion method reference
     */
    addAssertionMethod(methodId: string): this;
    /**
     * Add a service endpoint
     */
    addService(service: ServiceEndpoint): this;
    /**
     * Add bilateral consent service endpoint
     */
    addConsentService(endpoint: string): this;
    /**
     * Add TIBET provenance service endpoint
     */
    addTibetService(endpoint: string): this;
    /**
     * Build the DID document
     */
    build(): DIDDocument;
    /**
     * Build and return as JSON string
     */
    toJSON(): string;
}
/**
 * Simple in-memory DID resolver
 *
 * For production, implement a resolver that fetches from
 * a DID registry or distributed ledger.
 */
declare class DIDResolver {
    private documents;
    /**
     * Register a DID document
     */
    register(doc: DIDDocument): void;
    /**
     * Resolve a DID to its document
     */
    resolve(did: string): DIDDocument | null;
    /**
     * Check if a DID is registered
     */
    exists(did: string): boolean;
    /**
     * Deactivate (remove) a DID
     */
    deactivate(did: string): boolean;
    /**
     * List all registered DIDs
     */
    list(): string[];
}

/**
 * did-jis - JTel Identity Standard
 *
 * Bilateral consent and intent verification with TIBET provenance trails.
 *
 * IETF Drafts:
 * - JIS: https://datatracker.ietf.org/doc/draft-vandemeent-jis-identity/
 * - TIBET: https://datatracker.ietf.org/doc/draft-vandemeent-tibet-provenance/
 *
 * @example
 * ```typescript
 * import { TIBET, createBilateralConsent, createDID } from 'did-jis';
 *
 * // Create DIDs for both parties
 * const aliceDid = createDID('alice');
 * const bobDid = createDID('bob');
 *
 * // Alice proposes sharing data with Bob
 * const { proposal, accept, reject } = await createBilateralConsent({
 *   from: aliceDid,
 *   to: bobDid,
 *   action: 'share-health-records',
 *   purpose: 'Medical consultation'
 * });
 *
 * // Bob accepts - both now have cryptographic proof
 * const response = await accept();
 * console.log(response.token); // TIBET token with full provenance
 * ```
 *
 * @packageDocumentation
 */

/**
 * Library version
 */
declare const VERSION = "0.1.0";
/**
 * WWWw explanation - the provenance model
 */
declare const WWWw: {
    readonly WHAT: "Content - what is inside the action (ERIN)";
    readonly WITH: "Links - what is attached/referenced (ERAAN)";
    readonly WHERE: "Context - environment and circumstances (EROMHEEN)";
    readonly WHY: "Intent - purpose behind the action (ERACHTER)";
};

export { type BilateralConsent, BilateralConsentManager, type ConsentProposal, type ConsentResponse, type DIDDocument, DIDDocumentBuilder, DIDResolver, type ProvenanceChain, type ServiceEndpoint, TIBET, type TIBETState, type TIBETToken, type TIBETTokenType, VERSION, type VerificationMethod, type VerificationResult, WWWw, type WWWwProvenance, createBilateralConsent, createDID, isValidDID, parseDID };
