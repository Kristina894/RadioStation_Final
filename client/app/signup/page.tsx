"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import * as Yup from "yup"
import axios from "axios"
import signupPic from "@/public/signup.jpg"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BACKEND_URL } from "@/constants/constans"

enum Role {
  user = "USER",
  admin = "ADMIN"
}

const validationSchema = Yup.object({
  firstname: Yup.string().required("First name is required"),
  lastname: Yup.string().required("Last name is required"),
  email: Yup.string().email("Invalid email format").required("Email is required"),
  password: Yup.string()
    .min(4, "Password must be at least 4 characters long")
    .max(40, "Password must be less than 40 characters")
    .matches(/[a-z]/, "Must contain at least one lowercase letter")
    .matches(/[A-Z]/, "Must contain at least one uppercase letter")
    .matches(/\d/, "Must contain at least one number")
    .matches(/[^a-zA-Z0-9]/, "Must contain at least one special character")
    .required("Password is required"),
  role: Yup.string().oneOf(Object.values(Role), "Invalid role").required("Role is required"),
})

export default function SignUp() {
  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    email: "",
    password: "",
    role: Role.user, // Default role
  })


  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const router = useRouter()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prevData) => ({ ...prevData, [name]: value }))
  }

  const handleRoleChange = (value: string) => {
    setFormData((prevData) => ({ ...prevData, role: value as Role }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      await validationSchema.validate(formData, { abortEarly: false })
      setErrors({})
      const { firstname, lastname, email, password, role } = formData
      const response = await axios.post(`${BACKEND_URL}/auth/signup`, {
        firstName: firstname,
        lastName: lastname,
        email,
        password,
        role,
      })

      if (response.status === 201) {
        localStorage.setItem("email", email)
        toast.success("Signup successful! Redirecting...")
        router.push("/verify-otp")
      }
    } catch (error: unknown) {
      if (error instanceof Yup.ValidationError) {
        const errorMessages: { [key: string]: string } = {}
        error.inner.forEach((err) => {
          if (err.path) errorMessages[err.path] = err.message
        })
        setErrors(errorMessages)
      } else {
        if (error instanceof Error) {
          console.log(error);
        } else {
          toast.error("Something went wrong!")
        }

      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-100 dark:bg-gray-900">
      <div className="md:flex-1 relative hidden md:block">
        <Image src={signupPic} alt="Sign Up" layout="fill" objectFit="cover" className="opacity-50" />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="text-black dark:text-white text-center">
            <h2 className="text-4xl font-bold mb-4">Join Our Community</h2>
            <p className="text-xl">Start your journey with us today!</p>
          </motion.div>
        </div>
      </div>

      <div className="md:flex-1 flex items-center justify-center lg:p-8">
        <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-3xl font-bold mb-6 text-center text-gray-800 dark:text-white">Create an Account</h1>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
                <div className="w-full">
                  <Label htmlFor="firstname" className="dark:text-gray-200">First Name</Label>
                  <Input id="firstname" name="firstname" value={formData.firstname} required onChange={handleInputChange} placeholder="" className="border-gray-300 dark:border-gray-600 bg-transparent dark:text-white" />
                  {errors.firstname && <p className="text-red-500 text-sm">{errors.firstname}</p>}
                </div>
                <div className="w-full">
                  <Label htmlFor="lastname" className="dark:text-gray-200">Last Name</Label>
                  <Input id="lastname" name="lastname" value={formData.lastname} onChange={handleInputChange} placeholder="" className="border-gray-300 dark:border-gray-600 bg-transparent dark:text-white" />
                  {errors.lastname && <p className="text-red-500 text-sm">{errors.lastname}</p>}
                </div>
              </div>

              <div>
                <Label htmlFor="email" className="dark:text-gray-200">Email Address</Label>
                <Input id="email" name="email" value={formData.email} required onChange={handleInputChange} type="email" className="border-gray-300 dark:border-gray-600 bg-transparent dark:text-white" />
                {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
              </div>

              <div>
                <Label htmlFor="password" className="dark:text-gray-200">Password</Label>
                <Input id="password" name="password" value={formData.password} onChange={handleInputChange} required placeholder="" type="password" className="border-gray-300 dark:border-gray-600 bg-transparent dark:text-white" />
                {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
              </div>

              <div>
                <Label htmlFor="role" className="dark:text-gray-200">Role</Label>
                <Select onValueChange={handleRoleChange}>
                  <SelectTrigger className="w-full border-gray-300 dark:border-gray-600 bg-transparent dark:text-white">
                    <SelectValue placeholder="Select a role" defaultValue={Role.user} />
                  </SelectTrigger>
                  <SelectContent
                    className="bg-black"
                  >
                    <SelectItem className="" value={Role.user}>User</SelectItem>
                    <SelectItem value={Role.admin}>Admin</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && <p className="text-red-500 text-sm">{errors.role}</p>}
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-400 text-white dark:text-black">
                {loading ? <Loader2 className="animate-spin mx-auto" /> : "Sign Up"}
              </Button>
            </form>

            <p className="mt-4 text-center text-gray-600 dark:text-gray-400">
              Already have an account?{" "}
              <Link href="/signin" className="text-blue-600 dark:text-blue-400 hover:underline">
                Sign In
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
