/**
 * TIBET - Transaction/Interaction-Based Evidence Trail
 *
 * Core implementation for creating and verifying provenance tokens.
 * IETF Draft: draft-vandemeent-tibet-provenance
 */

import {
  TIBETToken,
  TIBETTokenType,
  TIBETState,
  WWWwProvenance,
  VerificationResult,
  ProvenanceChain,
} from './types';

/**
 * Generate a UUID v4
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a signature for a token
 * In production, use proper cryptographic signing
 */
async function generateSignature(data: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback: simple hash (NOT for production)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

/**
 * TIBET Token Factory
 *
 * Creates and manages TIBET provenance tokens.
 */
export class TIBET {
  private tokens: Map<string, TIBETToken> = new Map();
  private defaultActor: string;

  constructor(actor?: string) {
    this.defaultActor = actor || 'anonymous';
  }

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
  async createToken(params: {
    type: TIBETTokenType;
    what: string | Record<string, unknown>;
    with?: string[];
    where?: Record<string, unknown>;
    why: string;
    actor?: string;
    parentId?: string;
    expiresIn?: number;
    metadata?: Record<string, unknown>;
  }): Promise<TIBETToken> {
    const tokenId = generateId();
    const timestamp = new Date().toISOString();
    const actor = params.actor || this.defaultActor;

    const provenance: WWWwProvenance = {
      what: params.what,
      with: params.with,
      where: params.where,
      why: params.why,
    };

    const tokenData = {
      tokenId,
      type: params.type,
      actor,
      provenance,
      timestamp,
      parentId: params.parentId,
    };

    const signature = await generateSignature(JSON.stringify(tokenData));

    const token: TIBETToken = {
      ...tokenData,
      state: 'CREATED',
      signature,
      expiresAt: params.expiresIn
        ? new Date(Date.now() + params.expiresIn).toISOString()
        : undefined,
      metadata: params.metadata,
    };

    this.tokens.set(tokenId, token);

    return token;
  }

  /**
   * Verify a TIBET token
   */
  async verify(tokenOrId: TIBETToken | string): Promise<VerificationResult> {
    const token =
      typeof tokenOrId === 'string' ? this.tokens.get(tokenOrId) : tokenOrId;

    if (!token) {
      return {
        valid: false,
        tokenId: typeof tokenOrId === 'string' ? tokenOrId : 'unknown',
        trustScore: 0,
        details: {
          signatureValid: false,
          notExpired: false,
          chainIntact: false,
          actorTrusted: false,
        },
        error: 'Token not found',
      };
    }

    // Check expiration
    const notExpired = token.expiresAt
      ? new Date(token.expiresAt) > new Date()
      : true;

    // Verify signature
    const tokenData = {
      tokenId: token.tokenId,
      type: token.type,
      actor: token.actor,
      provenance: token.provenance,
      timestamp: token.timestamp,
      parentId: token.parentId,
    };
    const expectedSignature = await generateSignature(JSON.stringify(tokenData));
    const signatureValid = token.signature === expectedSignature;

    // Check chain integrity
    let chainIntact = true;
    if (token.parentId) {
      const parent = this.tokens.get(token.parentId);
      chainIntact = !!parent;
    }

    // Calculate trust score
    let trustScore = 0;
    if (signatureValid) trustScore += 0.4;
    if (notExpired) trustScore += 0.3;
    if (chainIntact) trustScore += 0.2;
    if (token.actor !== 'anonymous') trustScore += 0.1;

    return {
      valid: signatureValid && notExpired && chainIntact,
      tokenId: token.tokenId,
      trustScore,
      details: {
        signatureValid,
        notExpired,
        chainIntact,
        actorTrusted: token.actor !== 'anonymous',
      },
    };
  }

  /**
   * Get the full provenance chain for a token
   */
  getChain(tokenId: string): ProvenanceChain | null {
    const tokens: TIBETToken[] = [];
    let current = this.tokens.get(tokenId);

    if (!current) return null;

    // Walk back through parent chain
    while (current) {
      tokens.unshift(current);
      current = current.parentId
        ? this.tokens.get(current.parentId)
        : undefined;
    }

    return {
      length: tokens.length,
      tokens,
      origin: tokens[0],
      current: tokens[tokens.length - 1],
    };
  }

  /**
   * Update token state
   */
  updateState(tokenId: string, newState: TIBETState): TIBETToken | null {
    const token = this.tokens.get(tokenId);
    if (!token) return null;

    token.state = newState;
    this.tokens.set(tokenId, token);

    return token;
  }

  /**
   * Get a token by ID
   */
  getToken(tokenId: string): TIBETToken | undefined {
    return this.tokens.get(tokenId);
  }

  /**
   * List all tokens (optionally filtered by type or state)
   */
  listTokens(filter?: {
    type?: TIBETTokenType;
    state?: TIBETState;
    actor?: string;
  }): TIBETToken[] {
    let tokens = Array.from(this.tokens.values());

    if (filter?.type) {
      tokens = tokens.filter((t) => t.type === filter.type);
    }
    if (filter?.state) {
      tokens = tokens.filter((t) => t.state === filter.state);
    }
    if (filter?.actor) {
      tokens = tokens.filter((t) => t.actor === filter.actor);
    }

    return tokens;
  }

  /**
   * Export tokens to JSON (for persistence)
   */
  export(): string {
    return JSON.stringify(Array.from(this.tokens.entries()));
  }

  /**
   * Import tokens from JSON
   */
  import(json: string): void {
    const entries = JSON.parse(json) as [string, TIBETToken][];
    for (const [id, token] of entries) {
      this.tokens.set(id, token);
    }
  }
}
