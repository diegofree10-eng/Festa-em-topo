import "./globals.css";
import { CartProvider } from "./context/CartContext";

export const metadata = {
  // O que aparece na aba do navegador e no Google
  title: "Nome da Sua Loja | Kits Festa e Personalizados 🎈",
  description: "Transforme sua comemoração com nossos kits festa exclusivos e personalizados. Peça agora com facilidade pelo WhatsApp!",
  
  // Como o link aparece quando você compartilha no WhatsApp/Instagram
  openGraph: {
    title: "Nome da Sua Loja | Personalizados com Amor ❤️",
    description: "Kits festa, lembrancinhas e tudo para sua comemoração. Clique para ver o catálogo!",
    url: "https://seusite.com.br", // Substitua pelo seu link real depois
    siteName: "Nome da Sua Loja",
    images: [
      {
        url: "https://seusite.com.br/og-image.jpg", // Uma foto bem bonita do seu melhor kit
        width: 1200,
        height: 630,
        alt: "Kits Festa Personalizados",
      },
    ],
    locale: "pt_BR",
    type: "website",
  },

  // Instruções para o Google
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-br">
      <head>
        {/* Meta tag para garantir que o zoom não quebre no iPhone */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body style={{ 
        margin: 0, 
        padding: 0, 
        backgroundColor: "#f8f9fa", // Um fundo leve para não cansar a vista
        color: "#333",
        fontFamily: "sans-serif" 
      }}>
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}