"use client"

import * as React from "react"

import type { CryptoNetwork } from "@/lib/crypto"
import {
  getRegistryVersion,
  getServerRegistryVersion,
  listWallets,
  subscribeWallets,
  type WalletHandle,
} from "@/lib/wallet-connect"

/**
 * Wallets detected in this browser for a chain. The server snapshot is -1, so
 * the hydration render sees an empty list and matches the server, then the
 * real list arrives as the extensions announce themselves.
 */
export function useDetectedWallets(chain: CryptoNetwork): WalletHandle[] {
  const version = React.useSyncExternalStore(
    subscribeWallets,
    getRegistryVersion,
    getServerRegistryVersion
  )

  return React.useMemo(
    () => (version < 0 ? [] : listWallets(chain)),
    [chain, version]
  )
}
