import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

const PublicRoute = ({ children }) => {
    const user = useSelector((state) => state.user);

    // Nếu đã login thì chuyển hướng về home/dashboard
    if (user._id) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default PublicRoute;
