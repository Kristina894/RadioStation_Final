"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import axios from "axios"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input" // Assuming you have Shadcn Input component
import { cn } from "@/lib/utils" // Assuming you have a utility function for classnames
import { BACKEND_URL } from "@/constants/constans"

export default function VerifyOTP({ forgotPass = false }: { forgotPass: boolean }) {
  const [otp, setOtp] = useState(["", "", "", ""])
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const inputRefs = useRef<HTMLInputElement[]>([]) // Ref to store input elements

  useEffect(() => {
    // Focus on the first input when the component mounts
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index: number, value: string) => {
    if (value.length <= 1 && !isNaN(Number(value))) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      if (value !== "" && index < 3) {
        // Focus on the next input
        inputRefs.current[index + 1]?.focus();
      }
    } else if (value.length > 1) {
      // Handle pasting multiple digits
      const pastedDigits = value.split("").slice(0, 4); // Limit to 4 digits
      const newOtp = [...otp];
      pastedDigits.forEach((digit, i) => {
        if (i < 4 && !isNaN(Number(digit))) {
          newOtp[i] = digit;
        }
      });
      setOtp(newOtp);

      // Focus on the last input after pasting
      inputRefs.current[3]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && otp[index] === "" && index > 0) {
      // Move focus to the previous input on backspace
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const enteredOtp = otp.join("")
    const email = localStorage.getItem("email")

    try {
      const response = await axios.put(`${BACKEND_URL}/auth/verifyotp`, {
        email,
        otp: enteredOtp,
      })

      localStorage.removeItem("email")
      localStorage.setItem("access_token", response.data.access_token)

      if (response.status === 200) {
        toast.success("OTP Verified Successfully! Redirecting...")
        if (!forgotPass) {
          router.push("/")
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Invalid OTP! Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800 dark:text-white">Verify OTP</h1>
      <motion.form
        onSubmit={handleSubmit}
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-center space-x-4">
          {otp.map((digit, index) => (
            <Input
              key={index}
              id={`otp-${index}`}
              type="text"
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              maxLength={1}
              className={cn(
                "w-12 h-12 text-center text-2xl rounded-md focus:outline-none",
                "dark:bg-gray-700 dark:text-white",
                "border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-popover file:text-popover-foreground file:focus:ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",  // Apply Shadcn Input styles (adjust as needed)
              )}
              inputMode="numeric" // For mobile keyboards
              pattern="[0-9]*"
              ref={(el: any) => (inputRefs.current[index] = el!)}
            />
          ))}
        </div>
        <motion.button
          type="submit"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {loading ? "Verifying..." : "Verify OTP"}
        </motion.button>
      </motion.form>
    </div>
  )
}
