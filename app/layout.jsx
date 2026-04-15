import "./globals.css";
import { CartProvider } from "./context/CartContext";

export const metadata = {
  title: "Minha Loja",
  description: "E-commerce simples"
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-br">
      <body style={{ margin: 0, padding: 0 }}>
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}