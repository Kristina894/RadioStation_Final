"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useUserStore } from "@/store/userStore"
import { LogOut } from "lucide-react"
import Link from "next/link"

export default function UserDropdown() {
    const [open, setOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const { user, clearUser } = useUserStore()

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [])

    if (!user) return null

    return (
        <div className="relative" ref={dropdownRef}>
            {/* User Avatar Button */}
            <button
                onClick={() => setOpen((prev) => !prev)}
                className="flex items-center space-x-2 bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-full cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600"
            >
                <span className="font-medium text-gray-800 dark:text-white">{user.firstName}</span>
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className=" block lg:absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 shadow-lg rounded-lg border dark:border-gray-700 p-4"
                    >
                        <p className="text-gray-700 dark:text-gray-200 font-semibold">{user.firstName} {user.lastName}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                        <hr className="my-2 border-gray-300 dark:border-gray-600" />
                        <button
                            onClick={() => {
                                clearUser()
                                localStorage.removeItem("access_token")
                                setOpen(false)
                            }}
                            className="flex items-center justify-center w-full text-sm text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-700 px-4 py-2 rounded-md"
                        >
                            <LogOut className="mr-2 w-4 h-4" />
                            <Link onClick={() => {
                                window.location.reload()
                            }} href={`/signin`}>
                                Logout
                            </Link>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
