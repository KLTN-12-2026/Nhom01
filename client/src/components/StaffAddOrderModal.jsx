import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, Trash2, Search, Utensils, ShoppingBag, X } from 'lucide-react';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';

export default function StaffAddOrderModal({ open, onClose, defaultTableNumber = '', onOrderAdded }) {
    const [tableNumber, setTableNumber] = useState(defaultTableNumber);
    const [tables, setTables] = useState([]);
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [categories, setCategories] = useState([]);
    const [cart, setCart] = useState([]); // [{ product, quantity, notes }]
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (defaultTableNumber) {
            setTableNumber(defaultTableNumber);
        }
    }, [defaultTableNumber]);

    // Fetch tables & products
    useEffect(() => {
        if (!open) return;

        const loadData = async () => {
            try {
                // Fetch tables
                const tableRes = await Axios({ ...SummaryApi.get_tables });
                if (tableRes.data.success) {
                    setTables(tableRes.data.data || []);
                }

                // Fetch categories
                const catRes = await Axios({ ...SummaryApi.get_category });
                if (catRes.data.success) {
                    setCategories(catRes.data.data || []);
                }

                // Fetch products
                const prodRes = await Axios({ ...SummaryApi.get_product, data: { page: 1, limit: 120 } });
                if (prodRes.data.success) {
                    setProducts(prodRes.data.data || []);
                }
            } catch (err) {
                console.error('Error loading data for modal:', err);
            }
        };
        loadData();
    }, [open]);

    const addToCart = (product) => {
        setCart((prev) => {
            const existing = prev.find((item) => item.product._id === product._id);
            if (existing) {
                return prev.map((item) =>
                    item.product._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
                );
            } else {
                return [...prev, { product, quantity: 1, notes: '' }];
            }
        });
    };

    const updateQuantity = (productId, delta) => {
        setCart((prev) =>
            prev
                .map((item) => {
                    if (item.product._id === productId) {
                        const newQty = item.quantity + delta;
                        return newQty > 0 ? { ...item, quantity: newQty } : null;
                    }
                    return item;
                })
                .filter(Boolean)
        );
    };

    const updateNotes = (productId, notes) => {
        setCart((prev) =>
            prev.map((item) => (item.product._id === productId ? { ...item, notes } : item))
        );
    };

    const removeItem = (productId) => {
        setCart((prev) => prev.filter((item) => item.product._id !== productId));
    };

    const totalAmount = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!tableNumber.trim()) {
            toast.error('Vui lòng chọn hoặc nhập số bàn');
            return;
        }

        if (cart.length === 0) {
            toast.error('Vui lòng chọn ít nhất 1 món ăn');
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                tableNumber: tableNumber.trim().toUpperCase(),
                items: cart.map((item) => ({
                    productId: item.product._id,
                    quantity: item.quantity,
                    notes: item.notes,
                })),
            };

            const res = await Axios({
                ...SummaryApi.staff_add_items_to_table_order,
                data: payload,
            });

            if (res.data.success) {
                toast.success(`Đã thêm món vào Bàn ${tableNumber.toUpperCase()} thành công!`);
                setCart([]);
                onOrderAdded && onOrderAdded();
                onClose();
            }
        } catch (error) {
            console.error('Error adding table order:', error);
            toast.error(error.response?.data?.message || 'Không thể thêm món cho bàn');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredProducts = products.filter((p) => {
        const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase());
        const matchCat =
            selectedCategory === 'ALL' ||
            p.category?.some((c) => (c._id || c) === selectedCategory);
        return matchSearch && matchCat;
    });

    const getCartItemCount = (productId) => {
        const found = cart.find((i) => i.product._id === productId);
        return found ? found.quantity : 0;
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-6 overflow-hidden">
                <DialogHeader className="pb-2 border-b border-border">
                    <DialogTitle className="text-xl font-black flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600">
                            <Utensils className="h-5 w-5" />
                        </span>
                        Đặt Món / Thêm Món Cho Khách Tại Bàn
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Nhân viên chọn bàn ăn, duyệt danh mục món và thêm trực tiếp vào hệ thống gọi món nhà hàng
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 overflow-hidden mt-3">
                    {/* Left: Product Selection */}
                    <div className="md:col-span-7 flex flex-col gap-3 overflow-hidden">
                        {/* Table Selector Box */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-muted/40 p-3 rounded-xl border border-border">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase text-muted-foreground whitespace-nowrap">
                                    Số Bàn:
                                </span>
                                <Input
                                    value={tableNumber}
                                    onChange={(e) => setTableNumber(e.target.value)}
                                    placeholder="VD: 01, A2..."
                                    className="h-9 w-28 font-black text-orange-600 uppercase text-center text-sm"
                                />
                            </div>

                            {tables.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-1 overflow-x-auto scrollbar-hide py-0.5">
                                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">Nhanh:</span>
                                    {tables.slice(0, 8).map((t) => (
                                        <button
                                            key={t._id}
                                            type="button"
                                            onClick={() => setTableNumber(t.tableNumber)}
                                            className={`text-[11px] px-2.5 py-1 rounded-md font-bold whitespace-nowrap transition-colors ${
                                                tableNumber === t.tableNumber
                                                    ? 'bg-orange-600 text-white'
                                                    : 'bg-card hover:bg-muted text-foreground border border-border'
                                            }`}
                                        >
                                            Bàn {t.tableNumber}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Search and Category Filter */}
                        <div className="space-y-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Tìm kiếm theo tên món ăn..."
                                    className="pl-9 h-9 text-xs rounded-xl"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => setSearch('')}
                                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {/* Category horizontal pills */}
                            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1">
                                <button
                                    type="button"
                                    onClick={() => setSelectedCategory('ALL')}
                                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                                        selectedCategory === 'ALL'
                                            ? 'bg-foreground text-background shadow-sm'
                                            : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    Tất cả
                                </button>
                                {categories.map((c) => (
                                    <button
                                        key={c._id}
                                        type="button"
                                        onClick={() => setSelectedCategory(c._id)}
                                        className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                                            selectedCategory === c._id
                                                ? 'bg-foreground text-background shadow-sm'
                                                : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        {c.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Products Grid */}
                        <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2.5 pr-1 max-h-[360px]">
                            {filteredProducts.length === 0 ? (
                                <div className="col-span-2 py-12 text-center text-xs text-muted-foreground">
                                    Không tìm thấy món ăn phù hợp
                                </div>
                            ) : (
                                filteredProducts.map((product) => {
                                    const inCartCount = getCartItemCount(product._id);
                                    return (
                                        <div
                                            key={product._id}
                                            onClick={() => addToCart(product)}
                                            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between relative group ${
                                                inCartCount > 0
                                                    ? 'border-orange-500 bg-orange-500/5'
                                                    : 'border-border bg-card hover:border-orange-500/50 hover:bg-muted/30'
                                            }`}
                                        >
                                            {inCartCount > 0 && (
                                                <span className="absolute top-1.5 right-1.5 bg-orange-600 text-white text-[10px] font-black h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center shadow">
                                                    {inCartCount}
                                                </span>
                                            )}

                                            <div className="flex gap-2.5">
                                                {product.image?.[0] ? (
                                                    <img
                                                        src={product.image[0]}
                                                        alt={product.name}
                                                        className="w-12 h-12 rounded-lg object-cover border border-border shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-sm shrink-0">
                                                        🍲
                                                    </div>
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-xs font-bold truncate text-foreground" title={product.name}>
                                                        {product.name}
                                                    </h4>
                                                    <div className="text-xs font-extrabold text-orange-600 mt-1">
                                                        {product.price?.toLocaleString('vi-VN')} đ
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-2 flex items-center justify-between pt-1 border-t border-border/50 text-[11px]">
                                                <span className="text-muted-foreground text-[10px]">
                                                    {product.unit || 'Phần'}
                                                </span>
                                                <span className="text-orange-600 font-bold flex items-center gap-0.5">
                                                    <Plus size={12} /> Thêm
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right: Cart Review */}
                    <div className="md:col-span-5 flex flex-col justify-between border-t md:border-t-0 md:border-l border-border md:pl-5 overflow-hidden">
                        <div className="space-y-3 overflow-hidden flex flex-col flex-1">
                            <div className="flex items-center justify-between pb-2 border-b border-border">
                                <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                    <ShoppingBag size={15} className="text-orange-600" />
                                    Đơn món: <strong className="text-orange-600">Bàn {tableNumber || '---'}</strong>
                                </span>
                                <Badge variant="secondary" className="text-xs font-bold">
                                    {cart.length} món
                                </Badge>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[300px]">
                                {cart.length === 0 ? (
                                    <div className="py-20 text-center text-xs text-muted-foreground space-y-2">
                                        <Utensils className="mx-auto h-8 w-8 text-muted-foreground/30" />
                                        <p>Chưa chọn món nào.</p>
                                        <p className="text-[11px]">Bấm vào các món bên trái để thêm vào đơn của bàn.</p>
                                    </div>
                                ) : (
                                    cart.map((item) => (
                                        <div
                                            key={item.product._id}
                                            className="p-3 rounded-xl border border-border bg-card space-y-2 text-xs shadow-sm"
                                        >
                                            <div className="flex justify-between items-start gap-2">
                                                <span className="font-bold text-foreground line-clamp-1">
                                                    {item.product.name}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(item.product._id)}
                                                    className="text-muted-foreground hover:text-destructive p-0.5"
                                                    title="Xóa món này"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <span className="text-muted-foreground font-semibold">
                                                    {(item.product.price * item.quantity).toLocaleString('vi-VN')} đ
                                                </span>

                                                <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 border border-border">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateQuantity(item.product._id, -1)}
                                                        className="h-6 w-6 rounded flex items-center justify-center hover:bg-background text-foreground transition-colors"
                                                    >
                                                        <Minus size={11} />
                                                    </button>
                                                    <span className="font-black px-1.5 text-foreground min-w-[20px] text-center">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateQuantity(item.product._id, 1)}
                                                        className="h-6 w-6 rounded flex items-center justify-center hover:bg-background text-foreground transition-colors"
                                                    >
                                                        <Plus size={11} />
                                                    </button>
                                                </div>
                                            </div>

                                            <Input
                                                value={item.notes}
                                                onChange={(e) => updateNotes(item.product._id, e.target.value)}
                                                placeholder="Ghi chú bếp (ít cay, không đường, làm nhanh...)"
                                                className="h-7 text-[11px] rounded-lg"
                                            />
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Order Summary & Submit Button */}
                        <div className="pt-3 border-t border-border space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-semibold text-muted-foreground">Tổng cộng tiền món:</span>
                                <span className="font-black text-xl text-orange-600">
                                    {totalAmount.toLocaleString('vi-VN')} đ
                                </span>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 h-10 font-semibold text-xs"
                                >
                                    Đóng
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={submitting || cart.length === 0 || !tableNumber.trim()}
                                    className="flex-1 h-10 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md shadow-orange-600/20"
                                >
                                    {submitting ? 'Đang gửi vào bếp…' : 'Xác nhận gọi món'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}