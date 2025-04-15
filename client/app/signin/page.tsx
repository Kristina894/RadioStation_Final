"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import axios from "axios"
import { toast } from "sonner"
import signinPic from "@/public/signin.jpg"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { BACKEND_URL } from "@/constants/constans"

export default function SignIn() {
    const [formData, setFormData] = useState({ email: "", password: "" })
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleInputChange = (e: any) => {
        const { name, value } = e.target
        setFormData((prevData) => ({ ...prevData, [name]: value }))
    }

    const handleSubmit = async (e: any) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { email, password } = formData
            const response = await axios.post(`${BACKEND_URL}/auth/signin`, {
                email,
                password
            })
            localStorage.removeItem("access_token")
            localStorage.setItem("access_token", response.data.access_token)
            toast.success("Sign in successful! Redirecting...")
            router.push("/")
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Invalid credentials!")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen  flex flex-col md:flex-row">
            <div className="md:flex-1 relative overflow-hidden hidden md:block">
                <Image src={signinPic} alt="Sign In" layout="fill" objectFit="cover" className="opacity-50" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="text-white text-center">
                        <h2 className="text-4xl text-black dark:text-white font-bold mb-4">Welcome Back!</h2>
                        <p className="text-xl text-black dark:text-white">We&apos;re so excited to see you again!</p>
                    </motion.div>
                </div>
            </div>

            <div className="md:flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800 dark:text-white">Sign In</h1>
                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div>
                                <Label htmlFor="email">Email Address</Label>
                                <Input id="email" name="email" value={formData.email} onChange={handleInputChange} type="email" required />
                            </div>
                            <div>
                                <Label htmlFor="password">Password</Label>
                                <Input id="password" name="password" value={formData.password} onChange={handleInputChange} type="password" required />
                            </div>
                            <button type="submit" disabled={loading} className=" w-full bg-blue-500 p-2">
                                {loading ? "Signing in..." : "Sign In"}
                            </button>
                        </form>

                        <div
                        className="my-10"
                        >
                            <p className="mt-4 text-center text-gray-600 dark:text-gray-400">
                                Don&apos;t have an account? {" "}
                                <Link href="/signup" className="bg-blue-500 p-2 dark:text-white rounded-xl">
                                    Sign Up
                                </Link>
                            </p>
                            <p className="mt-4 text-center text-gray-600 dark:text-gray-400">
                                Did you forget your Password?{" "}
                                <br />
                                <Link href="/forgotpassword" className="bg-blue-500  p-2 dark:text-white rounded-xl">
                                    Forgot Password
                                </Link>
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
