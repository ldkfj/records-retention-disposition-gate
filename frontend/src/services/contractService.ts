import { abi, createClient } from 'genlayer-js';
import { CONTRACT_ADDRESS, STUDIONET_CONFIG } from '../config/chain.ts';
import { sharedRpc } from './rpcClient.ts';
import { walletService } from './walletService.ts';
import { journalService } from './journalService.ts';
import { classifyTransaction } from './transactionClassifier.ts';
import {
  ProfileRecord,
  MappingRecord,
  ReviewRecord,
  EventRecord,
  SourceMetadata,
  ProfileState,
  MappingOutcome,
  DispositionClass,
  CutoffTrigger,
  ReviewAction,
  TemplateType,
  GrsFamily,
  TxStep,
  PendingOperation,
} from '../types/domain.ts';

const PROFILE_STATES = new Set<ProfileState>([
  'DRAFT',
  'FROZEN',
  'MAPPED',
  'RECLASSIFY_REQUIRED',
  'HOLD_UNRESOLVED',
  'RETAINING',
  'REVIEW_ELIGIBLE',
  'REVIEW_REQUESTED',
  'TRANSFER_AUTHORIZED',
  'DISPOSITION_AUTHORIZED',
  'HOLD',
  'SUPERSEDED',
]);
const MAPPING_OUTCOMES = new Set<MappingOutcome>([
  'TEMPORARY_ITEM_MATCH',
  'PERMANENT_ITEM_MATCH',
  'EXCLUDED_OR_WRONG_SCHEDULE',
  'MULTIPLE_PLAUSIBLE_ITEMS',
  'UNRESOLVED',
]);
const DISPOSITION_CLASSES = new Set(['TEMPORARY', 'PERMANENT', 'NOT_APPLICABLE', 'NONE']);
const CUTOFF_TRIGGERS = new Set<CutoffTrigger>([
  'FINAL_PAYMENT_OR_CANCELLATION',
  'BUSINESS_USE_CEASES',
  'NONE',
]);
const REVIEW_ACTIONS = new Set<ReviewAction>([
  'NONE',
  'AUTHORIZE_TRANSFER',
  'AUTHORIZE_DISPOSITION',
  'HOLD',
  'RECLASSIFY',
]);
const TEMPLATES = new Set<TemplateType>(['PROCUREMENT_WORKING_FILES', 'ADMINISTRATIVE_POLICY_FILES']);
const GRS_FAMILIES = new Set<GrsFamily>(['GRS_1_1', 'GRS_5_1']);

function invalidContractRead(recordName: string, detail: string): never {
  throw new Error(`INVALID_CONTRACT_READ_RESPONSE: ${recordName} ${detail}`);
}

function parseRecord(raw: unknown, recordName: string): Record<string, unknown> {
  let data = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw) as unknown;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'parse error';
      invalidContractRead(recordName, `malformed JSON (${message})`);
    }
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    invalidContractRead(recordName, 'must be a non-array object');
  }
  return data as Record<string, unknown>;
}

function hasOwn(data: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(data, key);
}

function readString(data: Record<string, unknown>, key: string, recordName: string, nonEmpty = false): string {
  if (!hasOwn(data, key) || typeof data[key] !== 'string') {
    invalidContractRead(recordName, `${key} must be a string`);
  }
  const value = data[key] as string;
  if (nonEmpty && value.trim() === '') {
    invalidContractRead(recordName, `${key} must not be empty`);
  }
  return value;
}

function readOptionalString(data: Record<string, unknown>, key: string, recordName: string): string {
  return hasOwn(data, key) ? readString(data, key, recordName) : '';
}

function readBoolean(data: Record<string, unknown>, key: string, recordName: string): boolean {
  if (!hasOwn(data, key) || typeof data[key] !== 'boolean') {
    invalidContractRead(recordName, `${key} must be a boolean`);
  }
  return data[key] as boolean;
}

function readInteger(
  data: Record<string, unknown>,
  key: string,
  recordName: string,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
): number {
  if (!hasOwn(data, key) || typeof data[key] !== 'number' || !Number.isSafeInteger(data[key])) {
    invalidContractRead(recordName, `${key} must be a safe integer`);
  }
  const value = data[key] as number;
  if (value < min || value > max) {
    invalidContractRead(recordName, `${key} is outside the allowed range`);
  }
  return value;
}

function readEnum<T extends string>(
  data: Record<string, unknown>,
  key: string,
  recordName: string,
  values: ReadonlySet<string>,
  allowEmpty = false,
): T {
  const value = readString(data, key, recordName);
  if ((allowEmpty && value === '') || values.has(value)) {
    return value as T;
  }
  invalidContractRead(recordName, `${key} has an unsupported enum value`);
}

function readAliasedString(
  data: Record<string, unknown>,
  keys: readonly string[],
  recordName: string,
  nonEmpty = false,
): string {
  const present = keys.filter((key) => hasOwn(data, key));
  if (present.length === 0) invalidContractRead(recordName, `requires one of ${keys.join(', ')}`);
  const values = present.map((key) => readString(data, key, recordName, nonEmpty));
  if (values.some((value) => value !== values[0])) {
    invalidContractRead(recordName, `conflicting aliases: ${present.join(', ')}`);
  }
  return values[0];
}

function readAliasedBoolean(
  data: Record<string, unknown>,
  keys: readonly string[],
  recordName: string,
): boolean {
  const present = keys.filter((key) => hasOwn(data, key));
  if (present.length === 0) invalidContractRead(recordName, `requires one of ${keys.join(', ')}`);
  const values = present.map((key) => readBoolean(data, key, recordName));
  if (values.some((value) => value !== values[0])) {
    invalidContractRead(recordName, `conflicting aliases: ${present.join(', ')}`);
  }
  return values[0];
}

