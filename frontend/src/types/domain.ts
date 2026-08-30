export type ProfileState =
  | 'DRAFT'
  | 'FROZEN'
  | 'MAPPED'
  | 'RECLASSIFY_REQUIRED'
  | 'HOLD_UNRESOLVED'
  | 'RETAINING'
  | 'REVIEW_ELIGIBLE'
  | 'REVIEW_REQUESTED'
  | 'TRANSFER_AUTHORIZED'
  | 'DISPOSITION_AUTHORIZED'
  | 'HOLD'
  | 'SUPERSEDED';

export type MappingOutcome =
  | 'TEMPORARY_ITEM_MATCH'
  | 'PERMANENT_ITEM_MATCH'
  | 'EXCLUDED_OR_WRONG_SCHEDULE'
  | 'MULTIPLE_PLAUSIBLE_ITEMS'
  | 'UNRESOLVED';

export type DispositionClass = 'TEMPORARY' | 'PERMANENT' | 'NOT_APPLICABLE';

export type CutoffTrigger =
  | 'FINAL_PAYMENT_OR_CANCELLATION'
  | 'BUSINESS_USE_CEASES'
  | 'NONE';

export type ReviewAction =
  | 'NONE'
  | 'AUTHORIZE_TRANSFER'
  | 'AUTHORIZE_DISPOSITION'
  | 'HOLD'
  | 'RECLASSIFY';

export type TemplateType =
  | 'PROCUREMENT_WORKING_FILES'
  | 'ADMINISTRATIVE_POLICY_FILES';

export type GrsFamily = 'GRS_1_1' | 'GRS_5_1';

export interface ProcurementAttributes {
  record_copy_status: 'OFFICIAL_RECORD' | 'ADMIN_REFERENCE_COPY';
  procurement_type?: 'FORMAL_CONTRACT' | 'SIMPLIFIED_ACQUISITION' | 'MICROPURCHASE';
  is_formal_contract?: boolean;
  contract_concluded?: boolean;
  includes_unsuccessful_bids?: boolean;
  scope_level?: 'WORKING_PAPERS' | 'ADMINISTRATIVE';
}

export interface AdministrativePolicyAttributes {
  policy_scope?: 'OFFICE_UNIT_LEVEL';
  record_level?: 'OFFICE_UNIT';
  is_agency_directive?: boolean;
  is_routine_administrative?: boolean;
}

export interface ProfileRecord {
  profile_id: number;
  client_nonce: string;
  template: TemplateType;
  attributes_json: string;
  creation_date: string;
  cutoff_date: string;
  grs_family: GrsFamily;
  custodian: string;
  owner?: string;
  officer: string;
  state: ProfileState;
  is_frozen?: boolean;
  mapping_attempts: number;
  mapping_outcome?: string;
  is_mapping_accepted?: boolean;
  last_attempt_timestamp: string;
  successor_id: number;
  superseded_by?: number;
  supersedes?: number;
  audit_hold_active: boolean;
  audit_hold?: boolean;
  audit_hold_reason: string;
  audit_hold_timestamp: string;
  fingerprint: string;
  review_requested?: boolean;
  review_requested_at?: string;
  review_decided?: boolean;
  review_action?: ReviewAction;
  review_reason?: string;
}

export interface MappingRecord {
  profile_id: number;
  attempt?: number;
  outcome: MappingOutcome;
  schedule_number: string;
  schedule_title: string;
  schedule_version: string;
  source_url?: string;
  pdf_url: string;
  pdf_fingerprint: string;
  item: string;
  item_number?: string;
  disposition_authority: string;
  page: string;
  page_or_section?: string;
  is_included: boolean;
  is_excluded: boolean;
  disposition_class: DispositionClass;
  cutoff_trigger: CutoffTrigger;
  retention_months: number;
  consequential_fingerprint: string;
  reason_code: string;
  earliest_review_date: string;
  assessed_at?: string;
  is_accepted: boolean;
  accepted_by: string;
  accepted_timestamp: string;
  accepted_at?: string;
}

export interface ReviewRecord {
  profile_id: number;
  epoch?: number;
  review_requested: boolean;
  requested_by: string;
  requested_timestamp: string;
  requested_at?: string;
  is_decided: boolean;
  decided?: boolean;
  action: ReviewAction;
  reason_code: string;
  officer?: string;
  decided_by: string;
  decided_timestamp: string;
  decided_at?: string;
  audit_hold_active?: boolean;
}

export interface EventRecord {
  event_id: number;
  profile_id: number;
  event_type: string;
  actor: string;
  details: string;
  timestamp: string;
}

export interface SourceMetadata {
  template: string;
  grs_family: string;
  schedule_number: string;
  schedule_title: string;
  schedule_version: string;
  source_url?: string;
  csv_url?: string;
  pdf_url: string;
}

export interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: any;
}

export interface WalletState {
  connected: boolean;
  address: string | null;
  chainId: number | null;
  provider: any | null;
  providerName: string | null;
  isCorrectChain: boolean;
}

export type TxStep =
  | 'IDLE'
  | 'SIGNING'
  | 'SUBMITTED'
  | 'CONSENSUS_POLLING'
  | 'READBACK'
  | 'SUCCESS'
  | 'ERROR';

export interface PendingOperation {
  id: string;
  type: string;
  timestamp: number;
  params: Record<string, any>;
  txHash?: string;
  status: 'PRE_SIGN' | 'SUBMITTED' | 'FAILED';
  error?: string;
}
