'use client';

import { useState } from 'react';
import axios from 'axios';
import { z } from 'zod';
import { BACKEND_URL } from '@/constants/constans';
import { useRouter } from 'next/navigation';
const emailSchema = z.object({
    email: z.string().email({ message: 'Invalid email address' }),
});

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const router = useRouter()
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setStatus('');

        const validation = emailSchema.safeParse({ email });
        if (!validation.success) {
            setError(validation.error.errors[0].message);
            return;
        }

        setLoading(true);
        try {
            const response = await axios.put(`${BACKEND_URL}/auth/forgotPassword`, {
                email,
            });

            localStorage.setItem('email', email);
            router.push('/forgotpassword/verifyotp')
        } catch (err: any) {
            const msg =
                err.response?.data?.message || 'Something went wrong. Please try again.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center h-[50vh] ">
            <form
                onSubmit={handleSubmit}
                className=" p-8 rounded-2xl shadow-xl w-full max-w-md"
            >
                <h2 className="text-2xl font-bold mb-6 text-center">Forgot Password</h2>

                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                    Email Address
                </label>
                <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-4 py-2 mb-2 border rounded-lg focus:outline-none focus:ring-2 ${error ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                        }`}
                    placeholder="Enter your email"
                />
                {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition duration-200 disabled:opacity-50"
                    disabled={loading}
                >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                </button>

                {status && (
                    <p className="mt-4 text-center text-green-600 text-sm">{status}</p>
                )}
            </form>
        </div>
    );
}
