import type { Metadata } from "next";
import "./globals.css";
import { ErrorProvider } from "@/contexts/ErrorContext";
import { ConfirmProvider } from "@/contexts/ConfirmContext";
import ErrorToastStack from "@/components/ErrorToastStack";

export const metadata: Metadata = {
  title: "VamoJogar",
  description: "Gerencie suas partidas de futebol e outros esportes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="overflow-x-hidden">
      <body className="antialiased min-h-screen bg-zinc-950 text-zinc-100 overflow-x-hidden">
        <ErrorProvider>
          <ConfirmProvider>
            {children}
            <ErrorToastStack />
          </ConfirmProvider>
        </ErrorProvider>
      </body>
    </html>
  );
}
