"use client";

import { useState, useEffect } from "react";
import { HoverEffect } from "@/components/ui/card-hover-effect";
import { BACKEND_URL } from "@/constants/constans";

export function CardHover() {
    const [projects, setProjects] = useState<
        { title: string; description: string; link: string }[]
    >([]);

    useEffect(() => {
        async function fetchStations() {
            try {
                const token = localStorage.getItem("access_token");
                if (!token) {
                    console.error("No access token found");
                    return;
                }

                const response = await fetch(`${BACKEND_URL}/stations`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error("Failed to fetch stations");
                }

                const data = await response.json();

                const stations = Array.isArray(data) ? data : [data];

                const mappedProjects = stations.map((station: any) => ({
                    title: station.stationName,
                    description:
                        station.description || station.location || "No description available",
                    link: `/station/${station.id}`,
                }));

                setProjects(mappedProjects);
            } catch (error) {
                console.error("Error fetching stations:", error);
            }
        }

        fetchStations();
    }, []);

    return (
        <div className=" lg:mx-auto px-8">
            <HoverEffect items={projects} />
        </div>
    );
}
