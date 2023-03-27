// Imports
// ========================================================
import { Html, Head, Main, NextScript } from 'next/document';

// Main Document Wrapper
// ========================================================
export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body className="bg-[#1e1e20]">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
};
