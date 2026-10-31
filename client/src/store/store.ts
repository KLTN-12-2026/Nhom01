import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import userReducer from './userSlice';
import productReducer from './productSlice';
import cartReducer from './cartProduct';
import addressReducer from './addressSlice';
import orderReducer from './orderSlice';

// Define the shape of your state
export interface UserState {
    _id: string;
    name: string;
    email: string;
    avatar: string;
    mobile: string;
    verity_email: string;
    last_login_date: string;
    status: string;
    address_details: any[]; // Replace 'any' with actual address type
    shopping_cart: any[]; // Replace 'any' with actual cart item type
    orderHistory: any[]; // Replace 'any' with actual order type
    role: string;
    rewardsPoint: number;
}

// Define other state interfaces (you'll need to fill these in with actual types)
interface ProductState {
    // Add product state properties here
    allCategory: Array<{
        _id: string;
        name: string;
        // Add other category properties
    }>;
    // Add other product state properties
}

interface CartState {
    cart: Array<{
        // Define your cart item structure here
        id: string;
        quantity: number;
        // Add other cart item properties
    }>;
}

interface AddressState {
    // Define your address state here
}

interface OrderState {
    // Define your order state here
}

// Define the root state type
export interface RootState {
    user: UserState;
    product: ProductState;
    cartItem: CartState;
    addresses: AddressState;
    orders: OrderState;
}

// Create the store with type annotations
export const store = configureStore({
    reducer: {
        user: userReducer,
        product: productReducer,
        cartItem: cartReducer,
        addresses: addressReducer,
        orders: orderReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware(),
});

// Export types for use throughout your app
export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<
    ReturnType,
    RootState,
    unknown,
    Action<string>
>;

// Export typed hooks for use in your components
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Export the store as default
export default store;
