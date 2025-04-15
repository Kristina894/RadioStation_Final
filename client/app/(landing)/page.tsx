"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/userStore";
import { CardHover } from "../_components/cards";
import { BACKEND_URL } from "@/constants/constans";

export default function Home() {
  const router = useRouter();
  const { user, setUser } = useUserStore();
  const [token, setToken] = useState<string | null>(null);
  const [tokenLoaded, setTokenLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("access_token");
      setToken(storedToken);
      setTokenLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!tokenLoaded) return;

    if (!token) {
      if (!localStorage.getItem("access_token")) {
        router.push("/signin");
      }
    } else {
      GetUserDetails();
    }
  }, [token, tokenLoaded]);

  async function GetUserDetails() {
    try {
      const res = await axios.get(`${BACKEND_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(res.data);
      setLoading(false);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.log("Unauthorized (401), redirecting to /signin");
        if (!localStorage.getItem("access_token")) {
          router.push("/signin");
        }
        router.push("/signin")
      } else {
        console.error("Error fetching user details:", error);
        setLoading(false);
      }
    }
  }


  if (loading) return <div>Loading...</div>;
  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-6 w-full mx-auto"
    >
      <h1 className="text-xl lg:text-3xl font-bold text-gray-800 dark:text-white mb-6">
        Welcome, {user?.firstName} {user?.lastName}!
      </h1>
      <CardHover />
    </motion.div>
  );
}