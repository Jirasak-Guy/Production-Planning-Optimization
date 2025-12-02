import { fetchProducts } from '@/app/lib/data';

export default async function Home() {
  const products = await fetchProducts();
  console.log(products);
  return (
    <div >
      
    </div>
  );
}
