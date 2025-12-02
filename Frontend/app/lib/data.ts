import { ProductData } from "@/app/types/CoreData";

export async function fetchProducts(): Promise<ProductData[]> {
  const response = await fetch("http://localhost:8000/products", {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch products");
  }
  return response.json();
}