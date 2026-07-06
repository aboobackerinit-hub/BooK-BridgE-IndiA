import React, { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import Head from 'next/head';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  ogImage?: string;
}

export const Layout = ({ children, title = 'BookBridge India', description = 'Every Book Finds a Reader' }: LayoutProps) => {
  return (
    <>
      <Head>
        <title>{title} | BookBridge India</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#2E7D32" />
      </Head>
      <div className="flex flex-col min-h-screen bg-white">
        <Header />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
    </>
  );
};
