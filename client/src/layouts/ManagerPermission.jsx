import React from 'react';
import { useSelector } from 'react-redux';

const ManagerPermission = ({ children }) => {
    const user = useSelector((state) => state.user);

    // Allow MANAGER
    const hasPermission = user?.role === 'MANAGER';

    return (
        <>
            {hasPermission ? (
                children
            ) : (
                <p className="text-red-600 bg-red-100 p-4 rounded">
                    Bạn không có quyền truy cập. Chỉ Quản lý mới có thể
                    truy cập trang này.
                </p>
            )}
        </>
    );
};

export default ManagerPermission;
