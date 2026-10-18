'use client';

import { useAuth } from '../context/AuthContext';

/**
 * Conditional rendering component based on user permissions.
 * 
 * Usage:
 * <Can I="delete" a="courses">
 *   <button>Delete</button>
 * </Can>
 * 
 * Or with fallback:
 * <Can I="delete" a="courses" passThrough>
 *    {(allowed) => <button disabled={!allowed}>Delete</button>}
 * </Can>
 */
const Can = ({ I, a, children, passThrough = false }) => {
    const { checkPermission, loading } = useAuth();

    if (loading) return null; // Or skeleton?

    const allowed = checkPermission(a, I);

    if (passThrough) {
        return typeof children === 'function' ? children(allowed) : children;
    }

    return allowed ? children : null;
};

export default Can;
