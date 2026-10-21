/**
 * Utility to check if a course is accessible on the current platform.
 * Supports:
 * - course.platform_availability: { web: boolean, mobile: boolean, desktop: boolean }
 * - course.allowed_platforms: ['web', 'mobile', 'desktop']
 */

export const checkPlatformAccess = (course, currentPlatform = 'web') => {
    if (!course) return { allowed: true };

    let pa = course.platform_availability;
    if (typeof pa === 'string') {
        try {
            pa = JSON.parse(pa);
        } catch (e) {
            pa = null;
        }
    }

    let ap = course.allowed_platforms;
    if (typeof ap === 'string') {
        try {
            ap = JSON.parse(ap);
        } catch (e) {
            ap = [ap];
        }
    }

    if (currentPlatform === 'web') {
        if (pa && typeof pa === 'object') {
            if (pa.web === false) {
                const targets = [];
                if (pa.mobile) targets.push('mobile app');
                if (pa.desktop) targets.push('desktop app');

                let targetDesc = 'mobile app';
                if (targets.length === 1) {
                    targetDesc = targets[0];
                } else if (targets.length > 1) {
                    targetDesc = targets.join(' or ');
                }

                return {
                    allowed: false,
                    message: `This course is only available on ${targetDesc}.`
                };
            }
        } else if (Array.isArray(ap) && ap.length > 0) {
            if (!ap.includes('web')) {
                const targets = [];
                if (ap.includes('mobile')) targets.push('mobile app');
                if (ap.includes('desktop')) targets.push('desktop app');

                let targetDesc = 'mobile app';
                if (targets.length === 1) {
                    targetDesc = targets[0];
                } else if (targets.length > 1) {
                    targetDesc = targets.join(' or ');
                }

                return {
                    allowed: false,
                    message: `This course is only available on ${targetDesc}.`
                };
            }
        }
    }

    return { allowed: true };
};
