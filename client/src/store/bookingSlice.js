import { createSlice } from '@reduxjs/toolkit';

const initialValue = {
    allBooking: [],
    loadingBooking: false,
    customerBookings: [],
};

const bookingSlice = createSlice({
    name: 'booking',
    initialState: initialValue,
    reducers: {
        setAllBooking: (state, action) => {
            state.allBooking = [...action.payload];
        },
        setLoadingBooking: (state, action) => {
            state.loadingBooking = action.payload;
        },
        setCustomerBookings: (state, action) => {
            state.customerBookings = [...action.payload];
        },
    },
});

export const { setAllBooking, setLoadingBooking, setCustomerBookings } = bookingSlice.actions;

export default bookingSlice.reducer;
