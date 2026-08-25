import { STUDIONET_CONFIG } from '../config/chain.ts';
import { EIP6963ProviderDetail, WalletState } from '../types/domain.ts';
import { sharedRpc } from './rpcClient.ts';

type Listener = (state: WalletState) => void;

const STRICT_RDNS_ALLOWLIST = ['io.metamask', 'com.okex.wallet', 'io.rabby'];

export class WalletService {
  private static instance: WalletService;
  private announcedProviders: Map<string, EIP6963ProviderDetail> = new Map();
  private hasEip6963Announcement = false;
  private activeListenersCleanup: (() => void) | null = null;
  private state: WalletState = {
    connected: false,
    address: null,
    chainId: null,
    provider: null,
    providerName: null,
    isCorrectChain: false,
  };
  private listeners: Set<Listener> = new Set();

  private constructor() {
    // Reload always starts disconnected
  }

  public static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  public initEIP6963(): () => void {
    if (typeof window === 'undefined') return () => {};

    const handleAnnouncement = (event: any) => {
      if (!event.detail || !event.detail.info || !event.detail.provider) return;
      const { info, provider } = event.detail;

      const rdns = (info.rdns || '').toLowerCase();
      if (
        typeof info.uuid !== 'string' ||
        !info.uuid ||
        typeof info.name !== 'string' ||
        !info.name ||
        typeof info.rdns !== 'string' ||
        typeof provider.request !== 'function'
      )
        return;

      // Strict RDNS allowlist check
      if (!STRICT_RDNS_ALLOWLIST.includes(rdns)) return;

      this.hasEip6963Announcement = true;

      // Deduplicate by UUID and provider identity
      const existingKey = Array.from(this.announcedProviders.keys()).find((k) => {
        const entry = this.announcedProviders.get(k);
        return entry && (entry.provider === provider || entry.info.uuid === info.uuid);
      });

      const key = existingKey || info.uuid || `${info.name}:${info.rdns}`;
      this.announcedProviders.set(key, { info, provider });
      this.notifyListeners();
    };

    window.addEventListener('eip6963:announceProvider', handleAnnouncement);
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    return () => {
      window.removeEventListener('eip6963:announceProvider', handleAnnouncement);
    };
  }

  public getDiscoveredProviders(): EIP6963ProviderDetail[] {
    const list = Array.from(this.announcedProviders.values());
    if (list.length > 0) {
      return list;
    }

    // Bounded legacy fallback if no EIP-6963 providers found
    if (!this.hasEip6963Announcement && typeof window !== 'undefined' && (window as any).ethereum) {
      const eth = (window as any).ethereum;
      let name = '';
      let rdns = '';

      if (eth.isRabby) {
        name = 'Rabby Wallet';
        rdns = 'io.rabby';
      } else if (eth.isOkxWallet || eth.isOKExWallet) {
        name = 'OKX Wallet';
        rdns = 'com.okex.wallet';
      } else if (eth.isMetaMask) {
        name = 'MetaMask';
        rdns = 'io.metamask';
      }

      // Unknown legacy provider MUST fail closed
      if (!name || !rdns) {
        return [];
      }

      return [
        {
          info: {
            uuid: 'legacy-injected',
            name,
            icon: '',
            rdns,
          },
          provider: eth,
        },
      ];
    }

    return [];
  }

  public getState(): WalletState {
    return { ...this.state };
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const s = this.getState();
    this.listeners.forEach((l) => l(s));
  }

