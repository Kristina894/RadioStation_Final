"use client";

import { useState, useEffect, FormEvent } from "react";
import { HoverEffect } from "@/components/ui/card-hover-effect";
import { BACKEND_URL } from "@/constants/constans";
import { toast } from "sonner";

interface ApprovalRequest {
  id: string;
  bookingId?: string | null;
  stationId: string;
  adminId: string;
  approvalStatus: string;
  reviewDate: string;
}

interface Station {
  id: string;
  stationName: string;
  location: string;
  contactEmail: string;
  contactPhone: string;
  description: string;
  adminApprovalRequests?: ApprovalRequest[];
  // Optionally, add properties like rjs, advertisementSlots, bookings if needed.
}

interface StationForm {
  stationName: string;
  location: string;
  contactEmail: string;
  contactPhone: string;
  description: string;
}

export function CardHover() {
  const [stations, setStations] = useState<Station[]>([]);
  const [pendingStations, setPendingStations] = useState<Station[]>([]);
  const [newStationForm, setNewStationForm] = useState<StationForm>({
    stationName: "",
    location: "",
    contactEmail: "",
    contactPhone: "",
    description: "",
  });
  const [editingStationId, setEditingStationId] = useState<string | null>(null);
  const [refresh, setRefresh] = useState<boolean>(false);

  // Fetch all stations
  async function fetchStations() {
    const token = localStorage.getItem("access_token");
    if (!token) {
      console.error("No access token found");
      return;
    }
    try {
      const response = await fetch(`${BACKEND_URL}/stations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch stations");
      const data = await response.json();
      const stationsArray: Station[] = Array.isArray(data) ? data : [data];
      setStations(stationsArray);
    } catch (error) {
      console.error("Error fetching stations:", error);
      toast.error("Error fetching stations");
    }
  }

  // Fetch pending approval stations
  async function fetchPendingStations() {
    const token = localStorage.getItem("access_token");
    if (!token) {
      console.error("No access token found");
      return;
    }
    try {
      const response = await fetch(`${BACKEND_URL}/stations/approvalPendingStations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch pending stations");
      const data = await response.json();
      const pendingArray: Station[] = Array.isArray(data) ? data : [data];
      setPendingStations(pendingArray);
    } catch (error) {
      console.error("Error fetching pending stations:", error);
      toast.error("Error fetching pending stations");
    }
  }

  useEffect(() => {
    fetchStations();
    fetchPendingStations();
  }, [refresh]);

  // Create or update a station
  async function submitStation(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = localStorage.getItem("access_token");
    if (!token) {
      console.error("No access token found");
      return;
    }
    try {
      let response;
      if (editingStationId) {
        // Update station (PATCH)
        response = await fetch(`${BACKEND_URL}/stations/${editingStationId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(newStationForm),
        });
      } else {
        // Create new station (POST)
        response = await fetch(`${BACKEND_URL}/stations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(newStationForm),
        });
      }
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Operation failed");
      }
      toast.success(editingStationId ? "Station updated successfully!" : "Station created successfully!");
      setNewStationForm({
        stationName: "",
        location: "",
        contactEmail: "",
        contactPhone: "",
        description: "",
      });
      setEditingStationId(null);
      setRefresh((prev) => !prev);
    } catch (error) {
      console.error("Error submitting station:", error);
      toast.error(error instanceof Error ? error.message : "Operation failed");
    }
  }

  // Delete a station
  async function deleteStation(stationId: string) {
    const token = localStorage.getItem("access_token");
    if (!token) {
      console.error("No access token found");
      return;
    }
    try {
      const response = await fetch(`${BACKEND_URL}/stations/${stationId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete station");
      }
      toast.success("Station deleted successfully!");
      setRefresh((prev) => !prev);
    } catch (error) {
      console.error("Error deleting station:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete station");
    }
  }

  // Approve or reject a pending station using its adminApprovalRequest id
  async function handleApproval(requestId: string, approvalStatus: "APPROVED" | "REJECTED") {
    const token = localStorage.getItem("access_token");
    if (!token) {
      console.error("No access token found");
      return;
    }
    try {
      const response = await fetch(`${BACKEND_URL}/stations/approve/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ approvalStatus }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update approval status");
      }
      toast.success(`Station ${approvalStatus === "APPROVED" ? "approved" : "rejected"} successfully!`);
      setRefresh((prev) => !prev);
    } catch (error) {
      console.error("Error updating approval status:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update approval status");
    }
  }

  // Handler for editing a station: prefill form with station data
  function handleEditStation(station: Station) {
    setEditingStationId(station.id);
    setNewStationForm({
      stationName: station.stationName,
      location: station.location,
      contactEmail: station.contactEmail,
      contactPhone: station.contactPhone,
      description: station.description,
    });
  }

  return (
    <div className="container mx-auto p-8 space-y-10">
      <h1 className="text-4xl font-bold">Radio Stations Manager</h1>

      {/* Create / Update Station Form */}
      <div className="border p-4 rounded-md space-y-4">
        <h2 className="text-2xl font-semibold">
          {editingStationId ? "Update Radio Station" : "Create New Radio Station"}
        </h2>
        <form onSubmit={submitStation} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Station Name</label>
            <input
              type="text"
              value={newStationForm.stationName}
              onChange={(e) =>
                setNewStationForm({ ...newStationForm, stationName: e.target.value })
              }
              className="mt-1 block w-full border rounded-md p-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Location</label>
            <input
              type="text"
              value={newStationForm.location}
              onChange={(e) =>
                setNewStationForm({ ...newStationForm, location: e.target.value })
              }
              className="mt-1 block w-full border rounded-md p-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Contact Email</label>
            <input
              type="email"
              value={newStationForm.contactEmail}
              onChange={(e) =>
                setNewStationForm({ ...newStationForm, contactEmail: e.target.value })
              }
              className="mt-1 block w-full border rounded-md p-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Contact Phone</label>
            <input
              type="text"
              value={newStationForm.contactPhone}
              onChange={(e) =>
                setNewStationForm({ ...newStationForm, contactPhone: e.target.value })
              }
              className="mt-1 block w-full border rounded-md p-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Description</label>
            <textarea
              value={newStationForm.description}
              onChange={(e) =>
                setNewStationForm({ ...newStationForm, description: e.target.value })
              }
              className="mt-1 block w-full border rounded-md p-2"
              required
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">
            {editingStationId ? "Update Station" : "Create Station"}
          </button>
          {editingStationId && (
            <button
              type="button"
              className="px-4 py-2 bg-gray-600 text-white rounded-md"
              onClick={() => {
                setEditingStationId(null);
                setNewStationForm({
                  stationName: "",
                  location: "",
                  contactEmail: "",
                  contactPhone: "",
                  description: "",
                });
              }}
            >
              Cancel Edit
            </button>
          )}
        </form>
      </div>

      {/* Display All Stations using HoverEffect */}
      <div>
        <h2 className="text-2xl font-semibold">All Radio Stations</h2>
        <HoverEffect
          items={stations.map((station) => ({
            title: station.stationName,
            description: station.description || station.location || "No description available",
            link: `/admin/station/${station.id}`,
          }))}
        />
      </div>

      {/* Manage Stations (Update / Delete) */}
      <div className="border p-4 rounded-md space-y-4">
        <h2 className="text-2xl font-semibold">Manage Stations</h2>
        {stations.length === 0 ? (
          <p>No stations available.</p>
        ) : (
          stations.map((station) => (
            <div
              key={station.id}
              className="border p-4 rounded-md flex flex-col md:flex-row md:items-center md:justify-between"
            >
              <div className="mb-2 md:mb-0">
                <h3 className="text-xl font-semibold">{station.stationName}</h3>
                <p>{station.description || station.location || "No description"}</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEditStation(station)}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-md"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteStation(station.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Display Pending Approval Stations */}
      <div className="border p-4 rounded-md space-y-4">
        <h2 className="text-2xl font-semibold">Approval Pending Stations</h2>
        {pendingStations.length === 0 ? (
          <p>No pending stations.</p>
        ) : (
          pendingStations.map((station) => (
            <div key={station.id} className="border p-4 rounded-md">
              <h3 className="text-xl font-semibold">{station.stationName}</h3>
              <p>{station.description || station.location || "No description"}</p>
              {station.adminApprovalRequests &&
                station.adminApprovalRequests.length > 0 &&
                station.adminApprovalRequests.map((request: ApprovalRequest) => (
                  <div key={request.id} className="flex space-x-2 mt-2">
                    <button
                      onClick={() => handleApproval(request.id, "APPROVED")}
                      className="px-4 py-2 bg-green-600 text-white rounded-md"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleApproval(request.id, "REJECTED")}
                      className="px-4 py-2 bg-red-600 text-white rounded-md"
                    >
                      Reject
                    </button>
                  </div>
                ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
