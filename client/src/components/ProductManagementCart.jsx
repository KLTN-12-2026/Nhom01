import React, { useState } from 'react';
import EditProductAdmin from './EditProductModel';
import ConfirmBox from './ConfirmBox';
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import successAlert from '../utils/successAlert';
import { DisplayPriceInVND } from '../utils/DisplayPriceInVND';
import ViewImage from './ViewImage';
import { Card, CardContent } from './ui/card';
import GlareHover from './GlareHover';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

const ProductManagementCart = ({ data, fetchProduct }) => {
    const [openEdit, setOpenEdit] = useState(false);
    const [openConfirmBoxDelete, setOpenConfirmBoxDelete] = useState(false);
    const [imageURL, setImageURL] = useState('');

    const handleDeleteProduct = async () => {
        try {
            const response = await Axios({
                ...SummaryApi.delete_product,
                data: {
                    _id: data._id,
                },
            });

            const { data: responseData } = response;

            if (responseData.success) {
                successAlert(responseData.message);
                if (fetchProduct) {
                    fetchProduct();
                }
                setOpenConfirmBoxDelete(false);
            }
        } catch (error) {
            AxiosToastError(error);
        }
    };

    return (
        <Card
            key={data._id}
            className="group rounded-2xl border border-border/80 bg-card hover:border-primary/50 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden relative flex flex-col cursor-pointer"
        >
            <div className="relative overflow-hidden cursor-pointer">
                <img
                    src={data?.image[0]}
                    alt={data?.name}
                    className="w-full h-36 sm:h-44 object-cover rounded-t-2xl transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/placeholder-product.jpg';
                    }}
                    onClick={() => setImageURL(data?.image[0])}
                />
                {!data.stock && (
                    <div className="absolute inset-0 bg-background/70 backdrop-blur-xs flex items-center justify-center">
                        <span className="bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-xs font-semibold shadow-xs">
                            Hết hàng
                        </span>
                    </div>
                )}
                {data.discount > 0 && (
                    <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground font-semibold shadow-xs">
                        -{data.discount}%
                    </Badge>
                )}
            </div>

            <CardContent className="p-3.5 flex-1 flex flex-col justify-between gap-2.5">
                <div className="space-y-1.5">
                    <h3
                        title={data?.name}
                        className="text-foreground font-semibold sm:text-base text-sm line-clamp-2 h-10 sm:h-12"
                    >
                        {data?.name}
                    </h3>
                    <div className="flex flex-wrap gap-1">
                        {data.category.map((cate) => (
                            <Badge
                                key={cate._id || cate.name}
                                variant="outline"
                                className="bg-muted text-foreground/80 border-border/60 text-[11px] py-0 px-2"
                            >
                                {cate.name}
                            </Badge>
                        ))}
                    </div>
                </div>
                <div className="flex py-1 gap-2 text-sm justify-between items-baseline pt-2 border-t border-border/50">
                    <p
                        title={data?.unit}
                        className="text-muted-foreground text-xs line-clamp-1"
                    >
                        {data?.unit}
                    </p>
                    <p className="text-primary font-bold text-sm sm:text-base">
                        {DisplayPriceInVND(data?.price)}
                    </p>
                </div>

                <div className="flex w-full items-center justify-center gap-2 pt-1">
                            <GlareHover
                                background="transparent"
                                glareOpacity={0.3}
                                glareAngle={-30}
                                glareSize={300}
                                transitionDuration={800}
                                playOnce={false}
                                className="flex-1"
                            >
                                <Button
                                    onClick={() => {
                                        setOpenEdit(true);
                                    }}
                                    className="bg-muted-foreground hover:bg-muted-foreground w-full"
                                >
                                    Sửa
                                </Button>
                            </GlareHover>
                            <GlareHover
                                background="transparent"
                                glareOpacity={0.3}
                                glareAngle={-30}
                                glareSize={300}
                                transitionDuration={800}
                                playOnce={false}
                                className="flex-1"
                            >
                                <Button
                                    onClick={() => {
                                        setOpenConfirmBoxDelete(true);
                                    }}
                                    className="bg-foreground w-full"
                                >
                                    Xóa
                                </Button>
                            </GlareHover>
                        </div>
                    </CardContent>

                    {openEdit && (
                        <EditProductAdmin
                            close={() => setOpenEdit(false)}
                            fetchProduct={fetchProduct}
                            data={data}
                        />
                    )}

                    {openConfirmBoxDelete && (
                        <ConfirmBox
                            close={() => setOpenConfirmBoxDelete(false)}
                            cancel={() => setOpenConfirmBoxDelete(false)}
                            confirm={handleDeleteProduct}
                            title="Xác nhận xóa sản phẩm"
                            message="Bạn có chắc chắn muốn xóa sản phẩm này?"
                            cancelText="Hủy"
                            confirmText="Xóa"
                        />
                    )}

                    {imageURL && (
                        <ViewImage url={imageURL} close={() => setImageURL('')} />
                    )}
                </Card>
    );
};

export default ProductManagementCart;
