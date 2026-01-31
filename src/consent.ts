/**
 * Bilateral Consent Module
 *
 * Implements the core did:jis bilateral consent flow:
 * 1. Party A proposes consent
 * 2. Party B accepts or rejects
 * 3. Both parties have cryptographic proof
 */

import { TIBET } from './tibet';
import {
  TIBETToken,
  BilateralConsent,
  ConsentProposal,
  ConsentResponse,
} from './types';

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
export class BilateralConsentManager {
  private tibet: TIBET;
  private proposals: Map<string, ConsentProposal> = new Map();

  constructor(actorDid?: string) {
    this.tibet = new TIBET(actorDid);
  }

  /**
   * Propose bilateral consent
   *
   * Creates a PROPOSED token that the other party can accept or reject.
   */
  async propose(consent: BilateralConsent): Promise<ConsentProposal> {
    const token = await this.tibet.createToken({
      type: 'bilateral_consent',
      what: {
        action: consent.action,
        from: consent.from,
        to: consent.to,
      },
      with: [consent.from, consent.to],
      where: consent.context,
      why: consent.purpose,
      actor: consent.from,
      expiresIn: consent.expiresIn,
      metadata: {
        consentType: 'bilateral',
        proposedAt: new Date().toISOString(),
      },
    });

    this.tibet.updateState(token.tokenId, 'PROPOSED');

    const proposal: ConsentProposal = {
      token,
    };

    this.proposals.set(token.tokenId, proposal);

    return proposal;
  }

  /**
   * Accept a consent proposal
   *
   * Creates an ACCEPTED token linked to the proposal.
   */
  async accept(proposalId: string, acceptorDid: string): Promise<ConsentResponse> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    const originalToken = proposal.token;

    // Verify the acceptor is the intended recipient
    const provenance = originalToken.provenance;
    const expectedTo = (provenance.what as Record<string, unknown>)?.to;
    if (expectedTo && expectedTo !== acceptorDid) {
      throw new Error('Acceptor does not match intended recipient');
    }

    // Create acceptance token
    const acceptToken = await this.tibet.createToken({
      type: 'bilateral_consent',
      what: {
        action: 'consent_accepted',
        originalAction: (provenance.what as Record<string, unknown>)?.action,
      },
      with: provenance.with,
      where: provenance.where,
      why: `Accepted: ${provenance.why}`,
      actor: acceptorDid,
      parentId: proposalId,
      metadata: {
        responseType: 'acceptance',
        acceptedAt: new Date().toISOString(),
      },
    });

    this.tibet.updateState(acceptToken.tokenId, 'ACCEPTED');
    this.tibet.updateState(proposalId, 'ACCEPTED');

    return {
      proposalId,
      accepted: true,
      token: acceptToken,
    };
  }

  /**
   * Reject a consent proposal
   *
   * Creates a REJECTED token linked to the proposal.
   */
  async reject(
    proposalId: string,
    rejectorDid: string,
    reason?: string
  ): Promise<ConsentResponse> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    const originalToken = proposal.token;
    const provenance = originalToken.provenance;

    // Create rejection token
    const rejectToken = await this.tibet.createToken({
      type: 'bilateral_consent',
      what: {
        action: 'consent_rejected',
        originalAction: (provenance.what as Record<string, unknown>)?.action,
      },
      with: provenance.with,
      where: provenance.where,
      why: reason || `Rejected: ${provenance.why}`,
      actor: rejectorDid,
      parentId: proposalId,
      metadata: {
        responseType: 'rejection',
        rejectedAt: new Date().toISOString(),
        reason,
      },
    });

    this.tibet.updateState(rejectToken.tokenId, 'REJECTED');
    this.tibet.updateState(proposalId, 'REJECTED');

    return {
      proposalId,
      accepted: false,
      token: rejectToken,
      reason,
    };
  }

  /**
   * Get the full consent chain (proposal + response)
   */
  getConsentChain(proposalId: string) {
    return this.tibet.getChain(proposalId);
  }

  /**
   * Verify a consent token
   */
  async verifyConsent(tokenId: string) {
    return this.tibet.verify(tokenId);
  }

  /**
   * List all proposals (optionally filtered by state)
   */
  listProposals(state?: 'PROPOSED' | 'ACCEPTED' | 'REJECTED'): ConsentProposal[] {
    let proposals = Array.from(this.proposals.values());

    if (state) {
      proposals = proposals.filter((p) => p.token.state === state);
    }

    return proposals;
  }

  /**
   * Get underlying TIBET instance for advanced operations
   */
  getTibet(): TIBET {
    return this.tibet;
  }
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
export async function createBilateralConsent(consent: BilateralConsent): Promise<{
  proposal: ConsentProposal;
  accept: (reason?: string) => Promise<ConsentResponse>;
  reject: (reason?: string) => Promise<ConsentResponse>;
}> {
  const manager = new BilateralConsentManager(consent.from);
  const proposal = await manager.propose(consent);

  return {
    proposal,
    accept: (reason?: string) =>
      manager.accept(proposal.token.tokenId, consent.to),
    reject: (reason?: string) =>
      manager.reject(proposal.token.tokenId, consent.to, reason),
  };
}
