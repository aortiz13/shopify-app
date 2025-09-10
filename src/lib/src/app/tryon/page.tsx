"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function TryOnPopup() {
  const searchParams = useSearchParams();
  const productId = searchParams.get("id");

  const [product, setProduct] = useState<any>(null);

  useEffect(() => {
    if (productId) {
      // acá iría fetch al backend para obtener info del producto
      setProduct({ id: productId, name: "Producto Ejemplo" });
    }
  }, [productId]);

  return (
    <div className="p-4 bg-white rounded shadow-md">
      <h1 className="text-xl font-bold mb-2">Probador Virtual</h1>
      <p>ID del producto: <span className="font-mono">{product?.id}</span></p>
      <p>Nombre: {product?.name}</p>
    </div>
  );
}