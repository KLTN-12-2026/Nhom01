import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    cart: [],
};

const cartSlice = createSlice({
    name: "cartItem",
    initialState,
    reducers: {
        handleAddItemCart: (state, action) => {
            state.cart = [...action.payload];
        },
        removeFromCart: (state, action) => {
            const itemId = action.payload;
            state.cart = state.cart.filter((item) => item._id !== itemId);
        },
        removeSelectedItemsFromCart: (state, action) => {
            const selectedIds = action.payload;
            state.cart = state.cart.filter((item) => !selectedIds.includes(item._id));
        },
        clearCart: (state) => {
            state.cart = [];
        },
        updateCartItemQuantity: (state, action) => {
            const { itemId, newQuantity } = action.payload;
            const item = state.cart.find((item) => item._id === itemId);
            if (item) {
                item.quantity = newQuantity;
            }
        },
    },
});

export const { handleAddItemCart, removeFromCart, removeSelectedItemsFromCart, clearCart, updateCartItemQuantity } = cartSlice.actions;

export default cartSlice.reducer;