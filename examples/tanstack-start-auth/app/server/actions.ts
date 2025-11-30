import { signIn, signOut, signUp } from '@nightmar3/uauth-start/server';
import { createServerFn } from '@tanstack/start';

/**
 * Server action for login
 * Handles form submission server-side using high-level signIn helper
 */
export const loginAction = createServerFn('POST', async (data: { email: string; password: string }) => {
    const result = await signIn(data.email, data.password)

    if (!result.ok) {
        return {
            ok: false,
            error: result.error || 'Login failed',
        }
    }

    return {
        ok: true,
        data: result.user,
        headers: {
            'Set-Cookie': result.setCookieHeaders
        }
    }
})

/**
 * Server action for signup
 * Handles account creation server-side using high-level signUp helper
 */
export const signupAction = createServerFn('POST', async (data: {
    email: string
    password: string
    name: string
}) => {
    const result = await signUp(data)

    if (!result.ok) {
        return {
            ok: false,
            error: result.error || 'Signup failed',
        }
    }

    return {
        ok: true,
        data: result.user,
        headers: {
            'Set-Cookie': result.setCookieHeaders
        }
    }
})

/**
 * Server action for logout
 * Handles session cleanup server-side using high-level signOut helper
 */
export const logoutAction = createServerFn('POST', async () => {
    const result = await signOut()

    return {
        ok: true,
        headers: {
            'Set-Cookie': result.setCookieHeaders
        }
    }
})
