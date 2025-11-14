import React, { createContext, useMemo } from 'react';

type ThemeTokens = {
  bg?: string;
  surface?: string;
  surface2?: string;
  text?: string;
  muted?: string;
  border?: string;
  primary?: string;
  primaryHover?: string;
  accent?: string;
  success?: string;
  danger?: string;
};

type ThemeContextValue = {
  tokens: Required<ThemeTokens>;
};

const defaultTokens: Required<ThemeTokens> = {
  bg: '#000000',
  surface: '#0a0a0a',
  surface2: '#1a1a1a',
  text: '#ffffff',
  muted: '#9ca3af',
  border: '#333333',
  primary: '#3b82f6',
  primaryHover: '#2563eb',
  accent: '#9333ea',
  success: '#4ade80',
  danger: '#ef4444'
};

export const ThemeContext = createContext<ThemeContextValue>({ tokens: defaultTokens });

interface Props {
  children: React.ReactNode;
  theme?: ThemeTokens;
}

export default function ThemeProvider({ children, theme }: Props) {
  const tokens = useMemo(() => ({ ...defaultTokens, ...(theme || {}) }), [theme]);

  const style: React.CSSProperties = {
    ['--bg' as any]: tokens.bg,
    ['--surface' as any]: tokens.surface,
    ['--surface-2' as any]: tokens.surface2,
    ['--text' as any]: tokens.text,
    ['--muted' as any]: tokens.muted,
    ['--border' as any]: tokens.border,
    ['--primary' as any]: tokens.primary,
    ['--primary-hover' as any]: tokens.primaryHover,
    ['--accent' as any]: tokens.accent,
    ['--success' as any]: tokens.success,
    ['--danger' as any]: tokens.danger
  };

  return (
    <ThemeContext.Provider value={{ tokens }}>
      <div style={style}>{children}</div>
    </ThemeContext.Provider>
  );
}

