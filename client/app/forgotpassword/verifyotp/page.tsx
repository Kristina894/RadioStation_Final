'use client';

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { z } from 'zod';
import { BACKEND_URL } from '@/constants/constans';
import { useRouter } from 'next/navigation';

const otpSchema = z.object({
    otp: z
        .string()
        .length(4, 'OTP must be 4 digits')
        .regex(/^\d{4}$/, 'OTP must be numeric'),
});

export default function OtpVerification() {
    const [otp, setOtp] = useState(['', '', '', '']);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState<string>('');
    const router = useRouter();
    const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedEmail = localStorage.getItem("email");
            if (savedEmail) {
                setEmail(savedEmail);
            }
        }
    }, []);

    const handleChange = (index: number, value: string) => {
        if (!/^\d?$/.test(value)) return;

        const updatedOtp = [...otp];
        updatedOtp[index] = value;
        setOtp(updatedOtp);

        if (value && index < 3) {
            inputsRef.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace') {
            if (otp[index]) {
                const updatedOtp = [...otp];
                updatedOtp[index] = '';
                setOtp(updatedOtp);
            } else if (index > 0) {
                inputsRef.current[index - 1]?.focus();
            }
        }

        if (e.key === 'ArrowLeft' && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }

        if (e.key === 'ArrowRight' && index < 3) {
            inputsRef.current[index + 1]?.focus();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setStatus('');

        const otpCode = otp.join('');
        const validation = otpSchema.safeParse({ otp: otpCode });

        if (!validation.success) {
            setError(validation.error.errors[0].message);
            return;
        }

        setLoading(true);

        try {
            const response = await axios.put(`${BACKEND_URL}/auth/verifyforgotPassotp`, {
                email,
                otp: otpCode,
            });

            setStatus('✅ OTP verified successfully!');
            router.push('/forgotpassword/changepass');
        } catch (err: any) {
            setError(err.response?.data?.message || '❌ Verification failed.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        inputsRef.current[0]?.focus();
    }, []);

    return (
        <div className="flex items-center justify-center my-auto h-[50vh] ">
            <form
                onSubmit={handleSubmit}
                className=" p-8 rounded-2xl shadow-lg w-full max-w-md"
            >
                <h2 className="text-2xl font-bold mb-6 text-center">Enter OTP</h2>

                <div className="flex justify-center space-x-4 mb-4">
                    {otp.map((digit, index) => (
                        <input
                            key={index}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, index)}
                            ref={(el: HTMLInputElement | null) => {
                                inputsRef.current[index] = el;
                            }}
                            className="w-12 h-12 text-center text-lg border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    ))}
                </div>

                {error && <p className="text-sm text-red-600 mb-3 text-center">{error}</p>}
                {status && <p className="text-sm text-green-600 mb-3 text-center">{status}</p>}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition duration-200 disabled:opacity-50"
                >
                    {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
            </form>
        </div>
    );
}