  public async connectProvider(providerDetail: EIP6963ProviderDetail): Promise<void> {
    const provider = providerDetail.provider;
    if (!provider || typeof provider.request !== 'function') {
      throw new Error('PROVIDER_INVALID');
    }

    // Cleanup any prior listeners
    if (this.activeListenersCleanup) {
      this.activeListenersCleanup();
      this.activeListenersCleanup = null;
    }

    const accounts: string[] = await provider.request({
      method: 'eth_requestAccounts',
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('NO_ACCOUNTS_RETURNED');
    }
    if (!/^0x[0-9a-fA-F]{40}$/.test(accounts[0])) {
      throw new Error('INVALID_ACCOUNT_ADDRESS');
    }

    const rawChainId: string = await provider.request({
      method: 'eth_chainId',
    });
    const chainId = parseInt(rawChainId, 16);

    this.state = {
      connected: true,
      address: accounts[0],
      chainId,
      provider,
      providerName: providerDetail.info.name,
      isCorrectChain: chainId === STUDIONET_CONFIG.chainId,
    };

    // Attach listeners on this exact provider with exact callback references
    const handleAccountsChanged = (newAccounts: string[]) => {
      sharedRpc.clearCache();
      if (!newAccounts || newAccounts.length === 0) {
        this.disconnect();
      } else {
        this.state.address = newAccounts[0];
        this.notifyListeners();
      }
    };

    const handleChainChanged = (newChainHex: string) => {
      sharedRpc.clearCache();
      const newChain = parseInt(newChainHex, 16);
      this.state.chainId = newChain;
      this.state.isCorrectChain = newChain === STUDIONET_CONFIG.chainId;
      this.notifyListeners();
    };

    const handleDisconnect = () => {
      sharedRpc.clearCache();
      this.disconnect();
    };

    if (typeof provider.on === 'function') {
      provider.on('accountsChanged', handleAccountsChanged);
      provider.on('chainChanged', handleChainChanged);
      provider.on('disconnect', handleDisconnect);

      this.activeListenersCleanup = () => {
        if (typeof provider.removeListener === 'function') {
          provider.removeListener('accountsChanged', handleAccountsChanged);
          provider.removeListener('chainChanged', handleChainChanged);
          provider.removeListener('disconnect', handleDisconnect);
        } else if (typeof provider.off === 'function') {
          provider.off('accountsChanged', handleAccountsChanged);
          provider.off('chainChanged', handleChainChanged);
          provider.off('disconnect', handleDisconnect);
        }
      };
    }

    this.notifyListeners();
  }

  public async switchChain(): Promise<void> {
    if (!this.state.provider) throw new Error('NO_PROVIDER_CONNECTED');
    try {
      await this.state.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: STUDIONET_CONFIG.chainIdHex }],
      });
    } catch (switchError: any) {
      // 4902 means chain has not been added yet
      if (switchError?.code === 4902 || switchError?.message?.includes('4902')) {
        await this.state.provider.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: STUDIONET_CONFIG.chainIdHex,
              chainName: STUDIONET_CONFIG.chainName,
              rpcUrls: [STUDIONET_CONFIG.rpcUrl],
              nativeCurrency: STUDIONET_CONFIG.nativeCurrency,
              blockExplorerUrls: STUDIONET_CONFIG.blockExplorerUrls,
            },
          ],
        });
        await this.state.provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: STUDIONET_CONFIG.chainIdHex }],
        });
      } else {
        throw switchError;
      }
    }

    // Re-read active chainId after switch attempt and fail closed if mismatch
    const rawChainId: string = await this.state.provider.request({
      method: 'eth_chainId',
    });
    const newChain = parseInt(rawChainId, 16);
    this.state.chainId = newChain;
    this.state.isCorrectChain = newChain === STUDIONET_CONFIG.chainId;
    this.notifyListeners();

    if (!this.state.isCorrectChain) {
      throw new Error('CHAIN_SWITCH_NOT_CONFIRMED');
    }
  }

  public clearDiscoveredProviders(): void {
    this.announcedProviders.clear();
    this.hasEip6963Announcement = false;
  }

  public disconnect(): void {
    if (this.activeListenersCleanup) {
      this.activeListenersCleanup();
      this.activeListenersCleanup = null;
    }

    sharedRpc.clearCache();
    this.state = {
      connected: false,
      address: null,
      chainId: null,
      provider: null,
      providerName: null,
      isCorrectChain: false,
    };
    this.notifyListeners();
  }
}

export const walletService = WalletService.getInstance();
