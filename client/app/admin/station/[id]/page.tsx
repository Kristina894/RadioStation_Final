"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input'; // Assuming you use Shadcn Input
import { Label } from '@/components/ui/label'; // Assuming you use Shadcn Label
import { Loader2, Edit, Trash2, CalendarClock, Tag, Radio, PlusCircle, Info } from 'lucide-react'; // Import icons

// --- Interfaces based on provided JSON structure ---
interface RJ {
    id: string;
    stationId: string;
    rjName: string;
    showName: string;
    showTiming: string;
    days?: string; // Add optional days field as requested
}

interface AdvertisementSlot {
    id: string;
    stationId: string;
    rjId: string;
    slotTime: string; // Expecting ISO string format
    availabilityStatus: "AVAILABLE" | "BOOKED" | "PENDING"; // Based on example, added PENDING too
    price: number;
}

// Added interface for the main station data structure
interface StationData {
    id: string;
    stationName: string;
    location: string;
    contactEmail: string;
    contactPhone: string;
    description: string;
    rjs: RJ[];
    advertisementSlots: AdvertisementSlot[];
    // bookings and adminApprovalRequests might not be needed directly in this component's state
}

// Define your backend URL centrally
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function Page() {
    const { id: stationIdParam } = useParams();
    const stationId = Array.isArray(stationIdParam) ? stationIdParam[0] : stationIdParam;

    // --- State ---
    // Consolidated state for station data
    const [stationData, setStationData] = useState<StationData | null>(null);
    const [rjs, setRjs] = useState<RJ[]>([]);
    const [slots, setSlots] = useState<AdvertisementSlot[]>([]);
    const [loadingData, setLoadingData] = useState(true); // Single loading state
    const [errorData, setErrorData] = useState<string | null>(null); // Single error state

    // RJ Management State
    const [rjForm, setRjForm] = useState<{ showName: string; rjName: string; days: string; showTiming: string }>({
        showName: '',
        rjName: '',
        days: '',
        showTiming: '',
    });
    const [editingRjId, setEditingRjId] = useState<string | null>(null);
    const [isSubmittingRj, setIsSubmittingRj] = useState(false);

    // Slot Management State
    const [slotForm, setSlotForm] = useState<{ rjId: string; slotTime: string; price: string }>({
        rjId: '',
        slotTime: '',
        price: '',
    });
    const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
    const [isSubmittingSlot, setIsSubmittingSlot] = useState(false);
    const [slotDialogOpen, setSlotDialogOpen] = useState(false);
    const [selectRjDialogOpen, setSelectRjDialogOpen] = useState(false);

    // --- Utility: Get Auth Token ---
    const getAuthToken = (): string | null => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('access_token');
        }
        return null;
    };

    // --- Fetch Station Data (Consolidated) ---
    const fetchStationData = useCallback(async () => {
        if (!stationId) return;
        setLoadingData(true);
        setErrorData(null);
        console.log(`Workspaceing data for station: ${stationId}`);
        try {
            const token = getAuthToken();
            if (!token) throw new Error("Authentication token not found.");

            // *** Use the endpoint provided by the user ***
            const res = await fetch(`${BACKEND_URL}/stations/${stationId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error(`Workspace Station Data failed with status: ${res.status}`, errorText);
                throw new Error(`Failed to fetch station data (Status: ${res.status})`);
            }

            const data: StationData = await res.json();

            // Sort slots by time before setting state
            const sortedSlots = data.advertisementSlots.sort((a, b) =>
                new Date(a.slotTime).getTime() - new Date(b.slotTime).getTime()
            );

            setStationData(data); // Store the full station data if needed elsewhere
            setRjs(data.rjs || []); // Set RJs from the response
            setSlots(sortedSlots || []); // Set sorted Slots from the response

            console.log("Station data fetched successfully:", data);
        } catch (error) {
            console.error("Fetch Station Data error:", error);
            setErrorData(error instanceof Error ? error.message : 'An error occurred fetching station data');
            setRjs([]); // Clear data on error
            setSlots([]);
            setStationData(null);
        } finally {
            setLoadingData(false);
        }
    }, [stationId]); // Dependency is stationId

    // --- Initial Data Fetch ---
    useEffect(() => {
        if (stationId) {
            console.log(`Station ID detected: ${stationId}. Fetching data...`);
            fetchStationData();
        } else {
            const msg = "Station ID not found in URL parameters.";
            console.error(msg);
            setErrorData(msg);
            setLoadingData(false);
        }
    }, [stationId, fetchStationData]); // Trigger fetch when stationId changes

    // --- RJ CRUD Handlers ---
    const handleRjFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setRjForm(prev => ({ ...prev, [name]: value }));
    };

    const handleCreateOrUpdateRJ = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stationId) {
            toast.error("Station ID is missing.");
            return;
        }
        setIsSubmittingRj(true);
        try {
            const token = getAuthToken();
            if (!token) throw new Error("Authentication token not found.");

            // Assuming CRUD endpoints for individual RJs remain /rjs and /rjs/:id
            const url = editingRjId ? `${BACKEND_URL}/rjs/${editingRjId}` : `${BACKEND_URL}/rjs`;
            const method = editingRjId ? 'PATCH' : 'POST';

            const body = JSON.stringify({
                stationId, // Crucial: ensure stationId is sent
                showName: `${rjForm.showName && rjForm.days ? `${rjForm.showName} (${rjForm.days})` : rjForm.showName}`,
                rjName: rjForm.rjName,
                days: rjForm.days || null, // Send null if empty, adjust if backend expects empty string
                showTiming: rjForm.showTiming,
            });
            console.log(`Submitting RJ ${editingRjId ? 'Update' : 'Create'}:`, body);

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body,
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ message: `RJ save operation failed (Status: ${res.status})` }));
                throw new Error(errorData.message || 'RJ save operation failed');
            }

            toast.success(editingRjId ? 'RJ updated successfully!' : 'RJ created successfully!');
            setRjForm({ showName: '', rjName: '', days: '', showTiming: '' }); // Reset form
            setEditingRjId(null);
            fetchStationData(); // Refresh ALL station data (including RJs and Slots)

        } catch (error) {
            console.error("RJ Save error:", error);
            toast.error(error instanceof Error ? error.message : 'RJ save operation failed');
        } finally {
            setIsSubmittingRj(false);
        }
    };

    const handleDeleteRJ = async (rjIdToDelete: string) => {
        if (!window.confirm("Are you sure you want to delete this RJ? This might affect associated slots and bookings.")) return;

        try {
            const token = getAuthToken();
            if (!token) throw new Error("Authentication token not found.");
            console.log(`Deleting RJ: ${rjIdToDelete}`);

            // Assuming DELETE endpoint remains /rjs/:id
            const res = await fetch(`${BACKEND_URL}/rjs/${rjIdToDelete}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ message: 'Failed to delete RJ' }));
                throw new Error(errorData.message || `Failed to delete RJ (Status: ${res.status})`);
            }
            toast.success('RJ deleted successfully!');
            fetchStationData(); // Refresh ALL station data
        } catch (error) {
            console.error("RJ Delete error:", error);
            toast.error(error instanceof Error ? error.message : 'Failed to delete RJ');
        }
    };

    const handleEditRJClick = (rj: RJ) => {
        setEditingRjId(rj.id);
        setRjForm({
            showName: rj.showName,
            rjName: rj.rjName,
            days: rj.days || '', // Handle potentially undefined 'days'
            showTiming: rj.showTiming,
        });
        document.getElementById('rj-form-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const handleCancelEditRJ = () => {
        setEditingRjId(null);
        setRjForm({ showName: '', rjName: '', days: '', showTiming: '' });
    };

    // --- Advertisement Slot CRUD Handlers ---
    const handleSlotFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setSlotForm(prev => ({ ...prev, [name]: value }));
    };

    // Format Date object or ISO string to datetime-local string (YYYY-MM-DDTHH:mm)
    const formatDateTimeLocal = (dateInput: string | Date | undefined): string => {
        if (!dateInput) return '';
        try {
            const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
            if (isNaN(date.getTime())) return ''; // Invalid date check
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        } catch { return ''; }
    };

     // Format local datetime string back to ISO 8601 for API
     const formatSlotTimeForAPI = (localTimeValue: string): string | null => {
        if (!localTimeValue) return null;
        try {
            const date = new Date(localTimeValue);
            if (isNaN(date.getTime())) throw new Error("Invalid date time value selected.");
            return date.toISOString(); // Backend expects standard ISO format
        } catch (error) {
            console.error("Error formatting date for API:", error);
            return null;
        }
    };

    const handleCreateOrUpdateSlot = async (e: React.FormEvent) => {
         e.preventDefault();
         if (!stationId) { toast.error("Station ID is missing."); return; }
         if (!slotForm.rjId) { toast.error("Please select an RJ."); return; }
         if (!slotForm.slotTime) { toast.error("Please select a slot time."); return; }
         if (!slotForm.price || Number(slotForm.price) < 0) { toast.error("Please enter a valid positive price."); return; }

         const formattedTimeForAPI = formatSlotTimeForAPI(slotForm.slotTime);
         if (!formattedTimeForAPI) {
             toast.error("Invalid date/time format selected.");
             return;
         }

         setIsSubmittingSlot(true);
         try {
            const token = getAuthToken();
            if (!token) throw new Error("Authentication token not found.");

            // Assuming CRUD endpoints for individual slots remain /slots and /slots/:id
            const url = editingSlotId ? `${BACKEND_URL}/slots/${editingSlotId}` : `${BACKEND_URL}/slots`;
            const method = editingSlotId ? 'PATCH' : 'POST';

            const body = JSON.stringify({
                stationId, // Crucial: ensure stationId is sent
                rjId: slotForm.rjId,
                slotTime: formattedTimeForAPI,
                price: Number(slotForm.price),
                // availabilityStatus is likely set by backend logic, not sent from client on create/update
            });
            console.log(`Submitting Slot ${editingSlotId ? 'Update' : 'Create'}:`, body);

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body,
            });

            if (!res.ok) {
                 const errorData = await res.json().catch(() => ({ message: `Slot save operation failed (Status: ${res.status})`}));
                 throw new Error(errorData.message || 'Slot save operation failed');
            }

            toast.success(editingSlotId ? 'Slot updated successfully!' : 'Slot created successfully!');
            setSlotDialogOpen(false); // Close dialog on success
            fetchStationData(); // Refresh ALL station data

        } catch (error) {
             console.error("Slot Save error:", error);
            toast.error(error instanceof Error ? error.message : "Failed to save advertisement slot");
        } finally {
            setIsSubmittingSlot(false);
        }
    };

    const handleEditSlotClick = (slot: AdvertisementSlot) => {
        setEditingSlotId(slot.id);
        // Ensure the RJ exists before trying to set it in the form
        if (rjs.find(rj => rj.id === slot.rjId)) {
             setSlotForm({
                rjId: slot.rjId,
                slotTime: formatDateTimeLocal(slot.slotTime),
                price: String(slot.price),
            });
             setSlotDialogOpen(true);
        } else {
            toast.error("Cannot edit slot: Associated RJ not found. It might have been deleted.");
            // Optionally reset form or handle differently
            setEditingSlotId(null);
            setSlotForm({ rjId: '', slotTime: '', price: '' });
        }
    };

    const handleDeleteSlot = async (slotIdToDelete: string) => {
        if (!window.confirm("Are you sure you want to delete this advertisement slot? This might affect existing bookings.")) return;

        try {
            const token = getAuthToken();
            if (!token) throw new Error("Authentication token not found.");
            console.log(`Deleting Slot: ${slotIdToDelete}`);

            // Assuming DELETE endpoint remains /slots/:id
            const res = await fetch(`${BACKEND_URL}/slots/${slotIdToDelete}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ message: 'Failed to delete slot' }));
                throw new Error(errorData.message || `Failed to delete slot (Status: ${res.status})`);
            }
            toast.success('Slot deleted successfully!');
            fetchStationData(); // Refresh ALL station data
        } catch (error) {
            console.error("Slot Delete error:", error);
            toast.error(error instanceof Error ? error.message : 'Failed to delete slot');
        }
    };

    // Reset form when dialog closes
    const handleSlotDialogClose = (open: boolean) => {
        if (!open) {
            setEditingSlotId(null);
            setSlotForm({ rjId: '', slotTime: '', price: '' });
        }
        setSlotDialogOpen(open);
    };

     // Reset select RJ form when its dialog closes
    const handleSelectRjDialogClose = (open: boolean) => {
        // No specific reset needed here unless you add filtering/search to RJ selection
        setSelectRjDialogOpen(open);
    };

    // --- Date Formatting Utility for Display ---
    const formatDateForDisplay = (dateString: string | undefined) => {
        if (!dateString) return "N/A";
        try {
          return new Date(dateString).toLocaleString("en-US", {
              year: 'numeric', month: 'short', day: 'numeric',
              hour: 'numeric', minute: '2-digit', hour12: true
          });
        } catch (e) {
            console.error("Invalid date format:", dateString, e);
            return "Invalid Date";
        }
    };

    // --- Render ---
    if (!stationId) {
         return <div className="container mx-auto p-8 text-center text-red-600 font-semibold">Error: Station ID is missing from the URL. Cannot load station data.</div>;
    }

    if (loadingData) {
        return (
            <div className="container mx-auto p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin inline-block mr-2 text-indigo-600" />
                Loading station data...
            </div>
        );
    }

    if (errorData) {
        return <div className="container mx-auto p-8 text-center text-red-600 bg-red-100 border border-red-300 rounded-md shadow">Error loading station data: {errorData}</div>;
    }

    // If station data is null after loading and no error, something went wrong
     if (!stationData && !loadingData && !errorData) {
         return <div className="container mx-auto p-8 text-center text-orange-600 bg-orange-100 border border-orange-300 rounded-md shadow">Could not load station data. Please check the station ID or try again later.</div>;
     }

    return (
        <div className="container mx-auto p-4 md:p-8 space-y-10">
             {/* Station Header */}
             <div className="mb-8 p-4 border rounded-lg  shadow-sm">
                 <h1 className="text-3xl md:text-4xl font-bold ">{stationData?.stationName || 'Station Details'}</h1>
                 <p className="text-md ">{stationData?.location}</p>
                 {stationData?.description && <p className="text-sm  mt-1">{stationData.description}</p>}
             </div>

            {/* Section: RJ CRUD */}
            <section className="space-y-6" id="rj-management">
                <h2 className="text-2xl font-semibold border-b pb-2 mb-4">Radio Jockeys</h2>

                {/* RJ Form Card */}
                <Card id="rj-form-card" className="shadow-md border border-gray-200">
                     <form onSubmit={handleCreateOrUpdateRJ}>
                        <CardHeader>
                            <CardTitle className="text-lg">{editingRjId ? "Update RJ Details" : "Add New RJ"}</CardTitle>
                             {!editingRjId && <CardDescription>Enter the details for the new Radio Jockey.</CardDescription>}
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* UPDATED Form Fields Order */}
                            <div>
                                <Label htmlFor="showName" className="mb-1 block text-sm font-medium ">Show Name</Label>
                                <Input id="showName" name="showName" type="text" value={rjForm.showName} onChange={handleRjFormChange} required placeholder="e.g., Morning Drive" />
                            </div>
                            <div>
                                <Label htmlFor="rjName" className="mb-1 block text-sm font-medium ">RJ Name</Label>
                                <Input id="rjName" name="rjName" type="text" value={rjForm.rjName} onChange={handleRjFormChange} required placeholder="e.g., RJ Alex" />
                            </div>
                             <div>
                                <Label htmlFor="days" className="mb-1 block text-sm font-medium ">Days Aired (Optional)</Label>
                                <Input id="days" name="days" type="text" placeholder="e.g., Monday - Friday" value={rjForm.days} onChange={handleRjFormChange} />
                            </div>
                            <div>
                                <Label htmlFor="showTiming" className="mb-1 block text-sm font-medium ">Show Timing</Label>
                                <Input id="showTiming" name="showTiming" type="text" placeholder="e.g., 7:00 AM - 10:00 AM" value={rjForm.showTiming} onChange={handleRjFormChange} required/>
                            </div>
                        </CardContent>
                        <DialogFooter className="p-4  border-t mt-4 rounded-b-lg">
                            {editingRjId && (
                                <Button type="button" variant="outline" onClick={handleCancelEditRJ} size="sm">Cancel</Button>
                            )}
                            <Button type="submit" disabled={isSubmittingRj} size="sm">
                                {isSubmittingRj && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingRjId ? "Update RJ" : "Create RJ"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Card>

                {/* List of RJs */}
                <div>
                    <h3 className="text-lg font-medium mb-3 pt-4">Existing RJs ({rjs.length})</h3>
                    {rjs.length === 0 && !loadingData ? (
                         <p className=" italic p-3  rounded-md border">No Radio Jockeys found for this station yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {rjs.map((rj) => (
                                <Card key={rj.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center hover:shadow-md transition-shadow border">
                                    <div className='mb-3 sm:mb-0 flex-grow mr-4 space-y-1'>
                                        <p className="font-semibold text-base ">{rj.showName}</p>
                                        <p className="text-sm ">with {rj.rjName}</p>
                                        <p className="text-xs ">
                                            {rj.days ? `${rj.days} | ` : ''}{rj.showTiming}
                                        </p>
                                    </div>
                                    <div className="flex space-x-2 self-end sm:self-center flex-shrink-0">
                                        <Button variant="ghost" size="sm" onClick={() => handleEditRJClick(rj)} className="text-blue-600 hover:text-blue-700">
                                            <Edit className="mr-1 h-3.5 w-3.5" /> Edit
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleDeleteRJ(rj.id)} className="text-red-600 hover:text-red-700">
                                            <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </section>

             {/* Divider */}
             <hr className="my-8 border-gray-300"/>

            {/* Section: Advertisement Slots */}
             <section className="space-y-6" id="slot-management">
                <div className='flex justify-between items-center mb-4 border-b pb-2'>
                    <h2 className="text-2xl font-semibold">Advertisement Slots</h2>
                     {rjs.length > 0 ? (
                        <Button onClick={() => { setEditingSlotId(null); setSlotForm({ rjId: '', slotTime: '', price: '' }); setSlotDialogOpen(true); }} size="sm">
                             <PlusCircle className="mr-2 h-4 w-4" /> Create New Slot
                        </Button>
                     ) : (
                         <p className="text-sm text-orange-600 flex items-center gap-1">
                             <Info className="h-4 w-4" /> Please add an RJ first to create slots.
                         </p>
                     )}
                </div>

                 {/* List of Slots */}
                <div>
                    <h3 className="text-lg font-medium mb-3">Available & Booked Slots ({slots.length})</h3>
                     {slots.length === 0 && !loadingData ? (
                         <p className=" italic p-3  rounded-md border">No advertisement slots created for this station yet.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {slots.map((slot) => {
                                const associatedRj = rjs.find(r => r.id === slot.rjId);
                                const slotStatus = slot.availabilityStatus || "UNKNOWN"; // Handle missing status
                                const statusColor = {
                                    AVAILABLE: "text-green-600 bg-green-100 border-green-300",
                                    BOOKED: "text-red-600 bg-red-100 border-red-300",
                                    PENDING: "text-yellow-600 bg-yellow-100 border-yellow-300",
                                    UNKNOWN: " bg-gray-100 border-gray-300"
                                }[slotStatus] || " bg-gray-100 border-gray-300";

                                return (
                                    <Card key={slot.id} className="p-4 flex flex-col justify-between shadow hover:shadow-md transition-shadow border">
                                        <div className='space-y-2 mb-3'>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-sm font-medium ">
                                                     <CalendarClock className="h-4 w-4 text-indigo-600"/>
                                                     <span>{formatDateForDisplay(slot.slotTime)}</span>
                                                </div>
                                                {/* Display Availability Status */}
                                                <span className={`text-xs font-medium px-2 py-0.5 rounded border ${statusColor}`}>
                                                    {slotStatus}
                                                </span>
                                            </div>
                                             {associatedRj ? (
                                                <div className="flex items-center gap-2 text-xs  pt-1">
                                                   <Radio className="h-3.5 w-3.5 text-indigo-500"/>
                                                   <span>{associatedRj.showName} (with {associatedRj.rjName})</span>
                                                </div>
                                             ) : (
                                                 <div className="flex items-center gap-2 text-xs text-red-600 pt-1">
                                                   <Radio className="h-3.5 w-3.5"/>
                                                   <span>RJ Not Found (ID: {slot.rjId})</span>
                                                 </div>
                                             )}
                                             <div className="flex items-center gap-2 text-sm  pt-1">
                                                <Tag className="h-4 w-4 text-indigo-600"/>
                                                <span className='font-semibold'>Price: ₹{slot.price.toLocaleString('en-IN')}</span>
                                            </div>
                                        </div>
                                        <div className="flex space-x-2 mt-auto self-end border-t w-full pt-3">
                                            <Button className='flex-grow' variant="ghost" size="sm" onClick={() => handleEditSlotClick(slot)} title="Edit Slot">
                                                <Edit className="mr-1 h-3.5 w-3.5" /> Edit
                                            </Button>
                                            <Button className='flex-grow' variant="ghost" size="sm" onClick={() => handleDeleteSlot(slot.id)} title="Delete Slot" >
                                                <Trash2 className="mr-1 h-3.5 w-3.5 text-red-600" /> Delete
                                            </Button>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* --- Dialogs --- */}

            {/* Dialog: Create/Update Advertisement Slot */}
            <Dialog open={slotDialogOpen} onOpenChange={handleSlotDialogClose}>
                <DialogContent className="sm:max-w-[480px]">
                    <form onSubmit={handleCreateOrUpdateSlot}>
                        <DialogHeader>
                            <DialogTitle>{editingSlotId ? "Update Advertisement Slot" : "Create New Advertisement Slot"}</DialogTitle>
                            <DialogDescription>
                                {editingSlotId ? "Modify the details for this slot." : "Select an RJ, set the time, and price."}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-6">
                            {/* RJ selection */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="rj" className="text-right text-sm font-medium">RJ / Show</Label>
                                <div className="col-span-3 flex">
                                    <Input
                                        id="rj"
                                        readOnly
                                        value={slotForm.rjId ? (rjs.find(r => r.id === slotForm.rjId)?.showName || 'Unknown Show') + ' / ' + (rjs.find(r => r.id === slotForm.rjId)?.rjName || 'Unknown RJ') : ''}
                                        placeholder="Click 'Select' ->"
                                        className="rounded-r-none cursor-pointer  text-sm"
                                        onClick={() => setSelectRjDialogOpen(true)}
                                        required // Make selection required visually
                                    />
                                    <Button type="button" onClick={() => setSelectRjDialogOpen(true)} variant="outline" className="rounded-l-none border-l-0" size="sm">Select</Button>
                                </div>
                            </div>
                             {/* Slot Time */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="slotTime" className="text-right text-sm font-medium">Date & Time</Label>
                                <Input
                                    id="slotTime"
                                    name="slotTime"
                                    type="datetime-local"
                                    value={slotForm.slotTime}
                                    onChange={handleSlotFormChange}
                                    className="col-span-3 text-sm"
                                    required
                                />
                            </div>
                            {/* Price */}
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="price" className="text-right text-sm font-medium">Price (₹)</Label>
                                <Input
                                    id="price"
                                    name="price"
                                    type="number"
                                    min="0" // Basic validation
                                    value={slotForm.price}
                                    onChange={handleSlotFormChange}
                                    className="col-span-3 text-sm"
                                    placeholder="e.g., 1000"
                                    required
                                />
                            </div>
                        </div>
                        <DialogFooter className="mt-2">
                             <Button type="button" variant="outline" onClick={() => handleSlotDialogClose(false)}>Cancel</Button>
                             <Button type="submit" disabled={isSubmittingSlot || !slotForm.rjId}>
                                {isSubmittingSlot && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingSlotId ? "Update Slot" : "Create Slot"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

             {/* Dialog: Select RJ for Slot */}
             <Dialog open={selectRjDialogOpen} onOpenChange={handleSelectRjDialogClose}>
                 <DialogContent className="sm:max-w-[400px]">
                     <DialogHeader>
                         <DialogTitle>Select Radio Jockey</DialogTitle>
                         <DialogDescription>Choose the RJ and show for this advertisement slot.</DialogDescription>
                     </DialogHeader>
                     <div className="py-4 max-h-[60vh] overflow-y-auto space-y-2">
                         {rjs.length === 0 ? (
                             <p className="text-center  italic">No RJs available for this station.</p>
                         ) : (
                             rjs.map(rj => (
                                <Button
                                    key={rj.id}
                                    variant={slotForm.rjId === rj.id ? "default" : "outline"}
                                    className="w-full justify-start text-left h-auto py-2"
                                    onClick={() => {
                                        setSlotForm(prev => ({ ...prev, rjId: rj.id }));
                                        setSelectRjDialogOpen(false); // Close after selection
                                    }}
                                >
                                     <div className="flex flex-col">
                                        <span className="font-medium text-sm">{rj.showName}</span>
                                        <span className="text-xs ">with {rj.rjName} ({rj.days ? `${rj.days} | ` : ''}{rj.showTiming})</span>
                                    </div>
                                </Button>
                            ))
                         )}
                     </div>
                      <DialogFooter>
                         <Button variant="ghost" onClick={() => setSelectRjDialogOpen(false)}>Close</Button>
                     </DialogFooter>
                 </DialogContent>
             </Dialog>

        </div>
    );
}