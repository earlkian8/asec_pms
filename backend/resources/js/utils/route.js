/**
 * Route helper utility
 * Exports the route function from Ziggy
 * 
 * In Laravel with Ziggy, the route function is typically available globally.
 * This utility provides a consistent way to import and use it.
 */

// Access the global route function from Ziggy
// Ziggy makes route available on the window object
const getRoute = () => {
    if (typeof window !== 'undefined' && window.route) {
        return window.route;
    }
    
    // Fallback if route is not available (shouldn't happen in production)
    console.warn('Route helper not found. Make sure Ziggy is properly configured.');
    
    return function(name, params = {}, absolute = true) {
        if (name === undefined) {
            return {
                current: function(check) {
                    if (typeof window === 'undefined') return false;
                    const currentPath = window.location.pathname;
                    
                    if (check) {
                        if (typeof check === 'string') {
                            const pattern = check.replace(/\*/g, '.*');
                            return new RegExp(pattern).test(currentPath);
                        }
                        if (Array.isArray(check)) {
                            return check.some(c => {
                                const pattern = c.replace(/\*/g, '.*');
                                return new RegExp(pattern).test(currentPath);
                            });
                        }
                    }
                    
                    return currentPath;
                }
            };
        }
        
        // Simple fallback URL generation
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        return `${baseUrl}/${name.replace(/\./g, '/')}`;
    };
};

export const route = getRoute();

