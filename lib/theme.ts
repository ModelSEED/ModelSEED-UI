'use client';

/**
 * Material-UI theme configuration for ModelSEED UI.
 * 
 * This theme maintains visual consistency with the legacy AngularJS application
 * by mapping color values and styling from the original core.css file. All color
 * codes and design decisions are documented with their CSS source references.
 * 
 * @see core.css - Original styling source
 */

import { createTheme } from '@mui/material/styles';

/**
 * ModelSEED application theme with brand colors and typography.
 * 
 * Color palette derived from legacy core.css to maintain visual consistency:
 * - Primary (#30BCCF): ModelSEED brand teal
 * - Secondary (rgba(95,98,168,0.91)): Accent purple
 * - Error (#DA265D): Danger/error state red
 * - Success (#38BD5C): Success/complete state green
 * 
 * Typography uses Montserrat font family with 500 weight for all headings.
 * Buttons have 0px border-radius and 'none' text-transform per legacy design.
 * 
 * @example
 * ```tsx
 * import { ThemeProvider } from '@mui/material/styles';
 * import theme from '@/lib/theme';
 * 
 * export default function App() {
 *   return (
 *     <ThemeProvider theme={theme}>
 *       <YourComponents />
 *     </ThemeProvider>
 *   );
 * }
 * ```
 */
const theme = createTheme({
    palette: {
        primary: {
            main: '#30BCCF',    // From core.css: .md-primary / .ms-color
            contrastText: '#fff',
        },
        secondary: {
            main: 'rgba(95, 98, 168, 0.91)', // From core.css: .md-secondary
            contrastText: '#fff',
        },
        error: {
            main: '#DA265D',    // From core.css: .md-danger / .ms-color-error
            contrastText: '#fff',
        },
        success: {
            main: '#38BD5C',    // From core.css: .md-success / .ms-color-complete
            contrastText: '#fff',
        },
        info: {
            main: '#2FBBD0',    // From core.css: .info-check
        },
        background: {
            default: '#ffffff',
            paper: '#ffffff',
        },
    },
    typography: {
        fontFamily: 'Montserrat, "Helvetica Neue", Helvetica, Arial, sans-serif', // From body
        h1: {
            fontFamily: 'Montserrat, "Helvetica Neue", Helvetica, Arial, sans-serif',
            fontWeight: 500,
        },
        h2: {
            fontFamily: 'Montserrat, "Helvetica Neue", Helvetica, Arial, sans-serif',
            fontWeight: 500,
        },
        h3: {
            fontFamily: 'Montserrat, "Helvetica Neue", Helvetica, Arial, sans-serif',
            fontWeight: 500,
        },
        h4: {
            fontFamily: 'Montserrat, "Helvetica Neue", Helvetica, Arial, sans-serif',
            fontWeight: 500,
        },
        h5: {
            fontFamily: 'Montserrat, "Helvetica Neue", Helvetica, Arial, sans-serif',
            fontWeight: 500,
        },
        h6: {
            fontFamily: 'Montserrat, "Helvetica Neue", Helvetica, Arial, sans-serif',
            fontWeight: 500,
        },
        button: {
            textTransform: 'none', // From core.css: .md-button { text-transform: none; }
        },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: '0px', // From core.css: .form-control, .btn { border-radius: 0px !important; }
                },
                outlined: {
                    border: 'solid 2px #30BCCF', // From core.css: .btn-outline
                    '&:hover': {
                        border: 'solid 2px #30BCCF',
                        backgroundColor: '#30BCCF',
                        color: '#fff',
                    },
                },
            },
        },
        MuiLink: {
            styleOverrides: {
                root: {
                    color: '#30BCCF', // From core.css a
                    textDecoration: 'none',
                    '&:hover': {
                        color: '#006C86', // From core.css a:hover
                        textDecoration: 'none',
                    },
                },
            },
        },
    },
});

export default theme;