function readAliasedInteger(
  data: Record<string, unknown>,
  keys: readonly string[],
  recordName: string,
  min = 0,
): number {
  const present = keys.filter((key) => hasOwn(data, key));
  if (present.length === 0) invalidContractRead(recordName, `requires one of ${keys.join(', ')}`);
  const values = present.map((key) => readInteger(data, key, recordName, min));
  if (values.some((value) => value !== values[0])) {
    invalidContractRead(recordName, `conflicting aliases: ${present.join(', ')}`);
  }
  return values[0];
}

function validateAttributesJson(attributesJson: string, recordName: string): void {
  try {
    const parsed = JSON.parse(attributesJson) as unknown;
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      invalidContractRead(recordName, 'attributes_json must encode an object');
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'parse error';
    invalidContractRead(recordName, `attributes_json is malformed (${message})`);
  }
}

export function normalizeProfileRecord(raw: unknown): ProfileRecord {
  const recordName = 'Profile record';
  const data = parseRecord(raw, recordName);
  const profileId = readAliasedInteger(data, ['profile_id', 'id'], recordName, 1);
  const clientNonce = readAliasedString(data, ['client_nonce', 'nonce'], recordName, true);
  const template = readEnum<TemplateType>(data, 'template', recordName, TEMPLATES);
  const attributesJson = readString(data, 'attributes_json', recordName, true);
  validateAttributesJson(attributesJson, recordName);
  const creationDate = readString(data, 'creation_date', recordName, true);
  const cutoffDate = readString(data, 'cutoff_date', recordName, true);
  const grsFamily = readEnum<GrsFamily>(data, 'grs_family', recordName, GRS_FAMILIES);
  const custodian = readAliasedString(data, ['owner', 'custodian'], recordName, true);
  const officer = readString(data, 'officer', recordName, true);
  const state = readEnum<ProfileState>(data, 'state', recordName, PROFILE_STATES);
  const isFrozen = readBoolean(data, 'is_frozen', recordName);
  const mappingAttempts = readInteger(data, 'mapping_attempts', recordName, 0, 3);
  const mappingOutcome = readEnum<MappingOutcome>(data, 'mapping_outcome', recordName, MAPPING_OUTCOMES, true);
  const isMappingAccepted = readBoolean(data, 'is_mapping_accepted', recordName);
  const lastAttemptTimestamp = readOptionalString(data, 'last_attempt_timestamp', recordName);
  const successorId = readAliasedInteger(data, ['superseded_by', 'successor_id'], recordName, 0);
  const supersedes = readInteger(data, 'supersedes', recordName, 0);
  const auditHoldActive = readAliasedBoolean(data, ['audit_hold', 'audit_hold_active'], recordName);
  const auditHoldReason = readString(data, 'audit_hold_reason', recordName);
  const auditHoldTimestamp = readOptionalString(data, 'audit_hold_timestamp', recordName);
  const fingerprint = readString(data, 'fingerprint', recordName, true);
  const reviewRequested = readBoolean(data, 'review_requested', recordName);
  const reviewRequestedAt = readString(data, 'review_requested_at', recordName);
  const reviewDecided = readBoolean(data, 'review_decided', recordName);
  const reviewAction = readEnum<ReviewAction>(data, 'review_action', recordName, REVIEW_ACTIONS, true) || 'NONE';
  const reviewReason = readString(data, 'review_reason', recordName);

  if (!reviewRequested && reviewRequestedAt !== '') {
    invalidContractRead(recordName, 'review_requested_at must be empty when review_requested is false');
  }
  if (reviewDecided && (!reviewRequested || reviewAction === 'NONE')) {
    invalidContractRead(recordName, 'decided review must have a requested review and action');
  }

  return {
    profile_id: profileId,
    client_nonce: clientNonce,
    template,
    attributes_json: attributesJson,
    creation_date: creationDate,
    cutoff_date: cutoffDate,
    grs_family: grsFamily,
    custodian,
    owner: custodian,
    officer,
    state,
    is_frozen: isFrozen,
    mapping_attempts: mappingAttempts,
    mapping_outcome: mappingOutcome,
    is_mapping_accepted: isMappingAccepted,
    last_attempt_timestamp: lastAttemptTimestamp,
    successor_id: successorId,
    superseded_by: successorId,
    supersedes,
    audit_hold_active: auditHoldActive,
    audit_hold: auditHoldActive,
    audit_hold_reason: auditHoldReason,
    audit_hold_timestamp: auditHoldTimestamp,
    fingerprint,
    review_requested: reviewRequested,
    review_requested_at: reviewRequestedAt,
    review_decided: reviewDecided,
    review_action: reviewAction,
    review_reason: reviewReason,
  };
}

