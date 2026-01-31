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

// Core TIBET exports
export { TIBET } from './tibet';

// Bilateral consent exports
export { BilateralConsentManager, createBilateralConsent } from './consent';

// DID utilities
export {
  parseDID,
  isValidDID,
  createDID,
  DIDDocumentBuilder,
  DIDResolver,
} from './did';

// Type exports
export type {
  // WWWw Provenance
  WWWwProvenance,

  // TIBET types
  TIBETToken,
  TIBETTokenType,
  TIBETState,
  VerificationResult,
  ProvenanceChain,

  // Consent types
  BilateralConsent,
  ConsentProposal,
  ConsentResponse,

  // DID types
  DIDDocument,
  VerificationMethod,
  ServiceEndpoint,
} from './types';

/**
 * Library version
 */
export const VERSION = '0.1.0';

/**
 * WWWw explanation - the provenance model
 */
export const WWWw = {
  WHAT: 'Content - what is inside the action (ERIN)',
  WITH: 'Links - what is attached/referenced (ERAAN)',
  WHERE: 'Context - environment and circumstances (EROMHEEN)',
  WHY: 'Intent - purpose behind the action (ERACHTER)',
} as const;
