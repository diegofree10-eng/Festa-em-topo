import "./globals.css";

export const metadata = {
  title: "Minha Loja",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-br">
      <body className="bg-gray-100">
        {children}
      </body>
    </html>
  );
}