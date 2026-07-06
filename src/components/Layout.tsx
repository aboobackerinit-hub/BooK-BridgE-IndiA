import React, { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import Head from 'next/head';
import { APP_NAME, APP_TAGLINE, APP_THEME_COLOR } from '@/lib/siteConfig';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  ogImage?: string;
}

export const Layout = ({ children, title = APP_NAME, description = APP_TAGLINE }: LayoutProps) => {
  return (
    <>
      <Head>
        <title>{title} | BookBridge India</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content={APP_THEME_COLOR} />
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
