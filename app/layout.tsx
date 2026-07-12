import "./globals.css";
import { CartProvider } from "./context/CartContext";

export const metadata = {
  title: "Nome da Sua Loja | Kits Festa e Personalizados 🎈",
  description: "Transforme sua comemoração com nossos kits festa exclusivos e personalizados.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body style={{ 
        margin: 0, 
        padding: 0, 
        backgroundColor: "#f8f9fa",
        fontFamily: "sans-serif" 
      }}>
        {/* O CartProvider agora deve estar preparado para rodar no cliente 
          (garanta que ele tenha 'use client' no topo do arquivo dele)
        */}
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}