export function normalizeMappingRecord(raw: unknown): MappingRecord {
  const recordName = 'Mapping record';
  const data = parseRecord(raw, recordName);
  const profileId = readInteger(data, 'profile_id', recordName, 1);
  const attempt = readInteger(data, 'attempt', recordName, 1, 3);
  const outcome = readEnum<MappingOutcome>(data, 'outcome', recordName, MAPPING_OUTCOMES);
  const scheduleNumber = readString(data, 'schedule_number', recordName);
  const scheduleTitle = readString(data, 'schedule_title', recordName);
  const scheduleVersion = readString(data, 'schedule_version', recordName);
  const sourceUrl = readAliasedString(data, ['source_url', 'pdf_url'], recordName);
  const pdfUrl = readAliasedString(data, ['pdf_url', 'source_url'], recordName);
  const pdfFingerprint = readString(data, 'pdf_fingerprint', recordName);
  const item = readAliasedString(data, ['item_number', 'item'], recordName);
  const dispositionAuthority = readString(data, 'disposition_authority', recordName);
  const page = readAliasedString(data, ['page_or_section', 'page'], recordName);
  const isIncluded = readBoolean(data, 'is_included', recordName);
  const isExcluded = readBoolean(data, 'is_excluded', recordName);
  const rawDispositionClass = readEnum<string>(data, 'disposition_class', recordName, DISPOSITION_CLASSES);
  const dispositionClass: DispositionClass =
    (rawDispositionClass === 'NONE' ? 'NOT_APPLICABLE' : rawDispositionClass) as DispositionClass;
  const cutoffTrigger = readEnum<CutoffTrigger>(data, 'cutoff_trigger', recordName, CUTOFF_TRIGGERS);
  const retentionMonths = readInteger(data, 'retention_months', recordName, 0);
  const consequentialFingerprint = readString(data, 'consequential_fingerprint', recordName);
  const reasonCode = readString(data, 'reason_code', recordName);
  const earliestReviewDate = readString(data, 'earliest_review_date', recordName);
  const assessedAt = readString(data, 'assessed_at', recordName, true);
  const isAccepted = readBoolean(data, 'is_accepted', recordName);
  const acceptedBy = readOptionalString(data, 'accepted_by', recordName);
  const acceptedTimestamp = readAliasedString(data, ['accepted_at', 'accepted_timestamp'], recordName);

  if (isAccepted && acceptedTimestamp === '') {
    invalidContractRead(recordName, 'accepted_at must be non-empty when is_accepted is true');
  }

  return {
    profile_id: profileId,
    attempt,
    outcome,
    schedule_number: scheduleNumber,
    schedule_title: scheduleTitle,
    schedule_version: scheduleVersion,
    source_url: sourceUrl,
    pdf_url: pdfUrl,
    pdf_fingerprint: pdfFingerprint,
    item,
    item_number: item,
    disposition_authority: dispositionAuthority,
    page,
    page_or_section: page,
    is_included: isIncluded,
    is_excluded: isExcluded,
    disposition_class: dispositionClass,
    cutoff_trigger: cutoffTrigger,
    retention_months: retentionMonths,
    consequential_fingerprint: consequentialFingerprint,
    reason_code: reasonCode,
    earliest_review_date: earliestReviewDate,
    assessed_at: assessedAt,
    is_accepted: isAccepted,
    accepted_by: acceptedBy,
    accepted_timestamp: acceptedTimestamp,
    accepted_at: acceptedTimestamp,
  };
}

export function normalizeReviewRecord(raw: unknown): ReviewRecord {
  const recordName = 'Review record';
  const data = parseRecord(raw, recordName);
  const profileId = readInteger(data, 'profile_id', recordName, 1);
  const epoch = readInteger(data, 'epoch', recordName, 1);
  const requestedAt = readAliasedString(data, ['requested_at', 'requested_timestamp'], recordName, true);
  const reviewRequested = hasOwn(data, 'review_requested')
    ? readBoolean(data, 'review_requested', recordName)
    : requestedAt !== '';
  const requestedBy = readOptionalString(data, 'requested_by', recordName);
  const decided = hasOwn(data, 'decided')
    ? readBoolean(data, 'decided', recordName)
    : readBoolean(data, 'is_decided', recordName);
  if (hasOwn(data, 'decided') && hasOwn(data, 'is_decided') && readBoolean(data, 'decided', recordName) !== readBoolean(data, 'is_decided', recordName)) {
    invalidContractRead(recordName, 'conflicting aliases: decided, is_decided');
  }
  const decidedAt = readAliasedString(data, ['decided_at', 'decided_timestamp'], recordName);
  const officer = readString(data, 'officer', recordName, true);
  const decidedBy = readOptionalString(data, 'decided_by', recordName);
  const action = readEnum<ReviewAction>(data, 'action', recordName, REVIEW_ACTIONS, true) || 'NONE';
  const reasonCode = readString(data, 'reason_code', recordName);
  const auditHoldActive = readBoolean(data, 'audit_hold_active', recordName);

  if (reviewRequested !== (requestedAt !== '')) {
    invalidContractRead(recordName, 'review_requested must match requested_at presence');
  }
  if (decided && (decidedAt === '' || action === 'NONE')) {
    invalidContractRead(recordName, 'decided review must have decided_at and action');
  }
  if (!decided && decidedAt !== '') {
    invalidContractRead(recordName, 'decided_at must be empty when decided is false');
  }

  return {
    profile_id: profileId,
    epoch,
    review_requested: reviewRequested,
    requested_by: requestedBy,
    requested_timestamp: requestedAt,
    requested_at: requestedAt,
    is_decided: decided,
    decided,
    action,
    reason_code: reasonCode,
    officer,
    decided_by: decidedBy,
    decided_timestamp: decidedAt,
    decided_at: decidedAt,
    audit_hold_active: auditHoldActive,
  };
}

export function createEmptyMappingRecord(profileId: number): MappingRecord {
  return {
    profile_id: profileId,
    attempt: 0,
    outcome: 'UNRESOLVED',
    schedule_number: '',
    schedule_title: '',
    schedule_version: '',
    source_url: '',
    pdf_url: '',
    pdf_fingerprint: '',
    item: '',
    item_number: '',
    disposition_authority: '',
    page: '',
    page_or_section: '',
    is_included: false,
    is_excluded: false,
    disposition_class: 'NOT_APPLICABLE',
    cutoff_trigger: 'NONE',
    retention_months: 0,
    consequential_fingerprint: '',
    reason_code: '',
    earliest_review_date: '',
    assessed_at: '',
    is_accepted: false,
    accepted_by: '',
    accepted_timestamp: '',
    accepted_at: '',
  };
}

