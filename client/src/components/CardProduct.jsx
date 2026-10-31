import React from 'react';
import ProductCard from './product/product-card';

const CardProduct = ({ data }) => {
    if (!data) return null;
    return <ProductCard data={data} />;
};

export default CardProduct;
