import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Axios from './../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import AxiosToastError from './../utils/AxiosToastError';
import { updatedAvatar } from '../store/userSlice';
import { IoClose } from 'react-icons/io5';
import Loading from './Loading';
import defaultAvatar from '../assets/defaultAvatar.png';

const UserProfileAvatarEdit = ({ close }) => {
    const user = useSelector((state) => state.user);
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);

    const handleUploadAvatarImage = async (e) => {
        const file = e.target.files[0];

        if (!file) {
            return;
        }

        const formData = new FormData();
        formData.append('avatar', file);

        try {
            setLoading(true);
            const response = await Axios({
                ...SummaryApi.upload_avatar,
                data: formData,
            });

            const { data: responseData } = response;
            dispatch(updatedAvatar(responseData.data.avatar));
        } catch (error) {
            AxiosToastError(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section
            onClick={close}
            className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 p-4 flex items-center justify-center"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-card border border-border/80 text-foreground rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transition-all duration-300"
            >
                {/* Header */}
                <div className="border-b border-border/60 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base sm:text-lg font-bold text-highlight font-display">
                            Cập nhật ảnh đại diện
                        </h3>
                        <button
                            onClick={close}
                            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            aria-label="Đóng"
                        >
                            <IoClose size={20} />
                        </button>
                    </div>
                </div>

                {/* Avatar Preview */}
                <div className="p-6 flex flex-col items-center gap-4">
                    <div className="relative">
                        <div
                            className="sm:w-32 sm:h-32 w-28 h-28 rounded-full overflow-hidden border-4 border-primary/20 shadow-md"
                        >
                            <img
                                src={user.avatar || defaultAvatar}
                                alt={user.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        {loading && (
                            <div className="absolute inset-0 bg-background/60 backdrop-blur-xs rounded-full flex items-center justify-center">
                                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                    </div>

                    <p className="text-sm sm:text-base text-foreground font-medium text-center">
                        Tải lên ảnh đại diện mới của bạn
                    </p>

                    <label
                        htmlFor="uploadProfile"
                        className="inline-flex items-center px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl
                    transition-all cursor-pointer shadow-xs gap-2 mt-2 text-sm hover:scale-[1.01] active:scale-[0.99]"
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                        </svg>
                        {loading ? 'Đang tải lên...' : 'Chọn ảnh mới'}
                        <input
                            onChange={handleUploadAvatarImage}
                            type="file"
                            accept="image/*"
                            id="uploadProfile"
                            className="hidden"
                            disabled={loading}
                        />
                    </label>

                    <p className="text-xs text-muted-foreground text-center">
                        Định dạng: JPG, PNG (tối đa 5MB)
                    </p>
                </div>

                {/* Footer */}
                <div className="bg-card px-6 py-3.5 border-t border-border/60 flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={close}
                        className="px-5 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-xl
                    transition-colors border border-border/80"
                        disabled={loading}
                    >
                        Hủy
                    </button>
                </div>
            </div>
        </section>
    );
};

export default UserProfileAvatarEdit;
