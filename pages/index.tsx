// Imports
// ========================================================
import Head from 'next/head';
import Link from 'next/link';
import { Inter } from 'next/font/google';
import { useEffect, useRef, useState } from 'react';
import { useAccount, useConnect, useSigner, useProvider, useNetwork, Connector } from 'wagmi';
import { WebBundlr } from "@bundlr-network/client";
import BigNumber from "bignumber.js";
import from2 from 'from2';
import toBuffer from 'typedarray-to-buffer';

// Constants
// ========================================================
/**
 * Not an exhaustive list of mime tyes
 */
const MIME_TYPES = [
  "application/json",
  "application/javascript",
  "application/xml",
  "text/plain",
  "text/html",
  "text/css",
  "image/jpeg",
  "image/png",
  "image/gif",
  "video/mp4",
  "video/mpeg"
];

/**
 * 
 */
const CHAIN_DICTIONARY = {
  0: 'Unknown',
  1: 'Ethereum Mainnet',
  5: 'Goerli Testnet',
  137: 'Polygon Mainnet',
  1337: 'Localhost',
  1442: 'zkEVM Testnet',
  80001: 'Mumbai Testnet',
  11155111: 'Sepolia Testnet'
};

/**
 * 
 */
const SUPPORTED_CHAINS = [
  1,
  137
];

/**
 * 
 */
const CHAIN_CURRENCY = {
  1: 'ethereum',
  137: 'matic',
};

/**
 * Node options offered by bundlr
 */
const BUNDLR_NODES = ["https://node1.bundlr.network", "https://node2.bundlr.network"];

/**
 * 
 */
const ARWEAVE_TX_URL = "https://arweave.net/";

// Config
// ========================================================
const inter = Inter({ subsets: ['latin'] });

// Helper
// ========================================================
/**
 * Function that creates a file reader stream
 * {TODO}: replace this
 * @param file 
 * @param options 
 * @returns 
 */
const fileReaderStream = async (file: File, options?: any) => {
  let opts = options || {};
  let offset: number = opts?.offset || 0
  const chunkSize = opts?.chunkSize || 1024 * 1024 // default 1MB chunk has tolerable perf on large files
  const fileReader = new FileReader();

  var from: any = from2((size: number, cb: any) => {
    if (offset >= (file?.size ?? 0)) return cb(null, null)
    fileReader.onloadend = function loaded (event) {
      var data = event?.target?.result
      if (data instanceof ArrayBuffer) data = toBuffer(new Uint8Array(event?.target?.result as any))
      cb(null, data as any)
    }
    var end = offset + chunkSize
    var slice = file?.slice(offset, end)
    fileReader.readAsArrayBuffer(slice as Blob)
    offset = end
  })

  from.name = file?.name
  from.size = file?.size
  from.type = file?.type
  from.lastModified = file?.lastModified

  fileReader.onerror = function (err) {
    from.destroy(err)
  }

  return from;
};

