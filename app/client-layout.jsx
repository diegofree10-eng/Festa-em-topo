"use client";

import { usePathname } from "next/navigation";
import CartBar from "./components/CartBar";

export default function ClientLayout({ children }) {

  const pathname = usePathname();

  const hideCart = pathname.startsWith("/admin");

  return (
    <>
      {!hideCart && <CartBar />}
      {children}
    </>
  );
}