import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Eip1193Provider, ethers } from "ethers";
import { useEip6963 } from "./useEip6963";

export interface UseMetaMaskState {
  provider: Eip1193Provider | undefined;
  chainId: number | undefined;
  accounts: string[] | undefined;
  isConnected: boolean;
  error: Error | undefined;
  connect: () => void;
}

function useMetaMaskInternal(): UseMetaMaskState {
  const { error: eip6963Error, providers } = useEip6963();
  const [_currentProvider, _setCurrentProvider] = useState<
    Eip1193Provider | undefined
  >(undefined);
  const [chainId, _setChainId] = useState<number | undefined>(undefined);
  const [accounts, _setAccounts] = useState<string[] | undefined>(undefined);

  const connectListenerRef = useRef<((connectInfo: { chainId: string }) => void) | undefined>(undefined);
  const disconnectListenerRef = useRef<((error: Error) => void) | undefined>(undefined);
  const chainChangedListenerRef = useRef<((chainId: string) => void) | undefined>(undefined);
  const accountsChangedListenerRef = useRef<((accounts: string[]) => void) | undefined>(undefined);

  const metaMaskProviderRef = useRef<Eip1193Provider | undefined>(undefined);

  const hasProvider = Boolean(_currentProvider);
  const hasAccounts = (accounts?.length ?? 0) > 0;
  const hasChain = typeof chainId === "number";

  const isConnected = hasProvider && hasAccounts && hasChain;

  const connect = useCallback(() => {
    if (!_currentProvider) {
      return;
    }

    if (accounts && accounts.length > 0) {
      return;
    }

    _currentProvider.request({ method: "eth_requestAccounts" });
  }, [_currentProvider, accounts]);

  useEffect(() => {
    let next: Eip1193Provider | undefined = undefined;
    for (let i = 0; i < providers.length; ++i) {
      if (providers[i].info.name.toLowerCase() === "metamask") {
        next = providers[i].provider;
        break;
      }
    }

    const prev = metaMaskProviderRef.current;
    if (prev === next) {
      return;
    }

    if (prev) {
      if (connectListenerRef.current && "off" in prev) {
        (prev as any).off?.("connect", connectListenerRef.current);
      }
      if (disconnectListenerRef.current && "off" in prev) {
        (prev as any).off?.("disconnect", disconnectListenerRef.current);
      }
      if (chainChangedListenerRef.current && "off" in prev) {
        (prev as any).off?.("chainChanged", chainChangedListenerRef.current);
      }
      if (accountsChangedListenerRef.current && "off" in prev) {
        (prev as any).off?.("accountsChanged", accountsChangedListenerRef.current);
      }
    }

    _setCurrentProvider(undefined);
    _setChainId(undefined);
    _setAccounts(undefined);

    metaMaskProviderRef.current = next;

    let nextConnectListener: ((connectInfo: { chainId: string }) => void) | undefined = undefined;
    let nextDisconnectListener: ((error: Error) => void) | undefined = undefined;
    let nextChainChangedListener: ((chainId: string) => void) | undefined = undefined;
    let nextAccountsChangedListener: ((accounts: string[]) => void) | undefined = undefined;

    connectListenerRef.current = undefined;
    disconnectListenerRef.current = undefined;
    chainChangedListenerRef.current = undefined;
    accountsChangedListenerRef.current = undefined;

    if (next) {
      nextConnectListener = (connectInfo: { chainId: string }) => {
        if (next !== metaMaskProviderRef.current) {
          return;
        }
        console.log(`[useMetaMask] on('connect') chainId=${connectInfo.chainId}`);
        _setCurrentProvider(next);
        _setChainId(Number.parseInt(connectInfo.chainId, 16));
      };
      connectListenerRef.current = nextConnectListener;

      nextDisconnectListener = (error: Error) => {
        if (next !== metaMaskProviderRef.current) {
          return;
        }
        console.log(`[useMetaMask] on('disconnect') error code=${error.message}`);
        _setCurrentProvider(undefined);
        _setChainId(undefined);
        _setAccounts(undefined);
      };
      disconnectListenerRef.current = nextDisconnectListener;

      nextChainChangedListener = (chainId: string) => {
        if (next !== metaMaskProviderRef.current) {
          return;
        }
        console.log(`[useMetaMask] on('chainChanged') chainId=${chainId}`);
        _setCurrentProvider(next);
        _setChainId(Number.parseInt(chainId, 16));
      };
      chainChangedListenerRef.current = nextChainChangedListener;

      nextAccountsChangedListener = (accounts: string[]) => {
        if (next !== metaMaskProviderRef.current) {
          return;
        }
        console.log(`[useMetaMask] on('accountsChanged') accounts.length=${accounts.length}`);
        _setCurrentProvider(next);
        _setAccounts(accounts);
        
        // Show alert when account is switched
        if (accounts.length > 0) {
          const newAccount = accounts[0];
          alert(`Account switched successfully!\n\nNew account address:\n${newAccount}`);
        }
      };
      accountsChangedListenerRef.current = nextAccountsChangedListener;

      if ("on" in next) {
        (next as any).on("connect", nextConnectListener);
        (next as any).on("disconnect", nextDisconnectListener);
        (next as any).on("chainChanged", nextChainChangedListener);
        (next as any).on("accountsChanged", nextAccountsChangedListener);
      }

      const updateChainId = async () => {
        if (next !== metaMaskProviderRef.current) {
          return;
        }

        try {
          const [chainIdHex, accountsArray] = await Promise.all([
            next.request({ method: "eth_chainId" }),
            next.request({ method: "eth_accounts" }),
          ]);

          console.log(
            `[useMetaMask] connected to chainId=${chainIdHex} accounts.length=${accountsArray.length}`
          );

          _setCurrentProvider(next);
          _setChainId(Number.parseInt(chainIdHex as string, 16));
          _setAccounts(accountsArray);
        } catch {
          console.log(`[useMetaMask] not connected!`);
          _setCurrentProvider(next);
          _setChainId(undefined);
          _setAccounts(undefined);
        }
      };

      updateChainId();
    }
  }, [providers]);

  useEffect(() => {
    return () => {
      const current = metaMaskProviderRef.current;

      if (current) {
        const chainChangedListener = chainChangedListenerRef.current;
        const accountsChangedListener = accountsChangedListenerRef.current;
        const connectListener = connectListenerRef.current;
        const disconnectListener = disconnectListenerRef.current;

        if (connectListener && "off" in current) {
          (current as any).off?.("connect", connectListener);
        }
        if (disconnectListener && "off" in current) {
          (current as any).off?.("disconnect", disconnectListener);
        }
        if (chainChangedListener && "off" in current) {
          (current as any).off?.("chainChanged", chainChangedListener);
        }
        if (accountsChangedListener && "off" in current) {
          (current as any).off?.("accountsChanged", accountsChangedListener);
        }
      }

      chainChangedListenerRef.current = undefined;
      metaMaskProviderRef.current = undefined;
    };
  }, []);

  return {
    provider: _currentProvider,
    chainId,
    accounts,
    isConnected,
    error: eip6963Error,
    connect,
  };
}

interface MetaMaskProviderProps {
  children: React.ReactNode;
}

const MetaMaskContext = createContext<UseMetaMaskState | undefined>(undefined);

export const MetaMaskProvider: React.FC<MetaMaskProviderProps> = ({
  children,
}) => {
  const { provider, chainId, accounts, isConnected, error, connect } =
    useMetaMaskInternal();
  return (
    <MetaMaskContext.Provider
      value={{
        provider,
        chainId,
        accounts,
        isConnected,
        error,
        connect,
      }}
    >
      {children}
    </MetaMaskContext.Provider>
  );
};

export function useMetaMask() {
  const context = useContext(MetaMaskContext);
  if (context === undefined) {
    throw new Error("useMetaMask must be used within a MetaMaskProvider");
  }
  return context;
}

