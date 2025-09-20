export const theme = {
    colors: {
      background: '#FFFFFF',
      surface: '#F7F8FA',
      text: '#111111',
      textSecondary: '#6B7280',
      border: '#E5E7EB',
      primary: '#5b21b6',
      danger: '#EF4444',
      muted: '#9CA3AF',
      success: '#10B981',
      warning: '#F59E0B',
      black: '#000000',
      // Mood colors
      mood1: '#ef4444',
      mood2: '#f59e0b',
      mood3: '#10b981',
      mood4: '#7c3aed',
      mood5: '#8b5cf6',
    },
    spacing: { 
      xs: 4, 
      sm: 8, 
      md: 12, 
      lg: 16, 
      xl: 24, 
      xxl: 32,
      xxxl: 48,
      xxxxl: 72,
    },
    radius: { 
      sm: 8, 
      md: 12, 
      lg: 16,
      full: 999,
    },
    typography: {
      h1: { 
        fontSize: 28, 
        fontWeight: '700' as const,
        letterSpacing: -0.5,
      },
      h2: { 
        fontSize: 22, 
        fontWeight: '600' as const,
        letterSpacing: -0.3,
      },
      h3: { 
        fontSize: 18, 
        fontWeight: '600' as const,
        letterSpacing: -0.2,
      },
      h4: { 
        fontSize: 14, 
        fontWeight: '500' as const,
        letterSpacing: -0.2,
      },
      body: { 
        fontSize: 16, 
        fontWeight: '400' as const, 
        lineHeight: 22,
      },
      caption: { 
        fontSize: 13, 
        fontWeight: '400' as const,
        color: '#6B7280',
      },
      button: { 
        fontSize: 16, 
        fontWeight: '600' as const,
      },
    },
    shadow: {
      small: { 
        shadowColor: '#000', 
        shadowOpacity: 0.05, 
        shadowRadius: 6, 
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      },
      medium: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
      },
    },
  };