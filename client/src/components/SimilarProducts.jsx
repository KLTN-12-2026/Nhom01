import React, { useEffect, useState } from 'react';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import CardProduct from './CardProduct';

const SimilarProducts = ({ categories }) => {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        const fetchProducts = async () => {
            if (!categories?.length) return;

            let mergedProducts = [];

            for (let c of categories) {
                try {
                    const res = await Axios.get(
                        `${SummaryApi.get_product_by_category_home.url}/${c._id}`
                    );

                    mergedProducts = [
                        ...mergedProducts,
                        ...(res.data?.products || []),
                    ];
                } catch (error) {
                    console.log('Error fetching category:', c.name, error);
                }
            }

            // loại bỏ trùng sản phẩm theo _id
            const uniqueProducts = mergedProducts.filter(
                (item, index, self) =>
                    index === self.findIndex((p) => p._id === item._id)
            );

            setProducts(uniqueProducts);
        };

        fetchProducts();
    }, [categories]);

    if (!products.length) return null;

    return (
        <div className="mt-12 mb-8">
            <h2 className="text-xl font-semibold mb-4">Sản phẩm tương tự</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {products.map((p) => (
                    <CardProduct key={p._id} data={p} />
                ))}
            </div>
        </div>
    );
};

export default SimilarProducts;
