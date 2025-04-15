"use client";

import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";
import { Menu, X, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import UserDropdown from "@/components/shared/UserDropDown";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUserStore } from "@/store/userStore";

enum Role {
  user = "USER",
  admin = "ADMIN",
}

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useUserStore();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tokenLoaded, setTokenLoaded] = useState(false); 

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("access_token");
      setAccessToken(storedToken);
      setTokenLoaded(true); 
    }
  }, []);

  useEffect(() => {
    if (tokenLoaded && !accessToken) {
      router.push("/signin");
    }
  }, [accessToken, tokenLoaded, router]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const menuVariants = {
    open: {
      opacity: 1,
      height: "auto",
      transition: { type: "spring", stiffness: 300, damping: 30 },
    },
    closed: {
      opacity: 0,
      height: 0,
      transition: { type: "spring", stiffness: 300, damping: 30 },
    },
  };

  return (
    <nav className="z-50 sticky top-0 bg-white dark:bg-gray-800 shadow-md">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-gray-800 dark:text-white">
            Radio Station
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {!accessToken ? (
              <>
                <Link
                  href="/signin"
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors duration-300"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors duration-300"
                >
                  Sign Up
                </Link>
              </>
            ) : null}
            {user?.role === Role.admin && (
              <Link href="/admin">
                <button className="flex items-center space-x-2 bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-full cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600">
                  <span className="font-medium text-gray-800 dark:text-white">
                    Admin Dashboard
                  </span>
                </button>
              </Link>
            )}
            <UserDropdown />
            <motion.button
              onClick={toggleTheme}
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
            >
              {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
            </motion.button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-4">
            <motion.button
              onClick={toggleTheme}
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              whileTap={{ scale: 0.95 }}
            >
              {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
            </motion.button>
            <button
              onClick={toggleMenu}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6 text-gray-600 dark:text-gray-300" />
              ) : (
                <Menu className="h-6 w-6 text-gray-600 dark:text-gray-300" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial="closed"
              animate="open"
              exit="closed"
              variants={menuVariants}
              className="md:hidden overflow-hidden"
            >
              <div className="py-4 flex items-end justify-end flex-col space-y-4">
                {!accessToken ? (
                  <div className="space-y-2">
                    <Link
                      href="/signin"
                      className="block px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-300"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      className="block px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-300"
                    >
                      Sign Up
                    </Link>
                  </div>
                ) : null}
                {user?.role === Role.admin && (
                  <Link href="/admin" className="block">
                    <button className="text-left px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600">
                      <span className="font-medium text-gray-800 dark:text-white">
                        Admin Dashboard
                      </span>
                    </button>
                  </Link>
                )}
                <div className="px-4">
                  <UserDropdown />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

export default Navbar;