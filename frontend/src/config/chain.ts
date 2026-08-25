export interface ChainConfig {
  chainId: number;
  chainIdHex: string;
  chainName: string;
  rpcUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrls: string[];
}

export const STUDIONET_CONFIG: ChainConfig = {
  chainId: 61999,
  chainIdHex: '0xf22f',
  chainName: 'GenLayer Studionet',
  rpcUrl: 'https://studio.genlayer.com/api',
  nativeCurrency: {
    name: 'GEN',
    symbol: 'GEN',
    decimals: 18,
  },
  blockExplorerUrls: ['https://studio.genlayer.com'],
};

export const OFFICIAL_NARA_SOURCES = {
  PROCUREMENT_WORKING_FILES: {
    template: 'PROCUREMENT_WORKING_FILES',
    grsFamily: 'GRS_1_1',
    scheduleNumber: 'GRS 1.1',
    scheduleTitle: 'Financial Management and Reporting Records',
    scheduleVersion: 'Transmittal 31 / April 2020',
    pdfUrl: 'https://www.archives.gov/files/records-mgmt/grs/grs01-1.pdf',
    items: [
      {
        item: '010',
        dispositionAuthority: 'DAA-GRS-2013-0003-0001',
        dispositionClass: 'TEMPORARY',
        retentionMonths: 72,
        trigger: 'FINAL_PAYMENT_OR_CANCELLATION',
        description: 'Financial transaction records related to procuring goods and services, paying for them, and paying bills (official record copy). Destroy 6 years (72 months) after final payment or cancellation.',
      },
      {
        item: '011',
        dispositionAuthority: 'DAA-GRS-2013-0003-0002',
        dispositionClass: 'TEMPORARY',
        retentionMonths: 0,
        trigger: 'BUSINESS_USE_CEASES',
        description: 'Administrative and reference copies of procurement records. Destroy when business use ceases.',
      },
    ],
  },
  ADMINISTRATIVE_POLICY_FILES: {
    template: 'ADMINISTRATIVE_POLICY_FILES',
    grsFamily: 'GRS_5_1',
    scheduleNumber: 'GRS 5.1',
    scheduleTitle: 'Common Office Records',
    scheduleVersion: 'Transmittal 28 / July 2017',
    pdfUrl: 'https://www.archives.gov/files/records-mgmt/grs/grs05-1.pdf',
    items: [
      {
        item: '010',
        dispositionAuthority: 'DAA-GRS-2016-0016-0001',
        dispositionClass: 'TEMPORARY',
        retentionMonths: 0,
        trigger: 'BUSINESS_USE_CEASES',
        description: 'Office/unit administrative policies and internal procedures. Destroy when business use ceases.',
      },
    ],
  },
} as const;

function getContractAddress(): string {
  const envAddr = (import.meta as any).env?.VITE_CONTRACT_ADDRESS || '';
  return envAddr.trim();
}

export const RAW_CONTRACT_ADDRESS = getContractAddress();

export function validateContractAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

export const IS_CONTRACT_ADDRESS_VALID = validateContractAddress(RAW_CONTRACT_ADDRESS);
export const CONTRACT_ADDRESS = IS_CONTRACT_ADDRESS_VALID ? RAW_CONTRACT_ADDRESS : '';
