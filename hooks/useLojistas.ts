import { collection, query, orderBy, limit, startAfter, getDocs, where, QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const buscarLojistas = async (lastDoc: QueryDocumentSnapshot | null, termoBusca: string) => {
  let q;

  if (termoBusca) {
    q = query(
      collection(db, "lojistas"),
      where("dadosLoja.dsNomeLoja", ">=", termoBusca),
      where("dadosLoja.dsNomeLoja", "<=", termoBusca + "\uf8ff"),
      limit(20)
    );
  } else {
    // CRIAMOS UM ARRAY DE ARGUMENTOS DINÂMICO
    const queryArgs = [
      collection(db, "lojistas"),
      orderBy("dataCadastro", "desc"),
      limit(10)
    ];

    // SÓ ADICIONAMOS O startAfter SE O lastDoc EXISTIR
    if (lastDoc) {
      queryArgs.push(startAfter(lastDoc));
    }

    q = query(...queryArgs); // O spread operator (...) passa os argumentos um por um
  }

  const snapshot = await getDocs(q);
  
  return {
    docs: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
    lastVisible: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null
  };
};