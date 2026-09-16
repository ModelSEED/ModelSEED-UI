import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '@/lib/theme';
import Box from '@mui/material/Box';
import HeaderLayoutRouter from '@/app/HeaderLayoutRouter';
import OutageBanner from '@/components/ui/OutageBanner';
import Providers from '@/components/Providers';
import { AuthProvider } from '@/components/auth/AuthProvider';
import FeedbackFAB from '@/components/feedback/FeedbackFAB';
import type { Metadata } from "next";
import "./globals.css";
import "@/styles/icomoon/style.css";

export const metadata: Metadata = {
    title: "ModelSEED",
    description: "ModelSEED is a resource for the reconstruction, exploration, comparison, and analysis of metabolic models.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link rel="shortcut icon" href="/img/ModelSEED-favicon.png" />
                <link
                    href="https://fonts.googleapis.com/icon?family=Material+Icons"
                    rel="stylesheet"
                />
            </head>
            <body suppressHydrationWarning>
                <AppRouterCacheProvider>
                    <ThemeProvider theme={theme}>
                        <Providers>
                            <AuthProvider>
                                <CssBaseline />
                                <OutageBanner />
                                <HeaderLayoutRouter />
                                <Box
                                    component="main"
                                    sx={{
                                        flexGrow: 1,
                                        backgroundColor: '#f5f5f5',
                                    }}
                                >
                                    {children}
                                </Box>
                                <FeedbackFAB />
                            </AuthProvider>
                        </Providers>
                    </ThemeProvider>
                </AppRouterCacheProvider>
            </body>
        </html>
    );
}
