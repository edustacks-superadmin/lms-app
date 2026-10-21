// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

// Create the Auth context
const AuthContext = createContext();

// Hook for consuming the context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState(null);

    // Use refs to track current values (avoids stale closure in auth listener)
    const currentUserIdRef = useRef(null);
    const currentRoleRef = useRef(null);

    // Update refs when state changes
    useEffect(() => {
        currentUserIdRef.current = user?.id;
    }, [user]);

    useEffect(() => {
        currentRoleRef.current = role;
    }, [role]);

    // -------------------------------------------------------------
    // Fetch the role for a given email
    // -------------------------------------------------------------
    const fetchUserRole = async (email) => {
        console.log('fetchUserRole: Starting for', email);
        try {
            const { data, error } = await supabase
                .from('members')
                .select('role')
                .eq('email', email)
                .single();

            if (error) {
                console.error('Error fetching role:', error);
                // Keep default 'student' role on error
            } else if (data?.role) {
                const fetchedRole = data.role.toLowerCase();
                setRole(fetchedRole);
                console.log('fetchUserRole: Updated role to', fetchedRole);
            }
        } catch (err) {
            console.error('Error in fetchUserRole (catch):', err);
            // Keep default role
        }
        console.log('fetchUserRole: Finished for', email);
    };

    // -------------------------------------------------------------
    // Initialise auth on mount and set up listener for changes
    // -------------------------------------------------------------
    useEffect(() => {
        let isMounted = true;

        const initializeAuth = async () => {
            console.log('========================================');
            console.log('AuthContext: initializeAuth started');
            console.log('AuthContext: Checking localStorage for session...');

            // Check if there's a session in localStorage
            const storedSession = localStorage.getItem('sb-xalbtjoykovnlbjeddtv-auth-token');
            console.log('AuthContext: localStorage session exists:', !!storedSession);

            try {
                // Get the current session
                const { data: { session }, error } = await supabase.auth.getSession();

                console.log('AuthContext: getSession result:', {
                    hasSession: !!session,
                    hasUser: !!session?.user,
                    userEmail: session?.user?.email,
                    error: error?.message
                });

                if (error) {
                    console.error('❌ Error getting session:', error);
                    if (isMounted) {
                        setSession(null);
                        setUser(null);
                        setRole(null);
                        setLoading(false);
                    }
                    return;
                }

                if (!isMounted) {
                    console.log('⚠️ Component unmounted, skipping state updates');
                    return;
                }

                console.log('✅ Session found:', session ? 'Yes' : 'No');
                setSession(session);
                setUser(session?.user ?? null);

                // On INITIAL load: Wait for role before showing UI (prevents login page flash)
                if (session?.user) {
                    console.log('✅ User session found, fetching role before showing UI');
                    setRole('student'); // Default role

                    // Fetch real role and WAIT for it on initial load
                    await fetchUserRole(session.user.email);

                    // Now set loading to false
                    setLoading(false);
                    console.log('✅ Loading set to false - UI will render with correct role');
                } else {
                    console.log('❌ No session found, clearing user state');
                    setRole(null);
                    setLoading(false);
                }

                console.log('AuthContext: Initialization complete');
                console.log('========================================');
            } catch (err) {
                console.error('❌ Error initializing auth:', err);
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        initializeAuth();

        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!isMounted) return;

                console.log('🔔 Auth state changed:', event, session?.user?.email);

                // Handle different auth events
                if (event === 'SIGNED_OUT') {
                    console.log('👋 User signed out');
                    setSession(null);
                    setUser(null);
                    setRole(null);
                } else if (event === 'TOKEN_REFRESHED') {
                    console.log('🔄 Token refreshed successfully');
                    setSession(session);
                    // Keep existing user and role - don't reset them
                } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
                    console.log('👤 User signed in or updated');
                    setSession(session);
                    const newUser = session?.user ?? null;

                    // Only reset role if this is a genuinely new user (not just a tab focus event)
                    if (newUser && newUser.id !== currentUserIdRef.current) {
                        console.log('🆕 New user detected, fetching role');
                        setUser(newUser);
                        setRole('student'); // Fast UI for new user
                        fetchUserRole(newUser.email); // Fetch in background
                    } else if (newUser && !currentRoleRef.current) {
                        console.log('👤 Existing user but no role, fetching role');
                        setUser(newUser);
                        setRole('student'); // Fast UI
                        fetchUserRole(newUser.email); // Fetch in background
                    } else {
                        console.log('👤 Existing user with role, keeping current role:', currentRoleRef.current);
                        setUser(newUser);
                        // Keep existing role - don't reset it
                    }
                } else {
                    // Handle other events (INITIAL_SESSION, etc.)
                    console.log('📢 Other auth event:', event);
                    setSession(session);
                    setUser(session?.user ?? null);

                    if (session?.user && !currentRoleRef.current) {
                        setRole('student'); // Fast UI
                        fetchUserRole(session.user.email); // Fetch in background
                    } else if (!session?.user) {
                        setRole(null);
                    }
                    // Otherwise keep existing role
                }
            }
        );

        // Set up periodic session refresh (every 30 minutes)
        const refreshInterval = setInterval(async () => {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) {
                console.error('Error refreshing session:', error);
            } else if (session) {
                console.log('✅ Session checked and valid');
                // If session exists, Supabase will auto-refresh the token if needed
                const { data, error: refreshError } = await supabase.auth.refreshSession();
                if (refreshError) {
                    console.error('Error refreshing token:', refreshError);
                } else {
                    console.log('Token refresh check completed');
                }
            }
        }, 30 * 60 * 1000); // 30 minutes

        // Cleanup on unmount
        return () => {
            isMounted = false;
            subscription.unsubscribe();
            clearInterval(refreshInterval);
        };
    }, []); // Empty deps - only run once on mount

    // -------------------------------------------------------------
    // Sign‑in helper
    // -------------------------------------------------------------
    const signIn = async (email, password) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
            // onAuthStateChange will update user/role automatically
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    };

    // -------------------------------------------------------------
    // Sign‑out helper
    // -------------------------------------------------------------
    const signOut = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            // onAuthStateChange will clear user/role
            return { error: null };
        } catch (error) {
            return { error };
        }
    };

        // -------------------------------------------------------------
    // Password Reset helpers
    // -------------------------------------------------------------
    const sendPasswordResetEmail = async (email) => {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) throw error;
            return { error: null };
        } catch (error) {
            return { error };
        }
    };

    const updateUserPassword = async (newPassword) => {
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });
            if (error) throw error;
            return { error: null };
        } catch (error) {
            return { error };
        }
    };

    const value = {
        user,
        role,
        session,
        loading,
        signIn,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};