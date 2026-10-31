import { useCallback, useEffect, useRef, useState } from 'react';
export function useWorkflowData(loader, enabled = true) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const generation = useRef(0);
    const reload = useCallback(async (quiet = false) => {
        if (!enabled) return;
        const current = ++generation.current;
        if (!quiet) setLoading(true);
        try {
            const value = await loader();
            if (current === generation.current) { setData(value); setError(''); }
        } catch (err) {
            if (current === generation.current) setError(err?.response?.data?.message || 'Không thể tải dữ liệu');
        } finally { if (current === generation.current) setLoading(false); }
    }, [loader, enabled]);
    useEffect(() => {
        reload();
        const timer = setInterval(() => { if (!document.hidden) reload(true); }, 30000);
        const invalidate = () => { generation.current++; };
        return () => { clearInterval(timer); invalidate(); };
    }, [reload]);
    return { data, loading, error, reload };
}