// Home Page
// ========================================================
export default function Home() {
  // State / Props
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileSelected, setFileSelected] = useState<File | undefined>();
  const [walletConnections, setWalletConnections] = useState<Connector[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploaded, setIsUploaded] = useState(false);
  const [fileUploadURL, setFileUploadURL] = useState('');

  // Wagmi Hooks
  const { connect, connectors, error: connectError, isLoading: connectIsLoading, pendingConnector: connectPendingConnector } = useConnect();
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const { data: wagmiSigner } = useSigner();
  const wagmiProvider = useProvider();

  // Functions
  /**
   * 
   * @param event 
   */
  const onInputFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.group('onInputFileChange');
    console.log({ files: event.target.files });
    setFileSelected(event.target.files?.[0])
    console.groupEnd();
  };

  /**
   * 
   * @param event 
   */
  const onSubmitFormUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    console.group('onSubmitFormUpload');
    event.preventDefault();

    if (!wagmiSigner || !chain?.id) {
      alert('Please connect your wallet first');
      return;
    }

    const file = event.currentTarget?.file?.files?.[0];
    console.log({ file });
		if (!file) {
      alert("Please select a file first.");
			return;
		}

    setIsSubmitting(true);
    
    // use method injection to add the missing function
    (wagmiProvider as any).getSigner = () => wagmiSigner;

    // create a WebBundlr object
		const bundlr = new WebBundlr(BUNDLR_NODES[0], (CHAIN_CURRENCY as any)[chain.id], wagmiProvider);

    try {
      // connect wallet
      await bundlr.ready();

      // retrieve price for item
      const price = await (await bundlr.getPrice(file?.size)).toNumber() / 1000000000000000000;
      console.log({ price });

      // fund to send to node to fund upload
      const fundAmountParsed = BigNumber(price as any).multipliedBy(bundlr.currencyConfig.base[1]);
      console.log({ fundAmountParsed: fundAmountParsed.toString() });
    
      // fund node and get balance
      await bundlr.fund(fundAmountParsed.toString());
      const currentBalance = await bundlr.getBalance(await wagmiSigner.getAddress());
      console.log({ currentBalance: currentBalance.toString() });

      // upload file
      const dataStream = await fileReaderStream(file);
      const tx = await bundlr.upload(dataStream, {
				tags: [{ name: "Content-Type", value: file?.type }],
			});
      console.log({ url: `${ARWEAVE_TX_URL}${tx.id}` });
      setFileUploadURL(`${ARWEAVE_TX_URL}${tx.id}`);
      setIsUploaded(true);
    } catch (error) {
      console.error({ error });
    }

    setIsSubmitting(false);
    console.groupEnd();
  };

  // Hooks
  useEffect(() => {
    if (connectIsLoading || connectPendingConnector) return;
    setWalletConnections(connectors);
  }, [connectors, connectError, connectIsLoading, connectPendingConnector]);

  // Render
  return (
    <>
      <Head>
        <title>Web3Uploader - Permaweb Arweave Bundlr File Uploader</title>
        <link rel="apple-touch-icon-precomposed" sizes="57x57" href="apple-touch-icon-57x57.png" />
        <link rel="apple-touch-icon-precomposed" sizes="114x114" href="apple-touch-icon-114x114.png" />
        <link rel="apple-touch-icon-precomposed" sizes="72x72" href="apple-touch-icon-72x72.png" />
        <link rel="apple-touch-icon-precomposed" sizes="144x144" href="apple-touch-icon-144x144.png" />
        <link rel="apple-touch-icon-precomposed" sizes="60x60" href="apple-touch-icon-60x60.png" />
        <link rel="apple-touch-icon-precomposed" sizes="120x120" href="apple-touch-icon-120x120.png" />
        <link rel="apple-touch-icon-precomposed" sizes="76x76" href="apple-touch-icon-76x76.png" />
        <link rel="apple-touch-icon-precomposed" sizes="152x152" href="apple-touch-icon-152x152.png" />
        <link rel="icon" type="image/png" href="favicon-196x196.png" sizes="196x196" />
        <link rel="icon" type="image/png" href="favicon-96x96.png" sizes="96x96" />
        <link rel="icon" type="image/png" href="favicon-32x32.png" sizes="32x32" />
        <link rel="icon" type="image/png" href="favicon-16x16.png" sizes="16x16" />
        <link rel="icon" type="image/png" href="favicon-128.png" sizes="128x128" />
        <meta name="application-name" content="&nbsp;"/>
        <meta name="msapplication-TileColor" content="#FFFFFF" />
        <meta name="msapplication-TileImage" content="mstile-144x144.png" />
        <meta name="msapplication-square70x70logo" content="mstile-70x70.png" />
        <meta name="msapplication-square150x150logo" content="mstile-150x150.png" />
        <meta name="msapplication-wide310x150logo" content="mstile-310x150.png" />
        <meta name="msapplication-square310x310logo" content="mstile-310x310.png" />
        <meta name="description" content="Simple Uploader For Arweave Using Bundlr" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <nav>
        <div className="p-4 md:p-8 flex justify-between">
          <Link className="text-[#ffc517] font-[500] bg-[#161618] leading-10 px-6 rounded-full hover:bg-[#0b0b0c] transition-all ease-in-out duration-200" href="/">Web3Uploader</Link>

          <Link href="https://github.com/codingwithmanny/web3uploader" target={'_blank'} referrerPolicy={'no-referrer'} className="text-white font-[500] bg-[#161618] leading-10 px-6 rounded-full hover:bg-[#0b0b0c] transition-all ease-in-out duration-200">GitHub</Link>
        </div>
      </nav>
      <main className="p-4 md:p-8">
        <h1 className="text-white text-[80px] md:text-[100px] lg:text-[140px] font-bold text-center"><span className="block leading-[80px] md:inline-block">Just</span> upload it!</h1>
        <p className="text-[#cccccc] text-2xl text-center mb-12">When you just need to upload a file to arweave with your wallet quickly.</p>
        {!isConnected
          ? <div className="text-center">
            {walletConnections.map((connector) => <button key={`connector-${connector?.id}`} onClick={() => connect({ connector })} disabled={!connector.ready} type="button" className="bg-[#ffc517] disabled:opacity-30 disabled:hover:scale-100 disabled:hover:bg-[#ffc517] mb-4 leading-10 px-6 font-[500] rounded-full hover:scale-105 hover:bg-[#ffaa17] transition-all ease-in-out duration-200">Connect With {connector?.name}{!connector.ready ? ' (Not Supported)' : ''}</button>)}
            <p className="text-[#666666] text-2xl text-center mb-12"><small>(Currently MetaMask/Web only supported)</small></p>
          </div>
          : <div>
            <div className="text-center mb-12">
              <span className="text-[#ffc517] font-[500] inline-block bg-[#161618] leading-10 px-6 rounded-full mx-2">Wallet <span className="text-white">{address?.slice(0, 5)}...{address?.slice(-4)}</span></span>
              <span className="text-[#ffc517] font-[500] inline-block bg-[#161618] leading-10 px-6 rounded-full mx-2">Paying Network <span className="text-white">{(CHAIN_DICTIONARY as any)[chain?.id ?? 0]} {!SUPPORTED_CHAINS.includes(chain?.id ?? 0) ? '(Not Supported)' : null}</span></span>
            </div>
            <div className={`w-full ${fileSelected && !isUploaded ? 'max-w-sm' : 'max-w-2xl'} rounded-xl bg-[#161618] block p-8 relative transition-all ease-in-out duration-200 mx-auto`}>
              <form className="text-center" onSubmit={onSubmitFormUpload}>
                <input onChange={onInputFileChange} ref={inputRef} type="file" name="file" className="hidden" />
                {!fileSelected 
                ? <div>
                  <h1 className="text-lg text-white font-semibold mb-2">Upload To Permaweb</h1>
                  <p className="text-center text-[rgb(145_145_147)] mb-4">Choose any file to upload to the permaweb with bundlr and arweave.</p>
                  <button type="button" onClick={() => {
                        inputRef.current?.click();
                    }} className="bg-[#ffc517] leading-10 px-6 font-[500] rounded-full hover:scale-105 hover:bg-[#ffaa17] transition-all ease-in-out duration-200">Select File To Upload</button>
                  </div>
                : !isUploaded ?
                  <div>
                    <div className="flex">
                    <div className="bg-black mb-4 w-32 h-32 flex items-center justify-center bg-opacity-30 rounded-lg">
                      <div className="text-[#ffc517] text-lg">
                        {fileSelected?.name?.split('.')[fileSelected?.name?.split('.').length - 1]}
                        <span className="block text-[#666666] text-sm">{fileSelected?.size}</span>
                      </div>
                    </div>
                    <div className="w-[calc(100%_-_8em)] mb-4 text-left px-6 py-3 text-white">
                      <h3 title={fileSelected?.name} className="mb-1 whitespace-nowrap overflow-hidden text-ellipsis">{fileSelected?.name}</h3>
                      <p>
                        <span className="inline-block bg-[#ffc517] text-black font-[500] text-sm rounded px-2 mb-2">{fileSelected?.type.length === 0 ? fileSelected?.name?.split('.')[fileSelected?.name?.split('.').length - 1] : fileSelected?.type}</span>
                      </p>
                      <span className="inline-block bg-[#484848] text-[#121212] font-[500] text-sm rounded px-2">{fileSelected?.size}</span>
                    </div>
                    </div>
                    <button type="submit" disabled={isSubmitting} className="bg-[#ffc517] w-full disabled:opacity-30 disabled:hover:scale-100 disabled:hover:bg-[#ffc517] mb-4 leading-10 px-6 font-[500] rounded-full hover:scale-105 hover:bg-[#ffaa17] transition-all ease-in-out duration-200">{isSubmitting ? 'Uploading...' : 'Upload'}</button>
                  </div>
                  : <div>
                  <div className="text-left relative">
                    <h3 className="text-white bg-black bg-opacity-20 leading-[4em] px-4 rounded" title={fileUploadURL}>
                      <span className="block max-w-[70%] overflow-hidden whitespace-nowrap text-ellipsis">{fileUploadURL}</span>
                    </h3>
                    <div className="absolute top-3 right-3 flex">
                      {/* <button className="bg-[#1e1e20] mr-2 text-white mb-4 leading-10 px-6 font-[500] rounded-full hover:scale-105 hover:bg-[#3e3e42] transition-all ease-in-out duration-200">Copy</button> */}
                      <Link href={fileUploadURL} target={'_blank'} className="bg-[#1e1e20] h-10 block text-white mb-4 leading-10 px-6 font-[500] rounded-full hover:scale-105 hover:bg-[#3e3e42] transition-all ease-in-out duration-200">Link</Link>
                    </div>
                    {/* <button type="button" onClick={() => {
                      setIsUploaded(false);
                      setFileUploadURL('');
                      setFileSelected(undefined);
                      if (inputRef?.current) {
                        (inputRef.current as HTMLInputElement).value = '';
                      }
                    }} className="bg-[#ffc517] w-full disabled:opacity-30 disabled:hover:scale-100 disabled:hover:bg-[#ffc517] mb-4 leading-10 px-6 font-[500] rounded-full hover:scale-105 hover:bg-[#ffaa17] transition-all ease-in-out duration-200">Upload Another</button> */}
                  </div>
                  </div>
                }
              </form>
            {fileSelected && !isSubmitting
              ? <button title="Remove selection" onClick={() => {
                  setFileSelected(undefined);
                  setIsUploaded(false);
                  setFileUploadURL('');
                  setFileSelected(undefined);
                  if (inputRef?.current) {
                    (inputRef.current as HTMLInputElement).value = '';
                  }
                }} type="button" className="bg-[#ffc517] absolute -top-3 -right-3 disabled:opacity-30 disabled:hover:scale-100 disabled:hover:bg-[#ffc517] mb-4 leading-10 px-4 font-[500] rounded-full hover:scale-105 hover:bg-[#ffaa17] transition-all ease-in-out duration-200">&times;</button>
                : null
              }
            </div>
          </div>
        }
      </main>
      <footer className="fixed w-full bottom-0 left-0 right-9 bg-black bg-opacity-30 h-14 flex justify-center items-center text-[rgb(126,126,128)]">
        built by&nbsp;<Link className="text-[#cda738] hover:text-[#ffc517] transition-all ease-in-out duration-200" href="https://twitter.com/codingwithmanny" referrerPolicy="no-referrer" target="_blank">@codingwithmanny</Link>
      </footer>
    </>
  );
};
