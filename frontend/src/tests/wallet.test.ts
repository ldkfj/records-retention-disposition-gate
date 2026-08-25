import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { walletService } from '../services/walletService.ts';
import { sharedRpc } from '../services/rpcClient.ts';

describe('WalletService (EIP-6963 Discovery, Strict Chain ID & Provider Isolation)', () => {
  beforeEach(() => {
    walletService.disconnect();
    walletService.clearDiscoveredProviders();
    sharedRpc.clearCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes EIP-6963 listener and discovers allowlisted wallet providers (MetaMask, OKX, Rabby)', () => {
    const cleanup = walletService.initEIP6963();

    const mockMetaMask = {
      info: {
        uuid: 'uuid-metamask-1',
        name: 'MetaMask',
        icon: 'data:image/svg+xml;base64,mock',
        rdns: 'io.metamask',
      },
      provider: { request: vi.fn() },
    };

    const mockOkx = {
      info: {
        uuid: 'uuid-okx-1',
        name: 'OKX Wallet',
        icon: 'data:image/svg+xml;base64,mock',
        rdns: 'com.okex.wallet',
      },
      provider: { request: vi.fn() },
    };

    const mockRabby = {
      info: {
        uuid: 'uuid-rabby-1',
        name: 'Rabby Wallet',
        icon: 'data:image/svg+xml;base64,mock',
        rdns: 'io.rabby',
      },
      provider: { request: vi.fn() },
    };

    const mockUnauthorized = {
      info: {
        uuid: 'uuid-unauth-1',
        name: 'MaliciousInjectedWallet',
        icon: 'data:image/svg+xml;base64,mock',
        rdns: 'com.unauthorized.wallet',
      },
      provider: { request: vi.fn() },
    };

    window.dispatchEvent(
      new CustomEvent('eip6963:announceProvider', { detail: mockMetaMask })
    );
    window.dispatchEvent(
      new CustomEvent('eip6963:announceProvider', { detail: mockOkx })
    );
    window.dispatchEvent(
      new CustomEvent('eip6963:announceProvider', { detail: mockRabby })
    );
    window.dispatchEvent(
      new CustomEvent('eip6963:announceProvider', { detail: mockUnauthorized })
    );

    const discovered = walletService.getDiscoveredProviders();
    expect(discovered.some((p) => p.info.rdns === 'io.metamask')).toBe(true);
    expect(discovered.some((p) => p.info.rdns === 'com.okex.wallet')).toBe(true);
    expect(discovered.some((p) => p.info.rdns === 'io.rabby')).toBe(true);
    expect(discovered.some((p) => p.info.rdns === 'com.unauthorized.wallet')).toBe(false);

    cleanup();
  });

  it('deduplicates announcements by UUID and provider identity', () => {
    const cleanup = walletService.initEIP6963();
    const sharedProvider = { request: vi.fn() };

    const announce1 = {
      info: { uuid: 'uuid-1', name: 'MetaMask', icon: '', rdns: 'io.metamask' },
      provider: sharedProvider,
    };
    const announceDuplicate = {
      info: { uuid: 'uuid-1', name: 'MetaMask Re-announcement', icon: '', rdns: 'io.metamask' },
      provider: sharedProvider,
    };

    window.dispatchEvent(
      new CustomEvent('eip6963:announceProvider', { detail: announce1 })
    );
    window.dispatchEvent(
      new CustomEvent('eip6963:announceProvider', { detail: announceDuplicate })
    );

    const discovered = walletService.getDiscoveredProviders();
    const metamaskEntries = discovered.filter((p) => p.info.rdns === 'io.metamask');
    expect(metamaskEntries.length).toBe(1);

    cleanup();
  });

  it('discards legacy fallback once valid EIP-6963 announcement arrives', () => {
    const cleanup = walletService.initEIP6963();

    const announce = {
      info: { uuid: 'uuid-eip6963', name: 'Rabby Wallet', icon: '', rdns: 'io.rabby' },
      provider: { request: vi.fn() },
    };

    window.dispatchEvent(
      new CustomEvent('eip6963:announceProvider', { detail: announce })
    );

    const discovered = walletService.getDiscoveredProviders();
    expect(discovered.some((p) => p.info.uuid === 'legacy-injected')).toBe(false);
    expect(discovered.some((p) => p.info.uuid === 'uuid-eip6963')).toBe(true);

    cleanup();
  });

  it('connects to provider, validates chain ID, and updates state without ambient guessing', async () => {
    const mockAccounts = ['0x1111111111111111111111111111111111111111'];
    const mockRequest = vi.fn().mockImplementation(async ({ method }) => {
      if (method === 'eth_requestAccounts') return mockAccounts;
      if (method === 'eth_chainId') return '0xf22f'; // 61999 in hex
      return null;
    });

    const mockProviderDetail = {
      info: {
        uuid: 'uuid-okx-1',
        name: 'OKX Wallet',
        icon: 'data:image/svg+xml;base64,mock',
        rdns: 'com.okex.wallet',
      },
      provider: {
        request: mockRequest,
        on: vi.fn(),
        removeListener: vi.fn(),
      },
    };

    await walletService.connectProvider(mockProviderDetail as any);

    const state = walletService.getState();
    expect(state.connected).toBe(true);
    expect(state.address).toBe(mockAccounts[0]);
    expect(state.chainId).toBe(61999);
    expect(state.isCorrectChain).toBe(true);
    expect(state.providerName).toBe('OKX Wallet');
  });

  it('fails closed when chain switch is not confirmed by re-reading eth_chainId', async () => {
    let currentChainHex = '0x1'; // mainnet
    const mockRequest = vi.fn().mockImplementation(async ({ method }) => {
      if (method === 'eth_requestAccounts') return ['0x1111111111111111111111111111111111111111'];
      if (method === 'eth_chainId') return currentChainHex; // always returns 0x1
      if (method === 'wallet_switchEthereumChain') return null; // pretending switch succeeded
      return null;
    });

    const mockDetail = {
      info: { uuid: 'uuid-fail-switch', name: 'MetaMask', icon: '', rdns: 'io.metamask' },
      provider: { request: mockRequest, on: vi.fn(), removeListener: vi.fn() },
    };

    await walletService.connectProvider(mockDetail as any);
    expect(walletService.getState().isCorrectChain).toBe(false);

    // switchChain should throw CHAIN_SWITCH_NOT_CONFIRMED
    await expect(walletService.switchChain()).rejects.toThrow(/CHAIN_SWITCH_NOT_CONFIRMED/);
    expect(walletService.getState().isCorrectChain).toBe(false);
  });

  it('retains exact callback references and cleans them up on disconnect', async () => {
    const mockAccounts = ['0x1111111111111111111111111111111111111111'];
    const listeners: Record<string, Function> = {};
    const onMock = vi.fn((event, cb) => {
      listeners[event] = cb;
    });
    const removeListenerMock = vi.fn((event) => {
      delete listeners[event];
    });

    const mockRequest = vi.fn().mockImplementation(async ({ method }) => {
      if (method === 'eth_requestAccounts') return mockAccounts;
      if (method === 'eth_chainId') return '0xf22f';
      return null;
    });

    const mockDetail = {
      info: { uuid: 'uuid-1', name: 'Rabby Wallet', icon: '', rdns: 'io.rabby' },
      provider: { request: mockRequest, on: onMock, removeListener: removeListenerMock },
    };

    await walletService.connectProvider(mockDetail as any);
    expect(onMock).toHaveBeenCalledWith('accountsChanged', expect.any(Function));
    expect(onMock).toHaveBeenCalledWith('chainChanged', expect.any(Function));
    expect(onMock).toHaveBeenCalledWith('disconnect', expect.any(Function));

    walletService.disconnect();
    expect(removeListenerMock).toHaveBeenCalledWith('accountsChanged', expect.any(Function));
    expect(removeListenerMock).toHaveBeenCalledWith('chainChanged', expect.any(Function));
    expect(removeListenerMock).toHaveBeenCalledWith('disconnect', expect.any(Function));

    const state = walletService.getState();
    expect(state.connected).toBe(false);
    expect(state.address).toBeNull();
    expect(state.chainId).toBeNull();
  });
});
