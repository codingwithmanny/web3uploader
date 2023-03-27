// Imports
// ========================================================
import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { WagmiConfig, createClient, configureChains } from "wagmi";
import { mainnet, polygon } from "wagmi/chains";
import { publicProvider } from "wagmi/providers/public";
import { MetaMaskConnector } from 'wagmi/connectors/metaMask'

// Main Wrapper
// ========================================================
const { chains, provider } = configureChains(
  [mainnet, polygon],
  [publicProvider()]
);


const client = createClient({
  connectors: [
    new MetaMaskConnector({ chains })
  ],
  provider,
})

// Main Wrapper
// ========================================================
export default function App({ Component, pageProps }: AppProps) {
  return <WagmiConfig client={client}><Component {...pageProps} /></WagmiConfig>
};