export function createEmptyReviewRecord(profileId: number): ReviewRecord {
  return {
    profile_id: profileId,
    epoch: 0,
    review_requested: false,
    requested_by: '',
    requested_timestamp: '',
    requested_at: '',
    is_decided: false,
    decided: false,
    action: 'NONE',
    reason_code: '',
    officer: '',
    decided_by: '',
    decided_timestamp: '',
    decided_at: '',
    audit_hold_active: false,
  };
}

function formatSafeError(err: any): string {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (typeof err === 'bigint') return err.toString();
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err, (_, v) => (typeof v === 'bigint' ? v.toString() : v));
  } catch {
    return String(err);
  }
}

function parseReturnedId(data: any): number | null {
  if (data === null || data === undefined) return null;
  if (typeof data === 'number' && Number.isInteger(data) && data > 0) return data;
  if (typeof data === 'bigint' && data > 0n) return Number(data);
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (trimmed.startsWith('0x')) {
      try {
        const hex = trimmed.slice(2);
        if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) return null;
        const bytes = Uint8Array.from(hex.match(/.{2}/g) || [], (byte) => parseInt(byte, 16));
        return parseReturnedId(abi.calldata.decode(bytes));
      } catch {
        return null;
      }
    }
    const parsed = parseInt(trimmed, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function waitForDelay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timeout);
      reject(new Error('OPERATION_ABORTED'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function waitUntilVisible(signal?: AbortSignal): Promise<void> {
  if (typeof document === 'undefined' || document.visibilityState !== 'hidden') return Promise.resolve();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      document.removeEventListener('visibilitychange', onVisible);
      signal?.removeEventListener('abort', onAbort);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        cleanup();
        resolve();
      }
    };
    const onAbort = () => {
      cleanup();
      reject(new Error('OPERATION_ABORTED'));
    };
    document.addEventListener('visibilitychange', onVisible);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export class ContractService {
  private static instance: ContractService;

  public static getInstance(): ContractService {
    if (!ContractService.instance) {
      ContractService.instance = new ContractService();
    }
    return ContractService.instance;
  }

  // --- VIEWS ---

  public async getProfile(profileId: number, skipCache = false, signal?: AbortSignal): Promise<ProfileRecord> {
    const raw = await sharedRpc.readContract('get_profile', [profileId], 'profile_detail', skipCache, this.getConfiguredContractAddress(), signal);
    return normalizeProfileRecord(raw);
  }

  public async getMapping(profileId: number, skipCache = false, signal?: AbortSignal): Promise<MappingRecord> {
    const raw = await sharedRpc.readContract('get_mapping', [profileId], 'mapping_detail', skipCache, this.getConfiguredContractAddress(), signal);
    return normalizeMappingRecord(raw);
  }

  public async getReview(profileId: number, skipCache = false, signal?: AbortSignal): Promise<ReviewRecord> {
    const raw = await sharedRpc.readContract('get_review', [profileId], 'review_detail', skipCache, this.getConfiguredContractAddress(), signal);
    return normalizeReviewRecord(raw);
  }

  public async getEffectiveStatus(profileId: number, currentDate: string, skipCache = false, signal?: AbortSignal): Promise<ProfileState> {
    const raw = await sharedRpc.readContract(
      'get_effective_status',
      [profileId, currentDate],
      'effective_status',
      skipCache,
      this.getConfiguredContractAddress(),
      signal
    );
    return raw as ProfileState;
  }

  public async getProfileCount(skipCache = false, signal?: AbortSignal): Promise<number> {
    const raw = await sharedRpc.readContract('get_profile_count', [], 'public_lookup', skipCache, this.getConfiguredContractAddress(), signal);
    return Number(raw);
  }

  public async getProfileIdByNonce(owner: string, clientNonce: string, skipCache = false, signal?: AbortSignal): Promise<number> {
    const raw = await sharedRpc.readContract(
      'get_profile_id_by_nonce',
      [owner, clientNonce],
      'public_lookup',
      skipCache,
      this.getConfiguredContractAddress(),
      signal
    );
    return Number(raw);
  }

  public async isNonceUsed(owner: string, clientNonce: string, skipCache = false, signal?: AbortSignal): Promise<boolean> {
    const raw = await sharedRpc.readContract('is_nonce_used', [owner, clientNonce], 'public_lookup', skipCache, this.getConfiguredContractAddress(), signal);
    return Boolean(raw);
  }

  public async getProfileIdByFingerprint(fingerprint: string, skipCache = false, signal?: AbortSignal): Promise<number> {
    const raw = await sharedRpc.readContract(
      'get_profile_id_by_fingerprint',
      [fingerprint],
      'public_lookup',
      skipCache,
      this.getConfiguredContractAddress(),
      signal
    );
    return Number(raw);
  }

  public async getEventCount(skipCache = false, signal?: AbortSignal): Promise<number> {
    const raw = await sharedRpc.readContract('get_event_count', [], 'events_view', skipCache, this.getConfiguredContractAddress(), signal);
    return Number(raw);
  }

  public async getEvent(eventId: number, skipCache = false, signal?: AbortSignal): Promise<EventRecord> {
    const raw = await sharedRpc.readContract('get_event', [eventId], 'events_view', skipCache, this.getConfiguredContractAddress(), signal);
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }

  public async getAuditor(skipCache = false, signal?: AbortSignal): Promise<string> {
    return await sharedRpc.readContract('get_auditor', [], 'auditor_view', skipCache, this.getConfiguredContractAddress(), signal);
  }

  public async getUpgrader(skipCache = false, signal?: AbortSignal): Promise<string> {
    return await sharedRpc.readContract('get_upgrader', [], 'upgrader_view', skipCache, this.getConfiguredContractAddress(), signal);
  }

  public async getUpgraders(skipCache = false, signal?: AbortSignal): Promise<string[]> {
    const raw = await sharedRpc.readContract('get_upgraders', [], 'upgrader_view', skipCache, this.getConfiguredContractAddress(), signal);
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }

  public async getSourceMetadata(template: string, skipCache = false, signal?: AbortSignal): Promise<SourceMetadata> {
    const raw = await sharedRpc.readContract('get_source_metadata', [template], 'source_view', skipCache, this.getConfiguredContractAddress(), signal);
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }

  public async getCodeHash(skipCache = false, signal?: AbortSignal): Promise<string> {
    return await sharedRpc.readContract('get_code_hash', [], 'code_hash_view', skipCache, this.getConfiguredContractAddress(), signal);
  }

  public createWriteClient(params: { endpoint: string; account: `0x${string}`; provider: any }) {
    return createClient(params);
  }

  public getConfiguredContractAddress(): string {
    return CONTRACT_ADDRESS;
  }

  public async verifyPendingOperation(op: PendingOperation): Promise<boolean> {
    const wallet = walletService.getState();
    try {
      switch (op.type) {
        case 'create_profile': {
          const id = await this.getProfileIdByNonce(wallet.address || '', String(op.params.clientNonce), true);
          return id > 0;
        }
        case 'freeze_profile': {
          const profile = await this.getProfile(Number(op.params.profileId), true);
          return profile.state === 'FROZEN';
        }
        case 'assess_mapping': {
          const mapping = await this.getMapping(Number(op.params.profileId), true);
          return mapping.outcome !== 'UNRESOLVED' || mapping.reason_code !== '';
        }
        case 'retry_unresolved': {
          const profile = await this.getProfile(Number(op.params.profileId), true);
          return profile.state === 'FROZEN';
        }
        case 'accept_mapping': {
          const mapping = await this.getMapping(Number(op.params.profileId), true);
          return mapping.is_accepted === true;
        }
        case 'place_audit_hold': {
          const profile = await this.getProfile(Number(op.params.profileId), true);
          return profile.audit_hold_active === true;
        }
        case 'clear_audit_hold': {
          const profile = await this.getProfile(Number(op.params.profileId), true);
          return profile.audit_hold_active === false;
        }
        case 'request_disposition_review': {
          const review = await this.getReview(Number(op.params.profileId), true);
          return review.review_requested === true;
        }
        case 'decide_review': {
          const review = await this.getReview(Number(op.params.profileId), true);
          return review.is_decided === true && review.action === op.params.action;
        }
        case 'supersede_profile': {
          const profile = await this.getProfile(Number(op.params.profileId), true);
          return profile.successor_id === Number(op.params.successorId);
        }
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  // --- WRITES & TRANSACTION PIPELINE ---

  public async createProfile(
    clientNonce: string,
    template: string,
    attributesJson: string,
    creationDate: string,
    cutoffDate: string,
    grsFamily: string,
    officer: string,
    onStepChange?: (step: TxStep, detail?: any) => void,
    signal?: AbortSignal
  ): Promise<{ profileId: number; txHash: string }> {
    const { txHash, opId, txReceipt } = await this.executeWrite(
      'create_profile',
      [clientNonce, template, attributesJson, creationDate, cutoffDate, grsFamily, officer],
      { clientNonce, template, attributesJson, creationDate, cutoffDate, grsFamily, officer },
      onStepChange,
      signal
    );

    try {
      onStepChange?.('READBACK', { txHash });
      const walletState = walletService.getState();

      // 1. Decode new profile ID from SDK transaction / trace return data
      let decodedId: number | null = null;
      if (txReceipt) {
        decodedId =
          parseReturnedId(txReceipt.data) ||
          parseReturnedId(txReceipt.result_data) ||
          parseReturnedId(txReceipt.result) ||
          parseReturnedId(txReceipt.returnValue) ||
          parseReturnedId(txReceipt.return_value) ||
          parseReturnedId(txReceipt.returnData);
      }

      // If not found in basic transaction fields, attempt trace
      if (!decodedId) {
        try {
          const trace = await sharedRpc.debugTraceTransaction(txHash, undefined, signal);
          if (trace) {
            decodedId =
              parseReturnedId(trace.return_data) ||
              parseReturnedId(trace.returnValue) ||
              parseReturnedId(trace.result) ||
              parseReturnedId(trace.data) ||
              parseReturnedId(trace.returnData);
          }
        } catch {
          // trace unavailable
        }
      }

      if (decodedId === null) {
        throw new Error('CREATE_RETURN_ID_MISSING: Finalized transaction return ID could not be decoded');
      }

      // 2. Cross-check with get_profile_id_by_nonce
      const nonceId = await this.getProfileIdByNonce(walletState.address || '', clientNonce, true, signal);
      if (nonceId === 0) {
        throw new Error('READBACK_MISMATCH: Profile ID not found for nonce');
      }

      // If we got a decoded ID from trace/receipt, assert exact match with nonce lookup
      if (decodedId !== nonceId) {
        throw new Error(
          `CREATE_RETURN_ID_MISMATCH: Decoded transaction return ID (${decodedId}) did not match nonce lookup ID (${nonceId})`
        );
      }

      const finalProfileId = decodedId;

      // 3. Verify get_profile(id) matches clientNonce
      const profile = await this.getProfile(finalProfileId, true, signal);
      if (profile.client_nonce !== clientNonce) {
        throw new Error(
          `CREATE_RETURN_ID_MISMATCH: Profile record nonce '${profile.client_nonce}' does not match submitted nonce '${clientNonce}'`
        );
      }

      sharedRpc.invalidateMethod('get_profile_count');
      sharedRpc.invalidateMethod('get_profile_id_by_nonce');
      sharedRpc.invalidateMethod('is_nonce_used');
      sharedRpc.invalidateMethod('get_event_count');
      sharedRpc.invalidateMethod('get_event');

      journalService.removeOperation(opId);
      onStepChange?.('SUCCESS', { profileId: finalProfileId, txHash });
      return { profileId: finalProfileId, txHash };
    } catch (readErr: any) {
      journalService.updateStatus(opId, 'SUBMITTED', formatSafeError(readErr));
      throw new Error(`AUTHORITATIVE_READBACK_FAILED: ${formatSafeError(readErr)}`);
    }
  }

  public async freezeProfile(
    profileId: number,
    onStepChange?: (step: TxStep, detail?: any) => void,
    signal?: AbortSignal
  ): Promise<{ txHash: string }> {
    const { txHash, opId } = await this.executeWrite('freeze_profile', [profileId], { profileId }, onStepChange, signal);

    try {
      onStepChange?.('READBACK', { txHash });
      const updated = await this.getProfile(profileId, true, signal);
      if (updated.state !== 'FROZEN') {
        throw new Error(`READBACK_MISMATCH: Expected FROZEN, got ${updated.state}`);
      }

      sharedRpc.invalidateMethod('get_profile');
      sharedRpc.invalidateMethod('get_effective_status');
      sharedRpc.invalidateMethod('get_event_count');
      sharedRpc.invalidateMethod('get_event');

      journalService.removeOperation(opId);
      onStepChange?.('SUCCESS', { profileId, txHash });
      return { txHash };
    } catch (readErr: any) {
      journalService.updateStatus(opId, 'SUBMITTED', formatSafeError(readErr));
      throw new Error(`AUTHORITATIVE_READBACK_FAILED: ${formatSafeError(readErr)}`);
    }
  }

  public async assessMapping(
    profileId: number,
    onStepChange?: (step: TxStep, detail?: any) => void,
    signal?: AbortSignal
  ): Promise<{ txHash: string; outcome: string }> {
    const { txHash, opId } = await this.executeWrite('assess_mapping', [profileId], { profileId }, onStepChange, signal);

    try {
      onStepChange?.('READBACK', { txHash });
      const updatedProfile = await this.getProfile(profileId, true, signal);
      const updatedMapping = await this.getMapping(profileId, true, signal);

      sharedRpc.invalidateMethod('get_profile');
      sharedRpc.invalidateMethod('get_mapping');
      sharedRpc.invalidateMethod('get_effective_status');
      sharedRpc.invalidateMethod('get_event_count');
      sharedRpc.invalidateMethod('get_event');

      journalService.removeOperation(opId);
      onStepChange?.('SUCCESS', { profileId, outcome: updatedMapping.outcome, state: updatedProfile.state, txHash });
      return { txHash, outcome: updatedMapping.outcome };
    } catch (readErr: any) {
      journalService.updateStatus(opId, 'SUBMITTED', formatSafeError(readErr));
      throw new Error(`AUTHORITATIVE_READBACK_FAILED: ${formatSafeError(readErr)}`);
    }
  }

  public async retryUnresolved(
    profileId: number,
    onStepChange?: (step: TxStep, detail?: any) => void,
    signal?: AbortSignal
  ): Promise<{ txHash: string; outcome: string }> {
    const { txHash, opId } = await this.executeWrite('retry_unresolved', [profileId], { profileId }, onStepChange, signal);

    try {
      onStepChange?.('READBACK', { txHash });
      const updatedProfile = await this.getProfile(profileId, true, signal);
      const updatedMapping = await this.getMapping(profileId, true, signal);

      sharedRpc.invalidateMethod('get_profile');
      sharedRpc.invalidateMethod('get_mapping');
      sharedRpc.invalidateMethod('get_effective_status');
      sharedRpc.invalidateMethod('get_event_count');
      sharedRpc.invalidateMethod('get_event');

      journalService.removeOperation(opId);
      onStepChange?.('SUCCESS', { profileId, outcome: updatedMapping.outcome, state: updatedProfile.state, txHash });
      return { txHash, outcome: updatedMapping.outcome };
    } catch (readErr: any) {
      journalService.updateStatus(opId, 'SUBMITTED', formatSafeError(readErr));
      throw new Error(`AUTHORITATIVE_READBACK_FAILED: ${formatSafeError(readErr)}`);
    }
  }

  public async acceptMapping(
    profileId: number,
    onStepChange?: (step: TxStep, detail?: any) => void,
    signal?: AbortSignal
  ): Promise<{ txHash: string }> {
    const { txHash, opId } = await this.executeWrite('accept_mapping', [profileId], { profileId }, onStepChange, signal);

    try {
      onStepChange?.('READBACK', { txHash });
      const updatedMapping = await this.getMapping(profileId, true, signal);
      if (!updatedMapping.is_accepted) {
        throw new Error('READBACK_MISMATCH: Mapping is_accepted is still false');
      }

      sharedRpc.invalidateMethod('get_profile');
      sharedRpc.invalidateMethod('get_mapping');
      sharedRpc.invalidateMethod('get_effective_status');
      sharedRpc.invalidateMethod('get_event_count');
      sharedRpc.invalidateMethod('get_event');

      journalService.removeOperation(opId);
      onStepChange?.('SUCCESS', { profileId, txHash });
      return { txHash };
    } catch (readErr: any) {
      journalService.updateStatus(opId, 'SUBMITTED', formatSafeError(readErr));
      throw new Error(`AUTHORITATIVE_READBACK_FAILED: ${formatSafeError(readErr)}`);
    }
  }

  public async placeAuditHold(
    profileId: number,
    reasonCode: string,
    onStepChange?: (step: TxStep, detail?: any) => void,
    signal?: AbortSignal
  ): Promise<{ txHash: string }> {
    const { txHash, opId } = await this.executeWrite(
      'place_audit_hold',
      [profileId, reasonCode],
      { profileId, reasonCode },
      onStepChange,
      signal
    );

    try {
      onStepChange?.('READBACK', { txHash });
      const updatedProfile = await this.getProfile(profileId, true, signal);
      if (!updatedProfile.audit_hold_active) {
        throw new Error('READBACK_MISMATCH: Audit hold is not active');
      }

      sharedRpc.invalidateMethod('get_profile');
      sharedRpc.invalidateMethod('get_effective_status');
      sharedRpc.invalidateMethod('get_event_count');
      sharedRpc.invalidateMethod('get_event');

      journalService.removeOperation(opId);
      onStepChange?.('SUCCESS', { profileId, txHash });
      return { txHash };
    } catch (readErr: any) {
      journalService.updateStatus(opId, 'SUBMITTED', formatSafeError(readErr));
      throw new Error(`AUTHORITATIVE_READBACK_FAILED: ${formatSafeError(readErr)}`);
    }
  }

  public async clearAuditHold(
    profileId: number,
    onStepChange?: (step: TxStep, detail?: any) => void,
    signal?: AbortSignal
  ): Promise<{ txHash: string }> {
    const { txHash, opId } = await this.executeWrite('clear_audit_hold', [profileId], { profileId }, onStepChange, signal);

    try {
      onStepChange?.('READBACK', { txHash });
      const updatedProfile = await this.getProfile(profileId, true, signal);
      if (updatedProfile.audit_hold_active) {
        throw new Error('READBACK_MISMATCH: Audit hold is still active');
      }

      sharedRpc.invalidateMethod('get_profile');
      sharedRpc.invalidateMethod('get_effective_status');
      sharedRpc.invalidateMethod('get_event_count');
      sharedRpc.invalidateMethod('get_event');

      journalService.removeOperation(opId);
      onStepChange?.('SUCCESS', { profileId, txHash });
      return { txHash };
    } catch (readErr: any) {
      journalService.updateStatus(opId, 'SUBMITTED', formatSafeError(readErr));
      throw new Error(`AUTHORITATIVE_READBACK_FAILED: ${formatSafeError(readErr)}`);
    }
  }

  public async requestDispositionReview(
    profileId: number,
    onStepChange?: (step: TxStep, detail?: any) => void,
    signal?: AbortSignal
  ): Promise<{ txHash: string }> {
    const { txHash, opId } = await this.executeWrite(
      'request_disposition_review',
      [profileId],
      { profileId },
      onStepChange,
      signal
    );

    try {
      onStepChange?.('READBACK', { txHash });
      const updatedReview = await this.getReview(profileId, true, signal);
      if (!updatedReview.review_requested) {
        throw new Error('READBACK_MISMATCH: Review requested is false');
      }

      sharedRpc.invalidateMethod('get_profile');
      sharedRpc.invalidateMethod('get_review');
      sharedRpc.invalidateMethod('get_effective_status');
      sharedRpc.invalidateMethod('get_event_count');
      sharedRpc.invalidateMethod('get_event');

      journalService.removeOperation(opId);
      onStepChange?.('SUCCESS', { profileId, txHash });
      return { txHash };
    } catch (readErr: any) {
      journalService.updateStatus(opId, 'SUBMITTED', formatSafeError(readErr));
      throw new Error(`AUTHORITATIVE_READBACK_FAILED: ${formatSafeError(readErr)}`);
    }
  }

  public async decideReview(
    profileId: number,
    action: ReviewAction,
    reasonCode: string,
    onStepChange?: (step: TxStep, detail?: any) => void,
    signal?: AbortSignal
  ): Promise<{ txHash: string }> {
    const { txHash, opId } = await this.executeWrite(
      'decide_review',
      [profileId, action, reasonCode],
      { profileId, action, reasonCode },
      onStepChange,
      signal
    );

    try {
      onStepChange?.('READBACK', { txHash });
      const updatedReview = await this.getReview(profileId, true, signal);
      if (!updatedReview.is_decided || updatedReview.action !== action) {
        throw new Error(`READBACK_MISMATCH: Review decided mismatch, action: ${updatedReview.action}`);
      }

      sharedRpc.invalidateMethod('get_profile');
      sharedRpc.invalidateMethod('get_review');
      sharedRpc.invalidateMethod('get_effective_status');
      sharedRpc.invalidateMethod('get_event_count');
      sharedRpc.invalidateMethod('get_event');

      journalService.removeOperation(opId);
      onStepChange?.('SUCCESS', { profileId, action, txHash });
      return { txHash };
    } catch (readErr: any) {
      journalService.updateStatus(opId, 'SUBMITTED', formatSafeError(readErr));
      throw new Error(`AUTHORITATIVE_READBACK_FAILED: ${formatSafeError(readErr)}`);
    }
  }

  public async supersedeProfile(
    profileId: number,
    successorId: number,
    onStepChange?: (step: TxStep, detail?: any) => void,
    signal?: AbortSignal
  ): Promise<{ txHash: string }> {
    const { txHash, opId } = await this.executeWrite(
      'supersede_profile',
      [profileId, successorId],
      { profileId, successorId },
      onStepChange,
      signal
    );

    try {
      onStepChange?.('READBACK', { txHash });
      const updatedProfile = await this.getProfile(profileId, true, signal);
      if (updatedProfile.successor_id !== successorId) {
        throw new Error(`READBACK_MISMATCH: Successor ID mismatch, got ${updatedProfile.successor_id}`);
      }

      sharedRpc.invalidateMethod('get_profile');
      sharedRpc.invalidateMethod('get_effective_status');
      sharedRpc.invalidateMethod('get_event_count');
      sharedRpc.invalidateMethod('get_event');

      journalService.removeOperation(opId);
      onStepChange?.('SUCCESS', { profileId, successorId, txHash });
      return { txHash };
    } catch (readErr: any) {
      journalService.updateStatus(opId, 'SUBMITTED', formatSafeError(readErr));
      throw new Error(`AUTHORITATIVE_READBACK_FAILED: ${formatSafeError(readErr)}`);
    }
  }

  // --- INTERNAL PIPELINE ---

  private async executeWrite(
    method: string,
    args: any[],
    params: Record<string, any>,
    onStepChange?: (step: TxStep, detail?: any) => void,
    signal?: AbortSignal
  ): Promise<{ txHash: string; opId: string; txReceipt?: any }> {
    const configuredAddress = this.getConfiguredContractAddress();
    if (!configuredAddress) {
      throw new Error('CONTRACT_NOT_CONFIGURED');
    }
    const targetAddress = configuredAddress as `0x${string}`;

    const walletState = walletService.getState();
    if (!walletState.connected || !walletState.provider || !walletState.address) {
      throw new Error('WALLET_NOT_CONNECTED');
    }

    if (!walletState.isCorrectChain) {
      await walletService.switchChain();
    }

    // 1. Probe storage capability BEFORE requesting signature
    if (!journalService.probeStorage()) {
      throw new Error('STORAGE_CAPABILITY_PROBE_FAILED: Browser storage is unavailable or restricted.');
    }

    const opId = `op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const pendingOp: PendingOperation = {
      id: opId,
      type: method,
      timestamp: Date.now(),
      params,
      status: 'PRE_SIGN',
    };

    journalService.savePendingOperation(pendingOp);
    onStepChange?.('SIGNING', { method, params });

    let txHash: string;
    try {
      if (signal?.aborted) {
        throw new Error('OPERATION_ABORTED');
      }

      // Must bind directly to selected EIP-1193 provider and account
      const client = this.createWriteClient({
        endpoint: STUDIONET_CONFIG.rpcUrl,
        account: walletState.address as `0x${string}`,
        provider: walletState.provider,
      });

      txHash = await client.writeContract({
        address: targetAddress,
        functionName: method,
        args,
        value: 0n,
      });
    } catch (err: any) {
      journalService.removeOperation(opId);
      onStepChange?.('ERROR', { error: formatSafeError(err) });
      throw err;
    }

    // 2. Hash obtained: immediately update journal / volatile lock before persistence
    journalService.updateHash(opId, txHash);
    onStepChange?.('SUBMITTED', { txHash });

    // 3. Poll for finality and execution result
    onStepChange?.('CONSENSUS_POLLING', { txHash });
    let txReceipt: any = null;
    try {
      txReceipt = await this.waitForFinalizedTransaction(txHash, 600_000, signal);
    } catch (finErr: any) {
      const message = formatSafeError(finErr);
      if (message.includes('TRANSACTION_EXECUTION_FAILED')) {
        journalService.removeOperation(opId);
      } else {
        journalService.updateStatus(opId, 'SUBMITTED', message);
      }
      onStepChange?.('ERROR', { error: formatSafeError(finErr) });
      throw finErr;
    }

    return { txHash, opId, txReceipt };
  }

  public async waitForFinalizedTransaction(
    txHash: string,
    deadlineMs = 600_000,
    signal?: AbortSignal
  ): Promise<any> {
    const startTime = Date.now();
    let pollInterval = 2500;
    const client = sharedRpc.getRawClient();

    while (Date.now() - startTime < deadlineMs) {
      if (signal?.aborted) {
        throw new Error('OPERATION_ABORTED');
      }

      // Pause if tab is hidden
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        await waitUntilVisible(signal);
      }

      if (signal?.aborted) {
        throw new Error('OPERATION_ABORTED');
      }

      try {
        sharedRpc.trackJourneyCall('tx_poll');
        // Use SDK getTransaction method
        const tx = await client.getTransaction({ hash: txHash });
        if (tx) {
          const classification = classifyTransaction(tx);
          if (classification.finalized) {
            if (classification.success) {
              return tx;
            }

            if (classification.executionError) {
              const errMsg = formatSafeError(
                tx.error || tx.data || tx.result_data || 'Contract execution reverted on-chain'
              );
              throw new Error(`TRANSACTION_EXECUTION_FAILED: ${errMsg}`);
            }

            if (classification.consensus !== 'AGREE' && classification.consensus !== 'MAJORITY_AGREE') {
              throw new Error(`CONSENSUS_DISAGREEMENT: Finalized consensus result was '${classification.consensus || 'MISSING'}'`);
            }

            // Unknown execution result
            throw new Error(`TRANSACTION_UNKNOWN_EXECUTION_RESULT: Execution result was '${classification.execution || 'MISSING'}'`);
          }

          if (classification.failedStatus) {
            throw new Error(`TRANSACTION_EXECUTION_FAILED: Transaction status was ${classification.status}`);
          }
          // If status is ACCEPTED, PENDING, PROPOSING, COMMITTING, REVEALING, continue polling!
        }
      } catch (err: any) {
        if (
          err.message &&
          (err.message.includes('TRANSACTION_EXECUTION_FAILED') ||
            err.message.includes('TRANSACTION_UNKNOWN_EXECUTION_RESULT') ||
            err.message.includes('CONSENSUS_DISAGREEMENT') ||
            err.message.includes('OPERATION_ABORTED'))
        ) {
          throw err;
        }
        // Transient network error while polling: continue backoff
      }

      await waitForDelay(pollInterval, signal);
      // Bounded backoff up to 10 seconds
      pollInterval = Math.min(pollInterval * 1.25, 10_000);
    }

    throw new Error('TRANSACTION_TIMEOUT_DEADLINE_EXCEEDED');
  }
}

export const contractService = ContractService.getInstance();
