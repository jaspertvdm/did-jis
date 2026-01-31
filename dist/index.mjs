// src/tibet.ts
function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : r & 3 | 8;
    return v.toString(16);
  });
}
async function generateSignature(data) {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, "0");
}
var TIBET = class {
  constructor(actor) {
    this.tokens = /* @__PURE__ */ new Map();
    this.defaultActor = actor || "anonymous";
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
  async createToken(params) {
    const tokenId = generateId();
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const actor = params.actor || this.defaultActor;
    const provenance = {
      what: params.what,
      with: params.with,
      where: params.where,
      why: params.why
    };
    const tokenData = {
      tokenId,
      type: params.type,
      actor,
      provenance,
      timestamp,
      parentId: params.parentId
    };
    const signature = await generateSignature(JSON.stringify(tokenData));
    const token = {
      ...tokenData,
      state: "CREATED",
      signature,
      expiresAt: params.expiresIn ? new Date(Date.now() + params.expiresIn).toISOString() : void 0,
      metadata: params.metadata
    };
    this.tokens.set(tokenId, token);
    return token;
  }
  /**
   * Verify a TIBET token
   */
  async verify(tokenOrId) {
    const token = typeof tokenOrId === "string" ? this.tokens.get(tokenOrId) : tokenOrId;
    if (!token) {
      return {
        valid: false,
        tokenId: typeof tokenOrId === "string" ? tokenOrId : "unknown",
        trustScore: 0,
        details: {
          signatureValid: false,
          notExpired: false,
          chainIntact: false,
          actorTrusted: false
        },
        error: "Token not found"
      };
    }
    const notExpired = token.expiresAt ? new Date(token.expiresAt) > /* @__PURE__ */ new Date() : true;
    const tokenData = {
      tokenId: token.tokenId,
      type: token.type,
      actor: token.actor,
      provenance: token.provenance,
      timestamp: token.timestamp,
      parentId: token.parentId
    };
    const expectedSignature = await generateSignature(JSON.stringify(tokenData));
    const signatureValid = token.signature === expectedSignature;
    let chainIntact = true;
    if (token.parentId) {
      const parent = this.tokens.get(token.parentId);
      chainIntact = !!parent;
    }
    let trustScore = 0;
    if (signatureValid) trustScore += 0.4;
    if (notExpired) trustScore += 0.3;
    if (chainIntact) trustScore += 0.2;
    if (token.actor !== "anonymous") trustScore += 0.1;
    return {
      valid: signatureValid && notExpired && chainIntact,
      tokenId: token.tokenId,
      trustScore,
      details: {
        signatureValid,
        notExpired,
        chainIntact,
        actorTrusted: token.actor !== "anonymous"
      }
    };
  }
  /**
   * Get the full provenance chain for a token
   */
  getChain(tokenId) {
    const tokens = [];
    let current = this.tokens.get(tokenId);
    if (!current) return null;
    while (current) {
      tokens.unshift(current);
      current = current.parentId ? this.tokens.get(current.parentId) : void 0;
    }
    return {
      length: tokens.length,
      tokens,
      origin: tokens[0],
      current: tokens[tokens.length - 1]
    };
  }
  /**
   * Update token state
   */
  updateState(tokenId, newState) {
    const token = this.tokens.get(tokenId);
    if (!token) return null;
    token.state = newState;
    this.tokens.set(tokenId, token);
    return token;
  }
  /**
   * Get a token by ID
   */
  getToken(tokenId) {
    return this.tokens.get(tokenId);
  }
  /**
   * List all tokens (optionally filtered by type or state)
   */
  listTokens(filter) {
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
  export() {
    return JSON.stringify(Array.from(this.tokens.entries()));
  }
  /**
   * Import tokens from JSON
   */
  import(json) {
    const entries = JSON.parse(json);
    for (const [id, token] of entries) {
      this.tokens.set(id, token);
    }
  }
};

// src/consent.ts
var BilateralConsentManager = class {
  constructor(actorDid) {
    this.proposals = /* @__PURE__ */ new Map();
    this.tibet = new TIBET(actorDid);
  }
  /**
   * Propose bilateral consent
   *
   * Creates a PROPOSED token that the other party can accept or reject.
   */
  async propose(consent) {
    const token = await this.tibet.createToken({
      type: "bilateral_consent",
      what: {
        action: consent.action,
        from: consent.from,
        to: consent.to
      },
      with: [consent.from, consent.to],
      where: consent.context,
      why: consent.purpose,
      actor: consent.from,
      expiresIn: consent.expiresIn,
      metadata: {
        consentType: "bilateral",
        proposedAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
    this.tibet.updateState(token.tokenId, "PROPOSED");
    const proposal = {
      token
    };
    this.proposals.set(token.tokenId, proposal);
    return proposal;
  }
  /**
   * Accept a consent proposal
   *
   * Creates an ACCEPTED token linked to the proposal.
   */
  async accept(proposalId, acceptorDid) {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }
    const originalToken = proposal.token;
    const provenance = originalToken.provenance;
    const expectedTo = provenance.what?.to;
    if (expectedTo && expectedTo !== acceptorDid) {
      throw new Error("Acceptor does not match intended recipient");
    }
    const acceptToken = await this.tibet.createToken({
      type: "bilateral_consent",
      what: {
        action: "consent_accepted",
        originalAction: provenance.what?.action
      },
      with: provenance.with,
      where: provenance.where,
      why: `Accepted: ${provenance.why}`,
      actor: acceptorDid,
      parentId: proposalId,
      metadata: {
        responseType: "acceptance",
        acceptedAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
    this.tibet.updateState(acceptToken.tokenId, "ACCEPTED");
    this.tibet.updateState(proposalId, "ACCEPTED");
    return {
      proposalId,
      accepted: true,
      token: acceptToken
    };
  }
  /**
   * Reject a consent proposal
   *
   * Creates a REJECTED token linked to the proposal.
   */
  async reject(proposalId, rejectorDid, reason) {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }
    const originalToken = proposal.token;
    const provenance = originalToken.provenance;
    const rejectToken = await this.tibet.createToken({
      type: "bilateral_consent",
      what: {
        action: "consent_rejected",
        originalAction: provenance.what?.action
      },
      with: provenance.with,
      where: provenance.where,
      why: reason || `Rejected: ${provenance.why}`,
      actor: rejectorDid,
      parentId: proposalId,
      metadata: {
        responseType: "rejection",
        rejectedAt: (/* @__PURE__ */ new Date()).toISOString(),
        reason
      }
    });
    this.tibet.updateState(rejectToken.tokenId, "REJECTED");
    this.tibet.updateState(proposalId, "REJECTED");
    return {
      proposalId,
      accepted: false,
      token: rejectToken,
      reason
    };
  }
  /**
   * Get the full consent chain (proposal + response)
   */
  getConsentChain(proposalId) {
    return this.tibet.getChain(proposalId);
  }
  /**
   * Verify a consent token
   */
  async verifyConsent(tokenId) {
    return this.tibet.verify(tokenId);
  }
  /**
   * List all proposals (optionally filtered by state)
   */
  listProposals(state) {
    let proposals = Array.from(this.proposals.values());
    if (state) {
      proposals = proposals.filter((p) => p.token.state === state);
    }
    return proposals;
  }
  /**
   * Get underlying TIBET instance for advanced operations
   */
  getTibet() {
    return this.tibet;
  }
};
async function createBilateralConsent(consent) {
  const manager = new BilateralConsentManager(consent.from);
  const proposal = await manager.propose(consent);
  return {
    proposal,
    accept: (reason) => manager.accept(proposal.token.tokenId, consent.to),
    reject: (reason) => manager.reject(proposal.token.tokenId, consent.to, reason)
  };
}

// src/did.ts
function parseDID(did) {
  const regex = /^did:([a-z]+):(.+)$/;
  const match = did.match(regex);
  if (!match) return null;
  return {
    method: match[1],
    id: match[2]
  };
}
function isValidDID(did) {
  if (!did.startsWith("did:jis:")) return false;
  const parsed = parseDID(did);
  if (!parsed) return false;
  return /^[a-zA-Z0-9:._-]+$/.test(parsed.id);
}
function createDID(...parts) {
  if (parts.length === 0) {
    throw new Error("DID must have at least one identifier part");
  }
  const id = parts.join(":");
  if (!/^[a-zA-Z0-9:._-]+$/.test(id)) {
    throw new Error("DID contains invalid characters");
  }
  return `did:jis:${id}`;
}
var DIDDocumentBuilder = class {
  constructor(did) {
    if (!isValidDID(did)) {
      throw new Error(`Invalid DID: ${did}`);
    }
    this.doc = {
      "@context": [
        "https://www.w3.org/ns/did/v1",
        "https://w3id.org/security/suites/jws-2020/v1",
        "https://humotica.com/ns/jis/v1"
        // JIS-specific context
      ],
      id: did,
      verificationMethod: [],
      authentication: [],
      assertionMethod: [],
      service: []
    };
  }
  /**
   * Set the controller of this DID document
   */
  setController(controller) {
    this.doc.controller = controller;
    return this;
  }
  /**
   * Add a verification method (key)
   */
  addVerificationMethod(method) {
    this.doc.verificationMethod = this.doc.verificationMethod || [];
    this.doc.verificationMethod.push(method);
    return this;
  }
  /**
   * Add authentication method reference
   */
  addAuthentication(methodId) {
    this.doc.authentication = this.doc.authentication || [];
    this.doc.authentication.push(methodId);
    return this;
  }
  /**
   * Add assertion method reference
   */
  addAssertionMethod(methodId) {
    this.doc.assertionMethod = this.doc.assertionMethod || [];
    this.doc.assertionMethod.push(methodId);
    return this;
  }
  /**
   * Add a service endpoint
   */
  addService(service) {
    this.doc.service = this.doc.service || [];
    this.doc.service.push(service);
    return this;
  }
  /**
   * Add bilateral consent service endpoint
   */
  addConsentService(endpoint) {
    return this.addService({
      id: `${this.doc.id}#bilateral-consent`,
      type: "BilateralConsentService",
      serviceEndpoint: endpoint
    });
  }
  /**
   * Add TIBET provenance service endpoint
   */
  addTibetService(endpoint) {
    return this.addService({
      id: `${this.doc.id}#tibet-provenance`,
      type: "TIBETProvenanceService",
      serviceEndpoint: endpoint
    });
  }
  /**
   * Build the DID document
   */
  build() {
    return { ...this.doc };
  }
  /**
   * Build and return as JSON string
   */
  toJSON() {
    return JSON.stringify(this.build(), null, 2);
  }
};
var DIDResolver = class {
  constructor() {
    this.documents = /* @__PURE__ */ new Map();
  }
  /**
   * Register a DID document
   */
  register(doc) {
    if (!isValidDID(doc.id)) {
      throw new Error(`Invalid DID: ${doc.id}`);
    }
    this.documents.set(doc.id, doc);
  }
  /**
   * Resolve a DID to its document
   */
  resolve(did) {
    return this.documents.get(did) || null;
  }
  /**
   * Check if a DID is registered
   */
  exists(did) {
    return this.documents.has(did);
  }
  /**
   * Deactivate (remove) a DID
   */
  deactivate(did) {
    return this.documents.delete(did);
  }
  /**
   * List all registered DIDs
   */
  list() {
    return Array.from(this.documents.keys());
  }
};

// src/index.ts
var VERSION = "0.1.0";
var WWWw = {
  WHAT: "Content - what is inside the action (ERIN)",
  WITH: "Links - what is attached/referenced (ERAAN)",
  WHERE: "Context - environment and circumstances (EROMHEEN)",
  WHY: "Intent - purpose behind the action (ERACHTER)"
};
export {
  BilateralConsentManager,
  DIDDocumentBuilder,
  DIDResolver,
  TIBET,
  VERSION,
  WWWw,
  createBilateralConsent,
  createDID,
  isValidDID,
  parseDID
};
