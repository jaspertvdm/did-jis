/**
 * TIBET Token Types - WWWw Provenance Model
 *
 * WHAT  (ERIN)     - What's inside the action
 * WITH  (ERAAN)    - What's attached/linked
 * WHERE (EROMHEEN) - Context around it
 * WHY   (ERACHTER) - Intent behind it
 */

export interface WWWwProvenance {
  /** WHAT - The content/action itself */
  what: string | Record<string, unknown>;

  /** WITH - Dependencies, references, linked parties */
  with?: string[];

  /** WHERE - Context, environment, circumstances */
  where?: Record<string, unknown>;

  /** WHY - Intent, purpose, reason */
  why: string;
}

export interface TIBETToken {
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

export type TIBETTokenType =
  | 'bilateral_consent'
  | 'unilateral_action'
  | 'verification'
  | 'revocation'
  | 'delegation'
  | 'audit'
  | 'threat';

export type TIBETState =
  | 'CREATED'
  | 'PROPOSED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'REVOKED';

export interface BilateralConsent {
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
  expiresIn?: number; // milliseconds
}

export interface ConsentProposal {
  /** Proposal token */
  token: TIBETToken;

  /** Accept URL/callback */
  acceptUrl?: string;

  /** Reject URL/callback */
  rejectUrl?: string;
}

export interface ConsentResponse {
  /** Original proposal token ID */
  proposalId: string;

  /** Response: accepted or rejected */
  accepted: boolean;

  /** Response token */
  token: TIBETToken;

  /** Reason (especially for rejection) */
  reason?: string;
}

export interface VerificationResult {
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

export interface ProvenanceChain {
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
export interface DIDDocument {
  '@context': string[];
  id: string;
  controller?: string;
  verificationMethod?: VerificationMethod[];
  authentication?: string[];
  assertionMethod?: string[];
  service?: ServiceEndpoint[];
}

export interface VerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyJwk?: JsonWebKey;
  publicKeyMultibase?: string;
}

export interface ServiceEndpoint {
  id: string;
  type: string;
  serviceEndpoint: string | Record<string, unknown>;
}
